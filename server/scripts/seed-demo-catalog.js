import 'dotenv/config';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const CONFIRMATION = 'seed-vimuhet-demo';

if (process.env.DEMO_CATALOG_CONFIRM !== CONFIRMATION) {
  console.error(`Refusing to change the catalog. Run with DEMO_CATALOG_CONFIRM=${CONFIRMATION}.`);
  process.exit(1);
}

const uri = String(process.env.MONGODB_URI || '').trim();
if (!uri) {
  console.error('MONGODB_URI is required. Nothing was changed.');
  process.exit(1);
}

const categories = [
  {
    name: 'Western Wear',
    slug: 'western-wear',
    description: 'Demo category for local storefront preview only.',
    image: { url: '/assets/categories/western-wear.webp' },
    displayOrder: 1,
  },
  {
    name: 'Ethnic Wear',
    slug: 'ethnic-wear',
    description: 'Demo category for local storefront preview only.',
    image: { url: '/assets/categories/ethnic-wear.webp' },
    displayOrder: 2,
  },
  {
    name: 'Indo-Western',
    slug: 'indo-western',
    description: 'Demo category for local storefront preview only.',
    image: { url: '/assets/categories/indo-western.webp' },
    displayOrder: 3,
  },
];

const demoText = 'Demo catalog data for local visual testing only. Replace this item, its imagery, sizing, pricing and product information before any real launch.';

const products = [
  {
    name: 'Demo Terracotta Belted Dress',
    slug: 'demo-terracotta-belted-dress',
    sku: 'DEMO-TERR-001',
    category: 'Western Wear',
    collectionName: 'Demo Collection',
    shortDescription: 'A temporary product card for testing the VIMUHET storefront.',
    description: demoText,
    price: 2499,
    stock: 12,
    lowStockThreshold: 3,
    sizes: ['S', 'M', 'L'],
    colors: ['Terracotta'],
    material: 'Demo fabric',
    fabric: 'Demo fabric',
    fit: 'Demo regular fit',
    style: 'Demo shirt dress',
    care: 'Demo care instruction — replace with verified garment care.',
    sizeGuide: 'Demo sizing only. Replace with actual garment measurements before launch.',
    featured: true,
    published: true,
    status: 'published',
    seoTitle: 'Demo Terracotta Belted Dress | VIMUHET',
    seoDescription: 'Temporary local storefront preview product.',
    images: [{ url: '/assets/products/rust-linen-dress.webp', alt: 'Demo terracotta belted dress product preview' }],
  },
  {
    name: 'Demo Ivory Embroidered Set',
    slug: 'demo-ivory-embroidered-set',
    sku: 'DEMO-IVORY-002',
    category: 'Ethnic Wear',
    collectionName: 'Demo Collection',
    shortDescription: 'A temporary product card for testing the VIMUHET storefront.',
    description: demoText,
    price: 3299,
    stock: 8,
    lowStockThreshold: 3,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Ivory'],
    material: 'Demo fabric',
    fabric: 'Demo fabric',
    fit: 'Demo relaxed fit',
    style: 'Demo embroidered set',
    care: 'Demo care instruction — replace with verified garment care.',
    sizeGuide: 'Demo sizing only. Replace with actual garment measurements before launch.',
    featured: true,
    published: true,
    status: 'published',
    seoTitle: 'Demo Ivory Embroidered Set | VIMUHET',
    seoDescription: 'Temporary local storefront preview product.',
    images: [{ url: '/assets/products/ivory-embroidered-set.webp', alt: 'Demo ivory embroidered set product preview' }],
  },
  {
    name: 'Demo Everyday Co-ord',
    slug: 'demo-everyday-co-ord',
    sku: 'DEMO-COORD-003',
    category: 'Indo-Western',
    collectionName: 'Demo Collection',
    shortDescription: 'A temporary product card for testing the VIMUHET storefront.',
    description: demoText,
    price: 2799,
    stock: 6,
    lowStockThreshold: 2,
    sizes: ['S', 'M', 'L'],
    colors: ['Sand'],
    material: 'Demo fabric',
    fabric: 'Demo fabric',
    fit: 'Demo easy fit',
    style: 'Demo co-ord',
    care: 'Demo care instruction — replace with verified garment care.',
    sizeGuide: 'Demo sizing only. Replace with actual garment measurements before launch.',
    featured: false,
    published: true,
    status: 'published',
    seoTitle: 'Demo Everyday Co-ord | VIMUHET',
    seoDescription: 'Temporary local storefront preview product.',
    images: [{ url: '/assets/lookbook/everyday-edit.webp', alt: 'Demo everyday co-ord product preview' }],
  },
  {
    name: 'Demo Heritage Kurta',
    slug: 'demo-heritage-kurta',
    sku: 'DEMO-KURTA-004',
    category: 'Ethnic Wear',
    collectionName: 'Demo Collection',
    shortDescription: 'A temporary product card for testing the VIMUHET storefront.',
    description: demoText,
    price: 2199,
    stock: 4,
    lowStockThreshold: 2,
    sizes: ['S', 'M', 'L'],
    colors: ['Clay'],
    material: 'Demo fabric',
    fabric: 'Demo fabric',
    fit: 'Demo regular fit',
    style: 'Demo kurta',
    care: 'Demo care instruction — replace with verified garment care.',
    sizeGuide: 'Demo sizing only. Replace with actual garment measurements before launch.',
    featured: false,
    published: true,
    status: 'published',
    seoTitle: 'Demo Heritage Kurta | VIMUHET',
    seoDescription: 'Temporary local storefront preview product.',
    images: [{ url: '/assets/categories/ethnic-wear.webp', alt: 'Demo heritage kurta product preview' }],
  },
  {
    name: 'Demo Sunset Layer',
    slug: 'demo-sunset-layer',
    sku: 'DEMO-SUNSET-005',
    category: 'Western Wear',
    collectionName: 'Demo Collection',
    shortDescription: 'A temporary sold-out product for testing availability states.',
    description: demoText,
    price: 1899,
    stock: 0,
    lowStockThreshold: 2,
    sizes: ['S', 'M', 'L'],
    colors: ['Rust'],
    material: 'Demo fabric',
    fabric: 'Demo fabric',
    fit: 'Demo relaxed fit',
    style: 'Demo layer',
    care: 'Demo care instruction — replace with verified garment care.',
    sizeGuide: 'Demo sizing only. Replace with actual garment measurements before launch.',
    featured: false,
    published: true,
    status: 'published',
    seoTitle: 'Demo Sunset Layer | VIMUHET',
    seoDescription: 'Temporary local storefront preview product.',
    images: [{ url: '/assets/categories/western-wear.webp', alt: 'Demo sunset layer product preview' }],
  },
  {
    name: 'Demo Modern Fusion Set',
    slug: 'demo-modern-fusion-set',
    sku: 'DEMO-FUSION-006',
    category: 'Indo-Western',
    collectionName: 'Demo Collection',
    shortDescription: 'A temporary product card for testing the VIMUHET storefront.',
    description: demoText,
    price: 3599,
    stock: 10,
    lowStockThreshold: 3,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Terracotta'],
    material: 'Demo fabric',
    fabric: 'Demo fabric',
    fit: 'Demo tailored fit',
    style: 'Demo fusion set',
    care: 'Demo care instruction — replace with verified garment care.',
    sizeGuide: 'Demo sizing only. Replace with actual garment measurements before launch.',
    featured: true,
    published: true,
    status: 'published',
    seoTitle: 'Demo Modern Fusion Set | VIMUHET',
    seoDescription: 'Temporary local storefront preview product.',
    images: [{ url: '/assets/categories/indo-western.webp', alt: 'Demo modern fusion set product preview' }],
  },
];

try {
  await mongoose.connect(uri);

  for (const category of categories) {
    await Category.findOneAndUpdate(
      { slug: category.slug },
      { $setOnInsert: { ...category, active: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  for (const product of products) {
    await Product.findOneAndUpdate(
      { slug: product.slug },
      { $set: product },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  console.log(`Demo catalog ready: ${categories.length} categories and ${products.length} published products.`);
  console.log('All demo records use slugs beginning with "demo-" and can be safely removed with the cleanup script.');
} catch (error) {
  console.error('Demo catalog seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
