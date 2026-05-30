import { redirect } from 'next/navigation';

export default function LuxuryWatchesRedirect({ searchParams }: { searchParams: { brand?: string } }) {
  const brand = searchParams.brand ? `&brand=${searchParams.brand}` : '';
  // Luxury watches are stored under the "watches" category (titled "Luxury Watches")
  redirect(`/products?category=watches${brand}`);
}
