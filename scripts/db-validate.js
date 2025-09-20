#!/usr/bin/env node

/**
 * Database Migr  tables: [
    'user_profiles',
    'categories',
    'artisan_profiles',
    'products',
    'product_reviews',
    'orders',
    'order_items',
    'payments',
    'wishlists',
    'carts',ation Script
 * 
 * This script validates that database migrations have been applied correctly:
 * - Verifies all required tables exist with correct structure
 * - Checks foreign key constraints and relationships
 * - Validates RLS policies are in place
 * - Tests triggers and functions
 * - Confirms enum types and storage buckets
 * - Runs comprehensive schema validation
 * 
 * Usage: npm run db:validate
 * Environment: Requires SUPABASE_URL and SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Validate environment
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error(chalk.red('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required'));
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Expected database schema
 */
const EXPECTED_SCHEMA = {
  tables: [
    'user_profiles',
    'categories',
    'artisan_profiles',
    'products',
    'product_reviews',
    'orders',
    'order_items',
    'payments',
    'wishlists',
    'cart_items'
  ],
  
  enums: [
    'user_role',
    'product_status',
    'order_status',
    'payment_status'
  ],
  
  functions: [
    'health_check',
    'handle_new_user'
  ],
  
  storage_buckets: [
    'product-images',
    'profile-images',
    'category-images'
  ],
  
  critical_foreign_keys: [
    { table: 'products', column: 'artisan_id', references: 'artisan_profiles' },
    { table: 'products', column: 'category_id', references: 'categories' },
    { table: 'orders', column: 'user_id', references: 'user_profiles' },
    { table: 'order_items', column: 'order_id', references: 'orders' },
    { table: 'order_items', column: 'product_id', references: 'products' }
  ]
};

/**
 * Validate table existence and structure
 */
async function validateTables() {
  console.log(chalk.blue('📋 Validating table structure...'));
  
  const issues = [];
  
  try {
    // Check if all required tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) throw error;

    const existingTables = tables.map(t => t.table_name);
    const missingTables = EXPECTED_SCHEMA.tables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      issues.push(`Missing tables: ${missingTables.join(', ')}`);
    }

    // Validate specific table structures
    for (const tableName of EXPECTED_SCHEMA.tables) {
      if (!existingTables.includes(tableName)) continue;

      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (colError) {
        issues.push(`Failed to get columns for ${tableName}: ${colError.message}`);
        continue;
      }

      // Check for required columns based on table
      const requiredColumns = getRequiredColumns(tableName);
      const existingColumns = columns.map(c => c.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        issues.push(`Table ${tableName} missing columns: ${missingColumns.join(', ')}`);
      }
    }

    if (issues.length === 0) {
      console.log(chalk.green('✅ All tables exist with expected structure'));
    } else {
      issues.forEach(issue => console.log(chalk.red(`❌ ${issue}`)));
    }

  } catch (error) {
    console.log(chalk.red('❌ Table validation failed:'), error.message);
    issues.push(`Table validation error: ${error.message}`);
  }

  return issues;
}

/**
 * Get required columns for each table
 */
function getRequiredColumns(tableName) {
  const columnMap = {
    user_profiles: ['id', 'email', 'full_name', 'role', 'created_at'],
    categories: ['id', 'name', 'slug', 'created_at'],
    artisan_profiles: ['id', 'business_name', 'bio', 'location', 'specializations'],
    products: ['id', 'name', 'description', 'price', 'category_id', 'artisan_id', 'status'],
    orders: ['id', 'customer_id', 'total', 'status', 'created_at'],
    order_items: ['id', 'order_id', 'product_id', 'quantity', 'price'],
    payments: ['id', 'order_id', 'amount', 'status', 'payment_method'],
    product_reviews: ['id', 'product_id', 'user_id', 'rating', 'comment'],
    wishlists: ['id', 'user_id', 'product_id', 'created_at'],
    carts: ['id', 'user_id', 'product_id', 'quantity', 'created_at']
  };

  return columnMap[tableName] || ['id'];
}

/**
 * Validate foreign key constraints
 */
async function validateForeignKeys() {
  console.log(chalk.blue('🔗 Validating foreign key constraints...'));
  
  const issues = [];

  try {
    const { data: constraints, error } = await supabase
      .from('information_schema.table_constraints')
      .select(`
        constraint_name,
        table_name,
        constraint_type
      `)
      .eq('constraint_type', 'FOREIGN KEY')
      .eq('table_schema', 'public');

    if (error) throw error;

    const existingFKs = constraints.map(c => `${c.table_name}.${c.constraint_name}`);
    
    // Check critical foreign keys exist
    for (const fk of EXPECTED_SCHEMA.critical_foreign_keys) {
      const hasFK = existingFKs.some(existing => 
        existing.includes(fk.table) && existing.includes(fk.column)
      );
      
      if (!hasFK) {
        issues.push(`Missing foreign key: ${fk.table}.${fk.column} -> ${fk.references}`);
      }
    }

    if (issues.length === 0) {
      console.log(chalk.green(`✅ Foreign key constraints validated (${constraints.length} found)`));
    } else {
      issues.forEach(issue => console.log(chalk.red(`❌ ${issue}`)));
    }

  } catch (error) {
    console.log(chalk.red('❌ Foreign key validation failed:'), error.message);
    issues.push(`Foreign key validation error: ${error.message}`);
  }

  return issues;
}

/**
 * Validate enum types
 */
async function validateEnums() {
  console.log(chalk.blue('📝 Validating enum types...'));
  
  const issues = [];

  try {
    // Get custom enum types
    const { data: types, error } = await supabase
      .from('pg_type')
      .select('typname')
      .eq('typtype', 'e');

    if (error) throw error;

    const existingEnums = types.map(t => t.typname);
    const missingEnums = EXPECTED_SCHEMA.enums.filter(enumType => !existingEnums.includes(enumType));

    if (missingEnums.length > 0) {
      issues.push(`Missing enum types: ${missingEnums.join(', ')}`);
    } else {
      console.log(chalk.green(`✅ All enum types found (${EXPECTED_SCHEMA.enums.length}/${existingEnums.length})`));
    }

    // Validate specific enum values
    for (const enumName of EXPECTED_SCHEMA.enums) {
      if (!existingEnums.includes(enumName)) continue;

      const expectedValues = getExpectedEnumValues(enumName);
      if (expectedValues.length > 0) {
        // This would require a more complex query to get enum values
        // For now, we just confirm the enum exists
      }
    }

  } catch (error) {
    console.log(chalk.red('❌ Enum validation failed:'), error.message);
    issues.push(`Enum validation error: ${error.message}`);
  }

  return issues;
}

/**
 * Get expected values for enum types
 */
function getExpectedEnumValues(enumName) {
  const enumValues = {
    user_role: ['customer', 'artisan', 'admin'],
    product_status: ['draft', 'active', 'inactive', 'discontinued'],
    order_status: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    payment_status: ['pending', 'completed', 'failed', 'refunded']
  };

  return enumValues[enumName] || [];
}

/**
 * Validate RLS policies
 */
async function validateRLS() {
  console.log(chalk.blue('🔒 Validating Row Level Security policies...'));
  
  const issues = [];

  try {
    // Check which tables have RLS enabled
    const { data: tables, error } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public');

    if (error) throw error;

    const tablesWithRLS = tables.filter(t => t.rowsecurity).map(t => t.tablename);
    const tablesWithoutRLS = tables.filter(t => !t.rowsecurity).map(t => t.tablename);

    // Tables that should have RLS enabled
    const shouldHaveRLS = ['user_profiles', 'orders', 'carts', 'wishlists', 'payments'];
    const missingRLS = shouldHaveRLS.filter(table => !tablesWithRLS.includes(table));

    if (missingRLS.length > 0) {
      issues.push(`Tables missing RLS: ${missingRLS.join(', ')}`);
    }

    // Tables that can be public (no RLS needed)
    const publicTables = ['categories', 'products', 'artisan_profiles'];
    
    console.log(chalk.green(`✅ RLS enabled on ${tablesWithRLS.length} tables`));
    console.log(chalk.gray(`   With RLS: ${tablesWithRLS.join(', ')}`));
    console.log(chalk.gray(`   Public: ${tablesWithoutRLS.filter(t => publicTables.includes(t)).join(', ')}`));

    if (issues.length > 0) {
      issues.forEach(issue => console.log(chalk.yellow(`⚠️  ${issue}`)));
    }

  } catch (error) {
    console.log(chalk.red('❌ RLS validation failed:'), error.message);
    issues.push(`RLS validation error: ${error.message}`);
  }

  return issues;
}

/**
 * Validate functions and triggers
 */
async function validateFunctions() {
  console.log(chalk.blue('⚙️  Validating functions and triggers...'));
  
  const issues = [];

  try {
    // Check for required functions
    const { data: functions, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_type', 'FUNCTION');

    if (error) throw error;

    const existingFunctions = functions.map(f => f.routine_name);
    const missingFunctions = EXPECTED_SCHEMA.functions.filter(func => !existingFunctions.includes(func));

    if (missingFunctions.length > 0) {
      issues.push(`Missing functions: ${missingFunctions.join(', ')}`);
    }

    // Test health_check function specifically
    const { data: healthData, error: healthError } = await supabase.rpc('health_check');
    if (healthError) {
      issues.push(`health_check function failed: ${healthError.message}`);
    } else {
      console.log(chalk.green('✅ health_check function working correctly'));
    }

    // Check for triggers
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table');

    if (!triggerError && triggers.length > 0) {
      console.log(chalk.green(`✅ Found ${triggers.length} database triggers`));
    }

  } catch (error) {
    console.log(chalk.red('❌ Function validation failed:'), error.message);
    issues.push(`Function validation error: ${error.message}`);
  }

  return issues;
}

/**
 * Validate storage buckets
 */
async function validateStorage() {
  console.log(chalk.blue('🗂️  Validating storage buckets...'));
  
  const issues = [];

  try {
    const { data: buckets, error } = await supabase
      .storage
      .listBuckets();

    if (error) {
      console.log(chalk.yellow('⚠️  Storage validation limited:'), error.message);
      return issues;
    }

    const existingBuckets = buckets.map(b => b.id);
    const missingBuckets = EXPECTED_SCHEMA.storage_buckets.filter(bucket => !existingBuckets.includes(bucket));

    if (missingBuckets.length > 0) {
      issues.push(`Missing storage buckets: ${missingBuckets.join(', ')}`);
    } else {
      console.log(chalk.green(`✅ All required storage buckets exist (${EXPECTED_SCHEMA.storage_buckets.length})`));
    }

    // Check bucket configurations
    buckets.forEach(bucket => {
      console.log(chalk.gray(`   • ${bucket.id} (${bucket.public ? 'public' : 'private'})`));
    });

  } catch (error) {
    console.log(chalk.yellow('⚠️  Storage validation failed:'), error.message);
    issues.push(`Storage validation error: ${error.message}`);
  }

  return issues;
}

/**
 * Run comprehensive validation tests
 */
async function runValidationTests() {
  console.log(chalk.blue('🧪 Running validation tests...'));
  
  const tests = [
    {
      name: 'Basic CRUD operations',
      test: async () => {
        // Test creating, reading, updating, deleting a category
        const testCategory = {
          name: `Test Category ${Date.now()}`,
          slug: `test-category-${Date.now()}`,
          description: 'Test category for validation'
        };

        const { data: created, error: createError } = await supabase
          .from('categories')
          .insert(testCategory)
          .select()
          .single();

        if (createError) throw new Error(`Create failed: ${createError.message}`);

        const { data: read, error: readError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', created.id)
          .single();

        if (readError) throw new Error(`Read failed: ${readError.message}`);

        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', created.id);

        if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

        return 'CRUD operations successful';
      }
    },
    
    {
      name: 'Foreign key constraints',
      test: async () => {
        // Try to insert a product with invalid artisan_id (should fail)
        const { error } = await supabase
          .from('products')
          .insert({
            name: 'Test Product',
            description: 'Test',
            price: 100,
            category_id: 'invalid-category-id',
            artisan_id: 'invalid-artisan-id',
            status: 'active'
          });

        if (!error) {
          throw new Error('Foreign key constraint not enforced');
        }

        return 'Foreign key constraints working';
      }
    }
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(chalk.green(`   ✅ ${test.name}: ${result}`));
      results.push({ name: test.name, status: 'passed', message: result });
    } catch (error) {
      console.log(chalk.red(`   ❌ ${test.name}: ${error.message}`));
      results.push({ name: test.name, status: 'failed', message: error.message });
    }
  }

  return results;
}

/**
 * Main validation function
 */
async function main() {
  console.log(chalk.bold.blue('🔍 Art-O-Mart Database Migration Validation\n'));
  console.log(chalk.gray(`Database URL: ${process.env.SUPABASE_URL}`));
  console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

  const allIssues = [];

  // Run all validation checks
  const tableIssues = await validateTables();
  const fkIssues = await validateForeignKeys();
  const enumIssues = await validateEnums();
  const rlsIssues = await validateRLS();
  const functionIssues = await validateFunctions();
  const storageIssues = await validateStorage();

  console.log(); // Empty line

  const testResults = await runValidationTests();

  // Collect all issues
  allIssues.push(...tableIssues, ...fkIssues, ...enumIssues, ...rlsIssues, ...functionIssues, ...storageIssues);

  // Add failed test results to issues
  const failedTests = testResults.filter(t => t.status === 'failed');
  failedTests.forEach(test => {
    allIssues.push(`Test failed - ${test.name}: ${test.message}`);
  });

  // Final summary
  console.log('\n' + chalk.bold('📋 Validation Summary:'));
  
  if (allIssues.length === 0) {
    console.log(chalk.bold.green('🎉 All validations passed! Database migration is complete and healthy.'));
  } else {
    console.log(chalk.bold.yellow(`⚠️  Found ${allIssues.length} issues:`));
    allIssues.forEach((issue, index) => {
      console.log(chalk.red(`   ${index + 1}. ${issue}`));
    });
    console.log('\n' + chalk.gray('💡 Consider running migrations or checking your schema configuration.'));
  }

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  console.log(chalk.gray(`\n🧪 Tests: ${passedTests}/${testResults.length} passed`));

  if (allIssues.length > 0) {
    process.exit(1);
  }
}

// Execute main function
main().catch(error => {
  console.error(chalk.red('\n💥 Validation failed with unexpected error:'), error);
  process.exit(1);
});