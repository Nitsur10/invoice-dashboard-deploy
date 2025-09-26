import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Define protected routes
const protectedRoutes = ['/overview', '/invoices', '/kanban', '/dashboard', '/analytics', '/settings'];
const adminOnlyRoutes = ['/admin'];
const authRoutes = ['/auth/login', '/auth/register'];
const publicRoutes = ['/api/auth/create-users', '/api/debug-env', '/api/test-client'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/webhook') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next();
  }

  // Skip middleware for public API routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  // Get user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Middleware session error:', sessionError);
  }

  const isAuthenticated = Boolean(session);
  const userRole = session?.user?.user_metadata?.role || 'user';
  const userEmail = session?.user?.email;

  // Handle auth routes (login, register, etc.)
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (isAuthenticated) {
      // User is already authenticated, redirect to dashboard
      return NextResponse.redirect(new URL('/overview', request.url));
    }
    return NextResponse.next();
  }

  // Handle protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return redirectToLogin(request.url, pathname);
    }

    // Check admin-only routes
    if (adminOnlyRoutes.some(route => pathname.startsWith(route))) {
      if (userRole !== 'ADMIN' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Add user info to request headers for API routes
    if (pathname.startsWith('/api/') && !publicRoutes.some(route => pathname.startsWith(route))) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-role', userRole || '');
      requestHeaders.set('x-user-authenticated', 'true');
      requestHeaders.set('x-user-email', userEmail || '');

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return response;
  }

  // Root redirect - allow unauthenticated users to access landing page
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/overview', request.url));
    }
    // Let unauthenticated users access the landing page
    return response;
  }

  return response;
}

function redirectToLogin(currentUrl: string, redirectTo?: string): NextResponse {
  const loginUrl = new URL('/auth/login', currentUrl);

  if (redirectTo && redirectTo !== '/auth/login') {
    loginUrl.searchParams.set('redirectTo', redirectTo);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};