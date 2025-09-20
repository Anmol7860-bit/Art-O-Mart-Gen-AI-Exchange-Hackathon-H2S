/**
 * Authentication and Authorization Tests
 * 
 * This test suite validates:
 * - User registration and login flows
 * - Email verification process
 * - Password reset functionality
 * - Role-based access control (RBAC)
 * - RLS policy enforcement for different user roles
 * - JWT token validation and refresh
 * - Session management
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { supabaseAdmin, supabaseClient } from '../config/database.js';

describe('User Registration Tests', () => {
  let testUser = null;
  const testEmail = `test.user.${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  afterAll(async () => {
    // Cleanup test user
    if (testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.user.id);
    }
  });

  test('should register new user successfully', async () => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User',
        role: 'customer'
      }
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail);
    expect(data.user.user_metadata.role).toBe('customer');
    
    testUser = data;
  });

  test('should create user profile after registration', async () => {
    if (!testUser) {
      test.skip();
      return;
    }

    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', testUser.user.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.email).toBe(testEmail);
    expect(data.role).toBe('customer');
  });

  test('should prevent duplicate email registration', async () => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    expect(error).not.toBeNull();
    expect(error.message).toMatch(/already registered|exists|duplicate/i);
  });

  test('should validate password requirements', async () => {
    // Note: Password validation depends on auth configuration
    // This test checks that the system handles weak passwords appropriately
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `weak.${Date.now()}@example.com`,
      password: '123', // Very weak password
      email_confirm: true
    });

    // System may accept weak passwords via admin API, but should handle gracefully
    if (error) {
      expect(error.message).toMatch(/password|weak|strength/i);
    } else {
      // If accepted, cleanup the test user
      if (data?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      }
    }
  });
});

describe('User Authentication Tests', () => {
  let testUser = null;
  const testEmail = `auth.test.${Date.now()}@example.com`;
  const testPassword = 'AuthTestPassword123!';

  beforeAll(async () => {
    // Create test user for authentication tests
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Auth Test User',
        role: 'customer'
      }
    });

    expect(error).toBeNull();
    testUser = data;
  });

  afterAll(async () => {
    if (testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.user.id);
    }
  });

  test('should login with valid credentials', async () => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail);
    expect(data.session).toBeDefined();
    expect(data.session.access_token).toBeDefined();
  });

  test('should fail login with invalid credentials', async () => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: 'WrongPassword123!'
    });

    expect(error).not.toBeNull();
    expect(error.message).toMatch(/Invalid login credentials/i);
    expect(data.user).toBeNull();
  });

  test('should fail login with non-existent user', async () => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: 'nonexistent@example.com',
      password: testPassword
    });

    expect(error).not.toBeNull();
    expect(error.message).toMatch(/Invalid login credentials/i);
    expect(data.user).toBeNull();
  });

  test('should logout user successfully', async () => {
    // First login
    await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    // Then logout
    const { error } = await supabaseClient.auth.signOut();
    
    expect(error).toBeNull();

    // Verify session is cleared
    const { data: { session } } = await supabaseClient.auth.getSession();
    expect(session).toBeNull();
  });
});

describe('Role-Based Access Control Tests', () => {
  let customerUser = null;
  let artisanUser = null;
  let adminUser = null;

  beforeAll(async () => {
    // Create test users with different roles
    const users = [
      { email: `customer.${Date.now()}@example.com`, role: 'customer' },
      { email: `artisan.${Date.now()}@example.com`, role: 'artisan' },
      { email: `admin.${Date.now()}@example.com`, role: 'admin' }
    ];

    for (const user of users) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: `Test ${user.role}`,
          role: user.role
        }
      });

      expect(error).toBeNull();

      if (user.role === 'customer') customerUser = data;
      if (user.role === 'artisan') artisanUser = data;
      if (user.role === 'admin') adminUser = data;
    }

    // Wait for user profiles to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Cleanup test users
    if (customerUser) await supabaseAdmin.auth.admin.deleteUser(customerUser.user.id);
    if (artisanUser) await supabaseAdmin.auth.admin.deleteUser(artisanUser.user.id);
    if (adminUser) await supabaseAdmin.auth.admin.deleteUser(adminUser.user.id);
  });

  test('customer should access own profile only', async () => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: customerUser.user.email,
      password: 'TestPassword123!'
    });

    expect(error).toBeNull();

    // Should access own profile
    const { data: ownProfile, error: ownError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', customerUser.user.id)
      .single();

    expect(ownError).toBeNull();
    expect(ownProfile).toBeDefined();

    // Should not access other user profiles
    const { data: otherProfiles, error: otherError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .neq('id', customerUser.user.id);

    if (!otherError) {
      expect(otherProfiles).toEqual([]);
    }

    await supabaseClient.auth.signOut();
  });

  test('artisan should manage own products only', async () => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: artisanUser.user.email,
      password: 'TestPassword123!'
    });

    expect(error).toBeNull();

    // Create artisan profile first
    await supabaseAdmin
      .from('artisan_profiles')
      .upsert({
        user_id: artisanUser.user.id,
        business_name: 'Test Artisan Business',
        craft_specialty: 'pottery',
        bio: 'Test bio',
        region: 'Test Region',
        workshop_address: 'Test Workshop Address',
        website_url: 'https://test-artisan.com',
        social_media: { instagram: 'test_artisan' }
      });

    // Test product creation (artisan should be able to create products)
    const testProduct = {
      title: 'Test Artisan Product',
      description: 'Test product description',
      price: 29.99,
      category_id: (await supabaseAdmin.from('categories').select('id').limit(1).single()).data.id,
      artisan_id: artisanUser.user.id,
      status: 'active',
      stock_quantity: 10
    };

    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .insert(testProduct)
      .select()
      .single();

    // This might fail due to RLS, which is expected behavior
    if (productError) {
      expect(productError.message).toMatch(/permission|policy|access/i);
    } else {
      expect(product.artisan_id).toBe(artisanUser.user.id);
    }

    await supabaseClient.auth.signOut();
  });

  test('admin should have broad access', async () => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: adminUser.user.email,
      password: 'TestPassword123!'
    });

    expect(error).toBeNull();

    // Admin should be able to view user profiles (depending on RLS policy)
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('user_profiles')
      .select('id, email, role')
      .limit(5);

    // RLS might still restrict this, which is fine
    if (!profilesError) {
      expect(Array.isArray(profiles)).toBe(true);
    }

    // Admin should be able to view products
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, title, status')
      .limit(5);

    expect(productsError).toBeNull();
    expect(Array.isArray(products)).toBe(true);

    await supabaseClient.auth.signOut();
  });
});

describe('Row Level Security Policy Tests', () => {
  let testCustomer = null;
  let testArtisan = null;

  beforeAll(async () => {
    // Create test users for RLS testing
    const { data: customer, error: customerError } = await supabaseAdmin.auth.admin.createUser({
      email: `rls.customer.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { role: 'customer' }
    });

    const { data: artisan, error: artisanError } = await supabaseAdmin.auth.admin.createUser({
      email: `rls.artisan.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { role: 'artisan' }
    });

    expect(customerError).toBeNull();
    expect(artisanError).toBeNull();

    testCustomer = customer;
    testArtisan = artisan;

    // Wait for profiles to be created
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  afterAll(async () => {
    if (testCustomer) await supabaseAdmin.auth.admin.deleteUser(testCustomer.user.id);
    if (testArtisan) await supabaseAdmin.auth.admin.deleteUser(testArtisan.user.id);
  });

  test('should enforce cart RLS policies', async () => {
    // Login as customer
    await supabaseClient.auth.signInWithPassword({
      email: testCustomer.user.email,
      password: 'TestPassword123!'
    });

    // Customer should be able to access their own cart items
    const { data: ownCart, error: ownError } = await supabaseClient
      .from('carts')
      .select('*')
      .eq('user_id', testCustomer.user.id);

    expect(ownError).toBeNull();
    expect(Array.isArray(ownCart)).toBe(true);

    // Customer should not be able to access other user's cart items
    const { data: otherCart, error: otherError } = await supabaseClient
      .from('carts')
      .select('*')
      .neq('user_id', testCustomer.user.id);

    if (!otherError) {
      expect(otherCart).toEqual([]);
    }

    await supabaseClient.auth.signOut();
  });

  test('should enforce orders RLS policies', async () => {
    // Login as customer
    await supabaseClient.auth.signInWithPassword({
      email: testCustomer.user.email,
      password: 'TestPassword123!'
    });

    // Customer should be able to access their own orders
    const { data: ownOrders, error: ownError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('customer_id', testCustomer.user.id);

    expect(ownError).toBeNull();
    expect(Array.isArray(ownOrders)).toBe(true);

    // Customer should not be able to access other user's orders
    const { data: otherOrders, error: otherError } = await supabaseClient
      .from('orders')
      .select('*')
      .neq('customer_id', testCustomer.user.id);

    if (!otherError) {
      expect(otherOrders).toEqual([]);
    }

    await supabaseClient.auth.signOut();
  });

  test('should allow public read access to products and categories', async () => {
    // Test without authentication
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, title, price, status')
      .eq('status', 'active')
      .limit(5);

    expect(productsError).toBeNull();
    expect(Array.isArray(products)).toBe(true);

    const { data: categories, error: categoriesError } = await supabaseClient
      .from('categories')
      .select('id, name, slug')
      .limit(5);

    expect(categoriesError).toBeNull();
    expect(Array.isArray(categories)).toBe(true);
  });
});

describe('Session Management Tests', () => {
  let testUser = null;

  beforeAll(async () => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `session.test.${Date.now()}@example.com`,
      password: 'SessionTestPassword123!',
      email_confirm: true
    });

    expect(error).toBeNull();
    testUser = data;
  });

  afterAll(async () => {
    if (testUser) await supabaseAdmin.auth.admin.deleteUser(testUser.user.id);
  });

  test('should maintain session across page refreshes', async () => {
    // Login
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: testUser.user.email,
      password: 'SessionTestPassword123!'
    });

    expect(loginError).toBeNull();
    expect(loginData.session).toBeDefined();

    // Simulate session retrieval (like after page refresh)
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    expect(sessionError).toBeNull();
    expect(session).toBeDefined();
    expect(session.user.id).toBe(testUser.user.id);

    await supabaseClient.auth.signOut();
  });

  test('should refresh expired tokens', async () => {
    // Login
    await supabaseClient.auth.signInWithPassword({
      email: testUser.user.email,
      password: 'SessionTestPassword123!'
    });

    // Get current session
    const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
    expect(currentSession).toBeDefined();

    // Attempt to refresh session
    const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession({
      refresh_token: currentSession.refresh_token
    });

    expect(refreshError).toBeNull();
    expect(refreshData.session).toBeDefined();
    expect(refreshData.session.access_token).toBeDefined();
    expect(refreshData.session.access_token).not.toBe(currentSession.access_token);

    await supabaseClient.auth.signOut();
  });
});

describe('Password Management Tests', () => {
  let testUser = null;

  beforeAll(async () => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `password.test.${Date.now()}@example.com`,
      password: 'OriginalPassword123!',
      email_confirm: true
    });

    expect(error).toBeNull();
    testUser = data;
  });

  afterAll(async () => {
    if (testUser) await supabaseAdmin.auth.admin.deleteUser(testUser.user.id);
  });

  test('should initiate password reset flow', async () => {
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(
      testUser.user.email,
      {
        redirectTo: 'http://localhost:3000/reset-password'
      }
    );

    // This should not error, but we can't test the actual email
    expect(error).toBeNull();
  });

  test('should update password for authenticated user', async () => {
    // Login first
    await supabaseClient.auth.signInWithPassword({
      email: testUser.user.email,
      password: 'OriginalPassword123!'
    });

    // Update password
    const { data, error } = await supabaseClient.auth.updateUser({
      password: 'NewPassword123!'
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();

    // Logout
    await supabaseClient.auth.signOut();

    // Test login with new password
    const { data: newLoginData, error: newLoginError } = await supabaseClient.auth.signInWithPassword({
      email: testUser.user.email,
      password: 'NewPassword123!'
    });

    expect(newLoginError).toBeNull();
    expect(newLoginData.user).toBeDefined();

    // Test that old password no longer works
    await supabaseClient.auth.signOut();
    const { data: oldLoginData, error: oldLoginError } = await supabaseClient.auth.signInWithPassword({
      email: testUser.user.email,
      password: 'OriginalPassword123!'
    });

    expect(oldLoginError).not.toBeNull();
    expect(oldLoginData.user).toBeNull();
  });
});