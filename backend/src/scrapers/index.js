// ================================================================
// scrapers/index.js — provider registry
// ================================================================

import cartpeProvider from './cartpeProvider.js';
import selloshipProvider from './selloshipProvider.js';
import shopifyProvider from './shopifyProvider.js';
import woocommerceProvider from './woocommerceProvider.js';

const providers = {
  cartpe: cartpeProvider,
  selloship: selloshipProvider,
  shopify: shopifyProvider,
  woocommerce: woocommerceProvider,
};

/**
 * Returns the provider for the given key.
 * @param {string} key
 * @returns {object} provider
 * @throws {Error} if key is not registered
 */
export function getProvider(key) {
  const p = providers[key];
  if (!p) {
    throw new Error(
      `Unsupported provider: "${key}". Available providers: ${Object.keys(providers).join(', ')}`
    );
  }
  return p;
}

/**
 * Auto-detects the provider key from a URL.
 * @param {string} url
 * @returns {string|null}
 */
export function detectProvider(url) {
  if (/cartpe\.in/i.test(url)) return 'cartpe';
  if (/selloship\.com/i.test(url)) return 'selloship';
  return null;
}

export default providers;
