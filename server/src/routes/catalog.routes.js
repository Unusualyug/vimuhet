import { Router } from 'express';
import * as catalog from '../controllers/catalog.controller.js';
import * as store from '../controllers/store.controller.js';
import { optionalUser, protectUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reviewRules } from '../validators/common.validators.js';

const router = Router();

router.get('/products', catalog.listProducts);
router.get('/products/search', catalog.search);
router.get('/products/popular-searches', catalog.popularSearches);
router.get('/products/:slug', catalog.getProductBySlug);
router.get('/products/:id/related', catalog.relatedProducts);
router.get('/products/:id/frequently-bought', catalog.frequentlyBoughtTogether);
router.get('/products/:productId/reviews', store.productReviews);
router.get('/products/:productId/size-stats', store.productSizeStats);

router.get('/categories', catalog.listCategories);
router.get('/categories/:slug', catalog.getCategory);
router.get('/collections', catalog.listCollections);
router.get('/collections/:slug', catalog.getCollection);

router.get('/new-arrivals', catalog.newArrivals);
router.get('/best-sellers', catalog.bestSellers);
router.get('/trending', catalog.trendingProducts);
router.get('/reviews/latest', catalog.latestReviews);

export default router;
