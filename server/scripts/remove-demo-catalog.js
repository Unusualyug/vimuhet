import 'dotenv/config';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const CONFIRMATION = 'remove-vimuhet-demo';
if (process.env.DEMO_CATALOG_CONFIRM !== CONFIRMATION) {
  console.error(`Refusing to remove records. Run with DEMO_CATALOG_CONFIRM=${CONFIRMATION}.`);
  process.exit(1);
}

const uri = String(process.env.MONGODB_URI || '').trim();
if (!uri) {
  console.error('MONGODB_URI is required. Nothing was changed.');
  process.exit(1);
}

try {
  await mongoose.connect(uri);
  const removedProducts = await Product.deleteMany({ slug: /^demo-/ });
  const removedCategories = await Category.deleteMany({ slug: { $in: ['western-wear', 'ethnic-wear', 'indo-western'] }, description: 'Demo category for local storefront preview only.' });
  console.log(`Removed ${removedProducts.deletedCount} demo product(s) and ${removedCategories.deletedCount} demo category record(s).`);
} catch (error) {
  console.error('Demo catalog cleanup failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
