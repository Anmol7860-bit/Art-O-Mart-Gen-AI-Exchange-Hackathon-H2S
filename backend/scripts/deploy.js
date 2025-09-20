/**
 * Automated Deployment Script
 * 
 * Handles deployment to various platforms (Render, Railway, Fly.io)
 * with environment validation, health checks, and rollback capabilities.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

class DeploymentManager {
  constructor() {
    this.platforms = ['render', 'railway', 'fly'];
    this.requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GOOGLE_GEMINI_API_KEY',
      'JWT_SECRET'
    ];
  }

  /**
   * Main deployment orchestrator
   */
  async deploy(platform, options = {}) {
    try {
      console.log(`🚀 Starting deployment to ${platform}...`);
      
      // Pre-deployment checks
      await this.preDeploymentChecks();
      
      // Platform-specific deployment
      let deploymentResult;
      switch (platform) {
        case 'render':
          deploymentResult = await this.deployToRender(options);
          break;
        case 'railway':
          deploymentResult = await this.deployToRailway(options);
          break;
        case 'fly':
          deploymentResult = await this.deployToFly(options);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      // Post-deployment verification
      await this.postDeploymentChecks(deploymentResult);
      
      console.log(`✅ Deployment to ${platform} completed successfully!`);
      return deploymentResult;
      
    } catch (error) {
      console.error(`❌ Deployment to ${platform} failed:`, error.message);
      
      if (options.rollback) {
        console.log('🔄 Initiating rollback...');
        await this.rollback(platform, options);
      }
      
      throw error;
    }
  }

  /**
   * Pre-deployment validation checks
   */
  async preDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');
    
    // Check if we're in the right directory
    if (!existsSync('package.json')) {
      throw new Error('package.json not found. Run this script from the project root.');
    }
    
    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '18.0.0';
    if (!this.isVersionCompatible(nodeVersion.slice(1), requiredVersion)) {
      throw new Error(`Node.js ${requiredVersion} or higher required. Current: ${nodeVersion}`);
    }
    
    // Run tests
    console.log('🧪 Running tests...');
    try {
      execSync('npm test', { stdio: 'pipe' });
      console.log('✅ All tests passed');
    } catch (error) {
      throw new Error('Tests failed. Deployment aborted.');
    }
    
    // Check environment variables
    this.validateEnvironmentVariables();
    
    // Check dependencies
    console.log('📦 Checking dependencies...');
    try {
      execSync('npm audit --audit-level=high', { stdio: 'pipe' });
      console.log('✅ No high-severity vulnerabilities found');
    } catch (error) {
      console.warn('⚠️  Security vulnerabilities detected. Consider updating dependencies.');
    }
    
    // Build the application
    console.log('🏗️  Building application...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Build completed successfully');
    } catch (error) {
      throw new Error('Build failed. Deployment aborted.');
    }
  }

  /**
   * Deploy to Render
   */
  async deployToRender(options) {
    console.log('🎨 Deploying to Render...');
    
    if (!existsSync('render.yaml')) {
      throw new Error('render.yaml configuration file not found');
    }
    
    try {
      // Use Render CLI or API for deployment
      const result = execSync('render deploy --service-id $RENDER_SERVICE_ID', {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      const deployUrl = this.extractDeployUrl(result, 'render');
      
      return {
        platform: 'render',
        url: deployUrl,
        timestamp: new Date().toISOString(),
        version: this.getVersion()
      };
      
    } catch (error) {
      throw new Error(`Render deployment failed: ${error.message}`);
    }
  }

  /**
   * Deploy to Railway
   */
  async deployToRailway(options) {
    console.log('🚂 Deploying to Railway...');
    
    if (!existsSync('railway.json')) {
      throw new Error('railway.json configuration file not found');
    }
    
    try {
      // Check if Railway CLI is installed
      execSync('railway --version', { stdio: 'pipe' });
      
      // Deploy using Railway CLI
      const result = execSync('railway up', {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      const deployUrl = this.extractDeployUrl(result, 'railway');
      
      return {
        platform: 'railway',
        url: deployUrl,
        timestamp: new Date().toISOString(),
        version: this.getVersion()
      };
      
    } catch (error) {
      if (error.message.includes('railway: command not found')) {
        throw new Error('Railway CLI not installed. Run: npm install -g @railway/cli');
      }
      throw new Error(`Railway deployment failed: ${error.message}`);
    }
  }

  /**
   * Deploy to Fly.io
   */
  async deployToFly(options) {
    console.log('🪰 Deploying to Fly.io...');
    
    if (!existsSync('fly.toml')) {
      throw new Error('fly.toml configuration file not found');
    }
    
    if (!existsSync('Dockerfile')) {
      throw new Error('Dockerfile not found. Fly.io requires Docker for deployment.');
    }
    
    try {
      // Check if Fly CLI is installed
      execSync('fly version', { stdio: 'pipe' });
      
      // Deploy using Fly CLI
      const result = execSync('fly deploy', {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      const deployUrl = this.extractDeployUrl(result, 'fly');
      
      return {
        platform: 'fly',
        url: deployUrl,
        timestamp: new Date().toISOString(),
        version: this.getVersion()
      };
      
    } catch (error) {
      if (error.message.includes('fly: command not found')) {
        throw new Error('Fly CLI not installed. Visit: https://fly.io/docs/getting-started/installing-flyctl/');
      }
      throw new Error(`Fly.io deployment failed: ${error.message}`);
    }
  }

  /**
   * Post-deployment verification
   */
  async postDeploymentChecks(deploymentResult) {
    console.log('🔍 Running post-deployment checks...');
    
    if (!deploymentResult.url) {
      throw new Error('Deployment URL not available for health check');
    }
    
    // Wait for deployment to be ready
    console.log('⏳ Waiting for deployment to be ready...');
    await this.sleep(30000); // Wait 30 seconds
    
    // Health check
    console.log('🏥 Performing health check...');
    const healthCheckPassed = await this.performHealthCheck(deploymentResult.url);
    
    if (!healthCheckPassed) {
      throw new Error('Health check failed. Deployment may not be working correctly.');
    }
    
    // API endpoint tests
    console.log('🧪 Testing API endpoints...');
    await this.testApiEndpoints(deploymentResult.url);
    
    console.log('✅ Post-deployment checks completed successfully');
  }

  /**
   * Perform health check on deployed application
   */
  async performHealthCheck(baseUrl, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        
        if (response.ok) {
          const healthData = await response.json();
          console.log('✅ Health check passed:', healthData);
          return true;
        }
        
        console.log(`⚠️  Health check attempt ${i + 1} failed. Status: ${response.status}`);
        
      } catch (error) {
        console.log(`⚠️  Health check attempt ${i + 1} failed:`, error.message);
      }
      
      if (i < retries - 1) {
        await this.sleep(10000); // Wait 10 seconds between retries
      }
    }
    
    return false;
  }

  /**
   * Test critical API endpoints
   */
  async testApiEndpoints(baseUrl) {
    const endpoints = [
      { path: '/api/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/agents/status', method: 'GET', expectedStatus: [200, 401] }, // May require auth
      { path: '/api/products', method: 'GET', expectedStatus: [200, 401] }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method
        });
        
        const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
          ? endpoint.expectedStatus 
          : [endpoint.expectedStatus];
        
        if (expectedStatuses.includes(response.status)) {
          console.log(`✅ ${endpoint.path} - Status: ${response.status}`);
        } else {
          console.warn(`⚠️  ${endpoint.path} - Unexpected status: ${response.status}`);
        }
        
      } catch (error) {
        console.warn(`⚠️  ${endpoint.path} - Error:`, error.message);
      }
    }
  }

  /**
   * Rollback deployment
   */
  async rollback(platform, options) {
    console.log(`🔄 Rolling back ${platform} deployment...`);
    
    try {
      switch (platform) {
        case 'render':
          // Render rollback logic
          execSync('render rollback --service-id $RENDER_SERVICE_ID', { stdio: 'inherit' });
          break;
          
        case 'railway':
          // Railway rollback logic
          execSync('railway rollback', { stdio: 'inherit' });
          break;
          
        case 'fly':
          // Fly.io rollback logic
          execSync('fly rollback', { stdio: 'inherit' });
          break;
      }
      
      console.log('✅ Rollback completed successfully');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables() {
    console.log('🔐 Validating environment variables...');
    
    const missing = [];
    const weak = [];
    
    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar];
      
      if (!value) {
        missing.push(envVar);
      } else if (this.isWeakSecret(envVar, value)) {
        weak.push(envVar);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    if (weak.length > 0) {
      console.warn(`⚠️  Weak secrets detected: ${weak.join(', ')}. Consider using stronger values.`);
    }
    
    console.log('✅ Environment variables validated');
  }

  /**
   * Check if a secret is weak
   */
  isWeakSecret(name, value) {
    if (name === 'JWT_SECRET' && (value.length < 32 || value === 'your-secret-key')) {
      return true;
    }
    
    // Add more weak secret checks as needed
    return false;
  }

  /**
   * Extract deployment URL from CLI output
   */
  extractDeployUrl(output, platform) {
    const urlPatterns = {
      render: /https:\/\/[a-zA-Z0-9.-]+\.render\.com/,
      railway: /https:\/\/[a-zA-Z0-9.-]+\.railway\.app/,
      fly: /https:\/\/[a-zA-Z0-9.-]+\.fly\.dev/
    };
    
    const pattern = urlPatterns[platform];
    if (!pattern) return null;
    
    const match = output.match(pattern);
    return match ? match[0] : null;
  }

  /**
   * Get current version from package.json
   */
  getVersion() {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Check version compatibility
   */
  isVersionCompatible(current, required) {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;
      
      if (currentPart > requiredPart) return true;
      if (currentPart < requiredPart) return false;
    }
    
    return true;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Command Line Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const platform = args[0];
  
  if (!platform) {
    console.error('Usage: node deploy.js <platform> [options]');
    console.error('Platforms: render, railway, fly');
    console.error('Options: --rollback, --skip-tests');
    process.exit(1);
  }
  
  const options = {
    rollback: args.includes('--rollback'),
    skipTests: args.includes('--skip-tests')
  };
  
  const deployment = new DeploymentManager();
  
  try {
    const result = await deployment.deploy(platform, options);
    console.log('\n🎉 Deployment Summary:');
    console.log(`Platform: ${result.platform}`);
    console.log(`URL: ${result.url}`);
    console.log(`Version: ${result.version}`);
    console.log(`Timestamp: ${result.timestamp}`);
    
  } catch (error) {
    console.error('\n💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DeploymentManager;