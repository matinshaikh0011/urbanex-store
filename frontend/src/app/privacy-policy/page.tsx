import type { Metadata } from 'next';
import Header from '@/components/Header';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How UrbanEx collects, uses and protects your personal information when you shop with us. Read our full privacy policy.',
  alternates: { canonical: '/privacy-policy' },
  openGraph: { title: 'Privacy Policy | UrbanEx', description: 'How UrbanEx collects, uses and protects your personal information.', url: '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>PRIVACY <span className={styles.accent}>POLICY</span></h1>
          <p className={styles.updated}>Last updated: June 2026</p>
        </div>

        <div className={styles.container}>
          <div className={styles.card}>
            <p className={styles.intro}>
              At UrbanEx, your privacy matters. This policy explains what information we collect, how we use it, and the choices you have. By using shopurbanex.com you agree to the practices described below.
            </p>

            <section className={styles.section}>
              <h2>Information We Collect</h2>
              <ul>
                <li><strong>Contact &amp; delivery details:</strong> name, phone number, email and shipping address you provide at checkout.</li>
                <li><strong>Order information:</strong> products ordered, size, payment method and your UPI transaction reference (UTR).</li>
                <li><strong>Account information:</strong> if you create an account, your email and a securely hashed password.</li>
                <li><strong>Usage data:</strong> basic analytics such as pages visited, device and browser type.</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>How We Use Your Information</h2>
              <ul>
                <li>To process, verify and deliver your orders.</li>
                <li>To contact you about your order via WhatsApp, phone or email.</li>
                <li>To handle returns, exchanges and customer support requests.</li>
                <li>To improve our products, website and service quality.</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>Payment Information</h2>
              <p>
                Payments are made directly through UPI. We do not store your card or bank credentials. We only record the UPI transaction reference (UTR) and a payment screenshot you submit so our team can verify your payment before dispatch.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Data Sharing</h2>
              <p>
                We do not sell your personal information. We share details only with trusted delivery partners to fulfil your order, or where required by law. Payment screenshots and order details are accessible only to authorised UrbanEx staff.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Data Security</h2>
              <p>
                We use industry-standard measures including encrypted connections (HTTPS), secure HttpOnly session cookies and hashed passwords to protect your information. No method of transmission is 100% secure, but we work to safeguard your data.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Your Rights</h2>
              <p>
                You may request access to, correction of, or deletion of your personal data at any time by contacting us. To do so, reach out via the details below.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Contact Us</h2>
              <p>
                Questions about this policy? WhatsApp us at <a href="https://wa.me/919898285850" target="_blank" rel="noopener noreferrer">+91 98982 85850</a> or email <a href="mailto:urbanexconnect@gmail.com">urbanexconnect@gmail.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
