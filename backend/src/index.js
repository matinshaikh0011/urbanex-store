import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import FormData from 'form-data';
import { PrismaClient } from '@prisma/client';
import { subcategories } from './catalog.js';
import { validateProductData, buildProductData, slugify } from './productUtils.js';
import { getProvider, detectProvider } from './scrapers/index.js';
import { fetchProductDetail } from './scrapers/cartpeProvider.js';

// ── Background Scan Job Store ─────────────────────────────────
// Scan jobs run in the background so the HTTP response returns
// immediately, avoiding Render's 30-second timeout for large catalogs.
//
// Jobs are stored in-memory (sufficient for a single-instance server).
// Each job has the shape:
//   { status, pagesScanned, productsFound, products, error, startedAt, completedAt }

const scanJobs = new Map();

function createScanJob() {
  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  scanJobs.set(jobId, {
    status: 'running',     // 'running' | 'done' | 'error'
    pagesScanned: 0,
    productsFound: 0,
    products: null,        // null while running, array when done
    error: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  });
  // Auto-expire after 30 minutes to avoid memory leaks
  setTimeout(() => scanJobs.delete(jobId), 30 * 60 * 1000);
  return jobId;
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;
const prisma = new PrismaClient();

// ── CORS: allow credentials so HttpOnly cookies work cross-origin ──
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_in_prod');
    if (decoded.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ════════════════════════════════════════════════════════════════

app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    // Fallback for dev: allow hardcoded password if no hash set
    let isValid = false;
    if (passwordHash) {
      isValid = await bcrypt.compare(password, passwordHash);
    } else {
      // Dev fallback — remove in production
      isValid = password === 'urbanex@admin2026';
    }

    if (!isValid) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET || 'dev_secret_change_in_prod',
      { expiresIn: '24h' }
    );

    res.cookie('urbanex_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

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
  res.json({ authenticated: true });
});

// ════════════════════════════════════════════════════════════════
// ADMIN STATS
// ════════════════════════════════════════════════════════════════

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const [totalOrders, pendingOrders, totalProducts, outOfStock, revenue, activeCoupons, recentOrders, outOfStockProducts] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['Pending Advance', 'Pending Verification'] } } }),
      prisma.product.count(),
      prisma.product.count({ where: { inStock: false } }),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.coupon.count({ where: { isActive: true } }).catch(() => 0),
      prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { product: { include: { brand: true } } } }),
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
    const orders = await prisma.order.findMany({
      include: { product: { include: { brand: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.put('/api/admin/orders/:orderId/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { orderId: req.params.orderId },
      data: { status },
    });
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
    await prisma.order.delete({ where: { orderId: req.params.orderId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
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
    const brands = await prisma.brand.findMany({ include: { _count: { select: { products: true } } } });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

app.post('/api/brands', adminAuth, async (req, res) => {
  try {
    const brand = await prisma.brand.create({ data: { name: req.body.name, slug: req.body.slug, logoUrl: req.body.logoUrl } });
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

app.put('/api/brands/:id', adminAuth, async (req, res) => {
  try {
    const brand = await prisma.brand.update({
      where: { id: parseInt(req.params.id) },
      data: { name: req.body.name, slug: req.body.slug, logoUrl: req.body.logoUrl },
    });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

app.delete('/api/brands/:id', adminAuth, async (req, res) => {
  try {
    await prisma.brand.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete brand' });
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
    const { brand, category, subcategory, featured } = req.query;
    const where = {};
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (featured === 'true') where.isFeatured = true;
    if (brand) where.brand = { slug: brand };
    const products = await prisma.product.findMany({ where, include: { brand: true } });
    res.json(products.map(p => ({
      id: p.id, name: p.name, slug: p.slug, description: p.description,
      price: Number(p.price), originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      images: p.images, sizes: p.sizes, colors: p.colors, category: p.category,
      subcategory: p.subcategory, isFeatured: p.isFeatured, inStock: p.inStock,
      brand: p.brand, brandId: p.brandId,
    })));
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

app.post('/api/products', adminAuth, async (req, res) => {
  try {
    const validation = validateProductData(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    const product = await prisma.product.create({
      data: buildProductData(req.body),
      include: { brand: true },
    });
    res.status(201).json({ ...product, price: Number(product.price), originalPrice: product.originalPrice != null ? Number(product.originalPrice) : null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', adminAuth, async (req, res) => {
  try {
    const validation = validateProductData(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: buildProductData(req.body),
      include: { brand: true },
    });
    res.json({ ...product, price: Number(product.price), originalPrice: product.originalPrice != null ? Number(product.originalPrice) : null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
  try {
    await prisma.order.updateMany({ where: { productId: parseInt(req.params.id) }, data: { productId: null } });
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
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

// ════════════════════════════════════════════════════════════════
// ORDERS (public + legacy)
// ════════════════════════════════════════════════════════════════

app.post('/api/orders', async (req, res) => {
  try {
    const { productId, size, color, quantity, totalAmount, paymentMethod, utrNumber, amountPaid, shippingName, shippingAddress, shippingEmail, shippingPhone, items } = req.body;
    const cleanUtr = (utrNumber || '').toString().trim();
    if (!/^\d{12}$/.test(cleanUtr)) return res.status(400).json({ error: 'A valid 12-digit UTR / Transaction ID is required.' });

    const orderId = generateOrderId();
    const firstItem = items && items.length > 0 ? items[0] : null;
    const order = await prisma.order.create({
      data: {
        orderId, totalAmount: parseFloat(totalAmount), status: 'Pending Verification',
        paymentMethod: paymentMethod || 'cod', utrNumber: cleanUtr,
        amountPaid: amountPaid != null ? parseFloat(amountPaid) : null,
        shippingName, shippingAddress, shippingEmail, shippingPhone,
        productId: firstItem ? parseInt(firstItem.productId) : (productId ? parseInt(productId) : null),
        size: firstItem ? firstItem.size : (size || null),
        color: firstItem ? firstItem.color : (color || null),
        quantity: firstItem ? (firstItem.quantity || 1) : (quantity || 1),
      },
    });
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, include: { product: { include: { brand: true } } } });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { orderId: req.params.orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const updated = await prisma.order.update({ where: { orderId: req.params.orderId }, data: { status } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.delete('/api/orders/:orderId', async (req, res) => {
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
  const jobId = createScanJob();
  const job = scanJobs.get(jobId);

  // Run the scan asynchronously (do NOT await — this is intentional)
  (async () => {
    try {
      const scrapeResult = await provider.scrape(url, scope, {
        delayMs,
        onProgress: (pagesScanned, productsFound) => {
          if (scanJobs.has(jobId)) {
            job.pagesScanned = pagesScanned;
            job.productsFound = productsFound;
          }
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
      if (scanJobs.has(jobId)) {
        job.status = 'done';
        job.products = enriched;
        job.productsFound = enriched.length;
        job.completedAt = new Date().toISOString();
        job.provider = resolvedKey;
        job.stats = {
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
      }
    } catch (err) {
      console.error('[scraper/scan background]', err);
      if (scanJobs.has(jobId)) {
        job.status = 'error';
        job.error = err.message;
        job.completedAt = new Date().toISOString();
      }
    }
  })();

  // Respond immediately with the job ID — client polls for progress
  res.json({ jobId, status: 'running' });
});

// GET /api/admin/scraper/scan/status/:jobId — poll for scan progress
app.get('/api/admin/scraper/scan/status/:jobId', adminAuth, (req, res) => {
  const job = scanJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found or expired' });

  if (job.status === 'running') {
    return res.json({
      status: 'running',
      pagesScanned: job.pagesScanned,
      productsFound: job.productsFound,
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

  // Clean up completed job after it's been fetched
  scanJobs.delete(req.params.jobId);
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

  // Phase 1 — Pre-validation
  const validProducts = [];
  for (const p of incoming) {
    if (p.brandId === 'no-brand' || p.brandId == null) {
      skippedCount++;
      log.push({ sourceId: p.sourceId, operation: 'skipped', errorMessage: 'no-brand-assigned' });
      continue;
    }
    const productData = {
      ...p,
      source,
      sourceId: p.sourceId,
      sourceUrl: p.productUrl || null,
      slug: p.slug || (slugify(p.name) + (p.sourceId ? `-${p.sourceId}` : '')),
    };
    const validation = validateProductData(productData);
    if (!validation.valid) {
      failureCount++;
      log.push({ sourceId: p.sourceId, operation: 'failed', errorMessage: validation.error });
      continue;
    }
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

          // ── Price assignment (correct direction) ──────────────────────────
          // detail.sourcePrice = CartPe's selling price (what they charge)
          // detail.originalPrice = CartPe's MRP (struck-through price)
          // The admin UI may have added a margin to sourcePrice before import.
          // p.sourcePrice (from scan listing) is the CartPe selling price.
          // p.price (set by admin in the import UI) = sourcePrice + margin = our selling price.
          //
          // We want:
          //   price         = p.price (admin-set, already includes margin)
          //   originalPrice = detail.originalPrice (CartPe MRP) if it's > p.price,
          //                   else Math.round(p.price * 1.4)
          //
          // We do NOT overwrite p.price here — the admin already set it.
          // We only update originalPrice from the detail page's MRP.
          if (detail.originalPrice && detail.originalPrice > p.price) {
            p.originalPrice = detail.originalPrice;
          }
          // If detail has no valid MRP, leave p.originalPrice as-is;
          // buildProductData will enforce originalPrice > price via its own rule.

          console.log(`[PRICE DEBUG] name="${p.name}" sourcePrice=${detail.sourcePrice} margin=${p.price - detail.sourcePrice} finalPrice=${p.price} originalPrice=${p.originalPrice}`);

          if (detail.images && detail.images.length > 0) p.images = detail.images;
          if (detail.description) p.description = detail.description;
          p.inStock = detail.inStock;
          // Always apply sizes from detail page — listing scan returns {} which breaks purchase flow
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

  // Phase 3 — Transaction
  try {
    await prisma.$transaction(async (tx) => {
      for (const p of validProducts) {
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
      console.log(`[PRICE DEBUG] sync name="${product.name}" price=${updateData.price} originalPrice=${updateData.originalPrice}`);
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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`🚀 UrbanEx API running on port ${PORT}`));
