#!/usr/bin/env node

/**
 * Database Status Check Script
 * 
 * This script checks the health and status of the Supabase database:
 * - Connection validation
 * - Health check RPC execution
 * - Schema validation
 * - Migration status
 * - Table counts and statistics
 * 
 * Usage: npm run db:status
 * Environment: Requires SUPABASE_URL and SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Validate environment
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required'));
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Check basic database connection
 */
async function checkConnection() {
  console.log(chalk.blue('🔍 Checking database connection...'));
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log(chalk.green('✅ Database connection successful'));
    return true;
  } catch (error) {
    console.log(chalk.red('❌ Database connection failed:'), error.message);
    return false;
  }
}

/**
 * Execute health check RPC
 */
async function checkHealth() {
  console.log(chalk.blue('🏥 Running health check...'));
  
  try {
    const { data, error } = await supabase.rpc('health_check');

    if (error) {
      throw error;
    }

    console.log(chalk.green('✅ Health check passed'));
    console.log(chalk.gray('   Status:'), data.status);
    console.log(chalk.gray('   Version:'), data.version);
    console.log(chalk.gray('   Database:'), data.database);
    console.log(chalk.gray('   Timestamp:'), data.timestamp);
    
    return data;
  } catch (error) {
    console.log(chalk.red('❌ Health check failed:'), error.message);
    return null;
  }
}

/**
 * Validate database schema
 */
async function validateSchema() {
  console.log(chalk.blue('📋 Validating database schema...'));
  
  const requiredTables = [
    'user_profiles',
    'categories',
    'artisan_profiles', 
    'products',
    'product_reviews',
    'orders',
    'order_items',
    'payments',
    'wishlists',
    'carts'
  ];

  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      throw error;
    }

    const existingTables = data.map(table => table.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length === 0) {
      console.log(chalk.green('✅ All required tables exist'));
      console.log(chalk.gray(`   Found ${existingTables.length} total tables`));
    } else {
      console.log(chalk.yellow('⚠️  Some required tables are missing:'));
      missingTables.forEach(table => {
        console.log(chalk.red(`   - ${table}`));
      });
    }

    return {
      existingTables,
      missingTables,
      isComplete: missingTables.length === 0
    };
  } catch (error) {
    console.log(chalk.red('❌ Schema validation failed:'), error.message);
    return null;
  }
}

/**
 * Get table statistics
 */
async function getTableStats() {
  console.log(chalk.blue('📊 Collecting table statistics...'));
  
  const tables = [
    'user_profiles',
    'categories',
    'artisan_profiles',
    'products', 
    'orders',
    'product_reviews'
  ];

  const stats = {};
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        stats[table] = count || 0;
      }
    } catch (error) {
      stats[table] = 'Error';
    }
  }

  console.log(chalk.green('✅ Table statistics:'));
  Object.entries(stats).forEach(([table, count]) => {
    const color = count === 'Error' ? chalk.red : count === 0 ? chalk.yellow : chalk.green;
    console.log(color(`   ${table}: ${count}`));
  });

  return stats;
}

/**
 * Check storage buckets
 */
async function checkStorage() {
  console.log(chalk.blue('🗂️  Checking storage buckets...'));
  
  try {
    // Note: This requires service role key for full access
    // With anon key, we might get limited results
    const { data, error } = await supabase
      .storage
      .listBuckets();

    if (error) {
      console.log(chalk.yellow('⚠️  Storage check limited (requires service key):'), error.message);
      return null;
    }

    if (data && data.length > 0) {
      console.log(chalk.green('✅ Storage buckets found:'));
      data.forEach(bucket => {
        console.log(chalk.gray(`   - ${bucket.id} (${bucket.public ? 'public' : 'private'})`));
      });
    } else {
      console.log(chalk.yellow('⚠️  No storage buckets found'));
    }

    return data;
  } catch (error) {
    console.log(chalk.yellow('⚠️  Storage check failed:'), error.message);
    return null;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(chalk.bold.blue('🚀 Art-O-Mart Database Status Check\n'));
  console.log(chalk.gray(`Database URL: ${process.env.SUPABASE_URL}`));
  console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

  let allPassed = true;

  // Run all checks
  const connectionOk = await checkConnection();
  if (!connectionOk) allPassed = false;

  console.log(); // Empty line

  const healthData = await checkHealth();
  if (!healthData) allPassed = false;

  console.log(); // Empty line

  const schemaData = await validateSchema();
  if (!schemaData?.isComplete) allPassed = false;

  console.log(); // Empty line

  await getTableStats();

  console.log(); // Empty line

  await checkStorage();

  // Final summary
  console.log('\n' + chalk.bold('📋 Summary:'));
  if (allPassed) {
    console.log(chalk.bold.green('✅ All checks passed - Database is healthy!'));
  } else {
    console.log(chalk.bold.yellow('⚠️  Some issues found - Check details above'));
  }

  console.log('\n' + chalk.gray('💡 Tip: Run `npm run db:migrate` if tables are missing'));
  console.log(chalk.gray('💡 Tip: Run `npm run db:seed` to populate with test data'));
}

// Execute main function
main().catch(error => {
  console.error(chalk.red('\n💥 Unexpected error:'), error);
  process.exit(1);
});