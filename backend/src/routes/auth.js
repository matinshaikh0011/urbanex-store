import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  CUSTOMER_COOKIE,
  signCustomerToken,
  cookieOptions,
  customerAuth,
} from '../middleware/customerAuth.js';
import { loginRateLimiter, recordFailure, resetAttempts } from '../utils/rateLimiter.js';

const router = express.Router();
const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strip sensitive fields before returning a user
function safeUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const name = (req.body.name || '').toString().trim();
    const email = (req.body.email || '').toString().trim().toLowerCase();
    const phone = (req.body.phone || '').toString().trim() || null;
    const password = (req.body.password || '').toString();

    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.passwordHash) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // If a guest User row already exists for this email (from a prior order),
    // upgrade it in place — preserves existing order relationships.
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, name: name || existing.name, phone: phone || existing.phone },
        })
      : await prisma.user.create({
          data: { email, name: name || null, phone, passwordHash },
        });

    const token = signCustomerToken({ sub: String(user.id), email: user.email });
    res.cookie(CUSTOMER_COOKIE, token, cookieOptions());
    return res.status(201).json({ user: safeUser(user) });
  } catch (error) {
    console.error('[auth/register]', error);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const email = (req.body.email || '').toString().trim().toLowerCase();
    const password = (req.body.password || '').toString();

    if (!EMAIL_RE.test(email) || !password) {
      recordFailure(req);
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      recordFailure(req);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      recordFailure(req);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    resetAttempts(req);
    const token = signCustomerToken({ sub: String(user.id), email: user.email });
    res.cookie(CUSTOMER_COOKIE, token, cookieOptions());
    return res.json({ user: safeUser(user) });
  } catch (error) {
    console.error('[auth/login]', error);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── POST /api/auth/logout ──
router.post('/logout', (req, res) => {
  const opts = cookieOptions();
  delete opts.maxAge;
  res.clearCookie(CUSTOMER_COOKIE, opts);
  return res.json({ success: true });
});

// ── GET /api/auth/me ──
router.get('/me', customerAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(req.customer.id) } });
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    return res.json({ user: safeUser(user) });
  } catch (error) {
    console.error('[auth/me]', error);
    return res.status(500).json({ error: 'Failed to load account.' });
  }
});

export default router;
