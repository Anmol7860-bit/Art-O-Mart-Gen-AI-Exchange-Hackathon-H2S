/**
 * Jest Setup - runs after Jest environment is set up but before tests
 * 
 * This file is executed once per test file and provides:
 * - Common test utilities
 * - Environment variable validation
 * - Test database connection verification
 * - Global test configurations
 */

import { jest } from '@jest/globals';
import { getDatabaseInfo } from '../config/database.js';

// Set longer timeout for database operations
jest.setTimeout(30000);

// Verify database connection before running tests
beforeAll(async () => {
  console.log('🔧 Setting up test environment...');
  
  // Check required environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure your .env file contains all required Supabase credentials.'
    );
  }

  // Verify database connection
  try {
    const dbInfo = await getDatabaseInfo();
    
    if (!dbInfo.connected) {
      throw new Error(`Database connection failed: ${dbInfo.error}`);
    }
    
    console.log('✅ Database connection verified');
    console.log(`📊 Database health: ${JSON.stringify(dbInfo.health, null, 2)}`);
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    throw error;
  }
});

// Global test utilities
global.testUtils = {
  // Generate unique test data
  generateUniqueEmail: () => `test.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@example.com`,
  generateUniqueString: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Wait utility
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Common test data generators
  generateTestProduct: (overrides = {}) => ({
    name: global.testUtils.generateUniqueString('Product'),
    description: 'Test product description',
    price: Math.floor(Math.random() * 100) + 10,
    stock_quantity: Math.floor(Math.random() * 50) + 1,
    status: 'active',
    ...overrides
  }),

  generateTestUser: (overrides = {}) => ({
    email: global.testUtils.generateUniqueEmail(),
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User',
      role: 'customer',
      ...overrides.user_metadata
    },
    ...overrides
  }),

  generateTestCategory: (overrides = {}) => ({
    name: global.testUtils.generateUniqueString('Category'),
    slug: global.testUtils.generateUniqueString('category').toLowerCase(),
    description: 'Test category description',
    ...overrides
  })
};

console.log('✅ Test setup completed successfully');