'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setLoading(true);
    setError('');
    setOrderData(null);

    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrderData(data);
      } else {
        setError('Order not found. Please check your Order ID.');
      }
    } catch {
      setError('Unable to track order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>TRACK <span className={styles.accent}>YOUR ORDER</span></h1>
          <p className={styles.subtitle}>Enter your Order ID to track your shipment</p>
        </div>

        <div className={styles.container}>
          <div className={styles.searchBox}>
            <form onSubmit={handleTrack} className={styles.form}>
              <input
                type="text"
                placeholder="Enter Order ID (e.g., UEX-123456)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={styles.trackBtn} disabled={loading}>
                {loading ? 'TRACKING...' : 'TRACK ORDER'}
              </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
          </div>

          {orderData && (
            <div className={styles.orderInfo}>
              <div className={styles.orderHeader}>
                <h2>Order Details</h2>
                <span className={styles.orderId}>Order ID: {orderData.orderId}</span>
              </div>

              <div className={styles.status}>
                <div className={styles.statusItem}>
                  <div className={`${styles.statusIcon} ${orderData.status === 'Pending Advance' ? styles.pending : styles.completed}`}>
                    {orderData.status === 'Pending Advance' ? '⏳' : '✓'}
                  </div>
                  <div>
                    <h4>Order Placed</h4>
                    <p>Your order has been received</p>
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <div className={`${styles.statusIcon} ${orderData.advancePaid ? styles.completed : styles.pending}`}>
                    {orderData.advancePaid ? '✓' : '⏳'}
                  </div>
                  <div>
                    <h4>Advance Payment</h4>
                    <p>{orderData.advancePaid ? 'Payment received' : 'Awaiting payment'}</p>
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <div className={`${styles.statusIcon} ${styles.pending}`}>⏳</div>
                  <div>
                    <h4>Processing</h4>
                    <p>Ready to ship</p>
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <div className={`${styles.statusIcon} ${styles.pending}`}>⏳</div>
                  <div>
                    <h4>Delivered</h4>
                    <p>Out for delivery</p>
                  </div>
                </div>
              </div>

              <div className={styles.orderDetails}>
                <div className={styles.detailRow}>
                  <span>Product</span>
                  <span>{orderData.product?.name || 'N/A'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span>Size</span>
                  <span>US {orderData.size || 'N/A'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span>Total Amount</span>
                  <span>₹{Number(orderData.totalAmount).toLocaleString('en-IN')}</span>
                </div>
                <div className={styles.detailRow}>
                  <span>Status</span>
                  <span className={styles.statusBadge}>{orderData.status}</span>
                </div>
              </div>

              <div className={styles.whatsappNote}>
                <p>💬 Need help? <a href="https://wa.me/919265110277" target="_blank" rel="noopener">Chat on WhatsApp</a></p>
              </div>
            </div>
          )}

          <div className={styles.helpSection}>
            <h3>How to Track Your Order</h3>
            <ol>
              <li>Find your Order ID in the confirmation message</li>
              <li>Enter the Order ID in the search box above</li>
              <li>Click &quot;Track Order&quot; to see your order status</li>
              <li>For any queries, WhatsApp us at +91 9265110277</li>
            </ol>
          </div>
        </div>
      </main>
    </>
  );
}