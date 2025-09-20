import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Assert that service key is present for admin operations
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_KEY is required for backend operations. ' +
    'Get your service_role key from Supabase Dashboard > Settings > API. ' +
    'This key has admin privileges - keep it secure and never expose it to clients!'
  );
}

// Create Supabase client with service role key for backend operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create Supabase client for user operations
const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Test helper function to clear authentication state
 * Call this between tests to ensure clean state
 */
export const clearAuthState = async () => {
  await supabaseClient.auth.signOut();
};

/**
 * Test helper function to create a temporary test user
 * Returns user data that can be used in tests
 */
export const createTestUser = async (userData = {}) => {
  const defaultUserData = {
    email: `test.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User',
      role: 'customer'
    }
  };

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    ...defaultUserData,
    ...userData
  });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Test helper function to delete a test user
 */
export const deleteTestUser = async (userId) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
};

/**
 * Test helper function to get database connection info
 */
export const getDatabaseInfo = async () => {
  try {
    const { data, error } = await supabaseAdmin.rpc('health_check');
    
    if (error) {
      throw error;
    }

    return {
      connected: true,
      health: data,
      url: process.env.SUPABASE_URL
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      url: process.env.SUPABASE_URL
    };
  }
};

export { supabaseAdmin, supabaseClient };