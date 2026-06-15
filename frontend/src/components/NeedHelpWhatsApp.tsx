import { WHATSAPP_NUMBER } from '@/lib/trustConfig';
import styles from './NeedHelpWhatsApp.module.css';

interface Props {
  productName?: string;
  message?: string;
}

export default function NeedHelpWhatsApp({ productName, message }: Props) {
  const baseText = message
    || (productName
      ? `Hi UrbanEx, I have a question about ${productName}`
      : 'Hi UrbanEx, I need help with my order');
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(baseText)}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.card}>
      <span className={styles.icon}>💬</span>
      <div className={styles.body}>
        <span className={styles.title}>Need help? Chat on WhatsApp</span>
        <span className={styles.sub}>Replies in minutes · Sizing, payment, returns</span>
      </div>
      <span className={styles.arrow}>→</span>
    </a>
  );
}
