import type { Metadata } from 'next';
import Header from '@/components/Header';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms and conditions that govern your use of UrbanEx and any purchase you make. Please read before placing an order.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Terms & Conditions | UrbanEx', description: 'Terms governing your use of UrbanEx and purchases.', url: '/terms' },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>TERMS &amp; <span className={styles.accent}>CONDITIONS</span></h1>
          <p className={styles.updated}>Last updated: June 2026</p>
        </div>

        <div className={styles.container}>
          <div className={styles.card}>
            <p className={styles.intro}>
              These Terms &amp; Conditions govern your use of shopurbanex.com and any purchase made through it. By placing an order you agree to these terms.
            </p>

            <section className={styles.section}>
              <h2>Products &amp; Pricing</h2>
              <p>
                We aim to describe and price every product accurately. All prices are in Indian Rupees (₹) and include applicable taxes unless stated otherwise. We reserve the right to correct errors and update prices at any time.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Orders &amp; Payment</h2>
              <ul>
                <li>Orders are confirmed only after we verify your UPI payment and transaction reference (UTR).</li>
                <li>For Cash on Delivery, a ₹300 advance is required to confirm the order; the balance is paid on delivery.</li>
                <li>We reserve the right to cancel any order in case of suspected fraud, payment failure, or stock unavailability.</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>Shipping &amp; Delivery</h2>
              <p>
                Orders are dispatched within 24–48 hours of payment confirmation and typically arrive within 3–5 business days across India. Delivery timelines are estimates and may vary for remote locations.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Returns &amp; Refunds</h2>
              <p>
                We offer a 7-day return and exchange window from the delivery date for unused items with original packaging and tags. Approved refunds are processed within 5–7 business days. See our <a href="/return-exchange">Return &amp; Exchange</a> page for full details.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Product Authenticity</h2>
              <p>
                Products in our main catalogue are verified for quality and ship with original packaging. Items listed under the &quot;UA Batch&quot; section are clearly labelled premium-quality alternatives and are sold as such.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Intellectual Property</h2>
              <p>
                All content on this website — including the UrbanEx name, logo and design — is the property of UrbanEx and may not be reproduced without permission.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Limitation of Liability</h2>
              <p>
                UrbanEx is not liable for indirect or consequential damages arising from the use of our website or products, to the extent permitted by law.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Contact Us</h2>
              <p>
                Questions about these terms? WhatsApp us at <a href="https://wa.me/919898285850" target="_blank" rel="noopener noreferrer">+91 98982 85850</a> or email <a href="mailto:urbanexconnect@gmail.com">urbanexconnect@gmail.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
