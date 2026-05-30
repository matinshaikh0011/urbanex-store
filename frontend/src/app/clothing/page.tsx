import { redirect } from 'next/navigation';

export default function ClothingRedirect({ searchParams }: { searchParams: { brand?: string } }) {
  const brand = searchParams.brand ? `&brand=${searchParams.brand}` : '';
  redirect(`/products?category=clothing${brand}`);
}
