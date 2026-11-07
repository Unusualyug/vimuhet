import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Collection from '../models/Collection.js';
import Review from '../models/Review.js';
import { asyncHandler, escapeRegex, ok, paginationMeta, parsePagination } from '../utils/index.js';
import { storage } from '../services/storage.service.js';
import ApiError from '../utils/ApiError.js';

const PUBLIC_PRODUCT_FIELDS =
  'name slug sku shortDescription description brand category subCategory collections price mrp taxPercent stock variants colors sizes images attributes status isFeatured isNewArrival tags rating reviewCount ratingBreakdown soldCount viewCount createdAt';

function transformProduct(doc) {
  const p = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  p.images = (p.images || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({
      ...i,
      url: i.url,
      thumb: storage.transform(i.url, { width: 400 }),
      card: storage.transform(i.url, { width: 700 }),
      large: storage.transform(i.url, { width: 1200 }),
    }));
  p.discountPercent = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  p.inStock = (p.stock || 0) > 0 || (p.variants || []).some((v) => v.stock - (v.reserved || 0) > 0);
  return p;
}

const SORTS = {
  recommended: { isFeatured: -1, soldCount: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  'best-selling': { soldCount: -1 },
  'top-rated': { rating: -1, reviewCount: -1 },
  'discount': { mrp: -1 },
};

/** Shared filter builder for shop / category / collection / search / new / best / trending. */
export function buildProductFilter(query, extra = {}) {
  const filter = { status: 'ACTIVE', ...extra };

  if (query.category) {
    const ids = String(query.category).split(',').filter(Boolean);
    filter.category = { $in: ids.map((id) => (mongoose.isValidObjectId(id) ? id : null)).filter(Boolean) };
  }
  if (query.collection) filter.collections = query.collection;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q.trim()), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { tags: rx }, { 'attributes.fabric': rx }, { 'colors.name': rx }, { shortDescription: rx }];
  }
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  if (query.size) {
    const sizes = String(query.size).split(',');
    filter.$and = [
      ...(filter.$and || []),
      {
        variants: { $elemMatch: { size: { $in: sizes }, stock: { $gt: 0 } } },
      },
    ];
  }
  if (query.color) filter['colors.name'] = { $in: String(query.color).split(',') };
  if (query.fabric) filter['attributes.fabric'] = { $in: String(query.fabric).split(',') };
  if (query.sleeve) filter['attributes.sleeve'] = { $in: String(query.sleeve).split(',') };
  if (query.pattern) filter['attributes.pattern'] = { $in: String(query.pattern).split(',') };
  if (query.occasion) filter['attributes.occasion'] = { $in: String(query.occasion).split(',') };
  if (query.minDiscount) {
    filter.$expr = {
      $gte: [
        { $cond: [{ $gt: ['$mrp', '$price'] }, { $multiply: [{ $divide: [{ $subtract: ['$mrp', '$price'] }, '$mrp'] }, 100] }, 0] },
        Number(query.minDiscount),
      ],
    };
  }
  if (query.inStock === 'true') filter.$and = [...(filter.$and || []), { stock: { $gt: 0 } }];
  if (query.onSale === 'true') filter.$and = [...(filter.$and || []), { $expr: { $gt: ['$mrp', '$price'] } }];
  if (query.minRating) filter.rating = { $gte: Number(query.minRating) };
  if (query.ids) filter._id = { $in: String(query.ids).split(',').filter(Boolean) };
  if (query.tag) filter.tags = query.tag;

  return filter;
}

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });
  const sort = SORTS[req.query.sort] || SORTS.recommended;
  const filter = buildProductFilter(req.query);

  const [items, total, facets] = await Promise.all([
    Product.find(filter)
      .select(PUBLIC_PRODUCT_FIELDS)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
    Product.aggregate([
      { $match: filter },
      {
        $facet: {
          categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
          fabrics: [{ $group: { _id: '$attributes.fabric', count: { $sum: 1 } } }],
          colors: [{ $unwind: '$colors' }, { $group: { _id: '$colors.name', hex: { $first: '$colors.hex' }, count: { $sum: 1 } } }],
          sizes: [{ $unwind: '$variants' }, { $group: { _id: '$variants.size', count: { $sum: 1 } } }],
          priceRange: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
          sleeves: [{ $group: { _id: '$attributes.sleeve', count: { $sum: 1 } } }],
          patterns: [{ $group: { _id: '$attributes.pattern', count: { $sum: 1 } } }],
          occasions: [{ $group: { _id: '$attributes.occasion', count: { $sum: 1 } } }],
        },
      },
    ]),
  ]);

  const f = facets[0] || {};
  const clean = (rows = []) => rows.filter((r) => r._id).map((r) => ({ value: r._id, count: r.count, hex: r.hex }));
  const categoryIds = (f.categories || []).map((c) => c._id);
  const categories = await Category.find({ _id: { $in: categoryIds } }).select('name slug').lean();

  return ok(
    res,
    items.map(transformProduct),
    'Products fetched',
    {
      ...paginationMeta({ page, limit, total }),
      filters: {
        categories: categories.map((c) => ({
          value: String(c._id),
          label: c.name,
          slug: c.slug,
          count: (f.categories || []).find((x) => String(x._id) === String(c._id))?.count || 0,
        })),
        fabrics: clean(f.fabrics),
        colors: clean(f.colors),
        sizes: clean(f.sizes),
        sleeves: clean(f.sleeves),
        patterns: clean(f.patterns),
        occasions: clean(f.occasions),
        priceRange: f.priceRange?.[0] ? { min: f.priceRange[0].min, max: f.priceRange[0].max } : { min: 0, max: 0 },
      },
    }
  );
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const query = mongoose.isValidObjectId(slug) ? { _id: slug } : { slug };
  const product = await Product.findOne({ ...query, status: { $in: ['ACTIVE', 'OUT_OF_STOCK'] } })
    .select(PUBLIC_PRODUCT_FIELDS)
    .populate('category', 'name slug')
    .populate('collections', 'name slug image');

  if (!product) throw ApiError.notFound('This product is unavailable');

  Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } }).catch(() => {});

  const related = await Product.find({
    _id: { $ne: product._id },
    status: 'ACTIVE',
    $or: [{ category: product.category?._id }, { tags: { $in: product.tags || [] } }],
  })
    .select(PUBLIC_PRODUCT_FIELDS)
    .limit(8)
    .sort({ soldCount: -1 });

  const reviews = await Review.find({ product: product._id, status: 'APPROVED' })
    .select('customerName rating title comment images verifiedPurchase createdAt adminResponse')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return ok(res, {
    product: transformProduct(product),
    related: related.map(transformProduct),
    reviews,
  });
});

export const relatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).select('category tags collections');
  if (!product) throw ApiError.notFound('Product not found');
  const related = await Product.find({
    _id: { $ne: product._id },
    status: 'ACTIVE',
    $or: [{ category: product.category }, { collections: { $in: product.collections || [] } }],
  })
    .limit(Number(req.query.limit) || 8)
    .sort({ soldCount: -1 });
  return ok(res, related.map(transformProduct));
});

export const frequentlyBoughtTogether = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('category collections price');
  if (!product) throw ApiError.notFound('Product not found');
  const items = await Product.find({
    _id: { $ne: product._id },
    status: 'ACTIVE',
    collections: { $in: product.collections || [] },
  })
    .limit(3)
    .sort({ soldCount: -1 });
  return ok(res, items.map(transformProduct));
});

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await Product.aggregate([
    { $match: { status: 'ACTIVE' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const map = counts.reduce((acc, c) => ({ ...acc, [String(c._id)]: c.count }), {});
  return ok(
    res,
    categories.map((c) => ({ ...c, productCount: map[String(c._id)] || 0 }))
  );
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!category) throw ApiError.notFound('Category not found');
  const count = await Product.countDocuments({ category: category._id, status: 'ACTIVE' });
  return ok(res, { ...category, productCount: count });
});

export const listCollections = asyncHandler(async (_req, res) => {
  const collections = await Collection.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
  const counts = await Product.aggregate([
    { $match: { status: 'ACTIVE' } },
    { $unwind: '$collections' },
    { $group: { _id: '$collections', count: { $sum: 1 } } },
  ]);
  const map = counts.reduce((acc, c) => ({ ...acc, [String(c._id)]: c.count }), {});
  return ok(
    res,
    collections.map((c) => ({ ...c, productCount: map[String(c._id)] || 0 }))
  );
});

export const getCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findOne({ slug: req.params.slug, isActive: true })
    .populate('categories', 'name slug image')
    .lean();
  if (!collection) throw ApiError.notFound('Collection not found');
  const count = await Product.countDocuments({ collections: collection._id, status: 'ACTIVE' });
  const related = await Collection.find({ _id: { $ne: collection._id }, isActive: true }).limit(3).lean();
  return ok(res, { ...collection, productCount: count, related });
});

export const newArrivals = asyncHandler(async (req, res) => {
  req.query.sort = req.query.sort || 'newest';
  req.query.isNewOnly = 'true';
  const filter = buildProductFilter(req.query, { isNewArrival: true });
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });
  const [items, total] = await Promise.all([
    Product.find(filter).select(PUBLIC_PRODUCT_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  return ok(res, items.map(transformProduct), 'New arrivals', paginationMeta({ page, limit, total }));
});

export const bestSellers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });
  const filter = buildProductFilter(req.query);
  const [items, total] = await Promise.all([
    Product.find(filter).select(PUBLIC_PRODUCT_FIELDS).sort({ soldCount: -1, rating: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  return ok(res, items.map(transformProduct), 'Best sellers', paginationMeta({ page, limit, total }));
});

export const trendingProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12 });
  const filter = buildProductFilter(req.query);
  const [items, total] = await Promise.all([
    Product.find(filter)
      .select(PUBLIC_PRODUCT_FIELDS)
      .sort({ viewCount: -1, soldCount: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  return ok(res, items.map(transformProduct), 'Trending products', paginationMeta({ page, limit, total }));
});

export const search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return ok(res, { products: [], categories: [], collections: [], suggestions: [] }, 'Empty search');
  }
  const rx = new RegExp(escapeRegex(q), 'i');
  const [products, categories, collections] = await Promise.all([
    Product.find({
      status: 'ACTIVE',
      $or: [{ name: rx }, { sku: rx }, { tags: rx }, { 'attributes.fabric': rx }, { 'colors.name': rx }],
    })
      .select('name slug price mrp images rating reviewCount category')
      .limit(Number(req.query.limit) || 8),
    Category.find({ isActive: true, name: rx }).select('name slug image').limit(4),
    Collection.find({ isActive: true, name: rx }).select('name slug image').limit(4),
  ]);

  const suggestions = [
    ...products.slice(0, 5).map((p) => ({ type: 'product', label: p.name, slug: p.slug, image: p.images?.[0]?.url })),
    ...categories.map((c) => ({ type: 'category', label: c.name, slug: c.slug })),
    ...collections.map((c) => ({ type: 'collection', label: c.name, slug: c.slug })),
  ];

  return ok(res, {
    products: products.map(transformProduct),
    categories,
    collections,
    suggestions,
  });
});

export const popularSearches = asyncHandler(async (_req, res) => {
  const rows = await Product.aggregate([
    { $match: { status: 'ACTIVE' } },
    { $sort: { viewCount: -1 } },
    { $limit: 6 },
    { $project: { _id: 0, name: 1, slug: 1 } },
  ]);
  return ok(res, rows.map((r) => r.name));
});

export const latestReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ status: 'APPROVED', verifiedPurchase: true })
    .populate('product', 'name slug images')
    .sort({ createdAt: -1 })
    .limit(Number(req.query.limit) || 6)
    .lean();
  return ok(res, reviews);
});

export default {
  listProducts,
  getProductBySlug,
  relatedProducts,
  frequentlyBoughtTogether,
  listCategories,
  getCategory,
  listCollections,
  getCollection,
  newArrivals,
  bestSellers,
  trendingProducts,
  search,
  popularSearches,
  latestReviews,
};
