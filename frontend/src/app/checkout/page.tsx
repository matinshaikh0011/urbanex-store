'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

// ── UPI payment config ──
const UPI_VPA = '9265110277@ptyes';
const UPI_NAME = 'Mr Shaikh Mohammad Matin';
const ADVANCE_AMOUNT = 300;

function buildUpiQr(amount: number) {
  // Format: https://upiqr.in/api/qr?name=...&vpa=...&amount=...
  const name = UPI_NAME.replace(/\s+/g, '+');
  return `https://upiqr.in/api/qr?name=${name}&vpa=${encodeURIComponent(UPI_VPA)}&amount=${amount}`;
}

// Fallback QR (encodes the standard UPI deep-link) in case the primary service is unavailable
function buildUpiQrFallback(amount: number) {
  const upiLink = `upi://pay?pa=${UPI_VPA}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;
}

const formatINR = (price: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);

// A valid UPI UTR / RRN is exactly 12 digits (no letters/spaces).
const UTR_REGEX = /^\d{12}$/;
const isValidUtr = (v: string) => UTR_REGEX.test(v.trim());

// ── Reusable UPI payment section ──
function PaymentSection({
  total,
  paymentMethod,
  setPaymentMethod,
  utrNumber,
  setUtrNumber,
}: {
  total: number;
  paymentMethod: 'cod' | 'prepaid';
  setPaymentMethod: (m: 'cod' | 'prepaid') => void;
  utrNumber: string;
  setUtrNumber: (v: string) => void;
}) {
  const payAmount = paymentMethod === 'prepaid' ? total : ADVANCE_AMOUNT;
  const qrUrl = buildUpiQr(payAmount);
  const trimmed = utrNumber.trim();
  const utrValid = isValidUtr(trimmed);
  const showUtrError = trimmed.length > 0 && !utrValid;
  return (
    <div className={styles.paymentSection}>
      <h3 className={styles.sectionTitle}>PAYMENT METHOD</h3>

      {/* Option 1 — COD advance */}
      <button
        type="button"
        className={`${styles.payCard} ${paymentMethod === 'cod' ? styles.payCardActive : ''}`}
        onClick={() => setPaymentMethod('cod')}
      >
        <span className={styles.radioCustom} data-checked={paymentMethod === 'cod'} />
        <span className={styles.payCardBody}>
          <span className={styles.payCardTitle}>CASH ON DELIVERY (PAY ₹300 ADVANCE)</span>
          <span className={styles.payCardSub}>Pay ₹300 now, balance on delivery</span>
        </span>
      </button>

      {/* Option 2 — Full prepaid */}
      <button
        type="button"
        className={`${styles.payCard} ${paymentMethod === 'prepaid' ? styles.payCardActive : ''}`}
        onClick={() => setPaymentMethod('prepaid')}
      >
        <span className={styles.radioCustom} data-checked={paymentMethod === 'prepaid'} />
        <span className={styles.payCardBody}>
          <span className={styles.payCardTitle}>FULL PREPAID PAYMENT</span>
          <span className={styles.payCardSub}>Get priority shipping ⚡</span>
        </span>
        <span className={styles.payBadge}>PRIORITY</span>
      </button>

      {/* QR + UTR block */}
      <div className={styles.qrBox}>
        <div className={styles.qrInstruction}>
          {paymentMethod === 'cod'
            ? 'Scan QR and pay ₹300 advance to confirm order. Balance on delivery.'
            : 'Scan QR and pay full amount for priority shipping.'}
        </div>

        <div className={styles.qrInner}>
          <div className={styles.qrImageWrap}>
            <img
              key={qrUrl}
              src={qrUrl}
              alt={`UPI QR for ${formatINR(payAmount)}`}
              className={styles.qrImage}
              width={220}
              height={220}
              onError={(e) => {
                const img = e.currentTarget;
                const fallback = buildUpiQrFallback(payAmount);
                if (img.src !== fallback) img.src = fallback;
              }}
            />
            <span className={styles.qrAmount}>PAY {formatINR(payAmount)}</span>
          </div>

          <div className={styles.qrMeta}>
            <div className={styles.qrMetaRow}>
              <span className={styles.qrMetaLabel}>UPI ID</span>
              <span className={styles.qrMetaValue}>{UPI_VPA}</span>
            </div>
            <div className={styles.qrMetaRow}>
              <span className={styles.qrMetaLabel}>NAME</span>
              <span className={styles.qrMetaValue}>{UPI_NAME}</span>
            </div>
            <div className={styles.upiApps}>
              <span className={`${styles.upiApp} ${styles.gpay}`}>GPay</span>
              <span className={`${styles.upiApp} ${styles.phonepe}`}>PhonePe</span>
              <span className={`${styles.upiApp} ${styles.paytm}`}>Paytm</span>
              <span className={`${styles.upiApp} ${styles.bhim}`}>BHIM</span>
            </div>
          </div>
        </div>

        {/* UTR input */}
        <div className={styles.field}>
          <label className={styles.label}>UTR / Transaction ID *</label>
          <input
            type="text"
            inputMode="numeric"
            name="utrNumber"
            value={utrNumber}
            onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
            required
            maxLength={12}
            aria-invalid={showUtrError}
            className={showUtrError ? styles.inputError : (utrValid ? styles.inputValid : '')}
            placeholder="Enter 12-digit UPI reference / UTR number"
          />
          {showUtrError && (
            <span className={styles.utrHint}>UTR must be exactly 12 digits — check the reference number in your UPI app.</span>
          )}
          {utrValid && (
            <span className={styles.utrOk}>✓ Looks good — we&apos;ll verify this payment before dispatch.</span>
          )}
        </div>

        <p className={styles.verifyNote}>🔒 Your order will be confirmed after payment verification</p>
      </div>
    </div>
  );
}

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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'prepaid'>('cod');
  const [utrNumber, setUtrNumber] = useState('');
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

    if (!isValidUtr(utrNumber)) {
      alert('Please enter a valid 12-digit UTR / Transaction ID after completing the UPI payment.');
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
          paymentMethod,
          amountPaid: paymentMethod === 'prepaid' ? total : ADVANCE_AMOUNT,
          utrNumber: utrNumber.trim(),
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

      // Store order info for confirmation page (+ WhatsApp notification details)
      sessionStorage.setItem('orderId', order.orderId);
      sessionStorage.setItem('orderItems', JSON.stringify(items));
      sessionStorage.setItem('orderTotal', total.toString());
      sessionStorage.setItem('orderCustomer', JSON.stringify({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        product: items.map(i => `${i.name} (x${i.quantity})`).join(', '),
        size: items.map(i => i.size).join(', '),
        paymentMethod,
        amountPaid: paymentMethod === 'prepaid' ? total : ADVANCE_AMOUNT,
      }));

      // Save to local order history (account page)
      try {
        const hist = JSON.parse(localStorage.getItem('urbanex_orders') || '[]');
        hist.unshift({
          orderId: order.orderId,
          date: new Date().toISOString(),
          products: items.map(i => ({ name: i.name, slug: undefined, size: i.size, quantity: i.quantity, price: i.price })),
          status: 'Pending Verification',
          total,
        });
        localStorage.setItem('urbanex_orders', JSON.stringify(hist.slice(0, 50)));
      } catch { /* ignore */ }

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

            <PaymentSection
              total={total}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              utrNumber={utrNumber}
              setUtrNumber={setUtrNumber}
            />

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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'prepaid'>('cod');
  const [utrNumber, setUtrNumber] = useState('');
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

    if (!isValidUtr(utrNumber)) {
      alert('Please enter a valid 12-digit UTR / Transaction ID after completing the UPI payment.');
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
          paymentMethod,
          amountPaid: paymentMethod === 'prepaid' ? product.price : ADVANCE_AMOUNT,
          utrNumber: utrNumber.trim(),
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
      sessionStorage.setItem('orderCustomer', JSON.stringify({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        product: product.name,
        size: size,
        paymentMethod,
        amountPaid: paymentMethod === 'prepaid' ? product.price : ADVANCE_AMOUNT,
      }));

      // Save to local order history (account page)
      try {
        const hist = JSON.parse(localStorage.getItem('urbanex_orders') || '[]');
        hist.unshift({
          orderId: order.orderId,
          date: new Date().toISOString(),
          products: [{ name: product.name, slug: product.slug, size, quantity: 1, price: product.price }],
          status: 'Pending Verification',
          total: product.price,
        });
        localStorage.setItem('urbanex_orders', JSON.stringify(hist.slice(0, 50)));
      } catch { /* ignore */ }

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

            <PaymentSection
              total={product.price}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              utrNumber={utrNumber}
              setUtrNumber={setUtrNumber}
            />

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