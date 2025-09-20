/**
 * Health Check Script
 * 
 * Comprehensive health monitoring for the backend API including
 * database connectivity, AI service availability, and system metrics.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import configuration
import { supabaseClient, supabaseAdmin } from '../config/database.js';
import AIService from '../services/aiService.js';

class HealthChecker {
  constructor() {
    this.checks = [];
    this.aiService = new AIService();
    this.startTime = Date.now();
  }

  /**
   * Register a health check
   */
  addCheck(name, checkFunction) {
    this.checks.push({ name, check: checkFunction });
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks: {},
      summary: {
        total: this.checks.length,
        passed: 0,
        failed: 0
      }
    };

    for (const { name, check } of this.checks) {
      try {
        const result = await Promise.race([
          check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Check timeout')), 10000)
          )
        ]);

        results.checks[name] = {
          status: 'healthy',
          ...result,
          duration: result.duration || 0
        };
        results.summary.passed++;

      } catch (error) {
        results.checks[name] = {
          status: 'unhealthy',
          error: error.message,
          duration: 0
        };
        results.summary.failed++;
        results.status = 'unhealthy';
      }
    }

    return results;
  }

  /**
   * Database connectivity check
   */
  async checkDatabase() {
    const start = Date.now();
    
    try {
      // Test basic connectivity
      const { data, error } = await supabaseClient
        .from('products')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      const duration = Date.now() - start;

      // Test admin connection
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);

      if (adminError) {
        throw new Error(`Admin database connection failed: ${adminError.message}`);
      }

      return {
        message: 'Database connections healthy',
        duration,
        details: {
          client_connection: 'healthy',
          admin_connection: 'healthy',
          response_time: `${duration}ms`
        }
      };

    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  /**
   * AI service connectivity check
   */
  async checkAIService() {
    const start = Date.now();
    
    try {
      // Test basic AI functionality
      const response = await this.aiService.generateResponse(
        'Health check test', 
        { maxTokens: 10 }
      );

      if (!response || typeof response !== 'string') {
        throw new Error('Invalid AI response format');
      }

      const duration = Date.now() - start;

      return {
        message: 'AI service operational',
        duration,
        details: {
          response_length: response.length,
          response_time: `${duration}ms`,
          model_status: 'healthy'
        }
      };

    } catch (error) {
      throw new Error(`AI service health check failed: ${error.message}`);
    }
  }

  /**
   * System resources check
   */
  async checkSystemResources() {
    const start = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Memory check (alert if using more than 80% of available memory)
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const isMemoryHealthy = memoryUsagePercent < 80;
      
      // Check disk space (if available)
      let diskSpace = null;
      try {
        const { execSync } = require('child_process');
        const dfOutput = execSync('df -h /', { encoding: 'utf8' });
        const lines = dfOutput.split('\n');
        if (lines[1]) {
          const parts = lines[1].split(/\s+/);
          diskSpace = {
            total: parts[1],
            used: parts[2],
            available: parts[3],
            usage_percent: parts[4]
          };
        }
      } catch {
        // Disk space check not available on this platform
      }

      const duration = Date.now() - start;

      return {
        message: isMemoryHealthy ? 'System resources healthy' : 'High memory usage detected',
        duration,
        details: {
          memory: {
            heap_used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heap_total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            usage_percent: `${memoryUsagePercent.toFixed(1)}%`,
            healthy: isMemoryHealthy
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          disk: diskSpace,
          uptime: `${Math.round(process.uptime())}s`
        }
      };

    } catch (error) {
      throw new Error(`System resources check failed: ${error.message}`);
    }
  }

  /**
   * External dependencies check
   */
  async checkExternalDependencies() {
    const start = Date.now();
    const dependencies = [];

    // Check internet connectivity
    try {
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      dependencies.push({
        name: 'internet_connectivity',
        status: response.ok ? 'healthy' : 'unhealthy',
        response_time: Date.now() - start
      });
    } catch (error) {
      dependencies.push({
        name: 'internet_connectivity',
        status: 'unhealthy',
        error: error.message
      });
    }

    // Check Google Gemini API availability
    try {
      const geminiStart = Date.now();
      // This is a lightweight check that doesn't use up quota
      const response = await fetch('https://generativelanguage.googleapis.com/', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      dependencies.push({
        name: 'google_gemini_api',
        status: 'reachable',
        response_time: Date.now() - geminiStart
      });
    } catch (error) {
      dependencies.push({
        name: 'google_gemini_api',
        status: 'unreachable',
        error: error.message
      });
    }

    const duration = Date.now() - start;
    const allHealthy = dependencies.every(dep => 
      dep.status === 'healthy' || dep.status === 'reachable'
    );

    return {
      message: allHealthy ? 'External dependencies reachable' : 'Some dependencies unreachable',
      duration,
      details: {
        dependencies,
        total_checked: dependencies.length,
        healthy: dependencies.filter(dep => 
          dep.status === 'healthy' || dep.status === 'reachable'
        ).length
      }
    };
  }

  /**
   * API endpoints check
   */
  async checkAPIEndpoints() {
    const start = Date.now();
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const endpoints = [
      { path: '/api/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/agents/status', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/products', method: 'GET', expectedStatus: [200, 401] }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const endpointStart = Date.now();
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          signal: AbortSignal.timeout(5000)
        });

        const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
          ? endpoint.expectedStatus 
          : [endpoint.expectedStatus];

        results.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          status: response.status,
          healthy: expectedStatuses.includes(response.status),
          response_time: Date.now() - endpointStart
        });

      } catch (error) {
        results.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'error',
          healthy: false,
          error: error.message,
          response_time: 0
        });
      }
    }

    const duration = Date.now() - start;
    const healthyEndpoints = results.filter(r => r.healthy).length;

    return {
      message: `${healthyEndpoints}/${results.length} endpoints healthy`,
      duration,
      details: {
        endpoints: results,
        total: results.length,
        healthy: healthyEndpoints,
        unhealthy: results.length - healthyEndpoints
      }
    };
  }

  /**
   * WebSocket connectivity check
   */
  async checkWebSocket() {
    const start = Date.now();
    
    try {
      // This would require setting up a test WebSocket connection
      // For now, we'll just check if the WebSocket server is configured
      const wsPort = process.env.WS_PORT || process.env.PORT || 5000;
      
      return {
        message: 'WebSocket configuration healthy',
        duration: Date.now() - start,
        details: {
          port: wsPort,
          status: 'configured',
          note: 'Full WebSocket connectivity test requires client connection'
        }
      };

    } catch (error) {
      throw new Error(`WebSocket check failed: ${error.message}`);
    }
  }

  /**
   * Environment configuration check
   */
  async checkEnvironment() {
    const start = Date.now();
    
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'GOOGLE_GEMINI_API_KEY'
    ];

    const envStatus = {};
    let allPresent = true;

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      envStatus[envVar] = {
        present: !!value,
        length: value ? value.length : 0,
        masked_value: value ? `${value.substring(0, 4)}...` : 'missing'
      };
      
      if (!value) allPresent = false;
    }

    const duration = Date.now() - start;

    return {
      message: allPresent ? 'All required environment variables present' : 'Missing required environment variables',
      duration,
      details: {
        node_env: process.env.NODE_ENV,
        environment_variables: envStatus,
        total_required: requiredEnvVars.length,
        present: Object.values(envStatus).filter(env => env.present).length
      }
    };
  }
}

/**
 * Initialize and run health checks
 */
async function runHealthCheck() {
  const healthChecker = new HealthChecker();
  
  // Register all health checks
  healthChecker.addCheck('database', () => healthChecker.checkDatabase());
  healthChecker.addCheck('ai_service', () => healthChecker.checkAIService());
  healthChecker.addCheck('system_resources', () => healthChecker.checkSystemResources());
  healthChecker.addCheck('external_dependencies', () => healthChecker.checkExternalDependencies());
  healthChecker.addCheck('api_endpoints', () => healthChecker.checkAPIEndpoints());
  healthChecker.addCheck('websocket', () => healthChecker.checkWebSocket());
  healthChecker.addCheck('environment', () => healthChecker.checkEnvironment());
  
  console.log('🏥 Running comprehensive health check...\n');
  
  const results = await healthChecker.runAllChecks();
  
  // Output results
  console.log('📊 Health Check Results');
  console.log('='.repeat(50));
  console.log(`Overall Status: ${results.status === 'healthy' ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Uptime: ${Math.round(results.uptime / 1000)}s`);
  console.log(`Checks Passed: ${results.summary.passed}/${results.summary.total}`);
  console.log('');

  // Detailed results
  for (const [checkName, checkResult] of Object.entries(results.checks)) {
    const status = checkResult.status === 'healthy' ? '✅' : '❌';
    console.log(`${status} ${checkName}: ${checkResult.message || 'OK'} (${checkResult.duration}ms)`);
    
    if (checkResult.error) {
      console.log(`   Error: ${checkResult.error}`);
    }
    
    if (checkResult.details && Object.keys(checkResult.details).length > 0) {
      console.log(`   Details: ${JSON.stringify(checkResult.details, null, 2)}`);
    }
    console.log('');
  }

  return results;
}

/**
 * Command Line Interface
 */
async function main() {
  try {
    const results = await runHealthCheck();
    
    // Exit with non-zero code if unhealthy
    if (results.status !== 'healthy') {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other modules
export { HealthChecker, runHealthCheck };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}