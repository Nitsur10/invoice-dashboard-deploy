import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from './env';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: string | null;
}

/**
 * Verify Supabase authentication for API routes
 */
export async function verifyAPIAuth(request: NextRequest): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      error: 'Supabase not configured'
    };
  }

  try {
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

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return {
        user: null,
        error: `Session error: ${sessionError.message}`
      };
    }

    if (!session?.user) {
      return {
        user: null,
        error: 'No authenticated user'
      };
    }

    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email || '',
      role: session.user.user_metadata?.role || 'user'
    };

    return {
      user,
      error: null
    };

  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Authentication error'
    };
  }
}

/**
 * Middleware for protecting API routes
 */
export function withAuth(handler: Function, requireAdmin: boolean = false) {
  return async (request: NextRequest, ...args: any[]) => {
    const authResult = await verifyAPIAuth(request);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    if (requireAdmin && authResult.user?.role !== 'ADMIN' && authResult.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Add user info to request headers for use in the handler
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', authResult.user!.id);
    requestHeaders.set('x-user-email', authResult.user!.email);
    requestHeaders.set('x-user-role', authResult.user!.role);

    const authenticatedRequest = new NextRequest(request.nextUrl, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      duplex: 'half',
    } as any);

    return handler(authenticatedRequest, ...args);
  };
}

/**
 * Get user info from request headers (for use in API handlers)
 */
export function getUserFromRequest(request: NextRequest): AuthenticatedUser | null {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role');

  if (!userId || !userEmail) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
    role: userRole || 'user'
  };
}
