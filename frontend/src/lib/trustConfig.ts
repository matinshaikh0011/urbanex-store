// Tunable trust copy/numbers used by TrustedByCustomers + WhyShopUrbanEx.
// Edit values here; no rebuild logic required.

export interface TrustStats {
  rating: number;
  ratingScale: number;
  happyCustomers: number;
  ordersDelivered: number;
}

// Single source of truth — keep every trust section in sync.
export const TRUST_STATS: TrustStats = {
  rating: 4.8,
  ratingScale: 5,
  happyCustomers: 2500,
  ordersDelivered: 3000,
};

export interface WhyShopItem {
  icon: string;
  title: string;
  text: string;
}

export const WHY_SHOP_ITEMS: WhyShopItem[] = [
  { icon: '📦', title: 'Original Packaging', text: 'Every product ships in its original box with all included accessories.' },
  { icon: '🧾', title: 'Invoice Included',   text: 'Authentic GST invoice with every order for full peace of mind.' },
  { icon: '↩️', title: '7-Day Returns',      text: 'Not happy? Hassle-free return or exchange within 7 days.' },
  { icon: '💵', title: 'COD Available',      text: 'Cash on delivery available on most pin codes across India.' },
  { icon: '🔒', title: 'Secure Payments',    text: 'UPI, cards, and net banking — every transaction is fully encrypted.' },
  { icon: '💬', title: 'WhatsApp Support',   text: 'Real humans on chat 9 AM – 10 PM, 7 days a week.' },
];

export const WHATSAPP_NUMBER = '919898285850';
