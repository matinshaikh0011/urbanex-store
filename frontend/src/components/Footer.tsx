import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <span className={styles.logo}>URBAN<span className={styles.accent}>EX</span></span>
          <p className={styles.tagline}>100% Premium Streetwear</p>
        </div>
        <div className={styles.links}>
          <p>© 2024 UrbanEx. All rights reserved.</p>
          <p>WhatsApp: +91 9898285850</p>
        </div>
      </div>
    </footer>
  );
}