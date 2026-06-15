'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import UrbanExVerified from '@/components/UrbanExVerified';
import { WHATSAPP_NUMBER } from '@/lib/trustConfig';
import styles from './page.module.css';

const SOURCING_STEPS = [
  { title: 'Curated Sourcing', text: 'Every product is hand-picked from authorised distributors or verified premium suppliers. We never list bulk no-name inventory.' },
  { title: 'In-house QC', text: 'Each piece is inspected for stitching, materials, weight, hardware, packaging and serial markers before it reaches your cart.' },
  { title: 'Ships Sealed', text: 'Approved pieces are sealed with original packaging, tags, dust bags or boxes — exactly how the brand intended.' },
];

const PACKAGING_ITEMS = [
  { emoji: '📦', label: 'Original Box' },
  { emoji: '🏷️', label: 'Brand Tags' },
  { emoji: '🛍️', label: 'Dust Bag' },
];

const ASSURANCE = [
  '100% authenticity backed by our return guarantee',
  'GST invoice with every shipment',
  'Tamper-evident sealed packaging',
  'Verified serial / model markers where applicable',
  '7-day no-questions return if anything feels off',
  'Real human support — chat, call or WhatsApp',
];

export const AUTHENTICITY_FAQ = [
  { q: 'Are UrbanEx products 100% original?', a: 'Yes. Every product we list is sourced from authorised distributors or verified premium suppliers, inspected by our QC team, and shipped sealed in its original packaging.' },
  { q: 'How can I verify authenticity after I receive my order?', a: 'Every shipment includes original brand packaging, tags, and a GST invoice. For categories like watches and luxury bags, you can verify serials and model markers with the brand directly. If anything looks off, contact us within 7 days for a full refund.' },
  { q: 'What if I think my product is not authentic?', a: 'Reach out on WhatsApp with photos within 7 days. If our QC team confirms the issue, we will arrange a free pickup and a full refund — no questions asked.' },
  { q: 'Do I get an invoice with my order?', a: 'Yes. A proper GST invoice is included with every shipment. You can also request a soft copy by emailing us your order ID.' },
  { q: 'Why is the price lower than the brand website?', a: 'We source directly and skip the multi-tier retail markup. That is the entire point of UrbanEx — premium product, fair price, zero compromise on authenticity.' },
  { q: 'Do you offer authentication certificates?', a: 'For select luxury watches and handbags, we provide additional brand authentication on request. Message us before purchase if you need a specific certificate.' },
];

export default function AuthenticityClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.heroKicker}>Trust / Authenticity</span>
          <h1 className={styles.heroTitle}>100% <span className={styles.accent}>VERIFIED</span> ORIGINAL</h1>
          <p className={styles.heroSub}>
            UrbanEx exists for one reason: premium products, verified authentic, delivered honestly.
            Here is exactly how we earn that promise on every single order.
          </p>
          <div className={styles.badgeWrap}>
            <UrbanExVerified size="lg" withLink={false} />
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.kicker}>How We Source</span>
          <h2 className={styles.sectionTitle}>Sourced &amp; <span className={styles.accent}>Verified</span></h2>
          <p className={styles.lead}>
            We do not run a marketplace. Every SKU on UrbanEx passes through a three-step process before it goes live.
          </p>
          <div className={styles.steps}>
            {SOURCING_STEPS.map((s, i) => (
              <article key={s.title} className={styles.step}>
                <span className={styles.stepNum}>0{i + 1}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepText}>{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.kicker}>Original Packaging</span>
          <h2 className={styles.sectionTitle}>Sealed, <span className={styles.accent}>Branded</span>, Complete</h2>
          <p className={styles.lead}>
            Your order arrives in factory-original packaging with all included accessories — exactly how the brand intended it.
          </p>
          <div className={styles.gallery}>
            {PACKAGING_ITEMS.map((p) => (
              <div key={p.label} className={styles.galleryItem}>
                <span className={styles.galleryEmoji} aria-hidden>{p.emoji}</span>
                <span className={styles.galleryLabel}>{p.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.kicker}>Invoice Example</span>
          <h2 className={styles.sectionTitle}>Proper GST <span className={styles.accent}>Invoice</span></h2>
          <p className={styles.lead}>
            Every order ships with a GST invoice. Below is an example of what you will receive.
          </p>
          <div className={styles.invoiceCard} aria-label="Example invoice">
            <div className={styles.invoiceHead}>
              <span>UrbanEx — Tax Invoice</span>
              <span>UEX-123456</span>
            </div>
            <div className={styles.invoiceRow}><span>Premium Watch — Black</span><span>₹4,999</span></div>
            <div className={styles.invoiceRow}><span>Shipping</span><span>FREE</span></div>
            <div className={styles.invoiceRow}><span>GST (18%)</span><span>included</span></div>
            <div className={`${styles.invoiceRow} ${styles.invoiceTotal}`}><span>Total Paid</span><span>₹4,999</span></div>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.kicker}>Our Promise</span>
          <h2 className={styles.sectionTitle}>Authenticity <span className={styles.accent}>Assurance</span></h2>
          <p className={styles.lead}>
            If anything feels off about your order, we make it right. No tickets, no runaround.
          </p>
          <ul className={styles.assuranceList}>
            {ASSURANCE.map((a) => (
              <li key={a} className={styles.assuranceItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <span className={styles.kicker}>FAQ</span>
          <h2 className={styles.sectionTitle}>Authenticity <span className={styles.accent}>FAQ</span></h2>
          <div className={styles.faq}>
            {AUTHENTICITY_FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} className={styles.faqItem}>
                  <button
                    className={styles.faqQ}
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span>{item.q}</span>
                    <span className={`${styles.faqIcon} ${open ? styles.faqIconOpen : ''}`}>+</span>
                  </button>
                  {open && <div className={styles.faqA}>{item.a}</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Still Have Doubts?</h2>
          <p style={{ color: '#bbb', maxWidth: 580, margin: '0 auto' }}>
            Chat with a real human on WhatsApp, or browse our verified collection.
          </p>
          <div className={styles.ctaButtons}>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20UrbanEx,%20I%20want%20to%20verify%20authenticity%20before%20ordering.`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaBtn}
            >
              💬 CHAT ON WHATSAPP
            </a>
            <Link href="/products" className={styles.ctaBtnOutline}>SHOP VERIFIED COLLECTION</Link>
          </div>
        </section>
      </main>
    </>
  );
}
