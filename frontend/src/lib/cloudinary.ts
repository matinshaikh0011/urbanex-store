// ================================================================
// Cloudinary URL transform helper.
//
// Only Cloudinary-hosted URLs (res.cloudinary.com/<cloud>/image/upload/...)
// support on-the-fly transforms. For those, we inject a transform segment
// right after "/upload/". Any other URL (scraped supplier image, external
// host) is returned unchanged — the CSS padding fallback handles those.
// ================================================================

const CLOUDINARY_UPLOAD_RE = /(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

/**
 * Inject a Cloudinary transform into an upload URL. No-op for non-Cloudinary
 * URLs or when a transform is already present (avoids double-stacking).
 *
 * @param url       original image URL
 * @param transform e.g. "c_pad,ar_4:5,b_auto,w_900"
 */
export function cld(url: string | undefined | null, transform: string): string {
  if (!url) return '';
  const m = url.match(CLOUDINARY_UPLOAD_RE);
  if (!m) return url; // not a Cloudinary upload URL → leave as-is
  const [, base, rest] = m;
  // If our transform (or any c_/ar_ transform) is already the first segment, skip.
  const firstSeg = rest.split('/')[0];
  if (/(^|,)(c_|ar_|w_|h_|b_)/.test(firstSeg)) return url;
  return `${base}${transform}/${rest}`;
}

// Preset transforms ---------------------------------------------------------

// Homepage ShowcaseCard — 4:5 portrait, pad to fit on a neutral auto bg so
// every product normalizes to the same frame & perceived size. f_auto/q_auto
// keep payload light.
export const SHOWCASE_4x5 = 'c_pad,ar_4:5,b_auto,w_700,f_auto,q_auto';

// Square 1:1 (collection/PDP if ever needed) — not applied yet.
export const SQUARE_1x1 = 'c_pad,ar_1:1,b_auto,w_700,f_auto,q_auto';
