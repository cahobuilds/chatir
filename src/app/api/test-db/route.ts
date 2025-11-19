import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/test-db - Test database connectivity
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test 1: Check environment variables
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          url: !!supabaseUrl,
          anonKey: !!supabaseAnonKey,
        },
      }, { status: 500 });
    }

    // Clean up URL - remove any trailing whitespace/newlines
    supabaseUrl = supabaseUrl.trim();

    // Test 2: Try to get current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Test 3: Try a simple database query
    const { data: tenants, error: dbError } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(1);

    return NextResponse.json({
      success: true,
      environment: {
        supabaseUrl: supabaseUrl,
        urlLength: supabaseUrl.length,
        urlHasNewline: supabaseUrl.includes('\n'),
        urlValid: supabaseUrl.startsWith('https://'),
        hasAnonKey: !!supabaseAnonKey,
      },
      auth: {
        user: user ? { id: user.id, email: user.email } : null,
        authError: authError?.message || null,
      },
      database: {
        connected: !dbError,
        error: dbError?.message || null,
        tenantsFound: tenants?.length || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

