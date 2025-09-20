/**
 * Jest Global Setup - runs once before all test files
 * 
 * This file is executed once at the beginning of the test suite and provides:
 * - Initial environment validation
 * - Database health check
 * - Test data preparation
 * - Global test configuration
 */

import { getDatabaseInfo } from '../config/database.js';

export default async () => {
  console.log('🚀 Starting global test setup...');
  
  // Validate environment
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }

  // Log test configuration
  console.log(`📝 Running tests in ${process.env.NODE_ENV} environment`);
  console.log(`🔗 Database URL: ${process.env.SUPABASE_URL}`);

  // Perform global database health check
  try {
    const dbInfo = await getDatabaseInfo();
    
    if (!dbInfo.connected) {
      console.error('❌ Global database health check failed:', dbInfo.error);
      process.exit(1);
    }
    
    console.log('✅ Global database health check passed');
  } catch (error) {
    console.error('❌ Global database health check error:', error.message);
    process.exit(1);
  }

  console.log('✅ Global test setup completed');
};