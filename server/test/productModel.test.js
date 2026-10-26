import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import ProductQuestion from '../models/ProductQuestion.js';
import Coupon from '../models/Coupon.js';

test('legacy published product documents remain published when validated', async () => {
  const p = new Product({ name: 'A real product', slug: 'real-product', category: 'Western Wear', price: 1200, stock: 3, published: true });
  await p.validate();
  assert.equal(p.status, 'published');
  assert.equal(p.published, true);
});

test('draft and archived product states cannot leak into the public catalog', async () => {
  const draft = new Product({ name: 'Draft item', slug: 'draft-item', category: 'Ethnic Wear', price: 0, status: 'draft', published: true });
  const archived = new Product({ name: 'Archived item', slug: 'archived-item', category: 'Ethnic Wear', price: 0, status: 'archived', published: true });
  await Promise.all([draft.validate(), archived.validate()]);
  assert.equal(draft.published, false);
  assert.equal(archived.published, false);
});

test('missing publication status defaults from the existing published flag', async () => {
  const draft = new Product({ name: 'Unpublished item', slug: 'unpublished-item', category: 'Dresses', price: 0, stock: 0 });
  await draft.validate();
  assert.equal(draft.status, 'draft');
  assert.equal(draft.published, false);
});

test('product variants retain their own size/color stock and optional SKU', async () => {
  const product = new Product({ name: 'Variant item', slug: 'variant-item', category: 'Dresses', price: 1200, stock: 5, sizes: ['S', 'M'], colors: ['Black'], variants: [{ size: 'S', color: 'Black', sku: 'VAR-S-BLK', stock: 2 }, { size: 'M', color: 'Black', stock: 3 }] });
  await product.validate();
  assert.equal(product.variants.length, 2);
  assert.equal(product.variants[0].stock, 2);
  assert.equal(product.variants[0].sku, 'VAR-S-BLK');
  assert.ok(product.variants[0]._id);
});

test('order line items can snapshot a selected variant without losing legacy fields', async () => {
  const variantId = new mongoose.Types.ObjectId();
  const order = new Order({ email: 'buyer@example.com', subtotal: 1200, total: 1299, items: [{ product: new mongoose.Types.ObjectId(), variantId, sku: 'VAR-M-NAVY', name: 'Variant item', quantity: 1, unitPrice: 1200, size: 'M', color: 'Navy' }] });
  await order.validate();
  assert.equal(String(order.items[0].variantId), String(variantId));
  assert.equal(order.items[0].sku, 'VAR-M-NAVY');
  assert.equal(order.items[0].size, 'M');
  assert.equal(order.items[0].color, 'Navy');
});

test('order request records retain type, reason and review status', async () => {
  const order = new Order({ email: 'buyer@example.com', subtotal: 1200, total: 1200, customerRequests: [{ type: 'return', status: 'pending', reason: 'The item does not fit as expected.' }] });
  await order.validate();
  assert.equal(order.customerRequests[0].type, 'return');
  assert.equal(order.customerRequests[0].status, 'pending');
  assert.ok(order.customerRequests[0]._id);
});

test('verified-purchase reviews require product, customer, order and bounded content', async () => {
  const review = new Review({ product: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), order: new mongoose.Types.ObjectId(), authorLabel: 'Nisha', rating: 5, title: 'Lovely everyday piece', body: 'The fabric and fit felt comfortable throughout the day.', verifiedPurchase: true });
  await review.validate();
  assert.equal(review.status, 'pending');
  assert.equal(review.verifiedPurchase, true);
  await assert.rejects(() => new Review({ product: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), order: new mongoose.Types.ObjectId(), authorLabel: 'Nisha', rating: 6, title: 'No', body: 'short' }).validate());
});

test('product questions remain pending until an administrator publishes an answer', async () => {
  const question = new ProductQuestion({ product: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), authorLabel: 'Nisha', question: 'Does this fabric have any stretch?' });
  await question.validate();
  assert.equal(question.status, 'pending');
  assert.equal(question.answer, undefined);
});

test('coupons enforce normalized codes, bounded percentages and valid scheduling', async () => {
  const coupon = new Coupon({ code: ' welcome-10 ', discountType: 'percentage', discountValue: 10, minSubtotal: 999, maxRedemptions: 100 });
  await coupon.validate();
  assert.equal(coupon.code, 'WELCOME-10');
  assert.equal(coupon.redemptionCount, 0);
  assert.equal(coupon.reservedCount, 0);
  await assert.rejects(() => new Coupon({ code: 'TOO-MUCH', discountType: 'percentage', discountValue: 101 }).validate());
});

test('orders can snapshot an optional gift-wrapping fee and gift note', async () => {
  const order = new Order({ email: 'buyer@example.com', subtotal: 1200, shippingFee: 99, total: 1398, gift: { wrapped: true, fee: 99, note: 'Happy birthday!' } });
  await order.validate();
  assert.equal(order.gift.wrapped, true);
  assert.equal(order.gift.fee, 99);
  assert.equal(order.gift.note, 'Happy birthday!');
});
