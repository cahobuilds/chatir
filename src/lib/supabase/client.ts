import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      anonKey: !!supabaseAnonKey,
    });
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }

  // Clean up URL - remove any trailing whitespace/newlines that might cause issues
  supabaseUrl = supabaseUrl.trim();

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (error) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
    throw new Error('Invalid Supabase URL format. Expected format: https://xxxxx.supabase.co');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

