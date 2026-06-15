'use client';

import { useState } from 'react';
import styles from './ProductFaqAccordion.module.css';

export interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  items?: FaqItem[];
  heading?: string;
}

export const DEFAULT_PDP_FAQ: FaqItem[] = [
  {
    q: 'Is this product 100% original?',
    a: 'Yes. Every UrbanEx product is sourced through verified channels and ships with original packaging plus an invoice. See our Authenticity Guarantee for details.',
  },
  {
    q: 'How long will delivery take?',
    a: 'Metro orders typically arrive in 2–4 business days. Standard zones take 4–6 days, remote regions 6–9 days. Enter your pincode above for an exact estimate.',
  },
  {
    q: 'Can I pay cash on delivery?',
    a: 'Yes. Cash on Delivery is available across India with no extra charge.',
  },
  {
    q: 'What if the size does not fit?',
    a: '7-day return and exchange window from delivery. Item must be unworn with original tags and packaging. WhatsApp us to start a return.',
  },
  {
    q: 'How do I know my size?',
    a: 'Tap the SIZE GUIDE button next to the size selector. For uncertain fits, request a live video call before ordering.',
  },
];

export default function ProductFaqAccordion({ items = DEFAULT_PDP_FAQ, heading = 'PRODUCT FAQ' }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className={styles.wrap}>
      <h3 className={styles.heading}>{heading.split(' ')[0]} <span className={styles.accent}>{heading.split(' ').slice(1).join(' ')}</span></h3>
      <div className={styles.list}>
        {items.map((item, idx) => {
          const isOpen = open === idx;
          return (
            <div key={idx} className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}>
              <button className={styles.question} onClick={() => setOpen(isOpen ? null : idx)}>
                <span>{item.q}</span>
                <span className={styles.chevron}>{isOpen ? '−' : '+'}</span>
              </button>
              <div className={styles.answerWrap} style={{ maxHeight: isOpen ? '500px' : '0' }}>
                <p className={styles.answer}>{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
