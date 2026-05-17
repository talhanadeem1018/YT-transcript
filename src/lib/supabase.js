import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasValidSupabaseConfig =
  typeof supabaseUrl === 'string' &&
  /^https?:\/\//.test(supabaseUrl) &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 20;

export const supabase =
  hasValidSupabaseConfig
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
