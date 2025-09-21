#!/bin/bash

# Art-O-Mart Backend Production Deployment Script
# ==============================================
# This script orchestrates the backend deployment process using existing infrastructure
# Supports Railway, Render, and Fly.io platforms with comprehensive validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"
DEPLOY_LOG="$BACKEND_DIR/logs/deployment.log"
HEALTH_CHECK_URL=""
CHOSEN_PLATFORM=""

# Ensure logs directory exists
mkdir -p "$BACKEND_DIR/logs"

# Logging function
log() {
    echo -e "$1" | tee -a "$DEPLOY_LOG"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

# Print header
print_header() {
    log ""
    log "========================================================"
    log "🚀 Art-O-Mart Backend Production Deployment"
    log "========================================================"
    log "Timestamp: $(date)"
    log "Backend Directory: $BACKEND_DIR"
    log "Log File: $DEPLOY_LOG"
    log ""
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check jq (needed for parsing JSON responses)
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. This may affect deployment status parsing."
        log_warning "Install jq: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    fi
    
    # Check if we're in the backend directory
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        log_error "package.json not found. Make sure you're running this from the backend directory"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Validate environment variables
validate_environment() {
    log_info "Validating environment configuration..."
    
    cd "$BACKEND_DIR"
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_error ".env.production file not found"
        log_error "Please create .env.production with your production environment variables"
        exit 1
    fi
    
    # Load .env.production for validation
    set -a
    if [ -f ".env.production" ]; then
        source .env.production
    fi
    set +a
    
    # Run environment validation
    if [ -f "utils/envValidator.js" ]; then
        log_info "Running environment validation..."
        if node -e "
            import('./utils/envValidator.js').then(({ validateEnvironment }) => {
                const result = validateEnvironment();
                if (!result.isValid) {
                    console.error('Environment validation failed:', result.errors);
                    process.exit(1);
                }
                console.log('Environment validation passed');
            });
        "; then
            log_success "Environment validation passed"
        else
            log_error "Environment validation failed"
            log_error "Please check your .env.production file and fix any issues"
            exit 1
        fi
    else
        log_warning "Environment validator not found, skipping validation"
    fi
}

# Choose deployment platform
choose_platform() {
    log_info "Choose deployment platform:"
    log "1) Railway (Recommended)"
    log "2) Render"
    log "3) Fly.io"
    
    read -p "Enter choice [1-3]: " choice
    
    case $choice in
        1)
            CHOSEN_PLATFORM="railway"
            log_info "Selected platform: Railway"
            ;;
        2)
            CHOSEN_PLATFORM="render"
            log_info "Selected platform: Render"
            ;;
        3)
            CHOSEN_PLATFORM="fly"
            log_info "Selected platform: Fly.io"
            ;;
        *)
            log_error "Invalid choice. Defaulting to Railway"
            CHOSEN_PLATFORM="railway"
            ;;
    esac
}

# Run pre-deployment health check
pre_deployment_check() {
    log_info "Running pre-deployment health check..."
    
    cd "$BACKEND_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    # Run local health check if available
    if [ -f "scripts/health-check.js" ]; then
        log_info "Running local health check..."
        if NODE_ENV=production node scripts/health-check.js; then
            log_success "Pre-deployment health check passed"
        else
            log_warning "Pre-deployment health check failed, continuing anyway..."
        fi
    fi
}

# Deploy to chosen platform
deploy_application() {
    log_info "Deploying to $CHOSEN_PLATFORM..."
    
    cd "$BACKEND_DIR"
    
    case $CHOSEN_PLATFORM in
        railway)
            deploy_railway
            ;;
        render)
            deploy_render
            ;;
        fly)
            deploy_fly
            ;;
    esac
}

# Deploy to Railway
deploy_railway() {
    log_info "Deploying to Railway..."
    
    # Check if Railway CLI is available
    if command -v railway &> /dev/null; then
        log_info "Using Railway CLI..."
        railway login
        
        # Set environment variables from .env.production
        log_info "Setting environment variables..."
        if [ -f ".env.production" ]; then
            # Read and set each environment variable
            while IFS='=' read -r key value || [ -n "$key" ]; do
                # Skip comments and empty lines
                [[ $key =~ ^[[:space:]]*# ]] && continue
                [[ -z "$key" ]] && continue
                
                # Remove leading/trailing whitespace
                key=$(echo "$key" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
                value=$(echo "$value" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
                
                if [ -n "$key" ] && [ -n "$value" ] && [[ ! "$value" == *"your_"* ]]; then
                    log_info "Setting $key..."
                    railway variables set "$key=$value" || log_warning "Failed to set $key"
                fi
            done < .env.production
        fi
        
        railway deploy
        HEALTH_CHECK_URL=$(railway status --json | jq -r '.url')"/api/health"
    else
        log_info "Railway CLI not found, using deployment script..."
        if [ -f "scripts/deploy.js" ]; then
            NODE_ENV=production node scripts/deploy.js railway
        else
            log_error "Deployment script not found"
            exit 1
        fi
    fi
    
    log_success "Railway deployment initiated"
}

# Deploy to Render
deploy_render() {
    log_info "Deploying to Render..."
    
    # Check if render.yaml exists
    if [ ! -f "render.yaml" ]; then
        log_error "render.yaml configuration not found"
        exit 1
    fi
    
    # Use deployment script
    if [ -f "scripts/deploy.js" ]; then
        NODE_ENV=production node scripts/deploy.js render
        log_success "Render deployment initiated"
    else
        log_error "Deployment script not found"
        log_info "Please push your code to your Render-connected repository"
    fi
}

# Deploy to Fly.io
deploy_fly() {
    log_info "Deploying to Fly.io..."
    
    # Check if flyctl is available
    if ! command -v flyctl &> /dev/null; then
        log_error "flyctl CLI not found. Please install Fly.io CLI"
        exit 1
    fi
    
    # Check if fly.toml exists
    if [ ! -f "fly.toml" ]; then
        log_error "fly.toml configuration not found"
        exit 1
    fi
    
    # Deploy using flyctl
    flyctl deploy --config fly.toml
    HEALTH_CHECK_URL=$(flyctl status --json | jq -r '.Hostname')"/api/health"
    
    log_success "Fly.io deployment initiated"
}

# Post-deployment validation
post_deployment_validation() {
    log_info "Running post-deployment validation..."
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready (60 seconds)..."
    sleep 60
    
    # Run health check if URL is available
    if [ -n "$HEALTH_CHECK_URL" ]; then
        log_info "Testing health endpoint: $HEALTH_CHECK_URL"
        
        for i in {1..5}; do
            if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
                log_success "Health endpoint is responding"
                break
            else
                log_warning "Health endpoint not ready, attempt $i/5"
                sleep 10
            fi
        done
    fi
    
    # Run comprehensive health check script
    if [ -f "scripts/health-check.js" ]; then
        log_info "Running comprehensive health validation..."
        if BASE_URL="$HEALTH_CHECK_URL" node scripts/health-check.js; then
            log_success "Post-deployment validation passed"
        else
            log_error "Post-deployment validation failed"
            log_error "Check the application logs and verify environment variables"
        fi
    fi
}

# Generate deployment summary
generate_summary() {
    log ""
    log "========================================================"
    log "📋 Deployment Summary"
    log "========================================================"
    log "Platform: $CHOSEN_PLATFORM"
    log "Deployment Time: $(date)"
    log "Health Check URL: ${HEALTH_CHECK_URL:-'Not available'}"
    log ""
    log "Next steps:"
    log "1. Update FRONTEND_URL in your environment variables"
    log "2. Configure CORS_ORIGINS with your actual frontend domain"
    log "3. Test AI agents and WebSocket connections"
    log "4. Monitor application logs for any issues"
    log ""
    log "Deployment log saved to: $DEPLOY_LOG"
    log "========================================================"
}

# Error handling
handle_error() {
    log_error "Deployment failed at step: $1"
    log_error "Check the logs above for details"
    log_error "You may need to:"
    log_error "1. Check your environment variables"
    log_error "2. Verify platform-specific configuration"
    log_error "3. Check application logs on the platform"
    exit 1
}

# Main execution
main() {
    print_header
    
    # Set up error handling
    trap 'handle_error "Unknown error"' ERR
    
    check_prerequisites || handle_error "Prerequisites check"
    validate_environment || handle_error "Environment validation"
    choose_platform || handle_error "Platform selection"
    pre_deployment_check || handle_error "Pre-deployment check"
    deploy_application || handle_error "Application deployment"
    post_deployment_validation || handle_error "Post-deployment validation"
    
    generate_summary
    
    log_success "🎉 Backend deployment completed successfully!"
}

# Run main function
main "$@"