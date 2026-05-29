import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import styles from '../products/page.module.css';

async function getUABatch() {
  try {
    const res = await fetch('https://urbanex-store.onrender.com/api/products?category=ua-batch', { cache: 'no-store' });
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

export default async function UABatchPage({ searchParams }: { searchParams: { brand?: string } }) {
  const products = await getUABatch();
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
              <Link href="/ua-batch" className={`${styles.brandFilter} ${!searchParams.brand ? styles.active : ''}`}>
                ALL BRANDS
              </Link>
              {brands.map((brand: any) => (
                <Link key={brand.id} href={`/ua-batch?brand=${brand.slug}`} className={`${styles.brandFilter} ${searchParams.brand === brand.slug ? styles.active : ''}`}>
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.header}>
              <h1 className={styles.title}>{activeBrand ? activeBrand.name : 'UA BATCH SNEAKERS'}</h1>
              <span className={styles.count}>{filteredProducts.length} items</span>
            </div>

            <div className={styles.banner}>
              <p>🔥 Exclusive Unreleased Sneakers at Best Prices</p>
            </div>

            {filteredProducts.length > 0 ? (
              <div className={styles.grid}>
                {filteredProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p>No UA Batch sneakers found.</p>
                <Link href="/ua-batch" className={styles.clearFilter}>Clear Filters</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}