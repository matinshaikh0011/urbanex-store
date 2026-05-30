import { redirect } from 'next/navigation';

export default function SneakersRedirect({ searchParams }: { searchParams: { brand?: string } }) {
  const brand = searchParams.brand ? `&brand=${searchParams.brand}` : '';
  redirect(`/products?category=sneakers${brand}`);
}
