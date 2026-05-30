'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import styles from './page.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authed, redirect to dashboard
  useEffect(() => {
    fetch('/api/admin/verify', { credentials: 'include' })
      .then(r => { if (r.ok) router.replace('/admin'); })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const from = searchParams.get('from') || '/admin';
        router.replace(from);
      } else {
        const data = await res.json();
        setError(data.error || 'Incorrect password');
      }
    } catch {
      setError('Cannot reach server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.logo}>
          <span className={styles.logoText}>URBAN<span className={styles.accent}>EX</span></span>
        </div>
        <h1 className={styles.title}>ADMIN PANEL</h1>
        <p className={styles.sub}>Enter your admin password to continue</p>

        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          placeholder="Password"
          className={styles.input}
          autoFocus
          autoComplete="current-password"
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.btn} disabled={loading}>
          {loading ? 'LOGGING IN…' : 'LOGIN'}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main style={{ background: '#111', minHeight: '100vh' }} />}>
      <LoginForm />
    </Suspense>
  );
}
