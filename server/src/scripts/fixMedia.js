/**
 * Media integrity repair — idempotent, safe to run any number of times.
 *
 * Older seed data stored image URLs without their width suffix
 * (`/media/banners/hero-1.jpg`) or with a derivative that is not generated
 * (`-1200.jpg` on product artwork). Both produce 404s in the storefront.
 *
 * This script walks every image-bearing document, resolves the URL against the
 * files that actually exist in `client/public/media`, and rewrites it to the
 * largest available derivative — the single master the frontend `imageSet()`
 * helper then downscales from.
 *
 * Usage:  node src/scripts/fixMedia.js [--dry]
 */
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import env from '../config/env.js';
import Homepage from '../models/Homepage.js';
import Banner from '../models/Banner.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Collection from '../models/Collection.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = path.resolve(__dirname, '../../../client/public/media');
const DRY = process.argv.includes('--dry');

// A trailing number is only a width derivative when it is a plausible pixel
// width. `hero-1.jpg` ends in "1", which is part of the asset name, not a size.
const MIN_WIDTH = 100;
const SIZE_RE = /^(.*)-(\d+)\.(jpe?g|png|webp)$/i;
const splitSized = (url) => {
  const m = String(url).match(SIZE_RE);
  if (!m || Number(m[2]) < MIN_WIDTH) return null;
  return { stem: m[1], width: Number(m[2]), ext: m[3].toLowerCase() };
};

/** Build a lookup of `dir/stem` -> sorted available widths, once per process. */
function indexMedia() {
  const index = new Map();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      // Stored URLs are public paths ('/media/banners/hero-1-2000.jpg'),
      // so the index key must carry the '/media' prefix too.
      const rel = '/media/' + path.relative(MEDIA_ROOT, full).split(path.sep).join('/');
      const parts = splitSized(rel);
      if (!parts) continue;
      const key = `${parts.stem}|${parts.ext}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(parts.width);
    }
  };
  walk(MEDIA_ROOT);
  for (const widths of index.values()) widths.sort((a, b) => b - a);
  return index;
}

const MEDIA = indexMedia();

/**
 * Resolve a stored URL to the largest derivative that exists on disk.
 * Returns the original URL when nothing matches (so remote/CDN URLs are untouched).
 */
function resolveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (/^https?:\/\//.test(url)) return url; // Cloudinary / external — leave alone

  const clean = url.split('?')[0];
  const parts = splitSized(clean);
  const ext = (parts?.ext || clean.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
  const stem = parts ? parts.stem : clean.replace(/\.(jpe?g|png|webp)$/i, '');

  const widths = MEDIA.get(`${stem}|${ext}`);
  if (!widths?.length) return url; // unknown asset — do not invent a path

  // Keep an explicitly requested size when it exists, otherwise use the master.
  const best = parts && widths.includes(parts.width) ? parts.width : widths[0];
  return `${stem}-${best}.${ext}`;
}

const changes = [];
function track(label, before, after) {
  if (before !== after) changes.push({ label, before, after });
  return after;
}

async function run() {
  await mongoose.connect(env.mongoUri);
  logger.info(`media index: ${MEDIA.size} asset stems from ${MEDIA_ROOT}`);

  /* ---------------- Homepage CMS ---------------- */
  const hp = await Homepage.findOne({ key: 'main' });
  if (hp) {
    for (const [i, slide] of (hp.hero || []).entries()) {
      if (slide.image?.url) {
        slide.image.url = track(`hero[${i}].image`, slide.image.url, resolveUrl(slide.image.url));
      }
      if (slide.mobileImage?.url) {
        slide.mobileImage.url = track(`hero[${i}].mobileImage`, slide.mobileImage.url, resolveUrl(slide.mobileImage.url));
      }
    }
    const s = hp.sections || {};
    for (const key of ['promoBanner', 'brandStory', 'lookbook']) {
      const img = s[key]?.image;
      if (img?.url) img.url = track(`sections.${key}.image`, img.url, resolveUrl(img.url));
    }
    hp.markModified('hero');
    if (hp.sections) hp.markModified('sections');
    if (!DRY) await hp.save();
  }

  /* ---------------- Banners ---------------- */
  for (const b of await Banner.find({})) {
    if (!b.image?.url) continue;
    const next = resolveUrl(b.image.url);
    if (next !== b.image.url) {
      track(`Banner "${b.title}"`, b.image.url, next);
      b.image.url = next;
      if (!DRY) await b.save();
    }
  }

  /* ---------------- Products ---------------- */
  for (const p of await Product.find({})) {
    let dirty = false;
    for (const img of p.images || []) {
      if (!img.url) continue;
      const next = resolveUrl(img.url);
      if (next !== img.url) {
        track(`Product "${p.name}" image`, img.url, next);
        img.url = next;
        dirty = true;
      }
    }
    if (dirty && !DRY) {
      p.markModified('images');
      await p.save();
    }
  }

  /* ---------------- Categories & Collections ---------------- */
  for (const [Model, label] of [[Category, 'Category'], [Collection, 'Collection']]) {
    for (const doc of await Model.find({})) {
      let dirty = false;
      for (const field of ['image', 'banner']) {
        const img = doc[field];
        if (!img?.url) continue;
        const next = resolveUrl(img.url);
        if (next !== img.url) {
          track(`${label} "${doc.name}" ${field}`, img.url, next);
          img.url = next;
          dirty = true;
        }
      }
      if (dirty && !DRY) await doc.save();
    }
  }

  if (changes.length) {
    logger.info(`${DRY ? '[dry run] would fix' : 'fixed'} ${changes.length} media URL(s):`);
    for (const c of changes.slice(0, 40)) logger.info(`  ${c.label}: ${c.before} -> ${c.after}`);
    if (changes.length > 40) logger.info(`  … and ${changes.length - 40} more`);
  } else {
    logger.info('All media URLs already resolve — nothing to fix.');
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  logger.error('Media repair failed:', err.stack || err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
