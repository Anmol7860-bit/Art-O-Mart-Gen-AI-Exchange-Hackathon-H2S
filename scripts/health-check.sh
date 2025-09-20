#!/bin/bash

# Art-O-Mart Health Check Script
# Comprehensive health monitoring for production environment

set -e

# Configuration
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost"
REDIS_HOST="localhost"
REDIS_PORT="6379"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DB="${POSTGRES_DB:-artomart}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Health check results
HEALTH_STATUS=0
CHECKS_PASSED=0
CHECKS_TOTAL=0

# Increment check counters
pass_check() {
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    log "✅ $1"
}

fail_check() {
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    HEALTH_STATUS=1
    error "❌ $1"
}

# Check if a service is reachable
check_service_reachable() {
    local service_name=$1
    local url=$2
    local timeout=${3:-5}
    
    if curl -f -m $timeout "$url" > /dev/null 2>&1; then
        pass_check "$service_name is reachable at $url"
    else
        fail_check "$service_name is not reachable at $url"
    fi
}

# Check API endpoints
check_api_health() {
    info "Checking API health..."
    
    # Basic health endpoint
    check_service_reachable "API Health" "$BACKEND_URL/api/health"
    
    # Test specific endpoints
    local endpoints=(
        "/api/products"
        "/api/categories" 
        "/api/artisans"
        "/api/auth/me"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -m 5 "$BACKEND_URL$endpoint" > /dev/null 2>&1; then
            pass_check "API endpoint $endpoint is responsive"
        else
            # Some endpoints might require authentication, so we check for proper error responses
            local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL$endpoint")
            if [[ "$status_code" == "401" || "$status_code" == "403" ]]; then
                pass_check "API endpoint $endpoint returns proper auth error"
            else
                fail_check "API endpoint $endpoint returned unexpected status: $status_code"
            fi
        fi
    done
}

# Check frontend
check_frontend_health() {
    info "Checking frontend health..."
    
    check_service_reachable "Frontend" "$FRONTEND_URL"
    
    # Check if static assets are loading
    local static_endpoints=(
        "/static/css/main.css"
        "/static/js/main.js"
        "/manifest.json"
    )
    
    for endpoint in "${static_endpoints[@]}"; do
        if curl -f -m 5 "$FRONTEND_URL$endpoint" > /dev/null 2>&1; then
            pass_check "Static asset $endpoint is accessible"
        else
            warning "Static asset $endpoint is not accessible (might not exist yet)"
        fi
    done
}

# Check database connectivity
check_database_health() {
    info "Checking database health..."
    
    # Check if PostgreSQL is responding
    if pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER > /dev/null 2>&1; then
        pass_check "PostgreSQL is accepting connections"
    else
        fail_check "PostgreSQL is not accepting connections"
        return
    fi
    
    # Check database exists and is accessible
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;" > /dev/null 2>&1; then
        pass_check "Database $POSTGRES_DB is accessible"
    else
        fail_check "Cannot connect to database $POSTGRES_DB"
    fi
    
    # Check critical tables exist
    local tables=("users" "products" "orders" "categories")
    for table in "${tables[@]}"; do
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt $table" | grep -q "$table"; then
            pass_check "Table $table exists"
        else
            warning "Table $table does not exist or is not accessible"
        fi
    done
}

# Check Redis connectivity
check_redis_health() {
    info "Checking Redis health..."
    
    if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
        pass_check "Redis is responding to ping"
    else
        fail_check "Redis is not responding"
        return
    fi
    
    # Test basic operations
    local test_key="healthcheck_$(date +%s)"
    local test_value="test_value"
    
    if redis-cli -h $REDIS_HOST -p $REDIS_PORT set $test_key $test_value EX 60 > /dev/null 2>&1; then
        pass_check "Redis SET operation successful"
    else
        fail_check "Redis SET operation failed"
    fi
    
    if [ "$(redis-cli -h $REDIS_HOST -p $REDIS_PORT get $test_key)" = "$test_value" ]; then
        pass_check "Redis GET operation successful"
        redis-cli -h $REDIS_HOST -p $REDIS_PORT del $test_key > /dev/null 2>&1
    else
        fail_check "Redis GET operation failed"
    fi
}

# Check Docker containers
check_docker_health() {
    info "Checking Docker containers..."
    
    if command -v docker >/dev/null 2>&1; then
        # Get container status
        local containers=$(docker-compose -f docker-compose.prod.yml ps --format json 2>/dev/null || echo "[]")
        
        if [ "$containers" = "[]" ] || [ -z "$containers" ]; then
            warning "No containers found or docker-compose not available"
            return
        fi
        
        # Parse container status
        echo "$containers" | jq -r '.[] | select(.State == "running") | .Name' | while read -r container; do
            pass_check "Container $container is running"
        done
        
        echo "$containers" | jq -r '.[] | select(.State != "running") | .Name + " (" + .State + ")"' | while read -r container_info; do
            fail_check "Container $container_info is not running"
        done
    else
        warning "Docker not available, skipping container checks"
    fi
}

# Check disk space
check_disk_space() {
    info "Checking disk space..."
    
    local threshold=90
    local usage=$(df / | awk 'NR==2 {print int($5)}')
    
    if [ $usage -lt $threshold ]; then
        pass_check "Disk usage is ${usage}% (below ${threshold}% threshold)"
    else
        fail_check "Disk usage is ${usage}% (above ${threshold}% threshold)"
    fi
    
    # Check specific directories
    local dirs=("logs" "backups" "uploads")
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            local dir_size=$(du -sh "$dir" | cut -f1)
            info "Directory $dir size: $dir_size"
        fi
    done
}

# Check memory usage
check_memory_usage() {
    info "Checking memory usage..."
    
    local threshold=90
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ $usage -lt $threshold ]; then
        pass_check "Memory usage is ${usage}% (below ${threshold}% threshold)"
    else
        fail_check "Memory usage is ${usage}% (above ${threshold}% threshold)"
    fi
}

# Check CPU usage
check_cpu_usage() {
    info "Checking CPU usage..."
    
    local threshold=90
    local usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print int($1)}')
    
    if [ -z "$usage" ]; then
        # Alternative method for macOS
        usage=$(iostat -c 2 | tail -1 | awk '{print int(100-$6)}')
    fi
    
    if [ -n "$usage" ] && [ $usage -lt $threshold ]; then
        pass_check "CPU usage is ${usage}% (below ${threshold}% threshold)"
    elif [ -n "$usage" ]; then
        fail_check "CPU usage is ${usage}% (above ${threshold}% threshold)"
    else
        warning "Could not determine CPU usage"
    fi
}

# Check SSL certificates (if applicable)
check_ssl_certificates() {
    info "Checking SSL certificates..."
    
    local domains=("artomart.com" "api.artomart.com")
    
    for domain in "${domains[@]}"; do
        if command -v openssl >/dev/null 2>&1; then
            local expiry_date=$(echo | openssl s_client -connect $domain:443 -servername $domain 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
            
            if [ -n "$expiry_date" ]; then
                local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
                local current_timestamp=$(date +%s)
                local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [ $days_until_expiry -gt 30 ]; then
                    pass_check "SSL certificate for $domain expires in $days_until_expiry days"
                elif [ $days_until_expiry -gt 7 ]; then
                    warning "SSL certificate for $domain expires in $days_until_expiry days"
                else
                    fail_check "SSL certificate for $domain expires in $days_until_expiry days (urgent)"
                fi
            else
                warning "Could not check SSL certificate for $domain"
            fi
        fi
    done
}

# Check log files for errors
check_logs_for_errors() {
    info "Checking logs for recent errors..."
    
    local log_dirs=("logs" "./logs" "/var/log")
    local error_patterns=("ERROR" "FATAL" "Exception" "failed" "timeout")
    local recent_errors=0
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            for pattern in "${error_patterns[@]}"; do
                # Check for errors in the last hour
                local errors=$(find "$log_dir" -name "*.log" -mtime -1 -exec grep -i "$pattern" {} + 2>/dev/null | wc -l)
                recent_errors=$((recent_errors + errors))
            done
        fi
    done
    
    if [ $recent_errors -eq 0 ]; then
        pass_check "No recent errors found in logs"
    elif [ $recent_errors -lt 10 ]; then
        warning "Found $recent_errors recent errors in logs"
    else
        fail_check "Found $recent_errors recent errors in logs (high error rate)"
    fi
}

# Generate health report
generate_health_report() {
    log "Health Check Summary"
    echo "===================="
    echo "Timestamp: $(date)"
    echo "Checks Passed: $CHECKS_PASSED/$CHECKS_TOTAL"
    
    if [ $HEALTH_STATUS -eq 0 ]; then
        log "🎉 All health checks passed!"
    else
        error "❌ Some health checks failed!"
    fi
    
    # Generate JSON report
    local json_report="{
        \"timestamp\": \"$(date -Iseconds)\",
        \"status\": \"$([ $HEALTH_STATUS -eq 0 ] && echo 'healthy' || echo 'unhealthy')\",
        \"checks_passed\": $CHECKS_PASSED,
        \"checks_total\": $CHECKS_TOTAL,
        \"success_rate\": \"$(echo "scale=2; $CHECKS_PASSED * 100 / $CHECKS_TOTAL" | bc)%\"
    }"
    
    echo "$json_report" > "health-report-$(date +%Y%m%d_%H%M%S).json"
    info "Health report saved to health-report-$(date +%Y%m%d_%H%M%S).json"
}

# Main health check function
main() {
    log "Starting comprehensive health check for Art-O-Mart..."
    
    # Load environment variables if available
    if [ -f ".env.production" ]; then
        export $(cat .env.production | grep -v ^# | xargs) 2>/dev/null || true
    fi
    
    # Run all health checks
    check_api_health
    check_frontend_health
    check_database_health
    check_redis_health
    check_docker_health
    check_disk_space
    check_memory_usage
    check_cpu_usage
    check_ssl_certificates
    check_logs_for_errors
    
    # Generate final report
    generate_health_report
    
    exit $HEALTH_STATUS
}

# Handle command line arguments
case "${1:-all}" in
    "api")
        check_api_health
        ;;
    "frontend")
        check_frontend_health
        ;;
    "database")
        check_database_health
        ;;
    "redis")
        check_redis_health
        ;;
    "docker")
        check_docker_health
        ;;
    "resources")
        check_disk_space
        check_memory_usage
        check_cpu_usage
        ;;
    "ssl")
        check_ssl_certificates
        ;;
    "logs")
        check_logs_for_errors
        ;;
    "all")
        main
        ;;
    *)
        echo "Usage: $0 {all|api|frontend|database|redis|docker|resources|ssl|logs}"
        echo "  all        - Run all health checks (default)"
        echo "  api        - Check API health"
        echo "  frontend   - Check frontend health"
        echo "  database   - Check database connectivity"
        echo "  redis      - Check Redis connectivity"
        echo "  docker     - Check Docker containers"
        echo "  resources  - Check system resources"
        echo "  ssl        - Check SSL certificates"
        echo "  logs       - Check logs for errors"
        exit 1
        ;;
esac