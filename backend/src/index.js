import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { subcategories } from './catalog.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

function generateOrderId() {
  const chars = '0123456789';
  let result = 'UEX-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.get('/api/brands', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { brand, category, subcategory, featured } = req.query;
    const where = {};
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (featured === 'true') where.isFeatured = true;
    if (brand) where.brand = { slug: brand };
    const products = await prisma.product.findMany({
      where,
      include: { brand: true },
    });
    const formatted = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      images: p.images,
      sizes: p.sizes,
      colors: p.colors,
      category: p.category,
      subcategory: p.subcategory,
      isFeatured: p.isFeatured,
      inStock: p.inStock,
      brand: p.brand,
      brandId: p.brandId,
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Subcategory metadata for storefront filters
app.get('/api/subcategories', (req, res) => {
  res.json(subcategories);
});

app.get('/api/products/featured', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isFeatured: true },
      include: { brand: true },
    });
    const formatted = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      images: p.images,
      sizes: p.sizes,
      colors: p.colors,
      category: p.category,
      subcategory: p.subcategory,
      isFeatured: p.isFeatured,
      inStock: p.inStock,
      brand: p.brand,
      brandId: p.brandId,
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

app.get('/api/products/:slug', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { brand: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({
      ...product,
      price: Number(product.price),
      originalPrice: product.originalPrice != null ? Number(product.originalPrice) : null,
      isFeatured: product.isFeatured,
      inStock: product.inStock,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { productId, size, color, quantity, totalAmount, paymentMethod, utrNumber, amountPaid, shippingName, shippingAddress, shippingEmail, shippingPhone, items } = req.body;

    // Server-side UTR validation — must be exactly 12 digits
    const cleanUtr = (utrNumber || '').toString().trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      return res.status(400).json({ error: 'A valid 12-digit UTR / Transaction ID is required.' });
    }

    const orderId = generateOrderId();
    const firstItem = items && items.length > 0 ? items[0] : null;
    const order = await prisma.order.create({
      data: {
        orderId,
        totalAmount: parseFloat(totalAmount),
        status: 'Pending Verification',
        paymentMethod: paymentMethod || 'cod',
        utrNumber: cleanUtr,
        amountPaid: amountPaid != null ? parseFloat(amountPaid) : null,
        shippingName,
        shippingAddress,
        shippingEmail,
        shippingPhone,
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

app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { orderId: req.params.orderId },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// All orders (admin)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { product: { include: { brand: true } } },
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (admin)
app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const updated = await prisma.order.update({
      where: { orderId: req.params.orderId },
      data: { status },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`🚀 UrbanEx API running on port ${PORT}`));
