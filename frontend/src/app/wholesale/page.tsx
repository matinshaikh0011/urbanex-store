'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

export default function WholesalePage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    businessType: '',
    budget: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.contactName || !form.phone || !form.businessType) {
      alert('Please fill in all required fields.');
      return;
    }
    const text = encodeURIComponent(
      `🏪 WHOLESALE ENQUIRY - UrbanEx\n\n` +
      `Business: ${form.businessName}\n` +
      `Contact: ${form.contactName}\n` +
      `Phone: ${form.phone}\n` +
      `Email: ${form.email || '-'}\n` +
      `City: ${form.city || '-'}\n` +
      `Business Type: ${form.businessType}\n` +
      `Monthly Budget: ${form.budget || '-'}\n\n` +
      `Message:\n${form.message || '-'}`
    );
    window.open(`https://wa.me/919265110277?text=${text}`, '_blank');
    setSent(true);
    setForm({ businessName: '', contactName: '', phone: '', email: '', city: '', businessType: '', budget: '', message: '' });
  };

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>BULK ORDERS</div>
            <h1 className={styles.title}>WHOLESALE <span className={styles.accent}>ENQUIRY</span></h1>
            <p className={styles.sub}>Partner with UrbanEx — premium streetwear at wholesale prices for your business.</p>
          </div>
        </section>

        <div className={styles.wrapper}>
          {sent ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✓</div>
              <h2>THANK YOU!</h2>
              <p>Thank you! We&apos;ll contact you within 24 hours.</p>
              <button className={styles.resetBtn} onClick={() => setSent(false)}>Submit Another Enquiry</button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.row}>
                <div className={styles.group}>
                  <label>Business Name *</label>
                  <input name="businessName" value={form.businessName} onChange={handleChange} required placeholder="Your business name" />
                </div>
                <div className={styles.group}>
                  <label>Contact Person Name *</label>
                  <input name="contactName" value={form.contactName} onChange={handleChange} required placeholder="Your full name" />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.group}>
                  <label>Phone / WhatsApp *</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className={styles.group}>
                  <label>Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.group}>
                  <label>City</label>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="Your city" />
                </div>
                <div className={styles.group}>
                  <label>Type of Business *</label>
                  <select name="businessType" value={form.businessType} onChange={handleChange} required>
                    <option value="">Select type</option>
                    <option value="Retail Shop">Retail Shop</option>
                    <option value="Online Store">Online Store</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>

              <div className={styles.group}>
                <label>Monthly Budget</label>
                <select name="budget" value={form.budget} onChange={handleChange}>
                  <option value="">Select budget</option>
                  <option value="₹10K-50K">₹10K - ₹50K</option>
                  <option value="₹50K-1L">₹50K - ₹1L</option>
                  <option value="₹1L+">₹1L+</option>
                </select>
              </div>

              <div className={styles.group}>
                <label>Message</label>
                <textarea name="message" value={form.message} onChange={handleChange} rows={4} placeholder="Tell us about your requirements..." />
              </div>

              <button type="submit" className={styles.submitBtn}>SEND ENQUIRY VIA WHATSAPP</button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
