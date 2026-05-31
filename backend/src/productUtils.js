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
 * Normalises a sizes value so it is never an empty object.
 * - If sizes has at least one non-empty array value → keep as-is
 * - Otherwise → { oneSize: ['One Size'] }
 */
function normaliseSizes(sizes) {
  if (sizes && typeof sizes === 'object') {
    const keys = Object.keys(sizes);
    if (keys.length > 0 && keys.some(k => Array.isArray(sizes[k]) && sizes[k].length > 0)) {
      return sizes;
    }
  }
  return { oneSize: ['One Size'] };
}

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
  const price = Number(data.price);
  let originalPrice = data.originalPrice != null && data.originalPrice !== ''
    ? Number(data.originalPrice)
    : null;

  // originalPrice must always be strictly greater than price.
  // If it's missing, equal, or lower — set it to price × 1.4.
  if (!originalPrice || originalPrice <= price) {
    originalPrice = Math.round(price * 1.4);
  }

  console.log(`[PRICE DEBUG] name="${data.name}" price=${price} originalPrice=${originalPrice}`);

  return {
    name:          String(data.name).trim(),
    slug:          String(data.slug).trim(),
    category:      data.category || null,
    subcategory:   data.subcategory || null,
    description:   data.description || null,
    price,
    originalPrice,
    brandId:       Number(data.brandId),
    sizes:         normaliseSizes(data.sizes),
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
