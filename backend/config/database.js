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

export { supabaseAdmin, supabaseClient };