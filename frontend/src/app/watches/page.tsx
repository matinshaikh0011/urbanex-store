import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import styles from '../products/page.module.css';

async function getWatches() {
  try {
    const res = await fetch('https://urbanex-store.onrender.com/api/products?category=watches', { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getBrands() {
  try {
    const res = await fetch('https://urbanex-store.onrender.com/api/brands', { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function WatchesPage({ searchParams }: { searchParams: { brand?: string } }) {
  const products = await getWatches();
  const brands = await getBrands();
  const activeBrand = searchParams.brand ? brands.find((b: any) => b.slug === searchParams.brand) : null;

  const filteredProducts = searchParams.brand
    ? products.filter((p: any) => p.brand.slug === searchParams.brand)
    : products;

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>FILTER BY BRAND</h3>
            <div className={styles.brandList}>
              <Link href="/watches" className={`${styles.brandFilter} ${!searchParams.brand ? styles.active : ''}`}>
                ALL BRANDS
              </Link>
              {brands.map((brand: any) => (
                <Link key={brand.id} href={`/watches?brand=${brand.slug}`} className={`${styles.brandFilter} ${searchParams.brand === brand.slug ? styles.active : ''}`}>
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.header}>
              <h1 className={styles.title}>{activeBrand ? activeBrand.name : 'WATCHES'}</h1>
              <span className={styles.count}>{filteredProducts.length} items</span>
            </div>

            {filteredProducts.length > 0 ? (
              <div className={styles.grid}>
                {filteredProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No watches found.</p>
                <Link href="/watches" className={styles.clearFilter}>Clear Filters</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}