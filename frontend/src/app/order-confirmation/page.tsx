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
  const [whatsappUrl, setWhatsappUrl] = useState('https://wa.me/919265110277');

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
      const message =
        `🛍️ NEW ORDER - UrbanEx\n` +
        `Order ID: ${storedOrderId}\n` +
        `Customer: ${customer.name || 'N/A'}\n` +
        `Phone: ${customer.phone || 'N/A'}\n` +
        `Product: ${customer.product || 'N/A'}\n` +
        `Size: ${customer.size || '-'}\n` +
        `Amount: ₹${amount}\n` +
        `Address: ${customer.address || 'N/A'}\n\n` +
        `Please confirm this order.`;

      const waUrl = `https://wa.me/919265110277?text=${encodeURIComponent(message)}`;
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
          Our team will get in touch shortly.
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
                PENDING ADVANCE
              </span>
            </div>
          </div>
        </div>

        <div className={styles.nextSteps}>
          <h2 className={styles.stepsTitle}>NEXT STEPS</h2>

          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <div className={styles.stepContent}>
              <span className={styles.stepHeading}>WhatsApp Confirmation</span>
              <span className={styles.stepText}>
                We just opened WhatsApp with your order details. Send the ₹300 advance to confirm your order.
              </span>
            </div>
          </div>

          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <div className={styles.stepContent}>
              <span className={styles.stepHeading}>Order Processing</span>
              <span className={styles.stepText}>
                Once advance is received, we&apos;ll ship your order within 24-48 hours.
              </span>
            </div>
          </div>

          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <div className={styles.stepContent}>
              <span className={styles.stepHeading}>Delivery</span>
              <span className={styles.stepText}>
                Pay remaining amount on delivery. Get 100% authentic products delivered to your door.
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
            OPEN WHATSAPP TO CONFIRM
          </a>
        </div>

        <Link href="/products" className={styles.continueBtn}>
          CONTINUE SHOPPING
        </Link>
      </div>
    </main>
  );
}