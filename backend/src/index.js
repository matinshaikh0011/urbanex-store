import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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

// API Routes
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
    const { brand, category, featured } = req.query;
    const where = {};
    if (category) where.category = category;
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
      originalPrice: Number(p.originalPrice),
      images: p.images,
      sizes: p.sizes,
      colors: p.colors,
      category: p.category,
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
      originalPrice: Number(p.originalPrice),
      images: p.images,
      sizes: p.sizes,
      colors: p.colors,
      category: p.category,
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
      originalPrice: Number(product.originalPrice),
      isFeatured: product.isFeatured,
      inStock: product.inStock,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { productId, size, color, quantity, totalAmount, shippingName, shippingAddress, shippingEmail, shippingPhone, items } = req.body;
    const orderId = generateOrderId();

    // Handle both single product and cart checkout
    const firstItem = items && items.length > 0 ? items[0] : null;

    const order = await prisma.order.create({
      data: {
        orderId,
        totalAmount: parseFloat(totalAmount),
        status: 'Pending Advance',
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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`🚀 UrbanEx API running on port ${PORT}`));
