'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

interface FAQItem { q: string; a: string; }
interface FAQGroup { title: string; icon: string; items: FAQItem[]; }

const FAQ_GROUPS: FAQGroup[] = [
  {
    title: 'Sizing',
    icon: '📏',
    items: [
      { q: 'How do I find my correct size?', a: 'Open any product page and tap "Size Guide" for a full UK/US/EU sneaker chart and S–XXL clothing measurements. If you are between sizes, we recommend sizing up for sneakers.' },
      { q: 'What if the size I want is unavailable?', a: 'Message us on WhatsApp with the product name — we often restock fast or can source your size from another batch.' },
      { q: 'Can I exchange for a different size?', a: 'Yes. We offer size exchanges within 7 days of delivery as long as the item is unused with original packaging and tags.' },
    ],
  },
  {
    title: 'Authenticity & Quality',
    icon: '✅',
    items: [
      { q: 'Are your products 100% original?', a: 'Every product in our main catalogue is verified original and ships with its bill and original packaging. Items in the "UA Batch" section are clearly labelled premium-quality replicas.' },
      { q: 'Do you provide a bill / invoice?', a: 'Yes, a bill is included with every original order. You can also request a live video call before dispatch to inspect the exact item you will receive.' },
      { q: 'What is a "Live Video Call"?', a: 'On any product page tap "Request a Live Video Call" — our team will show you the actual product on WhatsApp video before you pay the balance, so you buy with full confidence.' },
    ],
  },
  {
    title: 'Shipping & Delivery',
    icon: '🚚',
    items: [
      { q: 'How long does delivery take?', a: 'Orders are dispatched within 24–48 hours of payment confirmation and typically arrive in 3–5 business days across India.' },
      { q: 'Do you ship pan-India?', a: 'Yes, we deliver to all states across India. Remote pin codes may take 1–2 extra days.' },
      { q: 'How do I track my order?', a: 'Use the Track Order page with your Order ID (format UEX-XXXXXX) sent to you on WhatsApp after checkout.' },
      { q: 'Why is an advance payment required for COD?', a: 'A ₹300 advance confirms genuine orders and reduces fake/return-to-origin cases. The balance is paid on delivery. You can also choose Full Prepaid for priority shipping.' },
    ],
  },
  {
    title: 'Returns & Refunds',
    icon: '↩️',
    items: [
      { q: 'What is your return policy?', a: 'We offer a 7-day return/exchange window from the delivery date. Items must be unused, with original tags, labels and packaging intact.' },
      { q: 'How do I start a return?', a: 'Visit the Return & Exchange page, fill in your Order ID and reason, and our team will guide you on WhatsApp within 24 hours.' },
      { q: 'When will I get my refund?', a: 'Approved refunds are processed within 5–7 business days to your original payment method or via UPI.' },
    ],
  },
  {
    title: 'Payments',
    icon: '🔒',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept UPI (GPay, PhonePe, Paytm, BHIM) via QR code at checkout. Choose COD (₹300 advance) or Full Prepaid for priority shipping.' },
      { q: 'Is online payment safe?', a: 'Yes. You pay directly to our verified UPI ID and enter your UTR/transaction reference at checkout. Orders are confirmed only after we verify the payment.' },
    ],
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<string | null>('0-0');

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>HELP CENTER</div>
            <h1 className={styles.title}>FREQUENTLY ASKED <span className={styles.accent}>QUESTIONS</span></h1>
            <p className={styles.sub}>Everything about sizing, authenticity, shipping, returns and payments.</p>
          </div>
        </div>

        <div className={styles.container}>
          {FAQ_GROUPS.map((group, gi) => (
            <section key={gi} className={styles.group}>
              <h2 className={styles.groupTitle}><span>{group.icon}</span> {group.title}</h2>
              <div className={styles.items}>
                {group.items.map((item, ii) => {
                  const id = `${gi}-${ii}`;
                  const isOpen = open === id;
                  return (
                    <div key={id} className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}>
                      <button className={styles.question} onClick={() => setOpen(isOpen ? null : id)}>
                        <span>{item.q}</span>
                        <span className={styles.chevron}>{isOpen ? '−' : '+'}</span>
                      </button>
                      <div className={styles.answerWrap} style={{ maxHeight: isOpen ? '300px' : '0' }}>
                        <p className={styles.answer}>{item.a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className={styles.contactBox}>
            <h3>STILL HAVE QUESTIONS?</h3>
            <p>Our team replies fast on WhatsApp — usually within minutes.</p>
            <div className={styles.contactActions}>
              <a href="https://wa.me/919898285850" target="_blank" rel="noopener noreferrer" className={styles.waBtn}>💬 CHAT ON WHATSAPP</a>
              <Link href="/contact" className={styles.contactLink}>CONTACT PAGE</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
