import { redirect } from 'next/navigation';

export default function GlassesRedirect({ searchParams }: { searchParams: { brand?: string } }) {
  const brand = searchParams.brand ? `&brand=${searchParams.brand}` : '';
  redirect(`/products?category=glasses${brand}`);
}
