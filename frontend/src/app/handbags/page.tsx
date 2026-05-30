import { redirect } from 'next/navigation';

export default function HandbagsRedirect({ searchParams }: { searchParams: { brand?: string } }) {
  const brand = searchParams.brand ? `&brand=${searchParams.brand}` : '';
  redirect(`/products?category=handbags${brand}`);
}
