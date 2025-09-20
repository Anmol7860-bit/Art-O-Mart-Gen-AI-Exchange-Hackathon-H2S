#!/usr/bin/env node

/**
 * User Flow Testing Script
 * Runs comprehensive E2E tests against deployed frontend and backend
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
}

function success(message) {
  log(`✅ SUCCESS: ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  INFO: ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  WARNING: ${message}`, 'yellow');
}

function executeCommand(command, options = {}) {
  try {
    log(`Executing: ${command}`, 'cyan');
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      cwd: projectRoot,
      ...options 
    });
    return result;
  } catch (err) {
    error(`Command failed: ${command}`);
    error(err.message);
    throw err;
  }
}

async function validateTestEnvironment(baseUrl) {
  info(`Validating test environment: ${baseUrl}`);
  
  try {
    // Check if the application is accessible
    const response = await fetch(baseUrl);
    if (!response.ok) {
      throw new Error(`Application not accessible: ${response.status}`);
    }
    
    success('Test environment is accessible');
    return true;
  } catch (err) {
    error(`Test environment validation failed: ${err.message}`);
    return false;
  }
}

async function runAuthenticationTests(baseUrl) {
  info('Running authentication flow tests...');
  
  const testResults = {
    name: 'Authentication Tests',
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    executeCommand(`npx playwright test tests/e2e/auth.spec.js`, {
      env: { 
        ...process.env, 
        BASE_URL: baseUrl 
      }
    });
    
    // Parse results from the configured JSON reporter
    const resultsPath = path.join(projectRoot, 'playwright-report', 'results.json');
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      testResults.passed = results.suites?.reduce((acc, suite) => acc + (suite.specs?.filter(spec => spec.ok).length || 0), 0) || 0;
      testResults.failed = results.suites?.reduce((acc, suite) => acc + (suite.specs?.filter(spec => !spec.ok).length || 0), 0) || 0;
    }
    
    success(`Authentication tests completed: ${testResults.passed} passed, ${testResults.failed} failed`);
    return testResults;
    
  } catch (err) {
    error('Authentication tests failed');
    testResults.failed = 1;
    return testResults;
  }
}

async function runMarketplaceTests(baseUrl) {
  info('Running marketplace browsing tests...');
  
  const testResults = {
    name: 'Marketplace Tests',
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    executeCommand(`npx playwright test tests/e2e/marketplace.spec.js`, {
      env: { 
        ...process.env, 
        BASE_URL: baseUrl 
      }
    });
    
    success('Marketplace tests completed');
    return testResults;
    
  } catch (err) {
    error('Marketplace tests failed');
    testResults.failed = 1;
    return testResults;
  }
}

async function runCartTests(baseUrl) {
  info('Running shopping cart tests...');
  
  const testResults = {
    name: 'Cart Tests',
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    executeCommand(`npx playwright test tests/e2e/cart.spec.js`, {
      env: { 
        ...process.env, 
        BASE_URL: baseUrl 
      }
    });
    
    success('Cart tests completed');
    return testResults;
    
  } catch (err) {
    error('Cart tests failed');
    testResults.failed = 1;
    return testResults;
  }
}

async function runAIAssistantTests(baseUrl) {
  info('Running AI assistant tests...');
  
  const testResults = {
    name: 'AI Assistant Tests',
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    executeCommand(`npx playwright test tests/e2e/ai-assistant.spec.js`, {
      env: { 
        ...process.env, 
        BASE_URL: baseUrl 
      }
    });
    
    success('AI assistant tests completed');
    return testResults;
    
  } catch (err) {
    error('AI assistant tests failed');
    testResults.failed = 1;
    return testResults;
  }
}

function generateTestReport(allResults, baseUrl) {
  info('Generating test report...');
  
  const totalPassed = allResults.reduce((acc, result) => acc + result.passed, 0);
  const totalFailed = allResults.reduce((acc, result) => acc + result.failed, 0);
  const totalTests = totalPassed + totalFailed;
  
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl,
    summary: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      success_rate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0
    },
    test_suites: allResults
  };
  
  // Write report to file
  const reportPath = path.join(projectRoot, 'test-results', 'user-flow-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Console summary
  log('\n=== USER FLOW TEST SUMMARY ===', 'magenta');
  log(`Test Environment: ${baseUrl}`, 'cyan');
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${totalPassed}`, 'green');
  log(`Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  log(`Success Rate: ${report.summary.success_rate}%`, totalFailed === 0 ? 'green' : 'yellow');
  
  allResults.forEach(result => {
    const status = result.failed === 0 ? '✅' : '❌';
    log(`${status} ${result.name}: ${result.passed} passed, ${result.failed} failed`);
  });
  
  log(`\nDetailed report saved to: ${reportPath}`, 'cyan');
  
  return report;
}

async function runCriticalPathTests(baseUrl) {
  info('Running critical path tests (essential user journeys)...');
  
  try {
    // Run a subset of critical tests
    executeCommand(`npx playwright test --grep="(login|add to cart|checkout|AI assistant)"`, {
      env: { 
        ...process.env, 
        BASE_URL: baseUrl 
      }
    });
    
    success('Critical path tests completed');
    return true;
    
  } catch (err) {
    error('Critical path tests failed');
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:4028';
  const environment = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'development';
  const criticalOnly = args.includes('--critical-only');
  
  log('🧪 Starting User Flow Testing', 'magenta');
  log(`Environment: ${environment}`, 'cyan');
  log(`Base URL: ${baseUrl}`, 'cyan');
  
  try {
    // Validate test environment
    const isValid = await validateTestEnvironment(baseUrl);
    if (!isValid) {
      error('Test environment validation failed');
      process.exit(1);
    }
    
    if (criticalOnly) {
      // Run only critical path tests
      const success = await runCriticalPathTests(baseUrl);
      if (!success) {
        process.exit(1);
      }
      success('Critical path tests completed successfully');
      return;
    }
    
    // Run comprehensive user flow tests
    const allResults = [];
    
    // Run all test suites
    allResults.push(await runAuthenticationTests(baseUrl));
    allResults.push(await runMarketplaceTests(baseUrl));
    allResults.push(await runCartTests(baseUrl));
    allResults.push(await runAIAssistantTests(baseUrl));
    
    // Generate comprehensive report
    const report = generateTestReport(allResults, baseUrl);
    
    // Determine overall success
    const hasFailures = allResults.some(result => result.failed > 0);
    
    if (hasFailures) {
      error('Some user flow tests failed');
      process.exit(1);
    } else {
      success('🎉 All user flow tests passed!');
    }
    
  } catch (err) {
    error(`User flow testing failed: ${err.message}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  error(`Unhandled promise rejection: ${err.message}`);
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}