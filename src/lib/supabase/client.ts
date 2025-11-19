import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      anonKey: !!supabaseAnonKey,
    });
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (error) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
    throw new Error('Invalid Supabase URL format. Expected format: https://xxxxx.supabase.co');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

