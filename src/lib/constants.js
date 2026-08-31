export const PLATFORMS = [
  {
    key: "amazon",
    label: "Amazon",
    short: "IN",
    color: "#FF9900",
    soft: "rgba(255,153,0,0.14)",
    gradient: "linear-gradient(135deg,#FFB300 0%,#FF7A00 100%)",
    url: "https://www.amazon.in/s?rh=n%3A1571271031%2Cp_4%3AVimuhet&ref=bl_sl_s_ap_web_1571271031",
    app: "amazon://",
  },
  {
    key: "flipkart",
    label: "Flipkart",
    short: "FK",
    color: "#2874F0",
    soft: "rgba(40,116,240,0.14)",
    gradient: "linear-gradient(135deg,#4B9BFF 0%,#0B4FD1 100%)",
    url: "https://www.flipkart.com",
    app: "flipkart://",
  },
  {
    key: "meesho",
    label: "Meesho",
    short: "MS",
    color: "#F43397",
    soft: "rgba(244,51,151,0.14)",
    gradient: "linear-gradient(135deg,#FF6BB5 0%,#D5006D 100%)",
    url: "https://www.meesho.com",
    app: "meesho://",
  },
  {
    key: "myntra",
    label: "Myntra",
    short: "MY",
    color: "#FF3F6C",
    soft: "rgba(255,63,108,0.14)",
    gradient: "linear-gradient(135deg,#FF7A9C 0%,#E1004B 100%)",
    url: "https://www.myntra.com",
    app: "myntra://",
  },
];

export const PLATFORM_KEYS = PLATFORMS.map((p) => p.key);

export function platformMeta(key) {
  return (
    PLATFORMS.find((p) => p.key === key) || {
      key,
      label: key || "Store",
      color: "#9ca3af",
      soft: "rgba(156,163,175,0.14)",
      gradient: "linear-gradient(135deg,#d1d5db,#6b7280)",
      url: "#",
      app: "#",
    }
  );
}

export const CATEGORIES = [
  { key: "tshirts", label: "T-Shirts", emoji: "👕", blurb: "Everyday cottons" },
  { key: "shirts", label: "Shirts", emoji: "🧥", blurb: "Smart casuals" },
  {
    key: "kurtas",
    label: "Kurtas & Suits",
    emoji: "🪭",
    blurb: "Festive ethnic",
  },
  { key: "hoodies", label: "Hoodies", emoji: "🧢", blurb: "Street layers" },
  { key: "dresses", label: "Dresses", emoji: "👗", blurb: "Occasion wear" },
  { key: "bottoms", label: "Bottoms", emoji: "👖", blurb: "Denim & joggers" },
];

export function categoryLabel(key) {
  const found = CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key || "Collection";
}

export const SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "Free Size",
];

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
}

export function formatINR(value) {
  const num = Number(value || 0);
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function discountPercent(price, originalPrice) {
  const p = Number(price || 0);
  const o = Number(originalPrice || 0);
  if (!o || o <= p) return 0;
  return Math.round(((o - p) / o) * 100);
}

export function bestLink(product) {
  const links = Array.isArray(product?.links) ? product.links : [];
  const priced = links.filter((l) => l && l.url);
  if (!priced.length) return null;
  return priced
    .slice()
    .sort(
      (a, b) =>
        (a.price || product.price || 0) - (b.price || product.price || 0),
    )[0];
}

export function priceRange(product) {
  const links = Array.isArray(product?.links)
    ? product.links.filter((l) => l && l.url)
    : [];
  const prices = [
    Number(product.price || 0),
    ...links.map((l) => Number(l.price || 0)),
  ].filter(Boolean);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function normalizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((l) => ({
      platform: String(l?.platform || "").toLowerCase(),
      url: String(l?.url || "").trim(),
      price: Number(l?.price || 0) || 0,
    }))
    .filter((l) => l.platform && l.url);
}

export function toArray(value) {
  if (Array.isArray(value))
    return value
      .filter(Boolean)
      .map((v) => String(v).trim())
      .filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}
