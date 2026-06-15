import Link from 'next/link';
import styles from './UrbanExVerified.module.css';

type Variant = 'dark' | 'light';
type Size = 'sm' | 'lg';

interface Props {
  variant?: Variant;
  size?: Size;
  withLink?: boolean;
  label?: string;
}

export default function UrbanExVerified({
  variant = 'dark',
  size = 'sm',
  withLink = true,
  label = 'UrbanEx Verified',
}: Props) {
  const className = [
    styles.badge,
    variant === 'light' ? styles.badgeLight : '',
    size === 'lg' ? styles.badgeLg : '',
  ].filter(Boolean).join(' ');

  const content = (
    <span className={className} role="img" aria-label="UrbanEx verified authentic">
      <span className={`${styles.shield} ${variant === 'light' ? styles.shieldLight : ''}`} aria-hidden>✦</span>
      {label}
    </span>
  );

  return withLink ? (
    <Link href="/authenticity" style={{ textDecoration: 'none' }}>{content}</Link>
  ) : content;
}
