'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

export default function ReturnExchangePage() {
  const [formData, setFormData] = useState({
    orderId: '',
    name: '',
    email: '',
    phone: '',
    reason: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to the backend
    setSubmitted(true);
  };

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>RETURN & <span className={styles.accent}>EXCHANGE</span></h1>
          <p className={styles.subtitle}>Easy returns and exchanges within 7 days</p>
        </div>

        <div className={styles.container}>
          {submitted ? (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>
              <h2>Request Submitted!</h2>
              <p>We have received your return/exchange request. Our team will contact you within 24 hours on WhatsApp.</p>
              <a href="https://wa.me/919898285850" target="_blank" rel="noopener" className={styles.whatsappBtn}>
                CHAT ON WHATSAPP
              </a>
            </div>
          ) : (
            <div className={styles.formSection}>
              <div className={styles.policy}>
                <h3>Return Policy</h3>
                <ul>
                  <li>✓ 7-day return policy from delivery date</li>
                  <li>✓ Items must be unused with original packaging</li>
                  <li>✓ Original tags and labels must be attached</li>
                  <li>✓ Exchange available for different size/color</li>
                  <li>✓ Refund processed within 5-7 business days</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Order ID *</label>
                  <input
                    type="text"
                    placeholder="Enter your Order ID"
                    value={formData.orderId}
                    onChange={(e) => setFormData({...formData, orderId: e.target.value})}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Full Name *</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Reason for Return/Exchange *</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    required
                  >
                    <option value="">Select a reason</option>
                    <option value="wrong_size">Wrong Size</option>
                    <option value="wrong_color">Wrong Color</option>
                    <option value="defective">Defective Product</option>
                    <option value="not_as_described">Not as Described</option>
                    <option value="changed_mind">Changed My Mind</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Additional Details</label>
                  <textarea
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  ></textarea>
                </div>

                <button type="submit" className={styles.submitBtn}>
                  SUBMIT REQUEST
                </button>
              </form>
            </div>
          )}

          <div className={styles.contactSection}>
            <h3>Need Help?</h3>
            <p>Contact us via WhatsApp for instant assistance</p>
            <a href="https://wa.me/919898285850" target="_blank" rel="noopener" className={styles.whatsappLink}>
              💬 +91 9898285850
            </a>
          </div>
        </div>
      </main>
    </>
  );
}