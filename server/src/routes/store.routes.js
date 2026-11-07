import { Router } from 'express';
import * as cart from '../controllers/cart.controller.js';
import * as store from '../controllers/store.controller.js';
import * as cms from '../controllers/cms.controller.js';
import * as analytics from '../controllers/analytics.controller.js';
import { optionalUser, protectUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter, analyticsLimiter } from '../middleware/rateLimit.js';
import {
  addressRules,
  cartAddRules,
  checkoutRules,
  contactRules,
  reviewRules,
  verifyPaymentRules,
} from '../validators/common.validators.js';

const router = Router();

/* Cart */
router.get('/cart', optionalUser, cart.getCart);
router.post('/cart/items', optionalUser, writeLimiter, cartAddRules, validate, cart.addItem);
router.patch('/cart/items/:itemId', optionalUser, cart.updateItem);
router.delete('/cart/items/:itemId', optionalUser, cart.removeItem);
router.delete('/cart', optionalUser, cart.clearCart);
router.post('/cart/coupon', optionalUser, cart.applyCoupon);
router.delete('/cart/coupon', optionalUser, cart.removeCoupon);
router.post('/cart/items/:itemId/wishlist', optionalUser, cart.moveToWishlist);
router.post('/cart/wishlist-to-cart', protectUser, cart.wishlistToCart);

/* Wishlist */
router.get('/wishlist', optionalUser, cart.getWishlist);
router.post('/wishlist/toggle', optionalUser, cart.toggleWishlist);
router.delete('/wishlist/:productId', optionalUser, cart.removeFromWishlist);

/* Coupons (public listing) */
router.get('/coupons/public', cart.publicCoupons);

/* Checkout & payments */
/* Orders may only be placed, paid for, or amended by an authenticated customer.
   A guest cart lives server-side against x-guest-id and is merged into the
   account on login/register, so nothing is lost by requiring auth here. */
router.post('/checkout/create', protectUser, writeLimiter, checkoutRules, validate, store.createCheckout);
router.post('/checkout/verify', protectUser, verifyPaymentRules, validate, store.verifyPayment);
router.post('/checkout/failed', protectUser, store.reportFailed);
router.post('/checkout/retry', protectUser, store.retry);
router.post('/checkout/sandbox-payment', protectUser, store.sandboxPayment);
router.get('/checkout/pincode/:pincode', store.checkPincode);

/* Orders */
router.get('/orders', protectUser, store.myOrders);
router.get('/orders/:id', protectUser, store.myOrderDetail);
router.get('/orders/track/lookup', optionalUser, store.trackOrder);
router.post('/orders/:id/cancel', protectUser, store.cancelMyOrder);
router.post('/orders/:id/return', protectUser, store.requestReturn);

/* Addresses */
router.get('/addresses', protectUser, store.listAddresses);
router.post('/addresses', protectUser, addressRules, validate, store.addAddress);
router.patch('/addresses/:addressId', protectUser, store.updateAddress);
router.delete('/addresses/:addressId', protectUser, store.deleteAddress);
router.post('/addresses/:addressId/default', protectUser, store.setDefaultAddress);

/* Reviews */
router.get('/my/reviews/reviewable', protectUser, store.reviewableItems);
router.get('/my/reviews', protectUser, store.myReviews);
router.post('/my/reviews', protectUser, reviewRules, validate, store.createReview);
router.delete('/my/reviews/:id', protectUser, store.deleteMyReview);

/* Misc */
router.post('/newsletter/subscribe', writeLimiter, store.subscribe);
router.post('/stock-alerts', optionalUser, store.backInStockAlert);
router.post('/contact', writeLimiter, contactRules, validate, store.contact);

/* CMS */
router.get('/homepage', cms.publicHomepage);
router.get('/banners', cms.publicBanners);
router.get('/settings/public', cms.publicSettings);

/* Analytics */
router.post('/analytics/track', analyticsLimiter, optionalUser, analytics.track);

export default router;
