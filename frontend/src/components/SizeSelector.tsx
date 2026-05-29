'use client';

import styles from './SizeSelector.module.css';

interface SizeSelectorProps {
  sizes: { US: string[] };
  selectedSize: string | null;
  onSizeSelect: (size: string) => void;
}

export default function SizeSelector({ sizes, selectedSize, onSizeSelect }: SizeSelectorProps) {
  const usSizes = sizes.US || [];

  return (
    <div className={styles.container}>
      <label className={styles.label}>SELECT SIZE (US)</label>
      <div className={styles.grid}>
        {usSizes.map((size) => (
          <button
            key={size}
            className={`${styles.sizeBtn} ${selectedSize === size ? styles.selected : ''}`}
            onClick={() => onSizeSelect(size)}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}