import { WHY_SHOP_ITEMS } from '@/lib/trustConfig';
import styles from './WhyShopUrbanEx.module.css';

export default function WhyShopUrbanEx() {
  return (
    <section className={styles.section} aria-labelledby="why-shop-title">
      <div className={styles.head}>
        <span className={styles.kicker}>Why UrbanEx</span>
        <h2 id="why-shop-title" className={styles.title}>
          WHY SHOP <span className={styles.accent}>URBANEX?</span>
        </h2>
        <p className={styles.subtitle}>
          Every order ships with care, every product is verified, and every customer gets real human support.
        </p>
      </div>

      <div className={styles.grid}>
        {WHY_SHOP_ITEMS.map((item) => (
          <article key={item.title} className={styles.card}>
            <span className={styles.icon} aria-hidden>{item.icon}</span>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardText}>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
