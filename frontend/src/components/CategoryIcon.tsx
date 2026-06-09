/**
 * CategoryIcon — consistent line-icon set for product categories.
 * Replaces the emoji icons (👟 ⌚ 🕶️ 👜 👕 🔥) that read as generic/AI-made.
 * Inherits color via `currentColor` and scales with the `size` prop.
 */
interface CategoryIconProps {
  name?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function CategoryIcon({ name, size = 24, className, strokeWidth = 1.8 }: CategoryIconProps) {
  const key = (name || '').toLowerCase().trim();

  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false,
  };

  // Sneakers
  if (key.includes('sneaker') || key.includes('shoe')) {
    return (
      <svg {...common}>
        <path d="M2 16.5h18.2a1.8 1.8 0 0 0 1.8-1.8c0-1.1-.74-1.95-1.9-2.25l-6.8-1.85L11 7.2a1 1 0 0 0-.86-.45H6.6l.7 4.6L2 13.4z" />
        <line x1="2" y1="16.5" x2="22" y2="16.5" />
        <path d="M8.2 9.4l1.6 1.3M10 8.2l1.6 1.3" />
      </svg>
    );
  }

  // Watches (incl. luxury watches)
  if (key.includes('watch')) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="5" />
        <path d="M9.2 7.3 9.8 4h4.4l.6 3.3M9.2 16.7 9.8 20h4.4l.6-3.3" />
        <path d="M12 9.6V12l1.7 1" />
      </svg>
    );
  }

  // Glasses / sunglasses
  if (key.includes('glass')) {
    return (
      <svg {...common}>
        <circle cx="6.4" cy="13" r="3.4" />
        <circle cx="17.6" cy="13" r="3.4" />
        <path d="M9.8 12.4c1.2-1 3.2-1 4.4 0" />
        <path d="M3 10.6 4.7 8.4M21 10.6 19.3 8.4" />
      </svg>
    );
  }

  // Handbags / bags
  if (key.includes('handbag') || key.includes('bag')) {
    return (
      <svg {...common}>
        <path d="M5 8h14l-1.1 11.5a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z" />
        <path d="M8.5 9V6.2a3.5 3.5 0 0 1 7 0V9" />
      </svg>
    );
  }

  // Clothing (t-shirt)
  if (key.includes('cloth') || key.includes('shirt') || key.includes('apparel')) {
    return (
      <svg {...common}>
        <path d="M8.5 4 4 6.8 6 10.2l1.8-1V20h8.4V9.2l1.8 1L20 6.8 15.5 4a3.5 3.5 0 0 1-7 0z" />
      </svg>
    );
  }

  // UA Batch (flame)
  if (key.includes('ua') || key.includes('batch') || key.includes('fire') || key.includes('hot')) {
    return (
      <svg {...common}>
        <path d="M12 2.5c1 4.2 4.3 5.4 4.3 9.4a4.3 4.3 0 0 1-8.6 0c0-1.7.7-2.8 1.7-3.9C11 9.2 11.5 7.4 12 2.5z" />
        <path d="M12 21.5a2.6 2.6 0 0 0 2.6-2.6c0-1.4-1.3-2.3-2.6-3.6-1.3 1.3-2.6 2.2-2.6 3.6A2.6 2.6 0 0 0 12 21.5z" />
      </svg>
    );
  }

  // Fallback — generic tag
  return (
    <svg {...common}>
      <path d="M3 11.5 11.5 3H20a1 1 0 0 1 1 1v8.5L12.5 21a1 1 0 0 1-1.4 0L3 12.9a1 1 0 0 1 0-1.4z" />
      <circle cx="16.5" cy="7.5" r="1.3" />
    </svg>
  );
}
