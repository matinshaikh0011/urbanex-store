import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

export default function AboutPage() {
  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>ABOUT <span className={styles.accent}>URBANEX</span></h1>
          <p className={styles.subtitle}>Your Trusted Destination for Premium Streetwear & Accessories</p>
        </div>

        <div className={styles.container}>
          <section className={styles.section}>
            <div className={styles.intro}>
              <h2>WHO WE ARE</h2>
              <p>
                UrbanEx is a premium streetwear destination dedicated to bringing you 100% premium products from the world&apos;s most sought-after brands. Based in Surat, Gujarat, India, we&apos;ve built a reputation for quality, authenticity, and exceptional customer service.
              </p>
            </div>
          </section>

          <section className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statNum}>10K+</span>
              <span className={styles.statLabel}>Happy Customers</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>500+</span>
              <span className={styles.statLabel}>Products</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>15+</span>
              <span className={styles.statLabel}>Brands</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNum}>4.9</span>
              <span className={styles.statLabel}>Rating</span>
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
                <h3>👟 UA Batch</h3>
                <p>Unreleased and exclusive sneakers</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>© 2024 UrbanEx. All rights reserved. | 100% Premium Products</p>
      </footer>
    </>
  );
}