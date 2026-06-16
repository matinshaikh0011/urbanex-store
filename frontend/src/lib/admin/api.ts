// Shared admin API helper + toast hook.
// Extracted from the admin pages so both the dashboard and the scraper
// share one implementation instead of duplicating it.
'use client';

import { useState, useCallback } from 'react';

/** Fetch wrapper that sends cookies and bounces to login on 401. */
export async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, { credentials: 'include', ...opts });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }
  return res;
}

export type ToastType = 'ok' | 'err' | 'info';
export interface Toast { id: number; msg: string; type: ToastType }

/** Lightweight toast queue with auto-dismiss. */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((msg: string, type: ToastType = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// ── Formatting helpers ──
export const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const slugify = (s: string) =>
  s.toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
