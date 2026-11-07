import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Collection from '../models/Collection.js';
import StockMovement from '../models/StockMovement.js';
import InventoryAlert from '../models/InventoryAlert.js';
import { asyncHandler, created, escapeRegex, ok, paginationMeta, parsePagination, sku, slugify } from '../utils/index.js';
import ApiError from '../utils/ApiError.js';
import { storage } from '../services/storage.service.js';
import { adjustVariantStock } from '../services/inventory.service.js';
import { recordAudit } from '../middleware/audit.js';
import { notifyAdmin } from '../services/notification.service.js';

/* --------------------------------- Uploads --------------------------------- */

export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.files?.length && !req.file) throw ApiError.badRequest('No image provided');
  const files = req.files?.length ? req.files : [req.file];
  const folder = req.body?.folder || req.query.folder || 'products';
  const uploaded = await storage.uploadMany(files, { folder });
  return created(res, { images: uploaded, provider: storage.provider }, 'Image uploaded');
});

export const deleteMedia = asyncHandler(async (req, res) => {
  await storage.destroy(req.body.publicId);
  return ok(res, null, 'Image deleted');
});

/* --------------------------------- Products -------------------------------- */

const toImages = (images = []) =>
  images.map((img, i) => ({
    url: img.url,
    publicId: img.publicId || '',
    alt: img.alt || '',
    type: img.type || 'gallery',
    color: img.color || '',
    sortOrder: img.sortOrder ?? i,
  }));

function buildVariants({ sizes = [], colors = [], price, mrp, baseSku, existing = [], lowStockThreshold = 5 }) {
  const variants = [];
  sizes.forEach((size) => {
    colors.forEach((color) => {
      const name = typeof color === 'string' ? color : color.name;
      const match = existing.find((v) => v.size === size && v.color === name);
      variants.push({
        _id: match?._id,
        sku: match?.sku || `${baseSku}-${size}-${name.slice(0, 3).toUpperCase()}`,
        size,
        color: name,
        price: match?.price ?? price,
        mrp: match?.mrp ?? mrp,
        stock: match?.stock ?? 0,
        reserved: match?.reserved ?? 0,
        lowStockThreshold: match?.lowStockThreshold ?? lowStockThreshold,
        isActive: match?.isActive ?? true,
      });
    });
  });
  return variants;
}

export const adminListProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 200 });
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.stock === 'low') filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
  if (req.query.stock === 'out') filter.stock = 0;

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    'name-asc': { name: 1 },
    'price-desc': { price: -1 },
    'price-asc': { price: 1 },
    'stock-asc': { stock: 1 },
    'sales-desc': { soldCount: -1 },
  };

  const [items, total, stats] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortMap[req.query.sort] || sortMap.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
    Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0] } },
          inventoryValue: { $sum: { $multiply: ['$stock', '$price'] } },
        },
      },
    ]),
  ]);

  return ok(res, items, 'Products fetched', {
    ...paginationMeta({ page, limit, total }),
    stats: stats[0] || {},
  });
});

export const adminGetProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug').populate('collections', 'name slug');
  if (!product) throw ApiError.notFound('Product not found');
  return ok(res, product);
});

export const adminCreateProduct = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body.name) throw ApiError.badRequest('Product name is required');
  if (body.price == null || body.mrp == null) throw ApiError.badRequest('Selling price and MRP are required');
  if (Number(body.mrp) < Number(body.price)) throw ApiError.badRequest('MRP cannot be lower than the selling price');

  const baseSku = (body.sku || sku()).toUpperCase();
  const existingSku = await Product.findOne({ sku: baseSku });
  if (existingSku) throw ApiError.conflict('A product with this SKU already exists');

  const colors = body.colors || [];
  const sizes = body.sizes || [];
  const variants = body.variants?.length
    ? body.variants
    : buildVariants({ sizes, colors, price: body.price, mrp: body.mrp, baseSku });

  const product = await Product.create({
    ...body,
    sku: baseSku,
    slug: body.slug ? slugify(body.slug) : `${slugify(body.name)}-${baseSku.slice(-4).toLowerCase()}`,
    images: toImages(body.images),
    variants,
    stock: variants.reduce((s, v) => s + (Number(v.stock) || 0), 0),
    status: body.status || 'DRAFT',
    publishedAt: body.status === 'ACTIVE' ? new Date() : undefined,
  });

  await Category.updateOne({ _id: product.category }, { $inc: { productCount: 1 } });
  await recordAudit(req, {
    action: 'PRODUCT_CREATE',
    entity: 'Product',
    entityId: product._id,
    description: `Created product ${product.name}`,
  });
  return created(res, product, 'Product created');
});

export const adminUpdateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const body = { ...req.body };
  delete body._id;

  if (body.sku && body.sku.toUpperCase() !== product.sku) {
    const dup = await Product.findOne({ sku: body.sku.toUpperCase(), _id: { $ne: product._id } });
    if (dup) throw ApiError.conflict('Another product already uses this SKU');
    body.sku = body.sku.toUpperCase();
  }
  if (body.mrp != null && body.price != null && Number(body.mrp) < Number(body.price)) {
    throw ApiError.badRequest('MRP cannot be lower than the selling price');
  }
  if (body.name && body.name !== product.name) body.slug = `${slugify(body.name)}-${product.sku.slice(-4).toLowerCase()}`;
  if (body.images) body.images = toImages(body.images);
  if (body.sizes || body.colors) {
    body.variants = buildVariants({
      sizes: body.sizes || product.sizes,
      colors: body.colors || product.colors,
      price: body.price ?? product.price,
      mrp: body.mrp ?? product.mrp,
      baseSku: body.sku || product.sku,
      existing: product.variants,
      lowStockThreshold: product.lowStockThreshold,
    });
    body.stock = body.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  } else if (body.variants) {
    body.stock = body.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  }
  if (body.status === 'ACTIVE' && !product.publishedAt) body.publishedAt = new Date();

  Object.assign(product, body);
  await product.save();

  await recordAudit(req, {
    action: 'PRODUCT_UPDATE',
    entity: 'Product',
    entityId: product._id,
    description: `Updated product ${product.name}`,
    changes: Object.keys(body),
  });
  return ok(res, product, 'Product updated');
});

export const adminDeleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  // Remove Cloudinary assets, then archive (orders keep their snapshot data).
  await Promise.all(product.images.map((img) => storage.destroy(img.publicId)));
  await Product.deleteOne({ _id: product._id });
  await Category.updateOne({ _id: product.category }, { $inc: { productCount: -1 } });
  await recordAudit(req, {
    action: 'PRODUCT_DELETE',
    entity: 'Product',
    entityId: product._id,
    description: `Deleted product ${product.name}`,
  });
  return ok(res, null, 'Product deleted');
});

export const adminDuplicateProduct = asyncHandler(async (req, res) => {
  const source = await Product.findById(req.params.id).lean();
  if (!source) throw ApiError.notFound('Product not found');
  delete source._id;
  delete source.createdAt;
  delete source.updatedAt;
  const baseSku = sku();
  const copy = await Product.create({
    ...source,
    name: `${source.name} (Copy)`,
    sku: baseSku,
    slug: `${slugify(source.name)}-copy-${baseSku.slice(-4).toLowerCase()}`,
    status: 'DRAFT',
    soldCount: 0,
    viewCount: 0,
    rating: 0,
    reviewCount: 0,
    ratingBreakdown: [0, 0, 0, 0, 0],
    variants: source.variants.map((v) => ({ ...v, _id: undefined, sku: `${baseSku}-${v.size}-${v.color.slice(0, 3).toUpperCase()}`, reserved: 0 })),
  });
  await recordAudit(req, { action: 'PRODUCT_DUPLICATE', entity: 'Product', entityId: copy._id, description: `Duplicated ${source.name}` });
  return created(res, copy, 'Product duplicated as draft');
});

export const adminBulkProductAction = asyncHandler(async (req, res) => {
  const { ids = [], action, value } = req.body;
  if (!ids.length) throw ApiError.badRequest('Select at least one product');
  let update = {};
  if (action === 'status') update = { status: value };
  else if (action === 'feature') update = { isFeatured: Boolean(value) };
  else if (action === 'delete') {
    const products = await Product.find({ _id: { $in: ids } });
    await Promise.all(products.flatMap((p) => p.images.map((i) => storage.destroy(i.publicId))));
    await Product.deleteMany({ _id: { $in: ids } });
    await recordAudit(req, { action: 'PRODUCT_BULK_DELETE', entity: 'Product', description: `Deleted ${ids.length} products` });
    return ok(res, { modified: products.length }, `${products.length} products deleted`);
  } else throw ApiError.badRequest('Unsupported bulk action');

  const result = await Product.updateMany({ _id: { $in: ids } }, update);
  await recordAudit(req, { action: 'PRODUCT_BULK_UPDATE', entity: 'Product', description: `Bulk ${action} on ${ids.length} products` });
  return ok(res, { modified: result.modifiedCount }, 'Products updated');
});

/* -------------------------------- Categories ------------------------------- */

export const adminListCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const map = counts.reduce((a, c) => ({ ...a, [String(c._id)]: c.count }), {});
  return ok(res, categories.map((c) => ({ ...c, productCount: map[String(c._id)] || 0 })));
});

export const adminSaveCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = { ...req.body };
  body.slug = body.slug ? slugify(body.slug) : slugify(body.name);
  if (id) {
    const category = await Category.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!category) throw ApiError.notFound('Category not found');
    await recordAudit(req, { action: 'CATEGORY_UPDATE', entity: 'Category', entityId: category._id, description: `Updated ${category.name}` });
    return ok(res, category, 'Category updated');
  }
  const exists = await Category.findOne({ $or: [{ name: body.name }, { slug: body.slug }] });
  if (exists) throw ApiError.conflict('A category with this name already exists');
  const category = await Category.create(body);
  await recordAudit(req, { action: 'CATEGORY_CREATE', entity: 'Category', entityId: category._id, description: `Created ${category.name}` });
  return created(res, category, 'Category created');
});

export const adminDeleteCategory = asyncHandler(async (req, res) => {
  const count = await Product.countDocuments({ category: req.params.id });
  if (count) throw ApiError.badRequest(`Move or delete the ${count} products in this category first`);
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  await recordAudit(req, { action: 'CATEGORY_DELETE', entity: 'Category', entityId: req.params.id, description: `Deleted ${category.name}` });
  return ok(res, null, 'Category deleted');
});

export const adminReorderCategories = asyncHandler(async (req, res) => {
  const { order = [] } = req.body;
  await Promise.all(order.map((id, i) => Category.updateOne({ _id: id }, { sortOrder: i })));
  return ok(res, null, 'Order saved');
});

/* ------------------------------- Collections ------------------------------- */

export const adminListCollections = asyncHandler(async (_req, res) => {
  const collections = await Collection.find().sort({ sortOrder: 1 }).lean();
  const counts = await Product.aggregate([{ $unwind: '$collections' }, { $group: { _id: '$collections', count: { $sum: 1 } } }]);
  const map = counts.reduce((a, c) => ({ ...a, [String(c._id)]: c.count }), {});
  return ok(res, collections.map((c) => ({ ...c, productCount: map[String(c._id)] || 0 })));
});

export const adminSaveCollection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = { ...req.body };
  body.slug = body.slug ? slugify(body.slug) : slugify(body.name);
  if (id) {
    const collection = await Collection.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!collection) throw ApiError.notFound('Collection not found');
    await recordAudit(req, { action: 'COLLECTION_UPDATE', entity: 'Collection', entityId: collection._id, description: `Updated ${collection.name}` });
    return ok(res, collection, 'Collection updated');
  }
  const collection = await Collection.create(body);
  await recordAudit(req, { action: 'COLLECTION_CREATE', entity: 'Collection', entityId: collection._id, description: `Created ${collection.name}` });
  return created(res, collection, 'Collection created');
});

export const adminDeleteCollection = asyncHandler(async (req, res) => {
  const collection = await Collection.findByIdAndDelete(req.params.id);
  if (!collection) throw ApiError.notFound('Collection not found');
  await Product.updateMany({ collections: req.params.id }, { $pull: { collections: req.params.id } });
  await recordAudit(req, { action: 'COLLECTION_DELETE', entity: 'Collection', entityId: req.params.id, description: `Deleted ${collection.name}` });
  return ok(res, null, 'Collection deleted');
});

/* -------------------------------- Inventory -------------------------------- */

export const adminInventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 200 });
  const match = {};
  if (req.query.q) match.name = new RegExp(escapeRegex(req.query.q), 'i');
  if (req.query.category) match.category = new (await import('mongoose')).default.Types.ObjectId(req.query.category);

  const pipeline = [
    { $match: match },
    { $unwind: '$variants' },
    ...(req.query.level === 'low'
      ? [{ $match: { $expr: { $and: [{ $gt: ['$variants.stock', 0] }, { $lte: ['$variants.stock', '$variants.lowStockThreshold'] }] } } }]
      : []),
    ...(req.query.level === 'out' ? [{ $match: { 'variants.stock': 0 } }] : []),
    { $sort: { 'variants.stock': 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: '$variants._id',
        productId: '$_id',
        name: 1,
        sku: '$variants.sku',
        image: { $first: '$images.url' },
        size: '$variants.size',
        color: '$variants.color',
        stock: '$variants.stock',
        reserved: '$variants.reserved',
        threshold: '$variants.lowStockThreshold',
        status: 1,
      },
    },
  ];

  const [rows, countAgg, stats] = await Promise.all([
    Product.aggregate(pipeline),
    Product.aggregate([{ $match: match }, { $unwind: '$variants' }, { $count: 'total' }]),
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stock' },
          products: { $sum: 1 },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } },
          inventoryValue: { $sum: { $multiply: ['$stock', '$price'] } },
        },
      },
    ]),
  ]);

  return ok(res, rows, 'Inventory fetched', {
    ...paginationMeta({ page, limit, total: countAgg[0]?.total || 0 }),
    stats: stats[0] || {},
  });
});

export const adminUpdateStock = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity, reason } = req.body;
  const product = await adjustVariantStock({ productId, variantId, quantity: Number(quantity), reason, actor: req.admin.name });

  const variant = product.variants.id(variantId);
  if (variant && variant.stock <= variant.lowStockThreshold) {
    await notifyAdmin({
      type: 'LOW_STOCK',
      title: `Low stock: ${product.name}`,
      message: `${variant.size}/${variant.color} has ${variant.stock} units left.`,
      link: `/admin/inventory`,
    });
  }
  if (variant && variant.stock > 0) {
    await InventoryAlert.updateMany({ product: productId, variantId }, { notified: false });
  }
  await recordAudit(req, {
    action: 'STOCK_UPDATE',
    entity: 'Inventory',
    entityId: `${productId}:${variantId}`,
    description: `Stock set to ${quantity} for ${product.name}`,
  });
  return ok(res, product, 'Stock updated');
});

export const adminStockMovements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.productId) filter.product = req.query.productId;
  const [rows, total] = await Promise.all([
    StockMovement.find(filter).populate('product', 'name sku').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    StockMovement.countDocuments(filter),
  ]);
  return ok(res, rows, 'Movements fetched', paginationMeta({ page, limit, total }));
});

export default {
  uploadMedia,
  deleteMedia,
  adminListProducts,
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminDuplicateProduct,
  adminBulkProductAction,
  adminListCategories,
  adminSaveCategory,
  adminDeleteCategory,
  adminReorderCategories,
  adminListCollections,
  adminSaveCollection,
  adminDeleteCollection,
  adminInventory,
  adminUpdateStock,
  adminStockMovements,
};
