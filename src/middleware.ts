import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  getAppOrigin,
  getMarketingOrigin,
  getSiteRole,
  isAppPath,
  isMarketingPath,
} from '@/lib/site-role';

/**
 * Both Vercel projects build this whole repository, so each one can serve routes that
 * belong to the other half. This keeps every path on the domain that owns it, so the
 * marketing domain never exposes the product and neither domain publishes a duplicate
 * copy of the other's pages.
 *
 * The redirects are temporary (307) rather than permanent so a domain change during
 * setup can't be cached in visitors' browsers.
 */
function routeByRole(request: NextRequest) {
  const role = getSiteRole();
  if (role === 'both') return undefined;

  const pathname = request.nextUrl.pathname;
  const target = `${pathname}${request.nextUrl.search}`;

  if (role === 'marketing') {
    if (!isAppPath(pathname)) return undefined;

    // Cross-origin redirects of API calls fail CORS in ways that are hard to debug, so
    // the marketing domain simply doesn't answer for the API.
    const appOrigin = getAppOrigin();
    if (pathname.startsWith('/api') || !appOrigin) {
      return new NextResponse('Not found', { status: 404 });
    }
    return NextResponse.redirect(new URL(target, appOrigin), 307);
  }

  // The marketing home page owns "/" in this codebase. On the application domain the
  // bare URL keeps taking visitors into the product, as it did before marketing landed.
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (isMarketingPath(pathname)) {
    const marketingOrigin = getMarketingOrigin();
    // With no marketing domain configured yet, fall through and serve the page, so a
    // single-project deployment still works.
    if (marketingOrigin) return NextResponse.redirect(new URL(target, marketingOrigin), 307);
  }

  return undefined;
}

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

  // Framework internals and static assets need neither routing nor auth work.
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  const roleRedirect = routeByRole(request);
  if (roleRedirect) return roleRedirect;

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

