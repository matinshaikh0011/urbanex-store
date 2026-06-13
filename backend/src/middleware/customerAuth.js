import jwt from 'jsonwebtoken';

// ════════════════════════════════════════════════════════════════
// Customer auth middleware
// Mirrors the admin pattern but uses a SEPARATE cookie so customer
// and admin sessions never collide.
// Cookie: urbanex_customer_token   Role: 'customer'
// ════════════════════════════════════════════════════════════════

export const CUSTOMER_COOKIE = 'urbanex_customer_token';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set (customerAuth). Refusing to start.');
  process.exit(1);
}

export function signCustomerToken(payload) {
  return jwt.sign({ ...payload, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
}

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

export function customerAuth(req, res, next) {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'customer') return res.status(401).json({ error: 'Not authenticated' });
    req.customer = { id: decoded.sub, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
