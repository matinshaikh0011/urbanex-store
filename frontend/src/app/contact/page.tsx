'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import styles from './page.module.css';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Build WhatsApp message
    const text = encodeURIComponent(
      `*New Contact Enquiry — UrbanEx*\n\n` +
      `*Name:* ${form.name}\n` +
      `*Email:* ${form.email}\n` +
      `*Phone:* ${form.phone}\n` +
      `*Subject:* ${form.subject}\n\n` +
      `*Message:*\n${form.message}`
    );
    window.open(`https://wa.me/919999999999?text=${text}`, '_blank');
    setSent(true);
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Hero Banner */}
        <section className={styles.hero}>
          <div className={styles.heroGrid} />
          <div className={styles.heroDrip1} />
          <div className={styles.heroDrip2} />
          <div className={styles.heroContent}>
            <div className={styles.badge}>GET IN TOUCH</div>
            <h1 className={styles.heroTitle}>
              CONTACT<span className={styles.accent}> US</span>
            </h1>
            <p className={styles.heroSub}>We&apos;re here to help — reach out any time</p>
          </div>
        </section>

        <div className={styles.wrapper}>
          {/* Info Cards */}
          <section className={styles.infoGrid}>
            <a
              href="https://wa.me/919999999999"
              target="_blank"
              rel="noreferrer"
              className={`${styles.infoCard} ${styles.whatsapp}`}
            >
              <div className={styles.infoIcon}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className={styles.infoLabel}>WhatsApp</div>
              <div className={styles.infoValue}>+91 99999 99999</div>
              <div className={styles.infoNote}>Chat with us 24/7 for fastest response</div>
            </a>

            <a
              href="mailto:support@urbanex.in"
              className={`${styles.infoCard} ${styles.email}`}
            >
              <div className={styles.infoIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div className={styles.infoLabel}>Email</div>
              <div className={styles.infoValue}>support@urbanex.in</div>
              <div className={styles.infoNote}>We reply within 24 hours</div>
            </a>

            <div className={`${styles.infoCard} ${styles.hours}`}>
              <div className={styles.infoIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className={styles.infoLabel}>Hours</div>
              <div className={styles.infoValue}>10AM – 9PM</div>
              <div className={styles.infoNote}>Mon – Sat · Sunday by appointment</div>
            </div>

            <div className={`${styles.infoCard} ${styles.location}`}>
              <div className={styles.infoIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className={styles.infoLabel}>Location</div>
              <div className={styles.infoValue}>Pan India</div>
              <div className={styles.infoNote}>Fast delivery across all states</div>
            </div>
          </section>

          {/* Contact Form */}
          <section className={styles.formSection}>
            <div className={styles.formHeader}>
              <h2>SEND US A MESSAGE</h2>
              <p>Fill out the form below and we&apos;ll get back to you on WhatsApp</p>
            </div>

            {sent ? (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>✓</div>
                <h3>MESSAGE SENT!</h3>
                <p>Opening WhatsApp with your message. We&apos;ll reply shortly.</p>
                <button className={styles.resetBtn} onClick={() => setSent(false)}>Send Another</button>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Full Name *</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="phone">Phone / WhatsApp *</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="subject">Subject *</label>
                    <select
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a topic</option>
                      <option value="Order Enquiry">Order Enquiry</option>
                      <option value="Product Question">Product Question</option>
                      <option value="Return / Exchange">Return / Exchange</option>
                      <option value="Tracking Issue">Tracking Issue</option>
                      <option value="Wholesale Enquiry">Wholesale Enquiry</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    placeholder="Tell us how we can help you..."
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  SEND VIA WHATSAPP
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
