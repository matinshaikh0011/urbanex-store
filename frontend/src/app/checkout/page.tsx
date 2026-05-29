'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const isCartCheckout = searchParams.get('type') === 'cart';

    if (isCartCheckout) {
      // Load cart items from session storage
      const storedCart = sessionStorage.getItem('urbanex_cart_checkout');
      if (storedCart) {
        try {
          const items = JSON.parse(storedCart);
          setCartItems(items);
          setLoading(false);
        } catch {
          router.replace('/cart');
        }
      } else {
        router.replace('/cart');
      }
    } else {
      // Single product checkout - redirect to products if no product param
      const productSlug = searchParams.get('product');
      if (!productSlug) {
        router.replace('/products');
      } else {
        setLoading(false);
      }
    }
  }, [searchParams, router]);

  if (!mounted || loading) {
    return (
      <>
        <GlobalPopup />
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </>
    );
  }

  const isCartCheckout = searchParams.get('type') === 'cart';
  const productSlug = searchParams.get('product');

  // If it's a cart checkout, show cart checkout form
  if (isCartCheckout) {
    if (cartItems.length === 0) {
      router.replace('/cart');
      return null;
    }
    return (
      <>
        <GlobalPopup />
        <Header />
        <CartCheckoutForm items={cartItems} />
      </>
    );
  }

  // Single product checkout
  if (productSlug) {
    return (
      <>
        <GlobalPopup />
        <Header />
        <SingleProductCheckout slug={productSlug} size={searchParams.get('size') || ''} />
      </>
    );
  }

  router.replace('/products');
  return null;
}

// Cart Checkout Form Component
function CartCheckoutForm({ items }: { items: CartItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.name || !formData.address || !formData.email || !formData.phone) {
      alert('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      // Create order for each item
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.id,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: total,
          shippingName: formData.name,
          shippingAddress: formData.address,
          shippingEmail: formData.email,
          shippingPhone: formData.phone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const order = await response.json();

      // Store order info for confirmation page
      sessionStorage.setItem('orderId', order.orderId);
      sessionStorage.setItem('orderItems', JSON.stringify(items));
      sessionStorage.setItem('orderTotal', total.toString());

      // Redirect to confirmation page
      router.push('/order-confirmation');
    } catch (error) {
      console.error('Order submission error:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.checkoutLogo}>
          <span className={styles.logoText}>URBAN<span className={styles.logoAccent}>EX</span></span>
        </div>
        <h1 className={styles.title}>CHECKOUT</h1>

        <div className={styles.content}>
          <div className={styles.itemsList}>
            <h2 className={styles.sectionTitle}>ORDER SUMMARY</h2>
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className={styles.item}>
                <div className={styles.itemImage}>
                  <img src={item.image} alt={item.name} />
                </div>
                <div className={styles.itemDetails}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemSize}>Size: {item.size} | Qty: {item.quantity}</span>
                </div>
                <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.sectionTitle}>SHIPPING DETAILS</h3>

            <div className={styles.field}>
              <label className={styles.label}>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Shipping Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="Enter your complete shipping address"
                rows={3}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="+91 9876543210"
              />
            </div>

            <div className={styles.paymentSection}>
              <h3 className={styles.sectionTitle}>PAYMENT METHOD</h3>
              <div className={styles.paymentOption}>
                <input type="radio" id="cod" name="payment" value="cod" checked readOnly />
                <label htmlFor="cod" className={styles.paymentLabel}>
                  <span className={styles.radioCustom}></span>
                  Cash on Delivery (Requires ₹300 Advance)
                </label>
              </div>
              <p className={styles.paymentNote}>
                Pay ₹300 advance via UPI/Google Pay/PhonePe to confirm your order. Balance on delivery.
              </p>
            </div>

            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Total Amount</span>
              <span className={styles.totalAmount}>{formatPrice(total)}</span>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'PLACING ORDER...' : 'PLACE ORDER'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

// Single Product Checkout Component
function SingleProductCheckout({ slug, size }: { slug: string; size: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => {
        router.replace('/products');
      });
  }, [slug, router]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    // Validation
    if (!formData.name || !formData.address || !formData.email || !formData.phone) {
      alert('Please fill in all fields');
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          size: size,
          quantity: 1,
          totalAmount: product.price,
          shippingName: formData.name,
          shippingAddress: formData.address,
          shippingEmail: formData.email,
          shippingPhone: formData.phone,
        }),
      });

      if (!response.ok) throw new Error('Failed to create order');

      const order = await response.json();
      sessionStorage.setItem('orderId', order.orderId);
      sessionStorage.setItem('orderProduct', product.name);
      sessionStorage.setItem('orderSize', size);
      sessionStorage.setItem('orderTotal', product.price.toString());

      router.push('/order-confirmation');
    } catch (error) {
      console.error('Order error:', error);
      alert('Failed to place order. Please try again. Make sure backend is running.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading || !product) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.checkoutLogo}>
          <span className={styles.logoText}>URBAN<span className={styles.logoAccent}>EX</span></span>
        </div>
        <h1 className={styles.title}>CHECKOUT</h1>

        <div className={styles.content}>
          <div className={styles.itemsList}>
            <h2 className={styles.sectionTitle}>ORDER SUMMARY</h2>
            <div className={styles.item}>
              <div className={styles.itemImage}>
                <img src={product.images[0]} alt={product.name} />
              </div>
              <div className={styles.itemDetails}>
                <span className={styles.itemName}>{product.name}</span>
                <span className={styles.itemSize}>Size: {size}</span>
              </div>
              <span className={styles.itemPrice}>{formatPrice(product.price)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.sectionTitle}>SHIPPING DETAILS</h3>

            <div className={styles.field}>
              <label className={styles.label}>Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Enter your full name" />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Shipping Address *</label>
              <textarea name="address" value={formData.address} onChange={handleChange} required placeholder="Enter your complete shipping address" rows={3} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="your@email.com" />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Phone Number *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="+91 9876543210" />
            </div>

            <div className={styles.paymentSection}>
              <h3 className={styles.sectionTitle}>PAYMENT METHOD</h3>
              <div className={styles.paymentOption}>
                <input type="radio" id="cod" name="payment" value="cod" checked readOnly />
                <label htmlFor="cod" className={styles.paymentLabel}>
                  <span className={styles.radioCustom}></span>
                  Cash on Delivery (Requires ₹300 Advance)
                </label>
              </div>
              <p className={styles.paymentNote}>
                Pay ₹300 advance via UPI/Google Pay/PhonePe to confirm your order. Balance on delivery.
              </p>
            </div>

            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Total Amount</span>
              <span className={styles.totalAmount}>{formatPrice(product.price)}</span>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={formLoading}>
              {formLoading ? 'PLACING ORDER...' : 'PLACE ORDER'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <>
        <GlobalPopup />
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>Loading Checkout...</div>
        </main>
      </>
    }>
      <CheckoutContent />
    </Suspense>
  );
}