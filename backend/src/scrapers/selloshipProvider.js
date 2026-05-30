const selloshipProvider = {
  name: 'selloship',
  displayName: 'Selloship',
  supportedScopes: [],
  async scrape() { throw new Error('Selloship provider is not yet implemented'); },
  async syncProduct() { throw new Error('Selloship provider is not yet implemented'); },
  extractBrand() { throw new Error('Selloship provider is not yet implemented'); },
};
export default selloshipProvider;
