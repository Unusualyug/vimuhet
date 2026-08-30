import { PLATFORM_KEYS, normalizeLinks, toArray } from "./constants.js";

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function str(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).slice(0, 4000);
}

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
}

/**
 * Turns whatever the admin form sent into a safe set of product columns.
 */
export function parseProductBody(body = {}) {
  const links = normalizeLinks(
    (Array.isArray(body.links) ? body.links : []).filter((l) => PLATFORM_KEYS.includes(l?.platform)),
  );

  let images = toArray(body.images);
  images = images
    .map((url) => String(url).trim())
    .filter((url) => /^https?:\/\/|^\/api\/uploads\//.test(url))
    .slice(0, 12);

  const errors = [];
  if (!str(body.name).trim()) errors.push("Product name is required");
  if (!images.length) errors.push("Add at least one product photo");
  if (num(body.price) <= 0) errors.push("Current price must be greater than zero");
  if (!links.length) errors.push("Add at least one store link (Amazon / Flipkart / Meesho)");

  const original = num(body.originalPrice);
  const price = num(body.price);

  const payload = {
    name: str(body.name).trim(),
    tagline: str(body.tagline).trim(),
    description: str(body.description).trim(),
    category: str(body.category || "tshirts").trim(),
    fabric: str(body.fabric).trim(),
    fit: str(body.fit || "Regular").trim(),
    care: str(body.care).trim(),
    images,
    sizes: toArray(body.sizes),
    colors: toArray(body.colors),
    links,
    price,
    originalPrice: original > price ? original : 0,
    badge: str(body.badge).trim(),
    rating: Math.min(50, Math.max(30, num(body.rating, 48))),
    inStock: bool(body.inStock, true),
    featured: bool(body.featured, false),
    active: bool(body.active, true),
    sortOrder: num(body.sortOrder, 0),
    updatedAt: new Date(),
  };

  return { payload, errors };
}
