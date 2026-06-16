import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that are always public (even under /admin)
const PUBLIC_ADMIN = ['/admin/login'];

// The admin JWT is signed by the backend with JWT_SECRET. The middleware must
// share that secret to verify the signature. Set JWT_SECRET in the frontend
// deployment env (server-side only — NOT prefixed with NEXT_PUBLIC).
const JWT_SECRET = process.env.JWT_SECRET;
const secretKey = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

function redirectToLogin(request: NextRequest, withFrom = false) {
  const loginUrl = new URL('/admin/login', request.url);
  if (withFrom) loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run on /admin routes
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // Allow the login page through
  if (PUBLIC_ADMIN.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('urbanex_admin_token')?.value;
  if (!token) return redirectToLogin(request, true);

  // If the secret isn't configured we cannot verify — fail closed.
  if (!secretKey) {
    console.error('JWT_SECRET is not set on the frontend — cannot verify admin token.');
    return redirectToLogin(request);
  }

  try {
    // Cryptographically verify the signature AND expiry.
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.role !== 'admin') return redirectToLogin(request);
  } catch {
    // Invalid signature, expired, or malformed
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
