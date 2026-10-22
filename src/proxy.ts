import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';
import type { UserRole } from './types';

const intlMiddleware = createMiddleware(routing);

// Paths that require authentication (prefix match after stripping locale)
const PROTECTED_PREFIXES = ['/student', '/company', '/university', '/admin', '/onboarding'];

// Paths that redirect to dashboard when already authenticated
const AUTH_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];

// Dashboard routes per role
const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  student: '/student/dashboard',
  company: '/company/dashboard',
  university: '/university/dashboard',
  admin: '/admin',
};

// Which role owns each protected path prefix
const ROLE_FOR_PREFIX: Array<{ prefix: string; role: UserRole }> = [
  { prefix: '/student',    role: 'student' },
  { prefix: '/company',    role: 'company' },
  { prefix: '/university', role: 'university' },
  { prefix: '/admin',      role: 'admin' },
];

function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split('/');
  const first = segments[1];
  return routing.locales.includes(first as (typeof routing.locales)[number])
    ? first
    : routing.defaultLocale;
}

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.slice(locale.length + 1) || '/';
    }
  }
  return pathname;
}

/**
 * Fetch role from the profiles table using the service-role key so RLS
 * doesn't block the middleware read. Falls back to user_metadata if the DB
 * lookup fails (e.g. table not yet created during first deploy).
 */
async function getUserAccessFromDB(
  userId: string,
  fallback: UserRole
): Promise<{ role: UserRole; isSuspended: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { role: fallback, isSuspended: false };

  try {
    const res = await fetch(
      `${url}/rest/v1/profiles?id=eq.${userId}&select=role,is_suspended&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        // Keep this short — middleware runs on every request
        signal: AbortSignal.timeout(2000),
      }
    );
    if (!res.ok) return { role: fallback, isSuspended: false };
    const rows = await res.json() as Array<{ role: UserRole; is_suspended: boolean }>;
    return {
      role: rows[0]?.role ?? fallback,
      isSuspended: rows[0]?.is_suspended ?? false,
    };
  } catch {
    return { role: fallback, isSuspended: false };
  }
}

/**
 * Next.js 16 proxy (previously called middleware).
 * Handles: session refresh, locale routing, auth protection, role-based routing.
 *
 * RBAC flow:
 *  1. Refresh the Supabase session cookie.
 *  2. If unauthenticated and path is protected → redirect to login.
 *  3. If authenticated and path is an auth page → redirect to dashboard.
 *  4. If authenticated and path belongs to a different role → redirect to /unauthorized.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathnameWithoutLocale = stripLocale(pathname);
  const locale = getLocaleFromPathname(pathname);

  // ── 1. Refresh Supabase session ────────────────────────────────────────────
  let user = null;
  let supabaseResponse = NextResponse.next({ request });

  try {
    const result = await updateSession(request);
    user = result.user;
    supabaseResponse = result.supabaseResponse;
  } catch {
    // Supabase not configured — continue unauthenticated
  }

  // ── 2. Unauthenticated → protect private paths ────────────────────────────
  if (!user && PROTECTED_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p))) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    // ── 3. Resolve authoritative role from DB ──────────────────────────────
    const metaRole = (user.user_metadata?.role as UserRole) ?? 'student';
    const { role: userRole, isSuspended } = await getUserAccessFromDB(user.id, metaRole);

    if (isSuspended && pathnameWithoutLocale !== '/suspended') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
      }
      return NextResponse.redirect(new URL(`/${locale}/suspended`, request.url));
    }

    // ── 4. Authenticated user on an auth page → send to dashboard ──────────
    if (AUTH_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p))) {
      const redirectPath = DASHBOARD_BY_ROLE[userRole] ?? '/student/dashboard';
      return NextResponse.redirect(new URL(`/${locale}${redirectPath}`, request.url));
    }

    // ── 5. Role-based path protection ──────────────────────────────────────
    for (const { prefix, role } of ROLE_FOR_PREFIX) {
      if (pathnameWithoutLocale.startsWith(prefix) && userRole !== role) {
        // Admin can access everything
        if (userRole === 'admin') break;
        return NextResponse.redirect(
          new URL(`/${locale}/unauthorized`, request.url)
        );
      }
    }
  }

  // ── 0. Bypass next-intl for /api routes ────────────────────────────────────
  if (pathname.startsWith('/api')) {
    return supabaseResponse;
  }

  // ── 6. Apply next-intl locale routing, copy session cookies ───────────────
  const intlResponse = intlMiddleware(request);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });
  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
