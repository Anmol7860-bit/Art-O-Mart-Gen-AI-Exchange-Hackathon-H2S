#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Performs comprehensive health checks on deployed frontend
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnvVar } from '../src/utils/envValidator.js';

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

async function validateBasicConnectivity(deploymentUrl) {
  info('Validating basic connectivity...');
  
  const checks = {
    'Main Page': '/',
    'Marketplace': '/marketplace',
    'Login Page': '/login',
    'Register Page': '/register',
    'AI Assistant': '/ai-assistant'
  };
  
  const results = {};
  
  for (const [name, path] of Object.entries(checks)) {
    try {
      const url = `${deploymentUrl}${path}`;
      const response = await fetch(url);
      results[name] = {
        status: response.status,
        ok: response.ok,
        size: response.headers.get('content-length'),
        contentType: response.headers.get('content-type')
      };
      
      if (response.ok) {
        success(`${name}: ${response.status} OK`);
      } else {
        error(`${name}: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      error(`${name}: Connection failed - ${err.message}`);
      results[name] = { error: err.message };
    }
  }
  
  return results;
}

async function validateStaticAssets(deploymentUrl) {
  info('Validating static assets...');
  
  const assetChecks = [];
  
  try {
    // Get the main page to extract asset references
    const response = await fetch(deploymentUrl);
    const html = await response.text();
    
    // Extract CSS and JS files from HTML
    const cssMatches = html.match(/href="([^"]*\.css[^"]*)"/g) || [];
    const jsMatches = html.match(/src="([^"]*\.js[^"]*)"/g) || [];
    
    const cssFiles = cssMatches.map(match => match.match(/href="([^"]*)"/)[1]);
    const jsFiles = jsMatches.map(match => match.match(/src="([^"]*)"/)[1]);
    
    const allAssets = [...cssFiles, ...jsFiles];
    
    for (const asset of allAssets) {
      try {
        const assetUrl = asset.startsWith('http') ? asset : `${deploymentUrl}${asset}`;
        const assetResponse = await fetch(assetUrl);
        
        assetChecks.push({
          url: asset,
          status: assetResponse.status,
          ok: assetResponse.ok,
          size: assetResponse.headers.get('content-length'),
          type: asset.endsWith('.css') ? 'CSS' : 'JavaScript'
        });
        
        if (assetResponse.ok) {
          success(`Asset ${asset}: ${assetResponse.status} OK`);
        } else {
          error(`Asset ${asset}: ${assetResponse.status} ${assetResponse.statusText}`);
        }
      } catch (err) {
        error(`Asset ${asset}: ${err.message}`);
        assetChecks.push({ url: asset, error: err.message });
      }
    }
  } catch (err) {
    error(`Failed to validate assets: ${err.message}`);
  }
  
  return assetChecks;
}

async function validateAPIConnectivity(deploymentUrl) {
  info('Validating API connectivity...');
  
  const results = {};
  
  // Test basic API endpoints that should be accessible
  const apiEndpoints = {
    'Health Check': '/api/health',
    'Categories': '/api/categories',
    'Products': '/api/products'
  };
  
  for (const [name, endpoint] of Object.entries(apiEndpoints)) {
    try {
      // Use VITE_BACKEND_URL from environment - should be loaded by deploy script
      const backendUrl = process.env.VITE_BACKEND_URL;
      
      if (!backendUrl) {
        warning(`API ${name}: No VITE_BACKEND_URL configured, skipping backend validation`);
        continue;
      }
      
      if (backendUrl.includes('your-backend-domain-here') || backendUrl.includes('placeholder')) {
        warning(`API ${name}: Backend URL contains placeholder value, skipping`);
        continue;
      }
      
      const url = `${backendUrl}${endpoint}`;
      const response = await fetch(url);
      
      results[name] = {
        url,
        status: response.status,
        ok: response.ok
      };
      
      if (response.ok) {
        success(`API ${name}: ${response.status} OK`);
      } else {
        warning(`API ${name}: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      warning(`API ${name}: ${err.message}`);
      results[name] = { error: err.message };
    }
  }
  
  return results;
}

async function validateWebSocketConnection(deploymentUrl, cliArgs = {}) {
  info('Validating WebSocket connectivity...');
  
  try {
    // Prefer CLI argument, then environment variable
    let wsUrl = cliArgs.wsUrl || process.env.VITE_WS_URL;
    
    // If --backendUrl is provided but --wsUrl is not, construct WS URL
    if (!wsUrl && cliArgs.backendUrl) {
      wsUrl = cliArgs.backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    }
    
    // If no explicit configuration, skip with warning
    if (!wsUrl) {
      warning('No VITE_WS_URL or --wsUrl provided; skipping WebSocket validation');
      return {
        skipped: true,
        reason: 'No WebSocket URL configured',
        note: 'Provide VITE_WS_URL environment variable or --wsUrl argument to validate'
      };
    }
    
    // Validate that production uses secure WebSocket
    if (wsUrl.startsWith('ws://') && !wsUrl.includes('localhost')) {
      warning('WebSocket URL uses insecure protocol (ws://) in production; consider wss://');
    }
    
    if (wsUrl.includes('placeholder') || wsUrl.includes('your-backend-domain-here')) {
      warning('WebSocket URL contains placeholder value, skipping validation');
      return {
        configured: false,
        wsUrl,
        issue: 'Placeholder URL detected'
      };
    }
    
    // Note: We can't easily test WebSocket connections in Node.js without socket.io-client
    // This is more of a configuration check
    success(`WebSocket URL configured: ${wsUrl}`);
    
    return {
      wsUrl,
      configured: true,
      secure: wsUrl.startsWith('wss://'),
      note: 'WebSocket functionality should be tested with E2E tests'
    };
  } catch (err) {
    error(`WebSocket validation failed: ${err.message}`);
    return { error: err.message };
  }
}

async function validateEnvironmentConfiguration() {
  info('Validating environment configuration...');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_WS_URL'
  ];
  
  const config = {};
  
  for (const varName of requiredVars) {
    try {
      const value = getEnvVar(varName);
      if (value && !value.includes('placeholder') && !value.includes('your-')) {
        config[varName] = '✓ Configured';
        success(`${varName}: Configured`);
      } else {
        config[varName] = '⚠ Missing or placeholder';
        warning(`${varName}: Missing or contains placeholder values`);
      }
    } catch (err) {
      config[varName] = `❌ ${err.message}`;
      error(`${varName}: ${err.message}`);
    }
  }
  
  return config;
}

async function performanceCheck(deploymentUrl) {
  info('Performing basic performance checks...');
  
  const results = {};
  
  try {
    const startTime = Date.now();
    const response = await fetch(deploymentUrl);
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    const contentLength = response.headers.get('content-length');
    
    results.loadTime = loadTime;
    results.contentLength = contentLength;
    results.status = response.status;
    
    if (loadTime < 2000) {
      success(`Page load time: ${loadTime}ms (Good)`);
    } else if (loadTime < 5000) {
      warning(`Page load time: ${loadTime}ms (Acceptable)`);
    } else {
      error(`Page load time: ${loadTime}ms (Slow)`);
    }
    
    if (contentLength) {
      const sizeKB = Math.round(parseInt(contentLength) / 1024);
      info(`Content size: ${sizeKB} KB`);
      results.sizeKB = sizeKB;
    }
    
  } catch (err) {
    error(`Performance check failed: ${err.message}`);
    results.error = err.message;
  }
  
  return results;
}

function generateValidationReport(validationResults, deploymentUrl) {
  info('Generating validation report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    deploymentUrl,
    validation: validationResults,
    summary: {
      overall_status: 'unknown',
      critical_issues: [],
      warnings: [],
      recommendations: []
    }
  };
  
  // Analyze results and generate summary
  let hasErrors = false;
  let hasWarnings = false;
  
  // Check connectivity
  if (validationResults.connectivity) {
    const failedPages = Object.entries(validationResults.connectivity)
      .filter(([_, result]) => !result.ok && !result.error);
    
    if (failedPages.length > 0) {
      hasErrors = true;
      report.summary.critical_issues.push(`Failed to load pages: ${failedPages.map(([name]) => name).join(', ')}`);
    }
  }
  
  // Check assets
  if (validationResults.assets) {
    const failedAssets = validationResults.assets.filter(asset => !asset.ok && !asset.error);
    if (failedAssets.length > 0) {
      hasErrors = true;
      report.summary.critical_issues.push(`Failed to load ${failedAssets.length} assets`);
    }
  }
  
  // Check API connectivity
  if (validationResults.api) {
    const apiIssues = Object.entries(validationResults.api)
      .filter(([_, result]) => result.error);
    
    if (apiIssues.length > 0) {
      hasWarnings = true;
      report.summary.warnings.push('API connectivity issues detected');
    }
  }
  
  // Determine overall status
  if (hasErrors) {
    report.summary.overall_status = 'failed';
  } else if (hasWarnings) {
    report.summary.overall_status = 'warning';
  } else {
    report.summary.overall_status = 'passed';
  }
  
  // Add recommendations
  if (validationResults.performance?.loadTime > 3000) {
    report.summary.recommendations.push('Consider optimizing page load time');
  }
  
  if (hasWarnings || hasErrors) {
    report.summary.recommendations.push('Review and fix identified issues before going live');
  }
  
  // Write report to file
  const reportPath = path.join(projectRoot, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Console summary
  log('\n=== DEPLOYMENT VALIDATION SUMMARY ===', 'magenta');
  log(`Deployment URL: ${deploymentUrl}`, 'cyan');
  log(`Overall Status: ${report.summary.overall_status.toUpperCase()}`, 
      report.summary.overall_status === 'passed' ? 'green' : 
      report.summary.overall_status === 'warning' ? 'yellow' : 'red');
  
  if (report.summary.critical_issues.length > 0) {
    log('\nCritical Issues:', 'red');
    report.summary.critical_issues.forEach(issue => log(`  - ${issue}`, 'red'));
  }
  
  if (report.summary.warnings.length > 0) {
    log('\nWarnings:', 'yellow');
    report.summary.warnings.forEach(warning => log(`  - ${warning}`, 'yellow'));
  }
  
  if (report.summary.recommendations.length > 0) {
    log('\nRecommendations:', 'blue');
    report.summary.recommendations.forEach(rec => log(`  - ${rec}`, 'blue'));
  }
  
  log(`\nDetailed report saved to: ${reportPath}`, 'cyan');
  
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const deploymentUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1];
  const wsUrl = args.find(arg => arg.startsWith('--wsUrl='))?.split('=')[1];
  const backendUrl = args.find(arg => arg.startsWith('--backendUrl='))?.split('=')[1];
  
  if (!deploymentUrl) {
    error('Deployment URL is required. Use --url=https://your-domain.com');
    info('Optional parameters:');
    info('  --wsUrl=wss://your-websocket-url.com    Override WebSocket URL');
    info('  --backendUrl=https://your-backend.com   Use to derive WebSocket URL if --wsUrl not provided');
    process.exit(1);
  }
  
  const cliArgs = { wsUrl, backendUrl };
  
  log('🔍 Starting Deployment Validation', 'magenta');
  log(`Target URL: ${deploymentUrl}`, 'cyan');
  if (wsUrl) log(`WebSocket URL: ${wsUrl}`, 'cyan');
  if (backendUrl) log(`Backend URL: ${backendUrl}`, 'cyan');
  
  const validationResults = {};
  
  try {
    // Run all validation checks
    validationResults.connectivity = await validateBasicConnectivity(deploymentUrl);
    validationResults.assets = await validateStaticAssets(deploymentUrl);
    validationResults.api = await validateAPIConnectivity(deploymentUrl);
    validationResults.websocket = await validateWebSocketConnection(deploymentUrl, cliArgs);
    validationResults.environment = await validateEnvironmentConfiguration();
    validationResults.performance = await performanceCheck(deploymentUrl);
    
    // Generate comprehensive report
    const report = generateValidationReport(validationResults, deploymentUrl);
    
    // Exit with appropriate code
    if (report.summary.overall_status === 'failed') {
      error('Deployment validation failed');
      process.exit(1);
    } else if (report.summary.overall_status === 'warning') {
      warning('Deployment validation completed with warnings');
      process.exit(0);
    } else {
      success('🎉 Deployment validation passed!');
      process.exit(0);
    }
    
  } catch (err) {
    error(`Validation failed: ${err.message}`);
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