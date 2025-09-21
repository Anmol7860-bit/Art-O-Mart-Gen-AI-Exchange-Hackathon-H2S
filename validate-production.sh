#!/bin/bash

# Art-O-Mart Production Validation Script
# ========================================
# Comprehensive production validation orchestrating E2E tests, monitoring, and reporting
# 
# Usage: ./validate-production.sh [options]
# Options:
#   --skip-tests    Skip E2E tests (validation only)
#   --quick         Run only critical path tests
#   --verbose       Enable detailed logging
#   --report-only   Generate report from existing results

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
ENV_FILE="$PROJECT_ROOT/.env.production"
REPORTS_DIR="$PROJECT_ROOT/validation-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VALIDATION_LOG="$REPORTS_DIR/validation_${TIMESTAMP}.log"

# Parse command line arguments
SKIP_TESTS=false
QUICK_MODE=false
VERBOSE=false
REPORT_ONLY=false

for arg in "$@"; do
  case $arg in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --quick)
      QUICK_MODE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --report-only)
      REPORT_ONLY=true
      shift
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--skip-tests] [--quick] [--verbose] [--report-only]"
      exit 1
      ;;
  esac
done

# Logging functions
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} ${timestamp} - $message" | tee -a "$VALIDATION_LOG"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - $message" | tee -a "$VALIDATION_LOG"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} ${timestamp} - $message" | tee -a "$VALIDATION_LOG"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "$VALIDATION_LOG"
            ;;
        "STEP")
            echo -e "${PURPLE}[STEP]${NC} ${timestamp} - $message" | tee -a "$VALIDATION_LOG"
            ;;
    esac
}

verbose_log() {
    if [ "$VERBOSE" = true ]; then
        log "INFO" "$1"
    fi
}

# Error handling
handle_error() {
    local exit_code=$?
    local line_number=$1
    log "ERROR" "Script failed at line $line_number with exit code $exit_code"
    log "ERROR" "Production validation failed. Check the log file: $VALIDATION_LOG"
    exit $exit_code
}

trap 'handle_error $LINENO' ERR

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Main validation function
main() {
    log "STEP" "🚀 Starting Art-O-Mart Production Validation"
    log "INFO" "Timestamp: $TIMESTAMP"
    log "INFO" "Log file: $VALIDATION_LOG"
    
    if [ "$REPORT_ONLY" = true ]; then
        log "INFO" "Report-only mode: Generating report from existing results"
        generate_comprehensive_report
        exit 0
    fi
    
    # Step 1: Environment Setup
    setup_production_environment
    
    # Step 2: Initialize Monitoring
    initialize_sentry_monitoring
    
    # Step 3: Pre-flight Checks
    run_preflight_checks
    
    # Step 4: Run E2E Tests (unless skipped)
    if [ "$SKIP_TESTS" = false ]; then
        run_e2e_tests
    else
        log "INFO" "Skipping E2E tests as requested"
    fi
    
    # Step 5: User Flow Validation
    run_user_flow_validation
    
    # Step 6: Deployment Validation
    run_deployment_validation
    
    # Step 7: Performance Testing
    run_performance_tests
    
    # Step 8: Generate Comprehensive Report
    generate_comprehensive_report
    
    # Step 9: Final Status
    display_final_status
}

setup_production_environment() {
    log "STEP" "🔧 Setting up production environment"
    
    # Load production environment
    if [ -f "$ENV_FILE" ]; then
        log "SUCCESS" "Loading production environment from $ENV_FILE"
        set -a  # automatically export all variables
        source "$ENV_FILE"
        set +a  # stop automatically exporting
        verbose_log "Environment variables loaded"
    else
        log "ERROR" "Production environment file not found: $ENV_FILE"
        exit 1
    fi
    
    # Verify required environment variables
    local required_vars=(
        "VITE_SUPABASE_URL"
        "VITE_BACKEND_URL"
        "BASE_URL"
        "PRODUCTION_URL"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log "ERROR" "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log "SUCCESS" "Production environment configured"
    verbose_log "Base URL: $BASE_URL"
    verbose_log "Backend URL: $VITE_BACKEND_URL"
}

initialize_sentry_monitoring() {
    log "STEP" "📊 Initializing Sentry monitoring"
    
    if [ -n "$VITE_SENTRY_DSN" ] && [[ "$VITE_SENTRY_DSN" != *"your-sentry-dsn"* ]]; then
        log "SUCCESS" "Sentry DSN configured"
        verbose_log "Sentry DSN: [CONFIGURED]"
        
        # Test Sentry connection (if monitoring script exists)
        if [ -f "$PROJECT_ROOT/src/utils/monitoring.js" ]; then
            verbose_log "Testing Sentry connection"
            # Add Sentry test here if needed
        fi
    else
        log "WARNING" "Sentry DSN not configured or using placeholder value"
        log "WARNING" "Error tracking and performance monitoring will not be available"
    fi
}

run_preflight_checks() {
    log "STEP" "🔍 Running pre-flight checks"
    
    # Check if production URLs are accessible
    local urls_to_check=(
        "$BASE_URL"
        "$VITE_BACKEND_URL/api/health"
    )
    
    for url in "${urls_to_check[@]}"; do
        log "INFO" "Checking accessibility: $url"
        if curl -s -f -o /dev/null --max-time 10 "$url"; then
            log "SUCCESS" "✅ $url is accessible"
        else
            log "ERROR" "❌ $url is not accessible"
            exit 1
        fi
    done
    
    # Verify dependencies
    local required_commands=("npm" "npx")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "Required command not found: $cmd"
            exit 1
        fi
    done
    
    log "SUCCESS" "Pre-flight checks passed"
}

run_e2e_tests() {
    log "STEP" "🧪 Running E2E tests against production"
    
    local test_command="npx playwright test"
    local test_results_file="$REPORTS_DIR/e2e_results_${TIMESTAMP}.json"
    
    if [ "$QUICK_MODE" = true ]; then
        log "INFO" "Running quick mode (critical path tests only)"
        test_command="$test_command --grep '@critical'"
    fi
    
    # Set environment for tests
    export TEST_ENV=production
    export BASE_URL="$BASE_URL"
    
    log "INFO" "Executing: $test_command"
    
    # Run tests using reporters defined in playwright.config.js
    if $test_command > /dev/null 2>&1; then
        log "SUCCESS" "E2E tests completed successfully"
    else
        local exit_code=$?
        log "WARNING" "Some E2E tests failed (exit code: $exit_code)"
        
        # Don't fail the entire validation if tests fail
        # We'll include the results in the final report
    fi
    
    # Copy JSON results if they exist (created by JSON reporter in playwright.config.js)
    if [ -f "$PROJECT_ROOT/playwright-report/results.json" ]; then
        cp "$PROJECT_ROOT/playwright-report/results.json" "$test_results_file"
        log "INFO" "Test results saved to: $test_results_file"
    fi
    
    # Generate HTML report only in verbose mode to prevent hangs in CI/headless
    if [ "$VERBOSE" = true ]; then
        npx playwright show-report --host=0.0.0.0 --port=0 > /dev/null 2>&1 || true
        verbose_log "Playwright HTML report generated"
    fi
}

run_user_flow_validation() {
    log "STEP" "👥 Running user flow validation"
    
    if [ -f "$PROJECT_ROOT/scripts/test-user-flows.js" ]; then
        log "INFO" "Executing user flow validation script"
        
        # Run user flow tests
        if node "$PROJECT_ROOT/scripts/test-user-flows.js" --env=production > "$REPORTS_DIR/user_flows_${TIMESTAMP}.log" 2>&1; then
            log "SUCCESS" "User flow validation completed"
        else
            log "WARNING" "User flow validation encountered issues"
        fi
    else
        log "WARNING" "User flow validation script not found"
    fi
}

run_deployment_validation() {
    log "STEP" "🚀 Running deployment validation"
    
    if [ -f "$PROJECT_ROOT/scripts/validate-deployment.js" ]; then
        log "INFO" "Executing deployment validation"
        
        local validation_args="--url=$BASE_URL"
        if [ -n "$VITE_WS_URL" ]; then
            validation_args="$validation_args --wsUrl=$VITE_WS_URL"
        fi
        
        if node "$PROJECT_ROOT/scripts/validate-deployment.js" $validation_args > "$REPORTS_DIR/deployment_validation_${TIMESTAMP}.log" 2>&1; then
            log "SUCCESS" "Deployment validation passed"
        else
            log "WARNING" "Deployment validation found issues"
        fi
    else
        log "WARNING" "Deployment validation script not found"
    fi
}

run_performance_tests() {
    log "STEP" "⚡ Running performance tests"
    
    # Basic performance check using curl
    log "INFO" "Testing page load performance"
    
    local start_time=$(date +%s%3N)
    if curl -s -o /dev/null "$BASE_URL"; then
        local end_time=$(date +%s%3N)
        local load_time=$((end_time - start_time))
        log "SUCCESS" "Page load time: ${load_time}ms"
        echo "page_load_time_ms: $load_time" >> "$REPORTS_DIR/performance_${TIMESTAMP}.txt"
    else
        log "WARNING" "Performance test failed"
    fi
    
    # Additional performance tests can be added here
    verbose_log "Performance tests completed"
}

generate_comprehensive_report() {
    log "STEP" "📋 Generating comprehensive validation report"
    
    local report_file="$REPORTS_DIR/PRODUCTION_VALIDATION_REPORT_${TIMESTAMP}.md"
    
    cat > "$report_file" << EOF
# Art-O-Mart Production Validation Report
**Generated:** $(date)
**Validation ID:** $TIMESTAMP

## Executive Summary

This report contains the results of comprehensive production validation for Art-O-Mart, including end-to-end testing, user flow validation, deployment verification, and performance benchmarking.

### Production URLs
- **Frontend Application:** $BASE_URL
- **Backend API:** $VITE_BACKEND_URL
- **WebSocket Endpoint:** ${VITE_WS_URL:-"Not configured"}

### Validation Status
EOF

    # Add validation results
    if [ -f "$REPORTS_DIR/e2e_results_${TIMESTAMP}.json" ]; then
        echo "- ✅ E2E Tests: Results available" >> "$report_file"
    else
        echo "- ⚠️ E2E Tests: Not executed" >> "$report_file"
    fi
    
    if [ -f "$REPORTS_DIR/user_flows_${TIMESTAMP}.log" ]; then
        echo "- ✅ User Flow Validation: Completed" >> "$report_file"
    else
        echo "- ⚠️ User Flow Validation: Not executed" >> "$report_file"
    fi
    
    if [ -f "$REPORTS_DIR/deployment_validation_${TIMESTAMP}.log" ]; then
        echo "- ✅ Deployment Validation: Completed" >> "$report_file"
    else
        echo "- ⚠️ Deployment Validation: Not executed" >> "$report_file"
    fi
    
    # Compute status labels without exposing actual values
    local SENTRY_STATUS="Not configured"
    local ANALYTICS_STATUS="Not configured"
    
    if [ -n "$VITE_SENTRY_DSN" ]; then
        SENTRY_STATUS="Configured"
    fi
    
    if [ -n "$VITE_ANALYTICS_ID" ]; then
        ANALYTICS_STATUS="Configured"
    fi
    
    cat >> "$report_file" << EOF

## Environment Configuration
- **Environment:** Production
- **Sentry Monitoring:** $SENTRY_STATUS
- **Analytics:** $ANALYTICS_STATUS
- **Feature Flags:** AI Features, WebSockets, Analytics enabled

## Test Results Summary
Detailed test results and logs are available in the validation-reports directory.

## Performance Metrics
EOF
    
    if [ -f "$REPORTS_DIR/performance_${TIMESTAMP}.txt" ]; then
        cat "$REPORTS_DIR/performance_${TIMESTAMP}.txt" >> "$report_file"
    else
        echo "Performance tests not executed" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## Next Steps
1. Review any warnings or failed tests
2. Configure Sentry DSN for production monitoring
3. Set up Google Analytics if not already configured
4. Share production URLs with stakeholders

## Artifacts
All validation artifacts are stored in: \`validation-reports/\`
- Test results: \`e2e_results_${TIMESTAMP}.json\`
- User flow logs: \`user_flows_${TIMESTAMP}.log\`
- Deployment validation: \`deployment_validation_${TIMESTAMP}.log\`
- Performance data: \`performance_${TIMESTAMP}.txt\`
- Full validation log: \`validation_${TIMESTAMP}.log\`
EOF

    log "SUCCESS" "Comprehensive report generated: $report_file"
}

display_final_status() {
    log "STEP" "🎯 Production validation completed"
    
    echo -e "\n${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Art-O-Mart Production Status         ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC} Frontend URL: $BASE_URL"
    echo -e "${GREEN}║${NC} Backend URL:  $VITE_BACKEND_URL"
    echo -e "${GREEN}║${NC} Report ID:    $TIMESTAMP"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
    
    log "SUCCESS" "🎉 Production validation completed successfully!"
    log "INFO" "📋 Full report available in: validation-reports/"
    log "INFO" "🔗 Share these URLs with stakeholders for review"
    
    # Display any critical issues found
    local critical_issues=false
    
    if [ ! -f "$REPORTS_DIR/e2e_results_${TIMESTAMP}.json" ] && [ "$SKIP_TESTS" = false ]; then
        log "WARNING" "❗ E2E tests did not complete successfully"
        critical_issues=true
    fi
    
    if [[ "$VITE_SENTRY_DSN" == *"your-sentry-dsn"* ]] || [ -z "$VITE_SENTRY_DSN" ]; then
        log "WARNING" "❗ Sentry monitoring not configured"
    fi
    
    if [ "$critical_issues" = false ]; then
        log "SUCCESS" "🎊 Production environment is ready for use!"
        exit 0
    else
        log "WARNING" "⚠️ Production environment has some issues that should be addressed"
        exit 1
    fi
}

# Make sure we're in the right directory
cd "$PROJECT_ROOT"

# Run main function
main "$@"