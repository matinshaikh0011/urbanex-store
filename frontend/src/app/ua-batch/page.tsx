import { redirect } from 'next/navigation';

export default function UABatchRedirect({ searchParams }: { searchParams: { brand?: string } }) {
  const brand = searchParams.brand ? `&brand=${searchParams.brand}` : '';
  redirect(`/products?category=ua-batch${brand}`);
}
