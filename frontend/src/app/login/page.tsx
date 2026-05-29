'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import GlobalPopup from '@/components/GlobalPopup';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login - in production, this would call an API
    setTimeout(() => {
      localStorage.setItem('urbanex_user', JSON.stringify({ email: formData.email, name: formData.name || 'Customer' }));
      setLoading(false);
      router.push('/');
    }, 1000);
  };

  return (
    <>
      <GlobalPopup />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${isLogin ? styles.active : ''}`} onClick={() => setIsLogin(true)}>
                LOGIN
              </button>
              <button className={`${styles.tab} ${!isLogin ? styles.active : ''}`} onClick={() => setIsLogin(false)}>
                REGISTER
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {!isLogin && (
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              {!isLogin && (
                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              {isLogin && (
                <div className={styles.forgot}>
                  <Link href="#">Forgot Password?</Link>
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'PLEASE WAIT...' : isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className={styles.divider}>
              <span>OR</span>
            </div>

            <div className={styles.whatsappLogin}>
              <p>Prefer to order via WhatsApp?</p>
              <a href="https://wa.me/919898285850" target="_blank" rel="noopener" className={styles.whatsappBtn}>
                💬 CHAT ON WHATSAPP
              </a>
            </div>

            <p className={styles.note}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}