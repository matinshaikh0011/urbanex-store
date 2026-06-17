import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About Us — Premium Fashion Accessories in India',
  description: 'UrbanEx is a Surat-based premium fashion accessories brand offering a curated collection of watches, eyewear, handbags and more — verified quality, fast pan-India delivery and easy 7-day returns.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About UrbanEx — Premium Fashion Accessories in India',
    description: 'A curated collection of premium watches, eyewear and handbags. Based in Surat, delivering across India.',
    url: '/about',
  },
};

export default function AboutPage() {
  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>ABOUT <span className={styles.accent}>URBANEX</span></h1>
          <p className={styles.subtitle}>Your Trusted Destination for Premium Watches, Eyewear & Handbags</p>
        </div>

        <div className={styles.container}>
          <section className={styles.section}>
            <div className={styles.intro}>
              <h2>WHO WE ARE</h2>
              <p>
                UrbanEx is a premium fashion accessories brand bringing you a carefully curated collection of watches, eyewear, handbags and more from the world&apos;s most sought-after labels. Based in Surat, Gujarat, India, we&apos;ve built a reputation for quality, authenticity, and exceptional customer service.
              </p>
            </div>
          </section>

          <section className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statNum}>2,500+</span>
              <span className={styles.statLabel}>Happy Customers</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>3,000+</span>
              <span className={styles.statLabel}>Orders Delivered</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>4.8</span>
              <span className={styles.statLabel}>Rating</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>100%</span>
              <span className={styles.statLabel}>Authentic</span>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>WHY CHOOSE US</h2>
            <div className={styles.features}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <h3>100% Premium</h3>
                <p>Every product is verified and guaranteed original with original packaging.</p>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <h3>Best Prices</h3>
                <p>Competitive pricing on all premium brands with regular discounts.</p>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <h3>Fast Shipping</h3>
                <p>Delivery within 3-5 business days across India.</p>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <h3>Easy Returns</h3>
                <p>7-day return policy with hassle-free process.</p>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <h3>WhatsApp Support</h3>
                <p>Instant assistance via WhatsApp for all queries.</p>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <h3>Secure Payment</h3>
                <p>Multiple payment options including COD.</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>CONTACT US</h2>
            <div className={styles.contact}>
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>📞</span>
                <div>
                  <h3>Phone / WhatsApp</h3>
                  <p>+91 9898285850</p>
                </div>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>📍</span>
                <div>
                  <h3>Address</h3>
                  <p>Surat, Gujarat, India</p>
                </div>
              </div>
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}>💬</span>
                <div>
                  <h3>WhatsApp</h3>
                  <p>Click to chat: <a href="https://wa.me/919898285850" target="_blank" rel="noopener">+91 9898285850</a></p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>OUR SERVICES</h2>
            <div className={styles.services}>
              <div className={styles.service}>
                <h3>👟 Sneakers</h3>
                <p>Air Jordan, Nike, Adidas, Yeezy, and more</p>
              </div>
              <div className={styles.service}>
                <h3>⌚ Watches</h3>
                <p>Luxury and designer watches</p>
              </div>
              <div className={styles.service}>
                <h3>🕶️ Glasses</h3>
                <p>Premium sunglasses and eyeglasses</p>
              </div>
              <div className={styles.service}>
                <h3>👜 Handbags</h3>
                <p>Designer bags and accessories</p>
              </div>
              <div className={styles.service}>
                <h3>👕 Clothing</h3>
                <p>Premium streetwear apparel</p>
              </div>
              <div className={styles.service}>
                <h3>👟 Premium Edition</h3>
                <p>Premium-quality alternatives, clearly labelled</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>© 2026 UrbanEx. All rights reserved. | 100% Premium Products</p>
      </footer>
    </>
  );
}