'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

interface OrderItem {
  id: number;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
}

export default function OrderConfirmationPage() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orderId, setOrderId] = useState('N/A');
  const [orderTotal, setOrderTotal] = useState('0');
  const [whatsappUrl, setWhatsappUrl] = useState('https://wa.me/919898285850');

  useEffect(() => {
    // Get order info from sessionStorage
    const storedOrderId = sessionStorage.getItem('orderId');
    const storedTotal = sessionStorage.getItem('orderTotal');
    const storedCustomer = sessionStorage.getItem('orderCustomer');

    if (storedTotal) setOrderTotal(storedTotal);

    // Load order items
    const storedItems = sessionStorage.getItem('orderItems');
    if (storedItems) {
      try { setItems(JSON.parse(storedItems)); } catch { /* ignore */ }
    }

    if (storedOrderId) {
      setOrderId(storedOrderId);

      // Build the rich WhatsApp order notification
      let customer = { name: '', phone: '', address: '', product: 'Order placed', size: '-', amountPaid: '' as string | number };
      if (storedCustomer) {
        try { customer = { ...customer, ...JSON.parse(storedCustomer) }; } catch { /* ignore */ }
      }

      const amount = storedTotal ? parseInt(storedTotal) : 0;
      const utr = (customer as any).utrNumber || 'N/A';
      const paid = (customer as any).amountPaid || '';
      const message =
        `🛍️ NEW ORDER - UrbanEx\n` +
        `Order ID: ${storedOrderId}\n` +
        `Customer: ${customer.name || 'N/A'}\n` +
        `Phone: ${customer.phone || 'N/A'}\n` +
        `Product: ${customer.product || 'N/A'}\n` +
        `Size: ${customer.size || '-'}\n` +
        `Order Total: ₹${amount}\n` +
        `Amount Paid: ₹${paid || amount}\n` +
        `UTR / Txn ID: ${utr}\n` +
        `Address: ${customer.address || 'N/A'}\n\n` +
        `✅ Payment done. Please find my payment screenshot attached for verification.`;

      const waUrl = `https://wa.me/919898285850?text=${encodeURIComponent(message)}`;
      setWhatsappUrl(waUrl);

      // Auto-open WhatsApp shortly after the success page shows
      const timer = setTimeout(() => {
        window.open(waUrl, '_blank');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(typeof price === 'string' ? parseInt(price) : price);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.successIcon}>✓</div>

        <h1 className={styles.title}>
          ORDER <span className={styles.accent}>PLACED</span>
        </h1>

        <p className={styles.message}>
          Payment received. Our team will verify your payment and place your order shortly.
        </p>

        <div className={styles.orderCard}>
          <div className={styles.orderHeader}>
            <span className={styles.orderLabel}>ORDER ID</span>
            <span className={styles.orderId}>{orderId}</span>
          </div>

          <div className={styles.orderDetails}>
            {items.length > 0 ? (
              items.map((item, idx) => (
                <div key={idx} className={styles.detailRow}>
                  <span className={styles.detailLabel}>Product {idx + 1}</span>
                  <span className={styles.detailValue}>{item.name} (x{item.quantity}) - {item.size}</span>
                </div>
              ))
            ) : (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Product</span>
                <span className={styles.detailValue}>Order placed</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Total Amount</span>
              <span className={`${styles.detailValue} ${styles.amount}`}>
                {formatPrice(orderTotal)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status</span>
              <span className={`${styles.detailValue} ${styles.status}`}>
                PENDING VERIFICATION
              </span>
            </div>
          </div>
        </div>

        <div className={styles.nextSteps}>
          <h2 className={styles.stepsTitle}>NEXT STEPS</h2>

          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <div className={styles.stepContent}>
              <span className={styles.stepHeading}>Send Your Payment Screenshot</span>
              <span className={styles.stepText}>
                We just opened WhatsApp with your order details. Please attach the payment screenshot you uploaded so our team can verify it.
              </span>
            </div>
          </div>

          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <div className={styles.stepContent}>
              <span className={styles.stepHeading}>Payment Verification</span>
              <span className={styles.stepText}>
                Our team verifies your UPI payment against the UTR / reference number you provided.
              </span>
            </div>
          </div>

          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <div className={styles.stepContent}>
              <span className={styles.stepHeading}>Order Placed & Shipped</span>
              <span className={styles.stepText}>
                Once verified, your order is confirmed and shipped within 24-48 hours. 100% authentic products delivered to your door.
              </span>
            </div>
          </div>
        </div>

        <div className={styles.whatsappBtn}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappLink}
          >
            SEND SCREENSHOT ON WHATSAPP
          </a>
        </div>

        <Link href="/products" className={styles.continueBtn}>
          CONTINUE SHOPPING
        </Link>
      </div>
    </main>
  );
}