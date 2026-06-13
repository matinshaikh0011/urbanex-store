'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The /login page hosts both the LOGIN and REGISTER tabs.
// /signup simply routes there with the register tab pre-selected.
export default function SignupRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login?mode=register');
  }, [router]);
  return null;
}
