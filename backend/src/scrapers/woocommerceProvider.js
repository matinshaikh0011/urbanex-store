const woocommerceProvider = {
  name: 'woocommerce',
  displayName: 'WooCommerce',
  supportedScopes: [],
  async scrape() { throw new Error('WooCommerce provider is not yet implemented'); },
  async syncProduct() { throw new Error('WooCommerce provider is not yet implemented'); },
  extractBrand() { throw new Error('WooCommerce provider is not yet implemented'); },
};
export default woocommerceProvider;
