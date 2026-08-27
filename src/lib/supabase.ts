import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'DEVELOPMENT ERROR: VITE_SUPABASE_URL is missing. Check your local environment variables.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'DEVELOPMENT ERROR: VITE_SUPABASE_PUBLISHABLE_KEY is missing. Check your local environment variables.'
  );
}

// Security guard: Ensure service-role keys are not leaked into VITE_ variables
if (supabaseAnonKey.includes('service_role') || supabaseAnonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6') && supabaseAnonKey.length > 200) {
  // A service_role JWT is typically longer than standard anon keys and contains different scopes.
  // We can warn the developer if they accidentally copy-pasted the wrong key.
  console.warn('SECURITY ALERT: The publishable key looks like a service role key. Ensure you are using the public anon key.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
