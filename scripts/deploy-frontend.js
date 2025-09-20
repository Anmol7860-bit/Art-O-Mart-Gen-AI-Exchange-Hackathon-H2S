#!/usr/bin/env node

/**
 * Frontend Deployment Orchestration Script
 * Handles deployment to Vercel, Netlify, or AWS with validation and health checks
 */

import { execSync, spawn } from 'child_process';
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
  white: '\x1b[37m',
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
    process.exit(1);
  }
}

async function validateEnvironment() {
  info('Validating environment variables...');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_WS_URL'
  ];
  
  const missing = [];
  
  for (const varName of requiredVars) {
    try {
      const value = getEnvVar(varName);
      if (!value || value.includes('placeholder') || value.includes('your-')) {
        missing.push(varName);
      }
    } catch (err) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    error('Missing or invalid environment variables:');
    missing.forEach(varName => error(`  - ${varName}`));
    error('Please configure your environment variables before deployment.');
    process.exit(1);
  }
  
  success('Environment variables validated successfully');
}

async function runTests(testType = 'all') {
  info(`Running ${testType} tests...`);
  
  const testCommands = {
    unit: 'npm run test:unit',
    integration: 'npm run test:integration', 
    e2e: 'npm run test:e2e',
    all: 'npm run test:all'
  };
  
  try {
    if (testType === 'all') {
      // Run unit and integration tests
      executeCommand('npm run test:unit');
      executeCommand('npm run test:integration');
      info('Skipping E2E tests during build (run separately for deployed app)');
    } else {
      executeCommand(testCommands[testType]);
    }
    success(`${testType} tests completed successfully`);
  } catch (err) {
    error(`Tests failed: ${err.message}`);
    process.exit(1);
  }
}

async function buildApplication() {
  info('Building application for production...');
  
  // Clean previous build
  if (fs.existsSync(path.join(projectRoot, 'dist'))) {
    executeCommand('rm -rf dist');
  }
  
  // Build the application
  executeCommand('npm run build');
  
  // Verify build output
  const distPath = path.join(projectRoot, 'dist');
  if (!fs.existsSync(distPath)) {
    error('Build failed: dist directory not found');
    process.exit(1);
  }
  
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    error('Build failed: index.html not found in dist directory');
    process.exit(1);
  }
  
  success('Application built successfully');
}

async function deployToVercel() {
  info('Deploying to Vercel...');
  
  try {
    // Check if vercel CLI is installed
    executeCommand('which vercel', { stdio: 'pipe' });
  } catch {
    error('Vercel CLI not found. Install with: npm install -g vercel');
    process.exit(1);
  }
  
  // Deploy to Vercel
  executeCommand('vercel --prod --yes');
  success('Deployed to Vercel successfully');
}

async function deployToNetlify() {
  info('Deploying to Netlify...');
  
  try {
    // Check if netlify CLI is installed
    executeCommand('which netlify', { stdio: 'pipe' });
  } catch {
    error('Netlify CLI not found. Install with: npm install -g netlify-cli');
    process.exit(1);
  }
  
  // Deploy to Netlify
  executeCommand('netlify deploy --prod --dir=dist');
  success('Deployed to Netlify successfully');
}

async function deployToAWS() {
  info('Deploying to AWS S3 + CloudFront...');
  
  const s3Bucket = process.env.AWS_S3_BUCKET;
  const cloudFrontId = process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID;
  
  if (!s3Bucket) {
    error('AWS_S3_BUCKET environment variable not set');
    process.exit(1);
  }
  
  try {
    // Check if AWS CLI is installed
    executeCommand('which aws', { stdio: 'pipe' });
  } catch {
    error('AWS CLI not found. Install AWS CLI first.');
    process.exit(1);
  }
  
  // Sync to S3
  executeCommand(`aws s3 sync dist/ s3://${s3Bucket} --delete`);
  
  // Set cache headers
  executeCommand(`aws s3 cp dist/ s3://${s3Bucket}/ --recursive --exclude "*" --include "*.html" --cache-control "no-cache, no-store, must-revalidate"`);
  executeCommand(`aws s3 cp dist/ s3://${s3Bucket}/ --recursive --exclude "*" --include "*.js" --cache-control "public, max-age=31536000, immutable"`);
  executeCommand(`aws s3 cp dist/ s3://${s3Bucket}/ --recursive --exclude "*" --include "*.css" --cache-control "public, max-age=31536000, immutable"`);
  
  // Invalidate CloudFront if distribution ID provided
  if (cloudFrontId) {
    executeCommand(`aws cloudfront create-invalidation --distribution-id ${cloudFrontId} --paths "/*"`);
    success('CloudFront cache invalidated');
  }
  
  success('Deployed to AWS successfully');
}

async function validateDeployment(deploymentUrl) {
  if (!deploymentUrl) {
    warning('No deployment URL provided, skipping validation');
    return;
  }
  
  info(`Validating deployment at ${deploymentUrl}...`);
  
  try {
    // Basic health check
    const response = await fetch(deploymentUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    success('Deployment is accessible');
    
    // Run validation script
    executeCommand(`node scripts/validate-deployment.js --url=${deploymentUrl}`);
    
  } catch (err) {
    error(`Deployment validation failed: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || 'vercel';
  const skipTests = args.includes('--skip-tests');
  const deploymentUrl = args.find(arg => arg.startsWith('--url='))?.split('=')[1];
  
  log('🚀 Starting Frontend Deployment Process', 'magenta');
  log(`Platform: ${platform}`, 'cyan');
  
  try {
    // Step 1: Validate environment
    await validateEnvironment();
    
    // Step 2: Run tests (unless skipped)
    if (!skipTests) {
      await runTests('unit');
      await runTests('integration');
    } else {
      warning('Skipping tests (--skip-tests flag provided)');
    }
    
    // Step 3: Build application
    await buildApplication();
    
    // Step 4: Deploy to chosen platform
    switch (platform.toLowerCase()) {
      case 'vercel':
        await deployToVercel();
        break;
      case 'netlify':
        await deployToNetlify();
        break;
      case 'aws':
        await deployToAWS();
        break;
      default:
        error(`Unknown platform: ${platform}. Supported: vercel, netlify, aws`);
        process.exit(1);
    }
    
    // Step 5: Validate deployment
    if (deploymentUrl) {
      // Wait for deployment to be available
      info('Waiting 30 seconds for deployment to be available...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      await validateDeployment(deploymentUrl);
    }
    
    success('🎉 Deployment completed successfully!');
    
  } catch (err) {
    error(`Deployment failed: ${err.message}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  error(`Unhandled promise rejection: ${err.message}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  process.exit(1);
});

// Run the deployment script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;