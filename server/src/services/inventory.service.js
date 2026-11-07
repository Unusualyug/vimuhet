import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Stock is committed with atomic, guarded updates so two shoppers can never
 * buy the last unit. `reserved` holds units for in-flight (unpaid) orders.
 */

const availableFilter = (productId, variantId, qty) => ({
  _id: productId,
  $expr: {
    $gte: [
      {
        $sum: {
          $map: {
            input: { $filter: { input: '$variants', as: 'v', cond: { $eq: ['$$v._id', variantId] } } },
            as: 'm',
            in: { $subtract: ['$$m.stock', '$$m.reserved'] },
          },
        },
      },
      qty,
    ],
  },
});

const incReserved = (variantId, qty) => [
  {
    $set: {
      variants: {
        $map: {
          input: '$variants',
          as: 'v',
          in: {
            $cond: [
              { $eq: ['$$v._id', variantId] },
              { $mergeObjects: ['$$v', { reserved: { $add: ['$$v.reserved', qty] } }] },
              '$$v',
            ],
          },
        },
      },
    },
  },
];

/** Reserves stock for every order item. Throws if any line cannot be fulfilled. */
export async function reserveStock(items, orderId) {
  const reserved = [];
  try {
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        availableFilter(item.product, item.variantId, item.quantity),
        incReserved(item.variantId, item.quantity),
        { new: true, updatePipeline: true }
      );
      if (!product) {
        throw ApiError.conflict(
          `"${item.name}" (${item.size}/${item.color}) just went out of stock. Please update your bag.`
        );
      }
      reserved.push(item);
      const variant = product.variants.find((v) => String(v._id) === String(item.variantId));
      await logMovement({
        product: item.product,
        variantId: item.variantId,
        size: item.size,
        color: item.color,
        sku: item.sku,
        type: 'RESERVE',
        quantity: item.quantity,
        balanceAfter: variant?.stock ?? 0,
        order: orderId,
        reason: 'Checkout reservation',
      });
    }
    return true;
  } catch (err) {
    await releaseStock(reserved, orderId, 'Rollback after failed reservation');
    throw err;
  }
}

/** Releases reservations (payment failed / order cancelled before commit). */
export async function releaseStock(items, orderId, reason = 'Reservation released') {
  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, 'variants._id': item.variantId },
      [
        {
          $set: {
            variants: {
              $map: {
                input: '$variants',
                as: 'v',
                in: {
                  $cond: [
                    { $eq: ['$$v._id', item.variantId] },
                    {
                      $mergeObjects: [
                        '$$v',
                        { reserved: { $max: [0, { $subtract: ['$$v.reserved', item.quantity] }] } },
                      ],
                    },
                    '$$v',
                  ],
                },
              },
            },
          },
        },
      ],
      /* `updatePipeline: true` is mandatory here. Without it Mongoose refuses an
         array update with "Cannot pass an array to query updates unless the
         updatePipeline option is set", which threw a 500 and left the
         reservation in place — reserved units leaked on every failed payment,
         cancellation and abandoned checkout until real stock read as sold out.
         reserveStock() has always passed it; this call was simply missing it. */
      { new: true, updatePipeline: true }
    );
    if (!product) {
      /* The line was removed from the catalogue, or the variant is gone. There
         is nothing left to release and it must not abort the caller's
         cancel/fail path. */
      logger.warn(`Stock release skipped for ${item.sku} (order ${orderId}) — product or variant not found`);
      continue;
    }
    const variant = product?.variants.find((v) => String(v._id) === String(item.variantId));
    await logMovement({
      product: item.product,
      variantId: item.variantId,
      size: item.size,
      color: item.color,
      sku: item.sku,
      type: 'RELEASE',
      quantity: item.quantity,
      balanceAfter: variant?.stock ?? 0,
      order: orderId,
      reason,
    });
  }
}

/** Permanently commits reserved stock after verified payment. Idempotent per order. */
export async function commitStock(items, orderId) {
  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, 'variants._id': item.variantId },
      {
        $inc: {
          stock: -item.quantity,
          soldCount: item.quantity,
          'variants.$[v].stock': -item.quantity,
          'variants.$[v].reserved': -item.quantity,
        },
      },
      { arrayFilters: [{ 'v._id': item.variantId, 'v.reserved': { $gte: item.quantity } }], new: true }
    );

    if (!product) {
      // Reservation already consumed (duplicate webhook) or missing — never oversell.
      logger.warn(`Stock commit skipped for ${item.sku} (order ${orderId}) — reservation not found`);
      continue;
    }
    const variant = product.variants.find((v) => String(v._id) === String(item.variantId));
    await logMovement({
      product: item.product,
      variantId: item.variantId,
      size: item.size,
      color: item.color,
      sku: item.sku,
      type: 'OUT',
      quantity: item.quantity,
      balanceAfter: variant?.stock ?? 0,
      order: orderId,
      reason: 'Order paid',
    });
  }
}

/** Admin-side stock adjustment (absolute set for a variant). */
export async function adjustVariantStock({ productId, variantId, quantity, reason = 'Manual adjustment', actor = 'admin' }) {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');
  const variant = product.variants.id(variantId);
  if (!variant) throw ApiError.notFound('Variant not found');

  /* `quantity` is a signed ADJUSTMENT, not an absolute level — that is what the
     admin Inventory screen sends ("Positive adds · negative removes", and its
     placeholder reads "e.g. 10 to add, -3 to remove"). This used to be treated
     as the new absolute stock, so restocking 20 units with "+10" SET stock to
     10, and any negative value clamped everything to 0. */
  const delta = Math.trunc(Number(quantity) || 0);
  if (!Number.isFinite(delta) || delta === 0) {
    throw ApiError.badRequest('Enter a non-zero adjustment quantity');
  }
  variant.stock = Math.max(0, (variant.stock || 0) + delta);
  product.stock = product.variants.reduce((s, v) => s + v.stock, 0);
  if (product.stock === 0 && product.status === 'ACTIVE') product.status = 'OUT_OF_STOCK';
  if (product.stock > 0 && product.status === 'OUT_OF_STOCK') product.status = 'ACTIVE';
  await product.save();

  await logMovement({
    product: productId,
    variantId,
    size: variant.size,
    color: variant.color,
    sku: variant.sku,
    type: delta >= 0 ? 'IN' : 'ADJUST',
    quantity: Math.abs(delta),
    balanceAfter: variant.stock,
    reason,
    by: actor,
  });

  return product;
}

async function logMovement(payload) {
  try {
    await StockMovement.create(payload);
  } catch (err) {
    logger.warn('Stock movement log failed:', err.message);
  }
}

export const inventoryService = { reserveStock, releaseStock, commitStock, adjustVariantStock };
export default inventoryService;
