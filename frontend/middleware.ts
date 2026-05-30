import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require admin auth
const PROTECTED = ['/admin'];
// Routes that are always public (even under /admin)
const PUBLIC_ADMIN = ['/admin/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run on /admin routes
  const isAdminRoute = pathname.startsWith('/admin');
  if (!isAdminRoute) return NextResponse.next();

  // Allow the login page through
  if (PUBLIC_ADMIN.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Read the HttpOnly cookie
  const token = request.cookies.get('urbanex_admin_token')?.value;

  if (!token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT structure (edge-compatible: just check it's a valid JWT shape)
  // Full verification happens on the backend; here we just check presence + basic structure
  const parts = token.split('.');
  if (parts.length !== 3) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Decode payload (no secret needed in edge — backend verifies on every API call)
    const payload = JSON.parse(atob(parts[1]));
    if (payload.role !== 'admin') throw new Error('Not admin');
    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error('Expired');
  } catch {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
