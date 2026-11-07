export const inr = (value, { hideDecimals = true } = {}) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hideDecimals ? 0 : 2,
    maximumFractionDigits: hideDecimals ? 0 : 2,
  }).format(n);
};

export const compact = (value) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

export const formatDate = (value, opts = {}) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const timeAgo = (value) => {
  if (!value) return '';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(value);
};

export const discountPercent = (price, mrp) => {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

export const slugify = (s = '') =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/* ------------------------------------------------------------------ *
 * Responsive imagery
 *
 * Every locally seeded asset is stored as a set of width derivatives
 * (`name-400.jpg`, `-700`, `-1000`, `-1500`, `-2000`). `imageSet()` turns any
 * one of those URLs into a full srcset, so a component never has to guess
 * which derivative exists on disk.
 *
 * When `VITE_CLOUDINARY_CLOUD` is configured the same width list is requested
 * from Cloudinary instead, using on-the-fly transformations — no extra files.
 * ------------------------------------------------------------------ */

const CDN_CLOUD = import.meta.env?.VITE_CLOUDINARY_CLOUD;

/** Widths people actually download, per usage lane. */
export const WIDTH_LADDER = {
  product: [400, 700, 1000, 1500],
  banner: [800, 1200, 2000],
  hero: [800, 1200, 2000],
  general: [400, 700, 1000, 1200, 1500, 2000],
};

const LANE_DEFAULT_WIDTH = { product: 1000, banner: 1200, hero: 2000, general: 1000 };

/** Split `dir/name-1000.jpg` into `dir/name` + extension, ignoring any size suffix. */
const splitSizedUrl = (url) => {
  const m = String(url).match(/^(.*)-(\d+)\.(jpe?g|png|webp)$/i);
  if (!m) return null;
  return { stem: m[1], ext: m[3], width: Number(m[2]) };
};

/**
 * Rewrites an image URL to a specific width.
 * Returns the original URL untouched when it is not a size-suffixed local asset.
 */
export const resizeImage = (url, width) => {
  if (!url) return '';
  const parts = splitSizedUrl(url);
  if (!parts) return url;
  if (CDN_CLOUD && /res\.cloudinary\.com/.test(url)) {
    return url.replace(/\/upload\//, `/upload/w_${width},q_auto,f_auto/`);
  }
  return `${parts.stem}-${width}.${parts.ext}`;
};

/**
 * Builds a responsive image descriptor.
 * @param {string} url  any derivative of the asset
 * @param {object} [options]
 * @param {'product'|'banner'|'hero'|'general'} [options.lane] usage lane (picks the width ladder)
 * @param {string} [options.sizes] explicit `sizes` attribute
 */
export const imageSet = (url, { lane = 'product', sizes } = {}) => {
  if (!url) return { src: '', srcSet: undefined, sizes: undefined };

  const parts = splitSizedUrl(url);
  if (!parts) return { src: url, srcSet: undefined, sizes: undefined };

  const ladder = WIDTH_LADDER[lane] || WIDTH_LADDER.product;
  // Never upscale past the derivative that actually exists on disk.
  const widths = ladder.filter((w) => w <= parts.width);
  const usable = widths.length ? widths : [parts.width];
  const fallback = usable.includes(LANE_DEFAULT_WIDTH[lane]) ? LANE_DEFAULT_WIDTH[lane] : usable[usable.length - 1];

  return {
    src: resizeImage(url, fallback),
    srcSet: usable.map((w) => `${resizeImage(url, w)} ${w}w`).join(', '),
    sizes: sizes || '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  };
};

/** Convenience wrapper for full-bleed campaign art (heroes, page banners). */
export const bannerSet = (url, sizes = '100vw') => imageSet(url, { lane: 'hero', sizes });

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

export const compactNumber = compact;

export const percent = (value, digits = 1) => `${Number(value || 0).toFixed(digits).replace(/\.0$/, '')}%`;

export const duration = (sec = 0) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
