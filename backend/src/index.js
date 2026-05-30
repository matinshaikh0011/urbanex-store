import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { subcategories } from './catalog.js';

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
    const product = await prisma.product.create({
      data: {
        name: req.body.name, slug: req.body.slug, category: req.body.category,
        description: req.body.description, price: req.body.price,
        originalPrice: req.body.originalPrice || null, brandId: req.body.brandId,
        sizes: req.body.sizes, colors: req.body.colors,
        inStock: req.body.inStock ?? true, isFeatured: req.body.isFeatured ?? false,
        images: req.body.images || [],
        subcategory: req.body.subcategory || null,
      },
      include: { brand: true },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', adminAuth, async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: req.body.name, slug: req.body.slug, category: req.body.category,
        description: req.body.description, price: req.body.price,
        originalPrice: req.body.originalPrice || null, brandId: req.body.brandId,
        sizes: req.body.sizes, colors: req.body.colors,
        inStock: req.body.inStock, isFeatured: req.body.isFeatured,
        images: req.body.images || [],
        subcategory: req.body.subcategory || null,
      },
      include: { brand: true },
    });
    res.json(product);
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

app.listen(PORT, () => console.log(`🚀 UrbanEx API running on port ${PORT}`));
