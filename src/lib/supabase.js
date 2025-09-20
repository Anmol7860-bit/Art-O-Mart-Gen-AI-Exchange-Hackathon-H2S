import { createClient } from '@supabase/supabase-js';
import { shouldUseMockData } from '../utils/envValidator.js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

/**
 * Mock Supabase client for development/testing
 * Used when VITE_MOCK_DATA=true or when Supabase credentials are missing
 * 
 * To enable mock mode:
 * 1. Set VITE_MOCK_DATA=true in your .env file, OR
 * 2. Leave VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY empty/missing
 * 
 * Mock mode returns stubbed data for all database operations
 */
const createMockSupabaseClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback) => {
      // Call callback immediately with no session
      callback('SIGNED_OUT', null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  },
  from: (table) => ({
    select: () => ({
      eq: () => ({ data: [], error: null }),
      neq: () => ({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve) => resolve({ data: [], error: null })
    }),
    insert: () => Promise.resolve({ data: [], error: null }),
    update: () => Promise.resolve({ data: [], error: null }),
    delete: () => Promise.resolve({ data: [], error: null }),
    upsert: () => Promise.resolve({ data: [], error: null })
  }),
  rpc: () => Promise.resolve({ data: null, error: null }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      remove: () => Promise.resolve({ data: [], error: null })
    })
  }
});

/**
 * Create and export the Supabase client
 * 
 * Uses mock client when:
 * - VITE_MOCK_DATA=true is set in environment
 * - Supabase credentials are missing or invalid
 * 
 * Otherwise creates real Supabase client with provided credentials
 */
export const supabase = (() => {
  // Use mock client if explicitly enabled or credentials are missing
  if (shouldUseMockData() || !supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'https://placeholder.supabase.co' || 
      supabaseAnonKey === 'placeholder-key') {
    
    console.info('🔧 Using mock Supabase client - set proper credentials in .env for real database');
    return createMockSupabaseClient();
  }
  
  // Create real Supabase client with provided credentials
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    }
  });
})();
