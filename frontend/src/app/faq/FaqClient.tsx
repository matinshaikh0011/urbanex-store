'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import { FAQ_GROUPS } from './faqData';
import styles from './page.module.css';

export default function FaqClient() {
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
            <p className={styles.sub} style={{ marginTop: '0.75rem' }}>
              Looking for product authenticity proof?{' '}
              <Link href="/authenticity" style={{ color: '#cc0000', textDecoration: 'underline', fontWeight: 700 }}>
                See our Authenticity Guarantee →
              </Link>
            </p>
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
