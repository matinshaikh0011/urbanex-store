'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CheckoutForm.module.css';

interface CheckoutFormProps {
  product: {
    id: number;
    name: string;
    price: number;
    images: string[];
  };
  selectedSize: string;
}

export default function CheckoutForm({ product, selectedSize }: CheckoutFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create order in database
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          size: selectedSize,
          quantity: 1,
          totalAmount: product.price,
          shippingName: formData.name,
          shippingAddress: formData.address,
          shippingEmail: formData.email,
          shippingPhone: formData.phone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const order = await response.json();

      // Store order info for confirmation page
      sessionStorage.setItem('orderId', order.orderId);
      sessionStorage.setItem('orderProduct', product.name);
      sessionStorage.setItem('orderSize', selectedSize);
      sessionStorage.setItem('orderTotal', product.price.toString());

      // Redirect to confirmation page
      router.push('/order-confirmation');
    } catch (error) {
      console.error('Order submission error:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.productSummary}>
        <div className={styles.productImage}>
          <img src={product.images[0]} alt={product.name} />
        </div>
        <div className={styles.productInfo}>
          <span className={styles.productName}>{product.name}</span>
          <span className={styles.productSize}>Size: US {selectedSize}</span>
          <span className={styles.productPrice}>{formatPrice(product.price)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <h3 className={styles.sectionTitle}>SHIPPING DETAILS</h3>

        <div className={styles.field}>
          <label className={styles.label}>Full Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter your full name"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Shipping Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            placeholder="Enter your complete shipping address"
            rows={3}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Phone Number *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="+91 9876543210"
          />
        </div>

        <div className={styles.paymentSection}>
          <h3 className={styles.sectionTitle}>PAYMENT METHOD</h3>
          <div className={styles.paymentOption}>
            <input type="radio" id="cod" name="payment" value="cod" checked readOnly />
            <label htmlFor="cod" className={styles.paymentLabel}>
              <span className={styles.radioCustom}></span>
              Cash on Delivery (Requires ₹300 Advance)
            </label>
          </div>
          <p className={styles.paymentNote}>
            💳 Pay ₹300 advance via UPI/Google Pay/PhonePe to confirm your order. Balance on delivery.
          </p>
        </div>

        <div className={styles.totalSection}>
          <span className={styles.totalLabel}>Total Amount</span>
          <span className={styles.totalAmount}>{formatPrice(product.price)}</span>
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
        >
          {loading ? 'PLACING ORDER...' : 'PLACE ORDER'}
        </button>
      </form>
    </div>
  );
}