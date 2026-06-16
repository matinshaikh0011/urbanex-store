import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import FormData from 'form-data';
import { PrismaClient } from '@prisma/client';
import { subcategories } from './catalog.js';
import authRouter from './routes/auth.js';
import { CUSTOMER_COOKIE } from './middleware/customerAuth.js';
import { validateProductData, buildProductData, slugify } from './productUtils.js';
import { getProvider, detectProvider } from './scrapers/index.js';
import { fetchProductDetail } from './scrapers/cartpeProvider.js';
import { audit } from './utils/audit.js';

// ── Background Scan Job Store (DB-backed) ─────────────────────
// Scan jobs run in the background so the HTTP response returns
// immediately, avoiding Render's 30-second timeout for large catalogs.
//
// Jobs are persisted to the ScanJob table so they survive a backend
// restart. A small in-memory cache holds high-frequency progress
// counters; those are flushed to the DB on a throttle (every ~3s) and
// always on completion. Status/products/error are the source of truth
// in the DB so polling still works after a restart.

const scanProgressCache = new Map(); // jobId -> { pagesScanned, productsFound, lastFlush }

async function createScanJob(meta = {}) {
  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  await prisma.scanJob.create({
    data: {
      id: jobId,
      status: 'running',
      provider: meta.provider || null,
      url: meta.url || null,
      scope: meta.scope || null,
      pagesScanned: 0,
      productsFound: 0,
    },
  });
  scanProgressCache.set(jobId, { pagesScanned: 0, productsFound: 0, lastFlush: 0 });
  return jobId;
}

// Throttled progress update — keeps DB writes bounded during long scans.
async function updateScanProgress(jobId, pagesScanned, productsFound) {
  const cache = scanProgressCache.get(jobId) || { lastFlush: 0 };
  cache.pagesScanned = pagesScanned;
  cache.productsFound = productsFound;
  scanProgressCache.set(jobId, cache);
  const now = Date.now();
  if (now - cache.lastFlush > 3000) {
    cache.lastFlush = now;
    await prisma.scanJob.update({ where: { id: jobId }, data: { pagesScanned, productsFound } }).catch(() => {});
  }
}

async function completeScanJob(jobId, fields) {
  scanProgressCache.delete(jobId);
  await prisma.scanJob.update({
    where: { id: jobId },
    data: { ...fields, completedAt: new Date() },
  }).catch(err => console.error('[scanJob] complete failed:', err.message));
}

// Periodically purge old completed/errored jobs (older than 24h)
setInterval(() => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  prisma.scanJob.deleteMany({ where: { completedAt: { lt: cutoff } } }).catch(() => {});
}, 60 * 60 * 1000).unref?.();

dotenv.config();

// ── Environment validation ──
// Critical vars: missing → refuse to start (security/data integrity).
const REQUIRED_ENV = [
  'JWT_SECRET',
  'ADMIN_PASSWORD_HASH',
  'DATABASE_URL',
  'FRONTEND_URL',
];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k] || !process.env[k].trim());
if (missingEnv.length > 0) {
  console.error(`FATAL: missing required environment variable(s): ${missingEnv.join(', ')}. Refusing to start.`);
  process.exit(1);
}

// Optional vars: feature degrades gracefully if absent → warn only.
const OPTIONAL_ENV = ['NODE_ENV', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_UPLOAD_PRESET'];
const missingOptional = OPTIONAL_ENV.filter(k => !process.env[k] || !process.env[k].trim());
if (missingOptional.length > 0) {
  console.warn(`WARN: optional env var(s) not set: ${missingOptional.join(', ')}. Related features (e.g. scraper image upload) may be limited.`);
}

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();
const PORT = process.env.PORT || 3005;
const prisma = new PrismaClient();

// Behind Render's proxy — needed so req.ip is the real client IP (rate limiter)
app.set('trust proxy', 1);

// ── Security headers (Helmet) ──
// crossOriginResourcePolicy relaxed to allow the separate frontend origin
// to consume API responses; CSP left off (API-only, no HTML served).
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS: locked to the configured frontend origin only ──
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

app.use(cookieParser());

// ── Global API rate limit: 100 req / 15 min / IP ──
// Excludes the scraper status-poll route (admin-only, polled frequently
// during long imports) so legitimate progress polling isn't throttled.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
  skip: (req) => req.path.startsWith('/api/admin/scraper/scan/status'),
});
app.use('/api/', globalLimiter);

// ── Registration rate limit: 5 / hour / IP ──
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network. Please try again later.' },
});
app.use('/api/auth/register', registerLimiter);

// ── Admin login rate limit: brute-force protection ──
// Only failed attempts count (skipSuccessfulRequests) so a working admin
// session is never throttled. Far stricter than the global limiter.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed login attempts. Please try again in 15 minutes.' },
});

// ── Customer auth routes (register/login/logout/me) ──
app.use('/api/auth', authRouter);

// ── Helpers ──
function generateOrderId() {
  const chars = '0123456789';
  let result = 'UEX-';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

// ── Admin Auth Middleware ──
const adminAuth = (req, res, next) => {
  const token = req.cookies?.urbanex_admin_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
    req.admin = { username: decoded.username || 'admin' };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ════════════════════════════════════════════════════════════════

app.post('/api/admin/login', adminLoginLimiter, async (req, res) => {
  try {
    const { password, username } = req.body;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    const expectedUsername = process.env.ADMIN_USERNAME; // optional

    if (!passwordHash) {
      console.error('ADMIN_PASSWORD_HASH not set — admin login disabled.');
      return res.status(500).json({ error: 'Admin login is not configured.' });
    }

    // If a username is configured, it must match (case-insensitive).
    // Backwards-compatible: when ADMIN_USERNAME is unset, password-only login still works.
    if (expectedUsername) {
      const provided = (username || '').toString().trim().toLowerCase();
      if (provided !== expectedUsername.trim().toLowerCase()) {
        audit(prisma, req, { action: 'login_failed', entityType: 'auth', summary: 'Bad username' });
        return res.status(401).json({ error: 'Incorrect username or password' });
      }
    }

    const isValid = await bcrypt.compare(password || '', passwordHash);
    if (!isValid) {
      audit(prisma, req, { action: 'login_failed', entityType: 'auth', summary: 'Bad password' });
      return res.status(401).json({ error: expectedUsername ? 'Incorrect username or password' : 'Incorrect password' });
    }

    const adminUsername = expectedUsername || 'admin';
    const token = jwt.sign(
      { role: 'admin', username: adminUsername },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('urbanex_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    audit(prisma, req, { action: 'login', entityType: 'auth', summary: `${adminUsername} logged in` });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('urbanex_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true });
});

// Verify token (used by middleware/frontend to check auth)
app.get('/api/admin/verify', adminAuth, (req, res) => {
  res.json({ authenticated: true, username: req.admin?.username || 'admin' });
});

// ── Admin audit log (paginated, filterable by entityType/action) ──
app.get('/api/admin/audit-log', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const where = {};
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.action) where.action = req.query.action;
    const [records, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ records, total, page, limit });
  } catch (error) {
    console.error('[audit-log]', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ════════════════════════════════════════════════════════════════
// ADMIN STATS
// ════════════════════════════════════════════════════════════════

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const [totalOrders, pendingOrders, totalProducts, outOfStock, revenue, activeCoupons, recentOrders, outOfStockProducts] = await Promise.all([
      prisma.order.count({ where: { archived: false } }),
      prisma.order.count({ where: { archived: false, status: { in: ['Pending Advance', 'Pending Verification'] } } }),
      prisma.product.count(),
      prisma.product.count({ where: { inStock: false } }),
      prisma.order.aggregate({ where: { archived: false }, _sum: { totalAmount: true } }),
      prisma.coupon.count({ where: { isActive: true } }).catch(() => 0),
      prisma.order.findMany({ where: { archived: false }, take: 5, orderBy: { createdAt: 'desc' }, include: { product: { include: { brand: true } } } }),
      prisma.product.findMany({ where: { inStock: false }, take: 10, include: { brand: true } }),
    ]);

    res.json({
      totalOrders,
      pendingOrders,
      totalProducts,
      outOfStock,
      activeCoupons,
      totalRevenue: Number(revenue._sum.totalAmount || 0),
      recentOrders,
      outOfStockProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ════════════════════════════════════════════════════════════════
// ADMIN ORDERS
// ════════════════════════════════════════════════════════════════

app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').toString().trim();
    const status = (req.query.status || '').toString().trim();
    const archived = req.query.archived === 'true';

    const where = { archived };
    if (status && status.toLowerCase() !== 'all') {
      where.status = { contains: status, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { shippingName: { contains: search, mode: 'insensitive' } },
        { shippingPhone: { contains: search } },
        { utrNumber: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { product: { include: { brand: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ orders, total, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin: order CSV export — respects same filters, no pagination
app.get('/api/admin/orders/export', adminAuth, async (req, res) => {
  try {
    const search = (req.query.search || '').toString().trim();
    const status = (req.query.status || '').toString().trim();
    const archived = req.query.archived === 'true';

    const where = { archived };
    if (status && status.toLowerCase() !== 'all') {
      where.status = { contains: status, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { shippingName: { contains: search, mode: 'insensitive' } },
        { shippingPhone: { contains: search } },
        { utrNumber: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Email', 'Address', 'Product', 'Size', 'Qty', 'Total', 'Paid', 'Status', 'Payment', 'UTR', 'Coupon', 'Discount'];
    const rows = orders.map(o => [
      o.orderId, o.createdAt.toISOString(), o.shippingName, o.shippingPhone, o.shippingEmail || '',
      o.shippingAddress, o.product?.name || '', o.size || '', o.quantity,
      Number(o.totalAmount), o.amountPaid != null ? Number(o.amountPaid) : '', o.status,
      o.paymentMethod || '', o.utrNumber || '', o.couponCode || '',
      o.discountAmount != null ? Number(o.discountAmount) : '',
    ].map(esc).join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('[orders/export]', error);
    res.status(500).json({ error: 'Failed to export orders' });
  }
});

app.put('/api/admin/orders/:orderId/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { orderId: req.params.orderId },
      data: { status },
    });
    audit(prisma, req, { action: 'update', entityType: 'order', entityId: req.params.orderId, summary: `Status → ${status}` });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.post('/api/admin/orders/:orderId/notes', adminAuth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { orderId: req.params.orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const existingNotes = order.notes ? JSON.parse(order.notes) : [];
    const newNote = { text: req.body.note, createdAt: new Date().toISOString() };
    const updated = await prisma.order.update({
      where: { orderId: req.params.orderId },
      data: { notes: JSON.stringify([...existingNotes, newNote]) },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

app.delete('/api/admin/orders/:orderId', adminAuth, async (req, res) => {
  try {
    // Hard delete only when explicitly requested; default is soft-delete (archive)
    if (req.query.hard === 'true') {
      await prisma.order.delete({ where: { orderId: req.params.orderId } });
      audit(prisma, req, { action: 'delete', entityType: 'order', entityId: req.params.orderId, summary: 'Permanently deleted' });
      return res.json({ success: true, hardDeleted: true });
    }
    const updated = await prisma.order.update({
      where: { orderId: req.params.orderId },
      data: { archived: true },
    });
    audit(prisma, req, { action: 'archive', entityType: 'order', entityId: req.params.orderId, summary: 'Archived' });
    res.json({ success: true, archived: true, orderId: updated.orderId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Admin: restore an archived order
app.post('/api/admin/orders/:orderId/restore', adminAuth, async (req, res) => {
  try {
    const updated = await prisma.order.update({
      where: { orderId: req.params.orderId },
      data: { archived: false },
    });
    audit(prisma, req, { action: 'restore', entityType: 'order', entityId: req.params.orderId, summary: 'Restored from archive' });
    res.json({ success: true, orderId: updated.orderId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore order' });
  }
});

// ════════════════════════════════════════════════════════════════
// COUPONS
// ════════════════════════════════════════════════════════════════

app.get('/api/admin/coupons', adminAuth, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

app.post('/api/admin/coupons', adminAuth, async (req, res) => {
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: req.body.code.toUpperCase(),
        type: req.body.type,
        value: req.body.value,
        minimumOrder: req.body.minimumOrder || 0,
        maximumDiscount: req.body.maximumDiscount || null,
        usageLimit: req.body.usageLimit || 100,
        isActive: req.body.isActive ?? true,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      },
    });
    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

app.put('/api/admin/coupons/:id', adminAuth, async (req, res) => {
  try {
    const coupon = await prisma.coupon.update({
      where: { id: parseInt(req.params.id) },
      data: {
        code: req.body.code.toUpperCase(),
        type: req.body.type,
        value: req.body.value,
        minimumOrder: req.body.minimumOrder,
        maximumDiscount: req.body.maximumDiscount || null,
        usageLimit: req.body.usageLimit,
        isActive: req.body.isActive,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      },
    });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

app.delete('/api/admin/coupons/:id', adminAuth, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// Public coupon validation
app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const coupon = await prisma.coupon.findFirst({ where: { code: code.toUpperCase(), isActive: true } });
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) return res.status(400).json({ error: 'Coupon has expired' });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ error: 'Coupon limit reached' });
    if (Number(coupon.minimumOrder) > orderAmount) return res.status(400).json({ error: `Minimum order is ₹${coupon.minimumOrder}` });

    let discountAmount = coupon.type === 'percentage'
      ? (orderAmount * Number(coupon.value)) / 100
      : Number(coupon.value);
    if (coupon.maximumDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maximumDiscount));
    discountAmount = Math.round(discountAmount);

    res.json({
      valid: true,
      discountAmount,
      finalAmount: orderAmount - discountAmount,
      message: `Coupon applied! You save ₹${discountAmount}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// ════════════════════════════════════════════════════════════════
// BRANDS
// ════════════════════════════════════════════════════════════════

app.get('/api/brands', async (req, res) => {
  try {
    const where = req.query.featured === 'true' ? { isFeatured: true } : {};
    const brands = await prisma.brand.findMany({ where, include: { _count: { select: { products: true } } }, orderBy: { id: 'asc' } });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

app.post('/api/brands', adminAuth, async (req, res) => {
  try {
    const brand = await prisma.brand.create({ data: { name: req.body.name, slug: req.body.slug, logoUrl: req.body.logoUrl, isFeatured: req.body.isFeatured || false } });
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

app.put('/api/brands/:id', adminAuth, async (req, res) => {
  try {
    const brand = await prisma.brand.update({
      where: { id: parseInt(req.params.id) },
      data: { name: req.body.name, slug: req.body.slug, logoUrl: req.body.logoUrl, isFeatured: req.body.isFeatured },
    });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

app.delete('/api/brands/:id', adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid brand ID' });
  try {
    // Check if this brand has products
    const productCount = await prisma.product.count({ where: { brandId: id } });
    
    // Return the count for frontend confirmation
    // Frontend will send ?confirm=true after user confirms
    const confirmed = req.query.confirm === 'true';
    
    if (productCount > 0 && !confirmed) {
      return res.status(409).json({
        error: 'confirmation_required',
        productCount,
        message: `This brand has ${productCount} product(s). Deleting the brand will also delete all these products.`,
      });
    }
    
    // Delete associated products first (cascade)
    if (productCount > 0) {
      await prisma.product.deleteMany({ where: { brandId: id } });
    }
    
    // Delete associated BrandMappings
    await prisma.brandMapping.deleteMany({ where: { brandId: id } });
    
    // Delete the brand itself
    await prisma.brand.delete({ where: { id } });
    
    res.json({ success: true, deletedProducts: productCount });
  } catch (error) {
    console.error('[DELETE /api/brands/:id]', error);
    res.status(500).json({ error: error.message || 'Failed to delete brand' });
  }
});

// ════════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════════

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    const productCounts = await prisma.product.groupBy({ by: ['category'], _count: { id: true } });
    const countMap = {};
    productCounts.forEach(r => { countMap[r.category] = r._count.id; });
    const result = categories.map(c => ({ ...c, productCount: countMap[c.slug] || 0 }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', adminAuth, async (req, res) => {
  try {
    const { name, slug, description, image, parentId, featured, active, sortOrder } = req.body;
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        parentId: parentId ? parseInt(parentId) : null,
        featured: featured ?? false,
        active: active ?? true,
        sortOrder: sortOrder != null ? parseInt(sortOrder) : 0,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', adminAuth, async (req, res) => {
  try {
    const { name, slug, description, image, parentId, featured, active, sortOrder } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        parentId: parentId ? parseInt(parentId) : null,
        featured: featured ?? false,
        active: active ?? true,
        sortOrder: sortOrder != null ? parseInt(sortOrder) : 0,
      },
    });
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', adminAuth, async (req, res) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const productCount = await prisma.product.count({ where: { category: category.slug } });
    if (productCount > 0) {
      return res.status(400).json({ error: `Cannot delete: ${productCount} product(s) use this category. Reassign them first.` });
    }
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════

app.get('/api/products', async (req, res) => {
  try {
    const { brand, category, subcategory, featured, search } = req.query;
    const where = {};
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (featured === 'true') where.isFeatured = true;
    if (brand) where.brand = { slug: brand };
    if (search && search.toString().trim()) {
      where.OR = [
        { name: { contains: search.toString().trim(), mode: 'insensitive' } },
        { brand: { name: { contains: search.toString().trim(), mode: 'insensitive' } } },
      ];
    }

    const serialize = (p) => ({
      id: p.id, name: p.name, slug: p.slug, description: p.description,
      price: Number(p.price), originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      images: p.images, sizes: p.sizes, colors: p.colors, category: p.category,
      subcategory: p.subcategory, isFeatured: p.isFeatured, inStock: p.inStock,
      brand: p.brand, brandId: p.brandId, source: p.source, sourceId: p.sourceId, lastSync: p.lastSync,
    });

    // Opt-in pagination: only when ?page is supplied (keeps storefront array contract intact)
    if (req.query.page !== undefined) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: { brand: true },
          orderBy: [{ isFeatured: 'desc' }, { id: 'desc' }],
          skip,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);
      return res.json({ products: products.map(serialize), total, page, limit });
    }

    const products = await prisma.product.findMany({
      where,
      include: { brand: true },
      orderBy: [
        { isFeatured: 'desc' },
        { id: 'desc' },
      ],
    });
    res.json(products.map(serialize));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/subcategories', (req, res) => res.json(subcategories));

app.get('/api/products/featured', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ where: { isFeatured: true }, include: { brand: true } });
    res.json(products.map(p => ({
      id: p.id, name: p.name, slug: p.slug, description: p.description,
      price: Number(p.price), originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      images: p.images, sizes: p.sizes, colors: p.colors, category: p.category,
      subcategory: p.subcategory, isFeatured: p.isFeatured, inStock: p.inStock,
      brand: p.brand, brandId: p.brandId,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

app.get('/api/products/:slug', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug }, include: { brand: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...product, price: Number(product.price), originalPrice: product.originalPrice != null ? Number(product.originalPrice) : null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Admin: bulk update products (brand / category / featured / stock) in one request
app.put('/api/products/bulk', adminAuth, async (req, res) => {
  try {
    const { ids, action, value } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const intIds = ids.map(Number).filter(Number.isInteger);
    if (intIds.length === 0) return res.status(400).json({ error: 'No valid ids provided' });

    let data;
    switch (action) {
      case 'brand': {
        const brandId = Number(value);
        if (!Number.isInteger(brandId) || brandId <= 0) return res.status(400).json({ error: 'value must be a valid brandId' });
        data = { brandId };
        break;
      }
      case 'category': {
        const dbCats = await prisma.category.findMany({ where: { active: true }, select: { slug: true } }).catch(() => []);
        const allowed = dbCats.length > 0 ? dbCats.map(c => c.slug) : ['sneakers', 'watches', 'luxury-watches', 'glasses', 'handbags', 'clothing', 'ua-batch'];
        if (!allowed.includes(value)) return res.status(400).json({ error: 'Invalid category' });
        data = { category: value };
        break;
      }
      case 'featured':
        data = { isFeatured: Boolean(value) };
        break;
      case 'stock':
        data = { inStock: Boolean(value) };
        break;
      default:
        return res.status(400).json({ error: 'action must be one of: brand, category, featured, stock' });
    }

    const result = await prisma.product.updateMany({ where: { id: { in: intIds } }, data });
    audit(prisma, req, { action: 'bulk_update', entityType: 'product', summary: `${action} on ${result.count} products`, metadata: { ids: intIds, action, value } });
    res.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('[products/bulk]', error);
    res.status(500).json({ error: 'Failed to bulk update products' });
  }
});

// Admin: bulk delete products in one request
app.delete('/api/products/bulk', adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const intIds = ids.map(Number).filter(Number.isInteger);
    if (intIds.length === 0) return res.status(400).json({ error: 'No valid ids provided' });

    await prisma.order.updateMany({ where: { productId: { in: intIds } }, data: { productId: null } });
    const result = await prisma.product.deleteMany({ where: { id: { in: intIds } } });
    audit(prisma, req, { action: 'bulk_delete', entityType: 'product', summary: `Deleted ${result.count} products`, metadata: { ids: intIds } });
    res.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('[products/bulk delete]', error);
    res.status(500).json({ error: 'Failed to bulk delete products' });
  }
});

// Admin: bulk CSV import — accepts an array of product rows, processed in one request
app.post('/api/admin/import-csv', adminAuth, async (req, res) => {
  const { products: incoming } = req.body;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ error: 'products array must not be empty' });
  }

  const dbCats = await prisma.category.findMany({ where: { active: true }, select: { slug: true } }).catch(() => []);
  const allowedCats = dbCats.length > 0 ? dbCats.map(c => c.slug) : undefined;

  const results = [];
  let successCount = 0, failureCount = 0;

  for (const row of incoming) {
    const name = (row.name || '').toString().trim();
    try {
      const data = {
        name,
        slug: (row.slug && row.slug.trim()) || slugify(name),
        category: (row.category || '').toString().trim(),
        brandId: row.brandId != null ? Number(row.brandId) : (row.brand_id != null ? Number(row.brand_id) : null),
        description: (row.description || '').toString().trim() || null,
        price: Number(row.price),
        originalPrice: row.originalPrice ?? row.original_price ?? null,
        sizes: row.sizes,
        colors: row.colors,
        isFeatured: row.isFeatured === true || row.is_featured === 'true' || row.is_featured === true,
        inStock: !(row.inStock === false || row.in_stock === 'false' || row.in_stock === false),
        images: Array.isArray(row.images) ? row.images : [],
      };
      const validation = validateProductData(data, allowedCats);
      if (!validation.valid) {
        failureCount++;
        results.push({ name, ok: false, msg: validation.error });
        continue;
      }
      await prisma.product.create({ data: buildProductData(data) });
      successCount++;
      results.push({ name, ok: true, msg: 'Imported' });
    } catch (e) {
      failureCount++;
      results.push({ name, ok: false, msg: e.message || 'Failed' });
    }
  }

  res.json({ successCount, failureCount, results });
});

app.post('/api/products', adminAuth, async (req, res) => {
  try {
    const dbCats = await prisma.category.findMany({ where: { active: true }, select: { slug: true } }).catch(() => []);
    const allowedCats = dbCats.length > 0 ? dbCats.map(c => c.slug) : undefined;
    const validation = validateProductData(req.body, allowedCats);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    const product = await prisma.product.create({
      data: buildProductData(req.body),
      include: { brand: true },
    });
    audit(prisma, req, { action: 'create', entityType: 'product', entityId: product.id, summary: `Created "${product.name}"` });
    res.status(201).json({ ...product, price: Number(product.price), originalPrice: product.originalPrice != null ? Number(product.originalPrice) : null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Admin: clone/duplicate a product
app.post('/api/products/:id/clone', adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });
    const orig = await prisma.product.findUnique({ where: { id } });
    if (!orig) return res.status(404).json({ error: 'Product not found' });

    // Build a unique slug and a "(Copy)" name. Source tracking is dropped so
    // the clone is treated as a fresh, independently-managed product.
    let baseSlug = `${orig.slug}-copy`;
    let slug = baseSlug;
    let n = 2;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n++}`;
    }

    const clone = await prisma.product.create({
      data: {
        name: `${orig.name} (Copy)`,
        slug,
        category: orig.category,
        subcategory: orig.subcategory,
        description: orig.description,
        price: orig.price,
        originalPrice: orig.originalPrice,
        brandId: orig.brandId,
        sizes: orig.sizes,
        colors: orig.colors,
        inStock: orig.inStock,
        isFeatured: false,
        images: orig.images,
        source: null, sourceId: null, sourceUrl: null, lastSync: null,
      },
      include: { brand: true },
    });
    audit(prisma, req, { action: 'clone', entityType: 'product', entityId: clone.id, summary: `Cloned from #${id} "${orig.name}"` });
    res.status(201).json({ ...clone, price: Number(clone.price), originalPrice: clone.originalPrice != null ? Number(clone.originalPrice) : null });
  } catch (error) {
    console.error('[products/clone]', error);
    res.status(500).json({ error: 'Failed to clone product' });
  }
});

app.put('/api/products/:id', adminAuth, async (req, res) => {
  try {
    const dbCats = await prisma.category.findMany({ where: { active: true }, select: { slug: true } }).catch(() => []);
    const allowedCats = dbCats.length > 0 ? dbCats.map(c => c.slug) : undefined;
    const validation = validateProductData(req.body, allowedCats);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: buildProductData(req.body),
      include: { brand: true },
    });
    audit(prisma, req, { action: 'update', entityType: 'product', entityId: product.id, summary: `Updated "${product.name}"` });
    res.json({ ...product, price: Number(product.price), originalPrice: product.originalPrice != null ? Number(product.originalPrice) : null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
  try {
    await prisma.order.updateMany({ where: { productId: parseInt(req.params.id) }, data: { productId: null } });
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    audit(prisma, req, { action: 'delete', entityType: 'product', entityId: req.params.id, summary: 'Deleted product' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.put('/api/products/:id/stock', adminAuth, async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { inStock: req.body.inStock },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Admin: list only products with source tracking (for the Sync tab)
app.get('/api/admin/synced-products', adminAuth, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { source: { not: null } },
      include: { brand: { select: { name: true } } },
      orderBy: { lastSync: 'asc' },
    });
    res.json(products.map(p => ({
      id: p.id, name: p.name, source: p.source, sourceId: p.sourceId,
      sourceUrl: p.sourceUrl, lastSync: p.lastSync, inStock: p.inStock,
      images: p.images, brand: p.brand,
    })));
  } catch (error) {
    console.error('[synced-products]', error);
    res.status(500).json({ error: 'Failed to fetch synced products' });
  }
});

// ════════════════════════════════════════════════════════════════
// ORDERS (public + legacy)
// ════════════════════════════════════════════════════════════════

app.post('/api/orders', async (req, res) => {
  try {
    const {
      productId, size, color, quantity,
      paymentMethod, utrNumber,
      shippingName, shippingAddress, shippingEmail, shippingPhone,
      items, couponCode,
    } = req.body;
    const paymentScreenshot = req.body.paymentScreenshot || null;

    const cleanUtr = (utrNumber || '').toString().trim();
    if (!/^\d{12}$/.test(cleanUtr)) return res.status(400).json({ error: 'A valid 12-digit UTR / Transaction ID is required.' });

    if (!shippingName || !shippingAddress || !shippingPhone) {
      return res.status(400).json({ error: 'Shipping name, address and phone are required.' });
    }

    // ── Optionally link to the logged-in customer (guest checkout still allowed) ──
    let userId = null;
    const customerToken = req.cookies?.[CUSTOMER_COOKIE];
    if (customerToken) {
      try {
        const decoded = jwt.verify(customerToken, JWT_SECRET);
        if (decoded.role === 'customer') userId = parseInt(decoded.sub);
      } catch { /* invalid customer token — treat as guest */ }
    }

    // ── C2: build a normalised line-item list, then price EVERYTHING from the DB ──
    const lineItems = Array.isArray(items) && items.length > 0
      ? items.map(i => ({ productId: parseInt(i.productId), size: i.size || null, color: i.color || null, quantity: Math.max(1, parseInt(i.quantity) || 1) }))
      : (productId ? [{ productId: parseInt(productId), size: size || null, color: color || null, quantity: Math.max(1, parseInt(quantity) || 1) }] : []);

    if (lineItems.length === 0) return res.status(400).json({ error: 'No products in order.' });

    const productIds = [...new Set(lineItems.map(li => li.productId).filter(Number.isInteger))];
    const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const priceMap = new Map(dbProducts.map(p => [p.id, Number(p.price)]));

    let subtotal = 0;
    for (const li of lineItems) {
      const unit = priceMap.get(li.productId);
      if (unit == null) return res.status(400).json({ error: 'One or more products in your order no longer exist.' });
      subtotal += unit * li.quantity;
    }

    // ── C3: recompute discount server-side + atomically redeem the coupon ──
    let appliedCouponCode = null;
    let discountAmount = 0;
    if (couponCode) {
      const code = couponCode.toString().toUpperCase();
      // Atomic guard: only increment if active, not expired, and under the usage limit.
      const result = await prisma.coupon.updateMany({
        where: {
          code,
          isActive: true,
          usedCount: { lt: prisma.coupon.fields.usageLimit },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { usedCount: { increment: 1 } },
      });
      if (result.count === 1) {
        const coupon = await prisma.coupon.findFirst({ where: { code } });
        if (coupon && Number(coupon.minimumOrder) <= subtotal) {
          let d = coupon.type === 'percentage'
            ? (subtotal * Number(coupon.value)) / 100
            : Number(coupon.value);
          if (coupon.maximumDiscount) d = Math.min(d, Number(coupon.maximumDiscount));
          discountAmount = Math.min(Math.round(d), subtotal);
          appliedCouponCode = code;
        } else {
          // Did not actually qualify — roll the increment back.
          await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { decrement: 1 } } }).catch(() => {});
        }
      }
      // If result.count === 0 the coupon was invalid/expired/exhausted → silently ignored (no discount)
    }

    const totalAmount = subtotal - discountAmount;

    // ── Server decides what "amount paid" means based on payment method ──
    const ADVANCE_AMOUNT = 300;
    const amountPaid = paymentMethod === 'prepaid' ? totalAmount : ADVANCE_AMOUNT;

    const orderId = generateOrderId();
    const first = lineItems[0];
    const order = await prisma.order.create({
      data: {
        orderId, totalAmount, status: 'Pending Verification',
        paymentMethod: paymentMethod === 'prepaid' ? 'prepaid' : 'cod',
        utrNumber: cleanUtr,
        paymentScreenshot,
        amountPaid,
        userId,
        shippingName, shippingAddress, shippingEmail: shippingEmail || null, shippingPhone,
        productId: first.productId,
        size: first.size,
        color: first.color,
        quantity: first.quantity,
        couponCode: appliedCouponCode,
        discountAmount: discountAmount || null,
      },
    });
    res.status(201).json({ orderId: order.orderId, totalAmount: Number(order.totalAmount), amountPaid: Number(order.amountPaid), status: order.status });
  } catch (error) {
    console.error('[orders/create]', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Public order tracking — returns ONLY non-sensitive fields (no PII, no UTR, no screenshot)
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { orderId: req.params.orderId },
      include: { product: { select: { name: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({
      orderId: order.orderId,
      status: order.status,
      advancePaid: order.advancePaid,
      size: order.size,
      quantity: order.quantity,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      product: order.product ? { name: order.product.name } : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Status changes — admin only
app.put('/api/orders/:orderId/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const ALLOWED = ['Pending Advance', 'Pending Verification', 'Verified', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
    if (!status || !ALLOWED.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const updated = await prisma.order.update({ where: { orderId: req.params.orderId }, data: { status } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete — admin only
app.delete('/api/orders/:orderId', adminAuth, async (req, res) => {
  try {
    await prisma.order.delete({ where: { orderId: req.params.orderId } });
    res.json({ success: true, orderId: req.params.orderId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ════════════════════════════════════════════════════════════════
// SCRAPER ENDPOINTS
// ════════════════════════════════════════════════════════════════

// ── Cloudinary server-side upload helper ──
async function uploadToCloudinary(imageUrl) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error('Cloudinary env vars not configured on backend');

  const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
  const buffer = Buffer.from(imgRes.data);

  const fd = new FormData();
  fd.append('file', buffer, { filename: 'product.jpg', contentType: imgRes.headers['content-type'] || 'image/jpeg' });
  fd.append('upload_preset', preset);

  const uploadRes = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    fd,
    { headers: fd.getHeaders(), timeout: 30000 }
  );
  return uploadRes.data.secure_url;
}

// POST /api/admin/scraper/scan
// BACKGROUND JOB VERSION — returns immediately with a jobId.
// The scan runs in the background to avoid HTTP timeout (502) on large catalogs.
// Poll GET /api/admin/scraper/scan/status/:jobId for live progress.
app.post('/api/admin/scraper/scan', adminAuth, async (req, res) => {
  const { url, scope, provider: providerKey, delayMs } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'url is required' });
  }
  const validScopes = ['full', 'category', 'product'];
  if (!scope || !validScopes.includes(scope)) {
    return res.status(400).json({ error: `scope must be one of: ${validScopes.join(', ')}` });
  }

  let resolvedKey = providerKey;
  if (!resolvedKey) {
    resolvedKey = detectProvider(url);
    if (!resolvedKey) return res.status(400).json({ error: 'Could not auto-detect provider from URL. Please specify provider.' });
  }

  let provider;
  try {
    provider = getProvider(resolvedKey);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // Create a background job and return its ID immediately
  const jobId = await createScanJob({ provider: resolvedKey, url, scope });

  // Run the scan asynchronously (do NOT await — this is intentional)
  (async () => {
    try {
      const scrapeResult = await provider.scrape(url, scope, {
        delayMs,
        onProgress: (pagesScanned, productsFound) => {
          updateScanProgress(jobId, pagesScanned, productsFound);
        },
      });

      const { products: scraped, failedUrls, pagesFetched, pageErrors, stats: scrapeStats } = scrapeResult;

      // Duplicate detection — run in batches of 20 to avoid overwhelming the DB
      const enriched = [];
      const BATCH = 20;
      for (let i = 0; i < scraped.length; i += BATCH) {
        const batch = scraped.slice(i, i + BATCH);
        const batchResults = await Promise.all(batch.map(async (p) => {
          let duplicateStatus = 'new';
          let duplicateMatch = null;
          try {
            if (p.sourceId) {
              const existing = await prisma.product.findFirst({
                where: { source: resolvedKey, sourceId: p.sourceId },
                select: { name: true, slug: true },
              });
              if (existing) { duplicateStatus = 'already-imported'; duplicateMatch = { name: existing.name, slug: existing.slug }; }
            }
            if (duplicateStatus === 'new' && p.name) {
              const slug = slugify(p.name) + (p.sourceId ? `-${p.sourceId}` : '');
              const existing = await prisma.product.findFirst({ where: { slug }, select: { name: true, slug: true } });
              if (existing) { duplicateStatus = 'slug-duplicate'; duplicateMatch = { name: existing.name, slug: existing.slug }; }
            }
            if (duplicateStatus === 'new' && p.name) {
              const existing = await prisma.product.findFirst({ where: { name: { equals: p.name, mode: 'insensitive' } }, select: { name: true, slug: true } });
              if (existing) { duplicateStatus = 'possible-duplicate'; duplicateMatch = { name: existing.name, slug: existing.slug }; }
            }
          } catch (dupErr) {
            console.error(`[scraper/scan] dup check failed for ${p.sourceId}: ${dupErr.message}`);
          }
          return { ...p, duplicateStatus, duplicateMatch };
        }));
        enriched.push(...batchResults);
      }

      // Mark job complete
      const stats = {
        productsFound: scrapeStats?.productsFound ?? enriched.length,
        productsReturned: enriched.length,
        duplicateCount: enriched.filter(p => p.duplicateStatus !== 'new').length,
        failedCount: (scrapeStats?.failedCount || 0),
        pagesFetched: scrapeStats?.pagesFetched || pagesFetched || 0,
        scanDuration: scrapeStats?.scanDuration || 0,
        total: enriched.length,
        failed: scrapeStats?.failedCount || 0,
        failedUrls: failedUrls || [],
      };
      await completeScanJob(jobId, {
        status: 'done',
        products: enriched,
        productsFound: enriched.length,
        provider: resolvedKey,
        stats,
      });
    } catch (err) {
      console.error('[scraper/scan background]', err);
      await completeScanJob(jobId, { status: 'error', error: err.message });
    }
  })();

  // Respond immediately with the job ID — client polls for progress
  res.json({ jobId, status: 'running' });
});

// GET /api/admin/scraper/scan/status/:jobId — poll for scan progress
app.get('/api/admin/scraper/scan/status/:jobId', adminAuth, async (req, res) => {
  try {
    const job = await prisma.scanJob.findUnique({ where: { id: req.params.jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found or expired' });

    if (job.status === 'running') {
      // Prefer the live in-memory counters if present (fresher than DB)
      const cache = scanProgressCache.get(job.id);
      return res.json({
        status: 'running',
        pagesScanned: cache?.pagesScanned ?? job.pagesScanned,
        productsFound: cache?.productsFound ?? job.productsFound,
      });
    }

    if (job.status === 'error') {
      return res.json({ status: 'error', error: job.error });
    }

    // status === 'done'
    res.json({
      status: 'done',
      provider: job.provider,
      products: job.products,
      stats: job.stats,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error('[scraper/scan/status]', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// GET /api/admin/scraper/jobs — list recent scan jobs (status dashboard)
app.get('/api/admin/scraper/jobs', adminAuth, async (req, res) => {
  try {
    const jobs = await prisma.scanJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true, status: true, provider: true, url: true, scope: true,
        pagesScanned: true, productsFound: true, error: true,
        startedAt: true, completedAt: true,
      },
    });
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan jobs' });
  }
});

// POST /api/admin/scraper/jobs/:jobId/cancel — mark a running job as cancelled
app.post('/api/admin/scraper/scan/cancel/:jobId', adminAuth, async (req, res) => {
  try {
    const job = await prisma.scanJob.findUnique({ where: { id: req.params.jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status === 'running') {
      await completeScanJob(req.params.jobId, { status: 'error', error: 'Cancelled by admin' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// POST /api/admin/scraper/import
app.post('/api/admin/scraper/import', adminAuth, async (req, res) => {
  const { products: incoming, source, sourceUrl, imageMode = 'cloudinary' } = req.body;

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ error: 'products array must not be empty' });
  }
  if (!source || !sourceUrl) {
    return res.status(400).json({ error: 'source and sourceUrl are required' });
  }

  const log = [];
  let successCount = 0, updatedCount = 0, failureCount = 0, skippedCount = 0;

  // Phase 1 — Pre-validation (deferred price check: price is enriched from detail page)
  const validProducts = [];
  for (const p of incoming) {
    let finalBrandId = p.brandId;
    if (finalBrandId === 'no-brand' || finalBrandId == null) {
      finalBrandId = null;
    }
    if (!p.name || !String(p.name).trim()) {
      failureCount++;
      log.push({ sourceId: p.sourceId, operation: 'failed', errorMessage: 'name is required' });
      continue;
    }
    const productData = {
      ...p,
      brandId: finalBrandId,
      source,
      sourceId: p.sourceId,
      sourceUrl: p.productUrl || null,
      slug: p.slug || (slugify(p.name) + (p.sourceId ? `-${p.sourceId}` : '')),
    };
    validProducts.push(productData);
  }

  // Phase 1.5 — Fetch product detail pages for selected products
  // Uses controlled concurrency (DETAIL_CONCURRENCY at a time) to avoid
  // hammering CartPe and triggering rate-limits or cascading 500s.
  // A failed detail fetch keeps the listing data and never aborts the import.
  const DETAIL_CONCURRENCY = 8;
  const provider = (() => { try { return getProvider(source); } catch { return null; } })();
  if (provider && typeof provider.fetchProductDetail === 'function') {
    console.log(`[import] Fetching detail pages for ${validProducts.length} products (concurrency=${DETAIL_CONCURRENCY})…`);
    const detailStart = Date.now();

    for (let i = 0; i < validProducts.length; i += DETAIL_CONCURRENCY) {
      const batch = validProducts.slice(i, i + DETAIL_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(p => p.sourceUrl ? provider.fetchProductDetail(p.sourceUrl) : Promise.resolve(null))
      );
      results.forEach((result, batchIdx) => {
        const globalIdx = i + batchIdx;
        if (result.status === 'fulfilled' && result.value) {
          const detail = result.value;
          const p = validProducts[globalIdx];

          // If the listing scan had no price (price=0), use the detail page's price
          if ((!p.price || Number(p.price) <= 0) && detail.sourcePrice > 0) {
            p.price = detail.sourcePrice;
          }

          // Update originalPrice from CartPe's MRP only if it's higher than our price
          if (detail.originalPrice && detail.originalPrice > Number(p.price)) {
            p.originalPrice = detail.originalPrice;
          }

          if (detail.images && detail.images.length > 0) p.images = detail.images;
          if (detail.description) p.description = detail.description;
          p.inStock = detail.inStock;
          if (detail.sizes && Object.keys(detail.sizes).length > 0) p.sizes = detail.sizes;
        } else if (result.status === 'rejected') {
          const p = batch[batchIdx];
          console.warn(`[import] Detail fetch failed for ${p.sourceId} (${p.sourceUrl}): ${result.reason?.message}`);
          // Keep listing data — don't fail the import for a detail fetch error
        }
      });
      console.log(`[import] Detail pages: ${Math.min(i + DETAIL_CONCURRENCY, validProducts.length)}/${validProducts.length} done`);
    }

    console.log(`[import] Detail fetch complete in ${((Date.now() - detailStart) / 1000).toFixed(1)}s`);
  }

  // Phase 2 — Image handling (outside transaction)
  // Cloudinary uploads run in batches of IMAGE_CONCURRENCY to avoid overwhelming
  // the Cloudinary API and to keep memory usage bounded.
  const IMAGE_CONCURRENCY = 5;
  const imageFailures = [];

  if (imageMode === 'cloudinary') {
    // Collect all (product, imageUrl) pairs that need uploading
    const uploadTasks = [];
    for (const p of validProducts) {
      if (!Array.isArray(p.images) || p.images.length === 0) continue;
      p.images.forEach((imgUrl, imgIdx) => uploadTasks.push({ p, imgIdx, imgUrl }));
    }

    for (let i = 0; i < uploadTasks.length; i += IMAGE_CONCURRENCY) {
      const batch = uploadTasks.slice(i, i + IMAGE_CONCURRENCY);
      const results = await Promise.allSettled(batch.map(t => uploadToCloudinary(t.imgUrl)));
      results.forEach((result, batchIdx) => {
        const { p, imgIdx, imgUrl } = batch[batchIdx];
        if (result.status === 'fulfilled') {
          p.images[imgIdx] = result.value;
        } else {
          imageFailures.push({ sourceId: p.sourceId, url: imgUrl, error: result.reason?.message });
          // p.images[imgIdx] stays as the supplier URL (fallback)
        }
      });
    }
  }
  // supplier-url mode: images already set from detail fetch, no uploads needed

  // Phase 2.5 — Final price validation (now that detail pages have enriched prices)
  // Fetch live category slugs so newly-created categories are accepted.
  let allowedCategories;
  try {
    const dbCats = await prisma.category.findMany({ where: { active: true }, select: { slug: true } });
    if (dbCats.length > 0) allowedCategories = dbCats.map(c => c.slug);
  } catch { /* fallback to VALID_CATEGORIES inside validateProductData */ }

  const finalValidProducts = [];
  for (const p of validProducts) {
    const validation = validateProductData(p, allowedCategories);
    if (!validation.valid) {
      failureCount++;
      log.push({ sourceId: p.sourceId, operation: 'failed', errorMessage: validation.error });
      console.warn(`[import] Validation failed after detail fetch for ${p.sourceId}: ${validation.error}`);
      continue;
    }
    finalValidProducts.push(p);
  }

  // Phase 3 — Transaction
  try {
    await prisma.$transaction(async (tx) => {
      for (const p of finalValidProducts) {
        const data = buildProductData({ ...p, lastSync: new Date() });
        const existing = p.sourceId
          ? await tx.product.findFirst({ where: { source, sourceId: p.sourceId } })
          : null;

        if (existing) {
          await tx.product.update({ where: { id: existing.id }, data });
          updatedCount++;
          log.push({ sourceId: p.sourceId, operation: 'updated' });
        } else {
          await tx.product.create({ data });
          successCount++;
          log.push({ sourceId: p.sourceId, operation: 'created' });
        }
      }
    });
  } catch (txError) {
    console.error('[scraper/import] transaction failed:', txError);
    // Mark all valid products as failed
    for (const p of validProducts) {
      if (!log.find(l => l.sourceId === p.sourceId)) {
        failureCount++;
        log.push({ sourceId: p.sourceId, operation: 'failed', errorMessage: txError.message });
      }
    }
    successCount = 0;
    updatedCount = 0;
  }

  // Phase 4 — Import history (outside transaction)
  let historyId = null;
  try {
    const history = await prisma.importHistory.create({
      data: {
        source,
        sourceUrl,
        totalScraped: incoming.length,
        successCount,
        failureCount,
        skippedCount,
        updatedCount,
        log,
      },
    });
    historyId = history.id;
  } catch (histErr) {
    console.error('[scraper/import] failed to create ImportHistory:', histErr);
  }

  res.json({ successCount, updatedCount, failureCount, skippedCount, historyId, log, imageFailures });
});

// POST /api/admin/scraper/sync/:id
app.post('/api/admin/scraper/sync/:id', adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!product.source) return res.status(400).json({ error: 'Product has no source — cannot sync' });

    const provider = getProvider(product.source);
    const syncResult = await provider.syncProduct(product.sourceId, product.sourceUrl);

    const updateData = {
      inStock: syncResult.notFound ? false : syncResult.inStock,
      lastSync: new Date(),
    };

    if (!syncResult.notFound) {
      if (syncResult.price > 0) updateData.price = syncResult.price;
      if (syncResult.originalPrice) updateData.originalPrice = syncResult.originalPrice;
      // Always refresh images and sizes on sync — these can change on CartPe
      if (syncResult.images && syncResult.images.length > 0) updateData.images = syncResult.images;
      if (syncResult.sizes && Object.keys(syncResult.sizes).length > 0) updateData.sizes = syncResult.sizes;
      if (syncResult.description) updateData.description = syncResult.description;
    }

    // buildProductData enforces originalPrice > price, so pass through it
    // for price fields only (we build the full data object manually here to
    // avoid overwriting fields the admin may have customised like name/brand).
    if (updateData.price != null && updateData.originalPrice != null) {
      if (updateData.originalPrice <= updateData.price) {
        updateData.originalPrice = Math.round(updateData.price * 1.4);
      }
    }

    // Legacy optional flags kept for backwards compat but no longer needed
    const { syncName, syncDescription, syncImages } = req.body;
    if (syncName && syncResult.name) updateData.name = syncResult.name;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { brand: true },
    });

    res.json({
      ...updated,
      price: Number(updated.price),
      originalPrice: updated.originalPrice != null ? Number(updated.originalPrice) : null,
      notFound: syncResult.notFound || false,
    });
  } catch (error) {
    console.error('[scraper/sync]', error);
    res.status(500).json({ error: 'Sync failed: ' + error.message });
  }
});

// GET /api/admin/scraper/history
app.get('/api/admin/scraper/history', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      prisma.importHistory.findMany({
        orderBy: { importedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, source: true, sourceUrl: true, importedAt: true,
          totalScraped: true, successCount: true, updatedCount: true,
          failureCount: true, skippedCount: true, createdAt: true,
          // log excluded from list for performance
        },
      }),
      prisma.importHistory.count(),
    ]);

    res.json({ records, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch import history' });
  }
});

// GET /api/admin/scraper/history/:id
app.get('/api/admin/scraper/history/:id', adminAuth, async (req, res) => {
  try {
    const record = await prisma.importHistory.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!record) return res.status(404).json({ error: 'History record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history record' });
  }
});

// DELETE /api/admin/scraper/history/:id
app.delete('/api/admin/scraper/history/:id', adminAuth, async (req, res) => {
  try {
    const record = await prisma.importHistory.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!record) return res.status(404).json({ error: 'History record not found' });
    await prisma.importHistory.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history record' });
  }
});

// GET /api/admin/scraper/brand-mappings
app.get('/api/admin/scraper/brand-mappings', adminAuth, async (req, res) => {
  try {
    const where = req.query.provider ? { provider: req.query.provider } : {};
    const mappings = await prisma.brandMapping.findMany({
      where,
      include: { brand: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brand mappings' });
  }
});

// POST /api/admin/scraper/brand-mappings
app.post('/api/admin/scraper/brand-mappings', adminAuth, async (req, res) => {
  try {
    const { provider, supplierBrandName, brandId } = req.body;
    if (!provider || !supplierBrandName || !brandId) {
      return res.status(400).json({ error: 'provider, supplierBrandName, and brandId are required' });
    }
    const mapping = await prisma.brandMapping.upsert({
      where: { provider_supplierBrandName: { provider, supplierBrandName } },
      update: { brandId: parseInt(brandId) },
      create: { provider, supplierBrandName, brandId: parseInt(brandId) },
      include: { brand: true },
    });
    res.status(201).json(mapping);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save brand mapping' });
  }
});

// ════════════════════════════════════════════════════════════════
// HERO SLIDES
// ════════════════════════════════════════════════════════════════

// Public: Get active hero slides
app.get('/api/hero-slides', async (req, res) => {
  try {
    const slides = await prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(slides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hero slides' });
  }
});

// Admin: Get all hero slides
app.get('/api/admin/hero-slides', adminAuth, async (req, res) => {
  try {
    const slides = await prisma.heroSlide.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(slides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hero slides' });
  }
});

// Admin: reorder hero slides — accepts an ordered array of slide IDs
app.put('/api/admin/hero-slides/reorder', adminAuth, async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: 'order array of slide ids is required' });
    }
    const ids = order.map(Number).filter(Number.isInteger);
    await prisma.$transaction(
      ids.map((id, idx) => prisma.heroSlide.update({ where: { id }, data: { sortOrder: idx } }))
    );
    audit(prisma, req, { action: 'reorder', entityType: 'hero-slide', summary: `Reordered ${ids.length} slides` });
    res.json({ success: true });
  } catch (error) {
    console.error('[hero-slides/reorder]', error);
    res.status(500).json({ error: 'Failed to reorder slides' });
  }
});

// ── Hero slide field whitelist — prevents arbitrary fields reaching Prisma ──
function buildHeroSlideData(body) {
  const data = {};
  if (body.image !== undefined) data.image = String(body.image);
  if (body.label !== undefined) data.label = String(body.label);
  if (body.tagline !== undefined) data.tagline = String(body.tagline);
  if (body.spec !== undefined) data.spec = String(body.spec);
  if (body.emoji !== undefined) data.emoji = String(body.emoji);
  if (body.href !== undefined) data.href = String(body.href);
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0;
  return data;
}

// Admin: Create hero slide
app.post('/api/admin/hero-slides', adminAuth, async (req, res) => {
  try {
    const slide = await prisma.heroSlide.create({
      data: buildHeroSlideData(req.body),
    });
    res.status(201).json(slide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hero slide' });
  }
});

// Admin: Update hero slide
app.put('/api/admin/hero-slides/:id', adminAuth, async (req, res) => {
  try {
    const slide = await prisma.heroSlide.update({
      where: { id: parseInt(req.params.id) },
      data: buildHeroSlideData(req.body),
    });
    res.json(slide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update hero slide' });
  }
});

// Admin: Delete hero slide
app.delete('/api/admin/hero-slides/:id', adminAuth, async (req, res) => {
  try {
    await prisma.heroSlide.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hero slide' });
  }
});

// ════════════════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════════════════

const VALID_REVIEW_SOURCES = ['direct', 'whatsapp', 'instagram'];

function serializeReview(r) {
  return {
    id: r.id,
    productId: r.productId,
    product: r.product ? {
      id: r.product.id,
      name: r.product.name,
      slug: r.product.slug,
      image: Array.isArray(r.product.images) && r.product.images.length > 0 ? r.product.images[0] : null,
    } : null,
    customerName: r.customerName,
    rating: r.rating,
    text: r.text,
    source: r.source,
    imageUrls: r.imageUrls || [],
    videoUrl: r.videoUrl || null,
    whatsappScreenshotUrl: r.whatsappScreenshotUrl || null,
    approved: r.approved,
    featured: r.featured,
    displayDate: r.displayDate,
    createdAt: r.createdAt,
  };
}

function validateReviewBody(body) {
  const name = (body.customerName || '').toString().trim();
  if (!name) return { valid: false, error: 'customerName is required' };
  if (name.length > 120) return { valid: false, error: 'customerName too long' };
  const rating = parseInt(body.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) return { valid: false, error: 'rating must be 1-5' };
  const text = (body.text || '').toString().trim();
  if (!text) return { valid: false, error: 'text is required' };
  if (text.length > 2000) return { valid: false, error: 'text too long (max 2000)' };
  const source = (body.source || 'direct').toString().toLowerCase();
  if (!VALID_REVIEW_SOURCES.includes(source)) return { valid: false, error: `source must be one of: ${VALID_REVIEW_SOURCES.join(', ')}` };
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.filter(u => typeof u === 'string' && u.trim()).slice(0, 8) : [];

  // Validate display date: reject future dates and anything older than 5 years.
  let displayDate = new Date();
  if (body.displayDate) {
    const d = new Date(body.displayDate);
    if (isNaN(d.getTime())) return { valid: false, error: 'displayDate is not a valid date' };
    const now = new Date();
    if (d.getTime() > now.getTime() + 24 * 60 * 60 * 1000) return { valid: false, error: 'displayDate cannot be in the future' };
    const fiveYearsAgo = new Date(); fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (d.getTime() < fiveYearsAgo.getTime()) return { valid: false, error: 'displayDate cannot be more than 5 years in the past' };
    displayDate = d;
  }

  return {
    valid: true,
    data: {
      customerName: name,
      rating,
      text,
      source,
      imageUrls,
      videoUrl: body.videoUrl ? String(body.videoUrl).trim() : null,
      whatsappScreenshotUrl: body.whatsappScreenshotUrl ? String(body.whatsappScreenshotUrl).trim() : null,
      productId: body.productId ? parseInt(body.productId) : null,
      approved: body.approved !== false,
      featured: body.featured === true,
      displayDate,
    },
  };
}

// Public: list reviews. Filters: productSlug, source, featured, limit.
app.get('/api/reviews', async (req, res) => {
  try {
    const { productSlug, productId, source, featured, limit } = req.query;
    const where = { approved: true };
    if (productSlug) {
      const p = await prisma.product.findUnique({ where: { slug: productSlug }, select: { id: true } });
      if (!p) return res.json([]);
      where.productId = p.id;
    } else if (productId) {
      where.productId = parseInt(productId);
    }
    if (source && VALID_REVIEW_SOURCES.includes(source)) where.source = source;
    if (featured === 'true') where.featured = true;
    const take = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const reviews = await prisma.review.findMany({
      where,
      include: { product: { select: { id: true, name: true, slug: true, images: true } } },
      orderBy: [{ featured: 'desc' }, { displayDate: 'desc' }],
      take,
    });
    res.json(reviews.map(serializeReview));
  } catch (error) {
    console.error('[reviews/list]', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Public: aggregate stats (count + avg) for a product slug or global
app.get('/api/reviews/stats', async (req, res) => {
  try {
    const { productSlug } = req.query;
    const where = { approved: true };
    if (productSlug) {
      const p = await prisma.product.findUnique({ where: { slug: productSlug }, select: { id: true } });
      if (!p) return res.json({ count: 0, average: 0 });
      where.productId = p.id;
    }
    const agg = await prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true },
    });
    res.json({
      count: agg._count._all || 0,
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review stats' });
  }
});

// Admin: list all reviews (incl. unapproved)
app.get('/api/admin/reviews', adminAuth, async (req, res) => {
  try {
    const { approved, source, productId } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const where = {};
    if (approved === 'true') where.approved = true;
    if (approved === 'false') where.approved = false;
    if (source && VALID_REVIEW_SOURCES.includes(source)) where.source = source;
    if (productId) where.productId = parseInt(productId);
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { product: { select: { id: true, name: true, slug: true, images: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);
    res.json({ reviews: reviews.map(serializeReview), total, page, limit });
  } catch (error) {
    console.error('[admin/reviews/list]', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Admin: create review
app.post('/api/admin/reviews', adminAuth, async (req, res) => {
  const validation = validateReviewBody(req.body);
  if (!validation.valid) return res.status(400).json({ error: validation.error });
  try {
    if (validation.data.productId) {
      const exists = await prisma.product.findUnique({ where: { id: validation.data.productId }, select: { id: true } });
      if (!exists) return res.status(400).json({ error: 'productId does not exist' });
    }
    const review = await prisma.review.create({
      data: validation.data,
      include: { product: { select: { id: true, name: true, slug: true, images: true } } },
    });
    res.status(201).json(serializeReview(review));
  } catch (error) {
    console.error('[admin/reviews/create]', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Admin: update review
app.put('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const validation = validateReviewBody(req.body);
  if (!validation.valid) return res.status(400).json({ error: validation.error });
  try {
    const review = await prisma.review.update({
      where: { id },
      data: validation.data,
      include: { product: { select: { id: true, name: true, slug: true, images: true } } },
    });
    res.json(serializeReview(review));
  } catch (error) {
    console.error('[admin/reviews/update]', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Admin: toggle approved / featured
app.patch('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const data = {};
  if (typeof req.body.approved === 'boolean') data.approved = req.body.approved;
  if (typeof req.body.featured === 'boolean') data.featured = req.body.featured;
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' });
  try {
    const review = await prisma.review.update({
      where: { id },
      data,
      include: { product: { select: { id: true, name: true, slug: true, images: true } } },
    });
    res.json(serializeReview(review));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Admin: delete review
app.delete('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    await prisma.review.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

app.listen(PORT, () => console.log(`🚀 UrbanEx API running on port ${PORT}`));
