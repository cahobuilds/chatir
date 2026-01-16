import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Helper to create a timeout promise
function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);
}

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const pathname = request.nextUrl.pathname;

  // Early returns for public routes that don't need auth
  if (
    pathname.startsWith('/api/widget/') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/auth/forgot-password') ||
    pathname.startsWith('/auth/reset-password') ||
    pathname === '/' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  // Only check auth for routes that actually need it
  const needsAuth =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/signup');

  if (!needsAuth) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Missing Supabase environment variables');
    // For protected routes, redirect to login if env vars are missing
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Clean up URL - remove any trailing whitespace/newlines that might cause issues
  supabaseUrl = supabaseUrl.trim();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get user with timeout to prevent hanging
  let user = null;
  try {
    const getUserPromise = supabase.auth.getUser();
    const result = await timeoutPromise(getUserPromise, 3000); // 3 second timeout
    user = result.data?.user ?? null;
  } catch (error) {
    // If auth check times out or fails, log but don't block
    console.error('[Middleware] Auth check failed or timed out:', error);
    // For protected routes, redirect to login on timeout
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    // For auth pages, allow through
    return supabaseResponse;
  }

  // Protect admin routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if ((pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup')) && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

