#!/bin/bash

# Art-O-Mart Production Deployment Script
# This script automates the deployment process for the production environment

set -e # Exit on any error

# Configuration
PROJECT_NAME="art-o-mart"
ENVIRONMENT="production"
DOCKER_REGISTRY="your-registry.com"
VERSION=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is required but not installed"
    command -v git >/dev/null 2>&1 || error "Git is required but not installed"
    command -v jq >/dev/null 2>&1 || error "jq is required but not installed"
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        error ".env.production file not found"
    fi
    
    # Check if we're on the main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        warning "Not on main/master branch. Current branch: $CURRENT_BRANCH"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log "Prerequisites check completed ✓"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Build frontend image
    info "Building frontend image..."
    docker build -f docker/Dockerfile.frontend -t ${DOCKER_REGISTRY}/${PROJECT_NAME}/frontend:${VERSION} .
    docker tag ${DOCKER_REGISTRY}/${PROJECT_NAME}/frontend:${VERSION} ${DOCKER_REGISTRY}/${PROJECT_NAME}/frontend:latest
    
    # Build backend image
    info "Building backend image..."
    docker build -f docker/Dockerfile.backend -t ${DOCKER_REGISTRY}/${PROJECT_NAME}/backend:${VERSION} .
    docker tag ${DOCKER_REGISTRY}/${PROJECT_NAME}/backend:${VERSION} ${DOCKER_REGISTRY}/${PROJECT_NAME}/backend:latest
    
    log "Docker images built successfully ✓"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Run frontend tests
    info "Running frontend tests..."
    npm run test:ci
    
    # Run backend tests
    info "Running backend tests..."
    cd backend && npm run test:ci && cd ..
    
    # Run E2E tests
    info "Running E2E tests..."
    npm run test:e2e:ci
    
    log "All tests passed ✓"
}

# Push images to registry
push_images() {
    log "Pushing images to registry..."
    
    # Login to registry (assumes you're already logged in)
    docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}/frontend:${VERSION}
    docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}/frontend:latest
    docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}/backend:${VERSION}
    docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}/backend:latest
    
    log "Images pushed successfully ✓"
}

# Create deployment backup
create_backup() {
    log "Creating deployment backup..."
    
    BACKUP_DIR="backups/deployment_${TIMESTAMP}"
    mkdir -p $BACKUP_DIR
    
    # Backup current docker-compose files
    cp docker-compose.prod.yml $BACKUP_DIR/
    cp .env.production $BACKUP_DIR/
    
    # Export current container states
    docker-compose -f docker-compose.prod.yml ps --format json > $BACKUP_DIR/container_states.json
    
    # Backup database
    info "Creating database backup..."
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > $BACKUP_DIR/database_${TIMESTAMP}.sql.gz
    
    log "Backup created at $BACKUP_DIR ✓"
}

# Deploy to production
deploy() {
    log "Deploying to production..."
    
    # Load production environment
    export $(cat .env.production | grep -v ^# | xargs)
    
    # Update docker-compose file with new image versions
    sed -i.bak "s|image: ${DOCKER_REGISTRY}/${PROJECT_NAME}/frontend:.*|image: ${DOCKER_REGISTRY}/${PROJECT_NAME}/frontend:${VERSION}|g" docker-compose.prod.yml
    sed -i.bak "s|image: ${DOCKER_REGISTRY}/${PROJECT_NAME}/backend:.*|image: ${DOCKER_REGISTRY}/${PROJECT_NAME}/backend:${VERSION}|g" docker-compose.prod.yml
    
    # Pull latest images
    info "Pulling latest images..."
    docker-compose -f docker-compose.prod.yml pull
    
    # Rolling update deployment
    info "Performing rolling update..."
    
    # Update backend first
    docker-compose -f docker-compose.prod.yml up -d --no-deps backend
    sleep 10
    
    # Health check for backend
    info "Checking backend health..."
    for i in {1..30}; do
        if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
            info "Backend is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            error "Backend health check failed"
        fi
        sleep 2
    done
    
    # Update frontend
    docker-compose -f docker-compose.prod.yml up -d --no-deps frontend
    sleep 10
    
    # Health check for frontend
    info "Checking frontend health..."
    for i in {1..30}; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            info "Frontend is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            error "Frontend health check failed"
        fi
        sleep 2
    done
    
    # Update other services
    docker-compose -f docker-compose.prod.yml up -d
    
    log "Deployment completed successfully ✓"
}

# Post-deployment checks
post_deployment_checks() {
    log "Running post-deployment checks..."
    
    # Check all services are running
    info "Checking service status..."
    docker-compose -f docker-compose.prod.yml ps
    
    # Run smoke tests
    info "Running smoke tests..."
    
    # Test API endpoints
    curl -f http://localhost:3001/api/health || error "API health check failed"
    curl -f http://localhost:3001/api/products?limit=1 || error "API products endpoint failed"
    
    # Test frontend
    curl -f http://localhost/ || error "Frontend health check failed"
    
    # Check database connectivity
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U ${POSTGRES_USER} || error "Database connectivity check failed"
    
    # Check Redis connectivity
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping || error "Redis connectivity check failed"
    
    # Test authentication
    info "Testing authentication endpoints..."
    curl -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"wrongpassword"}' http://localhost:3001/api/auth/login | grep -q "error" || error "Authentication test failed"
    
    log "All post-deployment checks passed ✓"
}

# Send notifications
send_notifications() {
    log "Sending deployment notifications..."
    
    DEPLOYMENT_INFO="{
        \"version\": \"$VERSION\",
        \"timestamp\": \"$TIMESTAMP\",
        \"environment\": \"$ENVIRONMENT\",
        \"status\": \"success\"
    }"
    
    # Send to monitoring webhook (replace with your webhook URL)
    if [ -n "${WEBHOOK_URL}" ]; then
        curl -X POST -H "Content-Type: application/json" \
             -d "{\"text\":\"🚀 Art-O-Mart deployed successfully to production\", \"deployment\": $DEPLOYMENT_INFO}" \
             "${WEBHOOK_URL}" || warning "Failed to send webhook notification"
    fi
    
    # Send to email (if configured)
    if [ -n "${NOTIFICATION_EMAIL}" ]; then
        echo "Art-O-Mart production deployment completed successfully at $TIMESTAMP" | \
        mail -s "Production Deployment Success - $VERSION" "${NOTIFICATION_EMAIL}" || warning "Failed to send email notification"
    fi
    
    log "Notifications sent ✓"
}

# Rollback function
rollback() {
    local backup_dir=$1
    if [ -z "$backup_dir" ]; then
        error "Backup directory not specified for rollback"
    fi
    
    warning "Rolling back deployment..."
    
    # Restore previous docker-compose file
    cp ${backup_dir}/docker-compose.prod.yml ./docker-compose.prod.yml
    cp ${backup_dir}/.env.production ./.env.production
    
    # Restart services with previous version
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    
    log "Rollback completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Remove old images (keep last 3 versions)
    docker images ${DOCKER_REGISTRY}/${PROJECT_NAME}/frontend --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
    tail -n +2 | sort -k2 -r | tail -n +4 | awk '{print $1}' | xargs -r docker rmi
    
    docker images ${DOCKER_REGISTRY}/${PROJECT_NAME}/backend --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
    tail -n +2 | sort -k2 -r | tail -n +4 | awk '{print $1}' | xargs -r docker rmi
    
    # Clean up old logs (keep last 7 days)
    find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log "Cleanup completed ✓"
}

# Main deployment workflow
main() {
    log "Starting Art-O-Mart production deployment..."
    log "Version: $VERSION"
    log "Timestamp: $TIMESTAMP"
    
    # Trap for cleanup on exit
    trap cleanup EXIT
    
    case "${1:-deploy}" in
        "check")
            check_prerequisites
            ;;
        "build")
            check_prerequisites
            build_images
            ;;
        "test")
            check_prerequisites
            run_tests
            ;;
        "deploy")
            check_prerequisites
            build_images
            run_tests
            push_images
            create_backup
            deploy
            post_deployment_checks
            send_notifications
            log "🎉 Deployment completed successfully!"
            ;;
        "rollback")
            if [ -z "$2" ]; then
                error "Please specify backup directory for rollback"
            fi
            rollback "$2"
            ;;
        "status")
            docker-compose -f docker-compose.prod.yml ps
            ;;
        *)
            echo "Usage: $0 {check|build|test|deploy|rollback|status}"
            echo "  check    - Check prerequisites"
            echo "  build    - Build Docker images"
            echo "  test     - Run all tests"
            echo "  deploy   - Full deployment (default)"
            echo "  rollback - Rollback to previous version"
            echo "  status   - Show service status"
            exit 1
            ;;
    esac
}

# Parse command line arguments
while getopts "v:e:r:h" opt; do
    case $opt in
        v)
            VERSION=$OPTARG
            ;;
        e)
            ENVIRONMENT=$OPTARG
            ;;
        r)
            DOCKER_REGISTRY=$OPTARG
            ;;
        h)
            echo "Art-O-Mart Production Deployment Script"
            echo "Usage: $0 [OPTIONS] [COMMAND]"
            echo "Options:"
            echo "  -v VERSION    Set version tag (default: git short hash)"
            echo "  -e ENV        Set environment (default: production)"
            echo "  -r REGISTRY   Set Docker registry URL"
            echo "  -h           Show this help message"
            exit 0
            ;;
        \?)
            error "Invalid option: -$OPTARG"
            ;;
    esac
done

shift $((OPTIND-1))

# Run main function
main "$@"