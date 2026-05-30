// ================================================================
// productUtils.js — shared product validation and data building
// Used by both the existing product endpoints and the scraper import.
// ================================================================

const VALID_CATEGORIES = [
  'sneakers', 'watches', 'luxury-watches', 'glasses',
  'handbags', 'clothing', 'ua-batch',
];

const SLUG_RE = /^[a-z0-9-]+$/;

/**
 * Validates a product data object.
 * @param {object} data
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateProductData(data) {
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    return { valid: false, error: 'name is required' };
  }
  if (!data.slug || typeof data.slug !== 'string' || !SLUG_RE.test(data.slug)) {
    return { valid: false, error: 'slug is required and must match /^[a-z0-9-]+$/' };
  }
  const price = Number(data.price);
  if (!data.price || isNaN(price) || price <= 0) {
    return { valid: false, error: 'price must be a positive number' };
  }
  const brandId = Number(data.brandId);
  if (!data.brandId || isNaN(brandId) || brandId <= 0 || !Number.isInteger(brandId)) {
    return { valid: false, error: 'brandId must be a positive integer' };
  }
  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    return { valid: false, error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` };
  }
  // source and sourceId must both be present or both absent
  const hasSource = data.source != null && data.source !== '';
  const hasSourceId = data.sourceId != null && data.sourceId !== '';
  if (hasSource !== hasSourceId) {
    return { valid: false, error: 'source and sourceId must both be provided together or both omitted' };
  }
  return { valid: true };
}

/**
 * Builds a Prisma-compatible product data object from raw input.
 * Normalises types, applies null defaults, includes source tracking fields.
 * @param {object} data
 * @returns {object}
 */
export function buildProductData(data) {
  return {
    name:          String(data.name).trim(),
    slug:          String(data.slug).trim(),
    category:      data.category || null,
    subcategory:   data.subcategory || null,
    description:   data.description || null,
    price:         Number(data.price),
    originalPrice: data.originalPrice != null && data.originalPrice !== '' ? Number(data.originalPrice) : null,
    brandId:       Number(data.brandId),
    sizes:         data.sizes || {},
    colors:        data.colors || [],
    inStock:       data.inStock ?? true,
    isFeatured:    data.isFeatured ?? false,
    images:        Array.isArray(data.images) ? data.images : [],
    source:        data.source || null,
    sourceId:      data.sourceId || null,
    sourceUrl:     data.sourceUrl || null,
    lastSync:      data.lastSync ? new Date(data.lastSync) : null,
  };
}

/**
 * Generates a URL-safe slug from a string.
 * @param {string} s
 * @returns {string}
 */
export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
