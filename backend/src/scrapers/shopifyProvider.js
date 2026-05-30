const shopifyProvider = {
  name: 'shopify',
  displayName: 'Shopify',
  supportedScopes: [],
  async scrape() { throw new Error('Shopify provider is not yet implemented'); },
  async syncProduct() { throw new Error('Shopify provider is not yet implemented'); },
  extractBrand() { throw new Error('Shopify provider is not yet implemented'); },
};
export default shopifyProvider;
