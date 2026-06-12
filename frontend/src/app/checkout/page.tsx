'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

// ── UPI payment config ──
const UPI_VPA = '9265110277@ptyes';
const UPI_NAME = 'Mr Shaikh Mohammad Matin';
const ADVANCE_AMOUNT = 300;
const WHATSAPP_NUMBER = '919898285850';
const PAYMENT_WINDOW_SECONDS = 120; // 2-minute payment timer

function buildUpiLink(amount: number) {
  return `upi://pay?pa=${UPI_VPA}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('UrbanEx Order')}`;
}

const formatINR = (price: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);

// A valid UPI UTR / RRN is exactly 12 digits.
const UTR_REGEX = /^\d{12}$/;
const isValidUtr = (v: string) => UTR_REGEX.test(v.trim());

// ════════════════════════════════════════════════════════════════
// PAYMENT METHOD SELECTOR (inline, left column)
// ════════════════════════════════════════════════════════════════
function PaymentMethodSelector({
  paymentMethod,
  setPaymentMethod,
}: {
  paymentMethod: 'cod' | 'prepaid';
  setPaymentMethod: (m: 'cod' | 'prepaid') => void;
}) {
  return (
    <div className={styles.paymentSection}>
      <h3 className={styles.sectionTitle}>PAYMENT METHOD</h3>

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

      <p className={styles.payHint}>
        Choose a method, then tap <strong>Proceed to Payment</strong> to scan the UPI QR and confirm.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PAYMENT MODAL — 2-step: (1) QR + timer  →  (2) upload + UTR
// ════════════════════════════════════════════════════════════════
function PaymentModal({
  open,
  onClose,
  paymentMethod,
  payAmount,
  utrNumber,
  setUtrNumber,
  screenshot,
  setScreenshot,
  onComplete,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  paymentMethod: 'cod' | 'prepaid';
  payAmount: number;
  utrNumber: string;
  setUtrNumber: (v: string) => void;
  screenshot: string | null;
  setScreenshot: (v: string | null) => void;
  onComplete: () => void;
  loading: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_WINDOW_SECONDS);
  const [fileError, setFileError] = useState('');

  const trimmed = utrNumber.trim();
  const utrValid = isValidUtr(trimmed);
  const showUtrError = trimmed.length > 0 && !utrValid;

  // Reset to step 1 + restart timer each time the modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setSecondsLeft(PAYMENT_WINDOW_SECONDS);
      setFileError('');
    }
  }, [open]);

  // Generate QR for the amount
  useEffect(() => {
    if (!open) return;
    let active = true;
    QRCode.toDataURL(buildUpiLink(payAmount), {
      width: 460,
      margin: 1,
      color: { dark: '#0a0a0a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => { if (active) setQrDataUrl(url); })
      .catch(() => { if (active) setQrDataUrl(''); });
    return () => { active = false; };
  }, [open, payAmount]);

  // Countdown — only runs while on step 1 and modal is open
  useEffect(() => {
    if (!open || step !== 1) return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [open, step, secondsLeft]);

  // Lock background scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const timeUp = secondsLeft <= 0;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFileError('Please upload an image file (PNG / JPG).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFileError('Image is too large — please upload one under 8MB.');
      return;
    }
    setFileError('');
    const reader = new FileReader();
    reader.onload = () => setScreenshot(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const canComplete = utrValid && !!screenshot && !loading;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Complete payment">
      <div className={styles.modal}>
        {/* Header strip */}
        <div className={styles.modalHead}>
          <span className={styles.modalHeadTitle}>
            {step === 1 ? 'SCAN & PAY' : 'CONFIRM PAYMENT'}
          </span>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close" type="button">✕</button>
        </div>

        {/* Step indicator */}
        <div className={styles.steps}>
          <span className={`${styles.stepDot} ${step >= 1 ? styles.stepDotActive : ''}`}>1<span>PAY</span></span>
          <span className={styles.stepLine} />
          <span className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''}`}>2<span>CONFIRM</span></span>
        </div>

        <div className={styles.modalBody}>
          {step === 1 ? (
            <>
              <p className={styles.modalInstruction}>
                {paymentMethod === 'cod'
                  ? 'Scan the QR and pay the ₹300 advance to reserve your order. Balance is collected on delivery.'
                  : 'Scan the QR and pay the full amount for priority shipping.'}
              </p>

              {/* Timer */}
              <div className={`${styles.timer} ${timeUp ? styles.timerUp : ''}`}>
                <span className={styles.timerLabel}>{timeUp ? 'TIME EXPIRED' : 'COMPLETE PAYMENT WITHIN'}</span>
                <span className={styles.timerClock}>{timeUp ? '00:00' : `${mm}:${ss}`}</span>
              </div>

              <div className={styles.qrWrap}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`UPI QR for ${formatINR(payAmount)}`} className={styles.qrImage} />
                ) : (
                  <div className={`${styles.qrImage} ${styles.qrLoading}`}>Generating QR…</div>
                )}
                <span className={styles.qrAmount}>PAY {formatINR(payAmount)}</span>
              </div>

              <div className={styles.upiMeta}>
                <div className={styles.upiMetaRow}>
                  <span className={styles.upiMetaLabel}>UPI ID</span>
                  <span className={styles.upiMetaValue}>{UPI_VPA}</span>
                </div>
                <div className={styles.upiMetaRow}>
                  <span className={styles.upiMetaLabel}>NAME</span>
                  <span className={styles.upiMetaValue}>{UPI_NAME}</span>
                </div>
              </div>
              <div className={styles.upiApps}>
                <span className={`${styles.upiApp} ${styles.gpay}`}>GPay</span>
                <span className={`${styles.upiApp} ${styles.phonepe}`}>PhonePe</span>
                <span className={`${styles.upiApp} ${styles.paytm}`}>Paytm</span>
                <span className={`${styles.upiApp} ${styles.bhim}`}>BHIM</span>
              </div>

              {timeUp && (
                <button
                  type="button"
                  className={styles.regenBtn}
                  onClick={() => setSecondsLeft(PAYMENT_WINDOW_SECONDS)}
                >
                  ↻ RESTART TIMER
                </button>
              )}

              <button type="button" className={styles.modalPrimary} onClick={() => setStep(2)}>
                I&apos;VE PAID — NEXT →
              </button>
              <p className={styles.modalNote}>Already paid? Continue to upload your payment proof.</p>
            </>
          ) : (
            <>
              <p className={styles.modalInstruction}>
                Attach a <strong>screenshot of your payment</strong> and enter the <strong>UPI reference / UTR number</strong> shown in your payment app. Our team verifies this before dispatch.
              </p>

              {/* Screenshot upload */}
              <label className={styles.uploadLabel}>PAYMENT SCREENSHOT *</label>
              {screenshot ? (
                <div className={styles.uploadPreview}>
                  <img src={screenshot} alt="Payment screenshot preview" />
                  <button type="button" className={styles.uploadRemove} onClick={() => setScreenshot(null)} aria-label="Remove screenshot">✕</button>
                </div>
              ) : (
                <label className={styles.uploadBox}>
                  <input type="file" accept="image/*" onChange={handleFile} hidden />
                  <span className={styles.uploadIcon}>⬆</span>
                  <span className={styles.uploadText}>Tap to upload screenshot</span>
                  <span className={styles.uploadHint}>PNG or JPG, up to 8MB</span>
                </label>
              )}
              {fileError && <span className={styles.fieldError}>{fileError}</span>}

              {/* UTR */}
              <label className={styles.uploadLabel} style={{ marginTop: 18 }}>UTR / TRANSACTION ID *</label>
              <input
                type="text"
                inputMode="numeric"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                maxLength={12}
                aria-invalid={showUtrError}
                className={`${styles.modalInput} ${showUtrError ? styles.inputError : (utrValid ? styles.inputValid : '')}`}
                placeholder="Enter 12-digit UPI reference / UTR number"
              />
              {showUtrError && (
                <span className={styles.fieldError}>UTR must be exactly 12 digits — check the reference number in your UPI app.</span>
              )}
              {utrValid && (
                <span className={styles.fieldOk}>✓ Looks good — we&apos;ll verify this before dispatch.</span>
              )}

              <div className={styles.modalBtnRow}>
                <button type="button" className={styles.modalBack} onClick={() => setStep(1)}>← BACK</button>
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={onComplete}
                  disabled={!canComplete}
                >
                  {loading ? 'PLACING ORDER…' : 'COMPLETE ORDER'}
                </button>
              </div>
              <p className={styles.modalNote}>🔒 Your order is confirmed after our team verifies the payment.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CouponSection({
  total,
  onApply,
  onRemove,
  appliedCoupon,
  discountAmount,
}: {
  total: number;
  onApply: (code: string, discount: number) => void;
  onRemove: () => void;
  appliedCoupon: string | null;
  discountAmount: number | null;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), orderAmount: total }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setError(data.error || 'Invalid coupon code');
      } else {
        onApply(code.trim().toUpperCase(), data.discountAmount);
        setCode('');
      }
    } catch (err) {
      setError('Failed to validate coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.couponSection}>
      <h3 className={styles.sectionTitle}>HAVE A COUPON?</h3>
      {appliedCoupon ? (
        <div className={styles.appliedCouponBox}>
          <div className={styles.appliedCouponInfo}>
            <span className={styles.appliedCouponCode}>{appliedCoupon}</span>
            <span className={styles.appliedCouponSaved}>- {formatINR(discountAmount || 0)}</span>
          </div>
          <button type="button" className={styles.removeCouponBtn} onClick={onRemove}>✕</button>
        </div>
      ) : (
        <div className={styles.couponInputGroup}>
          <input
            type="text"
            className={styles.couponInput}
            placeholder="Enter coupon code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApply())}
          />
          <button
            type="button"
            className={styles.applyCouponBtn}
            onClick={handleApply}
            disabled={loading || !code.trim()}
          >
            {loading ? '...' : 'APPLY'}
          </button>
        </div>
      )}
      {error && <span className={styles.couponError}>{error}</span>}
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

// Validate shipping fields; returns error string or null
function validateShipping(f: { name: string; address: string; email: string; phone: string }) {
  if (!f.name.trim() || !f.address.trim() || !f.email.trim() || !f.phone.trim()) {
    return 'Please fill in all shipping details before proceeding to payment.';
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
// CART CHECKOUT
// ════════════════════════════════════════════════════════════════
function CartCheckoutForm({ items }: { items: CartItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'prepaid'>('cod');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', email: '', phone: '' });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - (discountAmount || 0);
  const payAmount = paymentMethod === 'prepaid' ? total : ADVANCE_AMOUNT;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateShipping(formData);
    if (err) { alert(err); return; }
    setModalOpen(true);
  };

  const handleComplete = async () => {
    if (!isValidUtr(utrNumber)) {
      alert('Please enter a valid 12-digit UTR / Transaction ID.');
      return;
    }
    if (!screenshot) {
      alert('Please upload a screenshot of your payment.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.id,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: total,
          paymentMethod,
          amountPaid: payAmount,
          utrNumber: utrNumber.trim(),
          couponCode: appliedCoupon,
          discountAmount: discountAmount,
          shippingName: formData.name,
          shippingAddress: formData.address,
          shippingEmail: formData.email,
          shippingPhone: formData.phone,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const order = await response.json();

      sessionStorage.setItem('orderId', order.orderId);
      sessionStorage.setItem('orderItems', JSON.stringify(items));
      sessionStorage.setItem('orderTotal', total.toString());
      try { sessionStorage.setItem('orderScreenshot', screenshot); } catch { /* may exceed quota */ }
      sessionStorage.setItem('orderCustomer', JSON.stringify({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        product: items.map(i => `${i.name} (x${i.quantity})`).join(', '),
        size: items.map(i => i.size).join(', '),
        paymentMethod,
        amountPaid: payAmount,
        utrNumber: utrNumber.trim(),
      }));

      try {
        const hist = JSON.parse(localStorage.getItem('urbanex_orders') || '[]');
        hist.unshift({
          orderId: order.orderId,
          date: new Date().toISOString(),
          products: items.map(i => ({ name: i.name, slug: undefined, size: i.size, quantity: i.quantity, price: i.price })),
          status: 'Pending Verification',
          total,
          couponCode: appliedCoupon,
          discountAmount: discountAmount,
        });
        localStorage.setItem('urbanex_orders', JSON.stringify(hist.slice(0, 50)));
      } catch { /* ignore */ }

      router.push('/order-confirmation');
    } catch (error) {
      console.error('Order submission error:', error);
      alert(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
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

        <form onSubmit={handleProceed} className={styles.content}>
          <div className={styles.leftCol}>
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

            <PaymentMethodSelector paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />
          </div>

          <div className={styles.rightCol}>
            <h2 className={styles.sectionTitle}>ORDER SUMMARY</h2>
            <div className={styles.itemsList}>
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className={styles.item}>
                  <div className={styles.itemImage}>
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className={styles.itemDetails}>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemSize}>Size: {item.size} | Qty: {item.quantity}</span>
                  </div>
                  <span className={styles.itemPrice}>{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <CouponSection
              total={subtotal}
              appliedCoupon={appliedCoupon}
              discountAmount={discountAmount}
              onApply={(code, discount) => { setAppliedCoupon(code); setDiscountAmount(discount); }}
              onRemove={() => { setAppliedCoupon(null); setDiscountAmount(null); }}
            />

            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Total Amount</span>
              <span className={styles.totalAmount}>{formatINR(total)}</span>
            </div>

            <button type="submit" className={styles.submitBtn}>PROCEED TO PAYMENT →</button>
          </div>
        </form>
      </div>

      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        paymentMethod={paymentMethod}
        payAmount={payAmount}
        utrNumber={utrNumber}
        setUtrNumber={setUtrNumber}
        screenshot={screenshot}
        setScreenshot={setScreenshot}
        onComplete={handleComplete}
        loading={loading}
      />
    </main>
  );
}

// ════════════════════════════════════════════════════════════════
// SINGLE PRODUCT CHECKOUT
// ════════════════════════════════════════════════════════════════
function SingleProductCheckout({ slug, size }: { slug: string; size: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'prepaid'>('cod');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', email: '', phone: '' });

  const total = product ? product.price - (discountAmount || 0) : 0;
  const payAmount = paymentMethod === 'prepaid' ? total : ADVANCE_AMOUNT;

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then(res => res.json())
      .then(data => { setProduct(data); setLoading(false); })
      .catch(() => { router.replace('/products'); });
  }, [slug, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateShipping(formData);
    if (err) { alert(err); return; }
    setModalOpen(true);
  };

  const handleComplete = async () => {
    if (!isValidUtr(utrNumber)) {
      alert('Please enter a valid 12-digit UTR / Transaction ID.');
      return;
    }
    if (!screenshot) {
      alert('Please upload a screenshot of your payment.');
      return;
    }
    setFormLoading(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          size: size,
          quantity: 1,
          totalAmount: total,
          paymentMethod,
          amountPaid: payAmount,
          utrNumber: utrNumber.trim(),
          couponCode: appliedCoupon,
          discountAmount: discountAmount,
          shippingName: formData.name,
          shippingAddress: formData.address,
          shippingEmail: formData.email,
          shippingPhone: formData.phone,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const order = await response.json();
      sessionStorage.setItem('orderId', order.orderId);
      sessionStorage.setItem('orderProduct', product.name);
      sessionStorage.setItem('orderSize', size);
      sessionStorage.setItem('orderTotal', total.toString());
      try { sessionStorage.setItem('orderScreenshot', screenshot); } catch { /* may exceed quota */ }
      sessionStorage.setItem('orderCustomer', JSON.stringify({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        product: product.name,
        size: size,
        paymentMethod,
        amountPaid: payAmount,
        utrNumber: utrNumber.trim(),
      }));

      try {
        const hist = JSON.parse(localStorage.getItem('urbanex_orders') || '[]');
        hist.unshift({
          orderId: order.orderId,
          date: new Date().toISOString(),
          products: [{ name: product.name, slug: product.slug, size, quantity: 1, price: product.price }],
          status: 'Pending Verification',
          total: total,
          couponCode: appliedCoupon,
          discountAmount: discountAmount,
        });
        localStorage.setItem('urbanex_orders', JSON.stringify(hist.slice(0, 50)));
      } catch { /* ignore */ }

      router.push('/order-confirmation');
    } catch (error) {
      console.error('Order error:', error);
      alert(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure backend is running.`);
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

        <form onSubmit={handleProceed} className={styles.content}>
          <div className={styles.leftCol}>
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

            <PaymentMethodSelector paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />
          </div>

          <div className={styles.rightCol}>
            <h2 className={styles.sectionTitle}>ORDER SUMMARY</h2>
            <div className={styles.itemsList}>
              <div className={styles.item}>
                <div className={styles.itemImage}>
                  <img src={product.images[0]} alt={product.name} />
                </div>
                <div className={styles.itemDetails}>
                  <span className={styles.itemName}>{product.name}</span>
                  <span className={styles.itemSize}>Size: {size}</span>
                </div>
                <span className={styles.itemPrice}>{formatINR(product.price)}</span>
              </div>
            </div>

            <CouponSection
              total={product.price}
              appliedCoupon={appliedCoupon}
              discountAmount={discountAmount}
              onApply={(code, discount) => { setAppliedCoupon(code); setDiscountAmount(discount); }}
              onRemove={() => { setAppliedCoupon(null); setDiscountAmount(null); }}
            />

            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Total Amount</span>
              <span className={styles.totalAmount}>{formatINR(total)}</span>
            </div>

            <button type="submit" className={styles.submitBtn}>PROCEED TO PAYMENT →</button>
          </div>
        </form>
      </div>

      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        paymentMethod={paymentMethod}
        payAmount={payAmount}
        utrNumber={utrNumber}
        setUtrNumber={setUtrNumber}
        screenshot={screenshot}
        setScreenshot={setScreenshot}
        onComplete={handleComplete}
        loading={formLoading}
      />
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
