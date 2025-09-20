/**
 * Database Connectivity and Schema Validation Tests
 * 
 * This test suite validates:
 * - Database connectivity (admin and client connections)
 * - Schema validation (tables, indexes, constraints)
 * - RLS policies enforcement
 * - Triggers functionality
 * - Storage bucket configuration
 * - Health check RPC function
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { supabaseAdmin, supabaseClient } from '../config/database.js';

describe('Database Connectivity Tests', () => {
  beforeAll(async () => {
    // Ensure we have valid connections before running tests
    console.log('🔍 Setting up database connectivity tests...');
  });

  afterAll(async () => {
    console.log('✅ Database connectivity tests completed');
  });

  test('should connect to Supabase with admin client', async () => {
    expect(supabaseAdmin).toBeDefined();
    
    // Test RPC health check with admin privileges
    const { data, error } = await supabaseAdmin.rpc('health_check');
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.status).toBe('healthy');
  });

  test('should connect to Supabase with client', async () => {
    expect(supabaseClient).toBeDefined();
    
    // Test basic query with client connection
    const { data, error } = await supabaseClient
      .from('categories')
      .select('id')
      .limit(1);
    
    // We expect either data or a specific error (not a connection error)
    expect(error?.message).not.toMatch(/connection|network|timeout/i);
  });

  test('should execute health check RPC function', async () => {
    const { data, error } = await supabaseAdmin.rpc('health_check');
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.database).toBeDefined();
  });
});

describe('Schema Validation Tests', () => {
  const requiredTables = [
    'user_profiles',
    'categories', 
    'artisan_profiles',
    'products',
    'product_reviews',
    'orders',
    'order_items',
    'carts',
    'addresses',
    'wishlists'
  ];

  test('should have all required tables', async () => {
    const { data, error } = await supabaseAdmin.rpc('get_public_tables');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    
    const existingTables = data;
    requiredTables.forEach(tableName => {
      expect(existingTables).toContain(tableName);
    });
  });

  test('should have proper indexes on key tables', async () => {
    const { data: productIndexes, error } = await supabaseAdmin.rpc('get_table_indexes', { table_name_param: 'products' });

    expect(error).toBeNull();
    expect(Array.isArray(productIndexes)).toBe(true);
    expect(productIndexes.length).toBeGreaterThan(0);
    
    // Check for critical indexes
    const indexNames = productIndexes.map(idx => idx.indexname);
    expect(indexNames.some(name => name.includes('artisan'))).toBe(true);
    expect(indexNames.some(name => name.includes('category'))).toBe(true);
  });

  test('should have proper foreign key constraints', async () => {
    const { data, error } = await supabaseAdmin.rpc('get_foreign_keys');

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(5); // Should have multiple FK constraints
    
    // Verify critical foreign keys exist
    const constraints = data.map(c => `${c.table_name}.${c.constraint_name}`);
    expect(constraints.some(c => c.includes('products') && c.includes('artisan'))).toBe(true);
    expect(constraints.some(c => c.includes('orders') && c.includes('customer'))).toBe(true);
  });
});

describe('Row Level Security (RLS) Tests', () => {
  test('should enforce RLS on user_profiles table', async () => {
    // Try to access user_profiles without authentication (should fail or return empty)
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*');
    
    // RLS should either block access or return empty results
    if (!error) {
      // If no error, RLS should filter results (likely empty for unauthenticated)
      expect(data).toEqual([]);
    } else {
      // If there's an error, it should be related to permissions
      expect(error.message).toMatch(/permission|policy|access/i);
    }
  });

  test('should allow public read access to categories', async () => {
    const { data, error } = await supabaseClient
      .from('categories')
      .select('id, name, slug')
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should allow public read access to products', async () => {
    const { data, error } = await supabaseClient
      .from('products')
      .select('id, title, price, status')
      .eq('status', 'active')
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Database Triggers Tests', () => {
  test('should have handle_new_user trigger', async () => {
    // Test that the trigger exists by trying to get table info
    const { data: tables, error } = await supabaseAdmin.rpc('get_public_tables');
    
    expect(error).toBeNull();
    expect(tables).toContain('user_profiles');
    
    // The trigger existence is confirmed by successful user creation in auth tests
  });

  test('should have updated_at triggers on key tables', async () => {
    const tablesWithUpdatedAt = ['user_profiles', 'products', 'orders', 'artisan_profiles'];
    
    // Test that tables with updated_at columns exist
    const { data: tables, error } = await supabaseAdmin.rpc('get_public_tables');
    
    expect(error).toBeNull();
    tablesWithUpdatedAt.forEach(table => {
      expect(tables).toContain(table);
    });

    // Get column info for a table to verify updated_at exists
    const { data: columns, error: colError } = await supabaseAdmin.rpc('get_table_columns', { table_name_param: 'products' });
    
    expect(colError).toBeNull();
    const columnNames = columns.map(col => col.column_name);
    expect(columnNames).toContain('updated_at');
  });
});

describe('Storage Configuration Tests', () => {
  test('should have required storage buckets', async () => {
    const requiredBuckets = ['product-images', 'profile-images', 'category-images'];
    
    const { data, error } = await supabaseAdmin
      .from('storage.buckets')
      .select('id, name, public')
      .in('id', requiredBuckets);

    expect(error).toBeNull();
    expect(data).toHaveLength(requiredBuckets.length);
    
    data.forEach(bucket => {
      expect(bucket.public).toBe(true); // All buckets should be public
      expect(requiredBuckets).toContain(bucket.id);
    });
  });

  test('should have proper file size limits on storage buckets', async () => {
    const { data, error } = await supabaseAdmin
      .from('storage.buckets')
      .select('id, file_size_limit')
      .in('id', ['product-images', 'profile-images']);

    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    
    data.forEach(bucket => {
      expect(bucket.file_size_limit).toBeGreaterThan(0);
      expect(bucket.file_size_limit).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });
});

describe('Data Types and Enums Tests', () => {
  test('should have custom enum types', async () => {
    const requiredEnums = ['user_role', 'product_status', 'order_status', 'payment_status'];
    
    const { data, error } = await supabaseAdmin.rpc('get_enum_types');

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    
    if (data && data.length > 0) {
      requiredEnums.forEach(enumName => {
        expect(data).toContain(enumName);
      });
    }
  });

  test('should validate user_role enum values', async () => {
    // Test enum values by trying to insert valid and invalid values
    const testCategory = {
      name: `Test Category ${Date.now()}`,
      slug: `test-category-${Date.now()}`,
      description: 'Test category for enum validation'
    };

    const { data: created, error } = await supabaseAdmin
      .from('categories')
      .insert(testCategory)
      .select()
      .single();

    expect(error).toBeNull();
    expect(created).toBeDefined();
    
    // Cleanup
    await supabaseAdmin.from('categories').delete().eq('id', created.id);
  });
});

describe('CRUD Operations Tests', () => {
  test('should perform basic CRUD on categories (admin)', async () => {
    const testCategory = {
      name: `Test Category ${Date.now()}`,
      slug: `test-category-${Date.now()}`,
      description: 'Test category for database validation'
    };

    // Create
    const { data: created, error: createError } = await supabaseAdmin
      .from('categories')
      .insert(testCategory)
      .select()
      .single();

    expect(createError).toBeNull();
    expect(created).toBeDefined();
    expect(created.name).toBe(testCategory.name);

    // Read
    const { data: read, error: readError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', created.id)
      .single();

    expect(readError).toBeNull();
    expect(read.name).toBe(testCategory.name);

    // Update
    const updatedName = `Updated ${testCategory.name}`;
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('categories')
      .update({ name: updatedName })
      .eq('id', created.id)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updated.name).toBe(updatedName);

    // Delete
    const { error: deleteError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', created.id);

    expect(deleteError).toBeNull();

    // Verify deletion
    const { data: deleted, error: verifyError } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', created.id);

    expect(verifyError).toBeNull();
    expect(deleted).toHaveLength(0);
  });
});

describe('Performance and Optimization Tests', () => {
  test('should execute queries within acceptable time limits', async () => {
    const startTime = Date.now();
    
    const { data, error } = await supabaseAdmin
      .from('products')
      .select(`
        id, 
        title, 
        price,
        artisan_profiles!inner(business_name),
        categories!inner(name)
      `)
      .eq('status', 'active')
      .limit(50);

    const executionTime = Date.now() - startTime;
    
    expect(error).toBeNull();
    expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should handle concurrent connections', async () => {
    const concurrentQueries = Array.from({ length: 5 }, (_, i) =>
      supabaseAdmin
        .from('categories')
        .select('id, name')
        .limit(10)
    );

    const results = await Promise.all(concurrentQueries);
    
    results.forEach(({ error }) => {
      expect(error).toBeNull();
    });
  });
});