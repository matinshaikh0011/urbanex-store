import { redirect } from 'next/navigation';

export default function WatchesRedirect({ searchParams }: { searchParams: { brand?: string } }) {
  const brand = searchParams.brand ? `&brand=${searchParams.brand}` : '';
  redirect(`/products?category=watches${brand}`);
}
