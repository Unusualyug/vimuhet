import { Router } from 'express';
import * as catalog from '../controllers/admin.catalog.controller.js';
import * as ops from '../controllers/admin.ops.controller.js';
import * as cms from '../controllers/cms.controller.js';
import * as analytics from '../controllers/analytics.controller.js';
import * as store from '../controllers/store.controller.js';
import { protectAdmin, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImages } from '../middleware/upload.js';
import { couponRules, productRules } from '../validators/common.validators.js';

const router = Router();
router.use(protectAdmin);

/* Dashboard & analytics */
router.get('/dashboard', requirePermission('dashboard:read'), ops.dashboard);
router.get('/analytics/overview', requirePermission('analytics:read'), analytics.overview);
router.get('/analytics/timeseries', requirePermission('analytics:read'), analytics.timeseries);
router.get('/analytics/sources', requirePermission('analytics:read'), analytics.sources);
router.get('/analytics/pages', requirePermission('analytics:read'), analytics.pages);
router.get('/analytics/live', requirePermission('analytics:read'), analytics.live);
router.get('/analytics/visitors', requirePermission('analytics:read'), analytics.visitors);
router.get('/analytics/products', requirePermission('analytics:read'), analytics.products);
router.get('/analytics/consent', requirePermission('analytics:read'), analytics.consent);

/* Media */
router.post('/upload', requirePermission('products:write'), uploadImages, catalog.uploadMedia);
router.post('/upload/delete', requirePermission('products:write'), catalog.deleteMedia);

/* Products */
router.get('/products', requirePermission('products:read'), catalog.adminListProducts);
router.get('/products/:id', requirePermission('products:read'), catalog.adminGetProduct);
router.post('/products', requirePermission('products:write'), productRules, validate, catalog.adminCreateProduct);
router.patch('/products/:id', requirePermission('products:write'), catalog.adminUpdateProduct);
router.delete('/products/:id', requirePermission('products:write'), catalog.adminDeleteProduct);
router.post('/products/:id/duplicate', requirePermission('products:write'), catalog.adminDuplicateProduct);
router.post('/products/bulk', requirePermission('products:write'), catalog.adminBulkProductAction);

/* Categories & collections */
router.get('/categories', requirePermission('products:read'), catalog.adminListCategories);
router.post('/categories', requirePermission('categories:write'), catalog.adminSaveCategory);
router.patch('/categories/:id', requirePermission('categories:write'), catalog.adminSaveCategory);
router.delete('/categories/:id', requirePermission('categories:write'), catalog.adminDeleteCategory);
router.post('/categories/reorder', requirePermission('categories:write'), catalog.adminReorderCategories);

router.get('/collections', requirePermission('products:read'), catalog.adminListCollections);
router.post('/collections', requirePermission('collections:write'), catalog.adminSaveCollection);
router.patch('/collections/:id', requirePermission('collections:write'), catalog.adminSaveCollection);
router.delete('/collections/:id', requirePermission('collections:write'), catalog.adminDeleteCollection);

/* Inventory */
router.get('/inventory', requirePermission('inventory:write'), catalog.adminInventory);
router.patch('/inventory/stock', requirePermission('inventory:write'), catalog.adminUpdateStock);
router.get('/inventory/movements', requirePermission('inventory:write'), catalog.adminStockMovements);

/* Orders */
router.get('/orders', requirePermission('orders:read'), ops.adminListOrders);
router.get('/orders/:id', requirePermission('orders:read'), ops.adminGetOrder);
router.patch('/orders/:id/status', requirePermission('orders:write'), ops.adminUpdateOrderStatus);
router.post('/orders/:id/cancel', requirePermission('orders:write'), ops.adminCancelOrder);
router.post('/orders/:id/refund', requirePermission('payments:refund'), ops.adminRefundOrder);
router.get('/orders/:id/invoice', requirePermission('orders:read'), ops.adminInvoice);

/* Payments */
router.get('/payments', requirePermission('payments:read'), ops.adminListPayments);
router.get('/payments/:id', requirePermission('payments:read'), ops.adminGetPayment);
router.post('/payments/:id/recheck', requirePermission('payments:read'), ops.adminRecheckPayment);

/* Customers */
router.get('/customers', requirePermission('customers:read'), ops.adminListCustomers);
router.get('/customers/:id', requirePermission('customers:read'), ops.adminGetCustomer);
router.patch('/customers/:id/toggle', requirePermission('customers:read'), ops.adminToggleCustomer);

/* Coupons */
router.get('/coupons', requirePermission('coupons:write'), ops.adminListCoupons);
router.post('/coupons', requirePermission('coupons:write'), couponRules, validate, ops.adminSaveCoupon);
router.patch('/coupons/:id', requirePermission('coupons:write'), ops.adminSaveCoupon);
router.delete('/coupons/:id', requirePermission('coupons:write'), ops.adminDeleteCoupon);

/* Reviews */
router.get('/reviews', requirePermission('reviews:moderate'), ops.adminListReviews);
router.patch('/reviews/:id', requirePermission('reviews:moderate'), ops.adminModerateReview);
router.delete('/reviews/:id', requirePermission('reviews:moderate'), ops.adminDeleteReview);

/* CMS */
router.get('/homepage', requirePermission('cms:write'), cms.adminGetHomepage);
router.put('/homepage', requirePermission('cms:write'), cms.adminSaveHomepage);
router.get('/banners', requirePermission('cms:write'), cms.adminListBanners);
router.post('/banners', requirePermission('cms:write'), cms.adminSaveBanner);
router.patch('/banners/:id', requirePermission('cms:write'), cms.adminSaveBanner);
router.delete('/banners/:id', requirePermission('cms:write'), cms.adminDeleteBanner);
router.post('/banners/reorder', requirePermission('cms:write'), cms.adminReorderBanners);

/* Engagement */
router.get('/contacts', requirePermission('orders:read'), ops.adminListContacts);
router.patch('/contacts/:id', requirePermission('orders:write'), ops.adminUpdateContact);
router.get('/subscribers', requirePermission('customers:read'), ops.adminListSubscribers);
router.get('/abandoned-carts', requirePermission('analytics:read'), ops.adminAbandonedCarts);
router.get('/notifications', ops.adminNotifications);
router.post('/notifications/read', ops.adminMarkNotificationRead);

/* Reports */
router.get('/reports/center', requirePermission('reports:read'), ops.reportCenter);
router.get('/reports/revenue', requirePermission('reports:read'), ops.revenueReport);
router.get('/reports/customers', requirePermission('reports:read'), ops.customerReport);
router.get('/reports/products', requirePermission('reports:read'), ops.productReport);

/* Administration */
router.get('/admins', requirePermission('settings:write'), ops.adminListAdmins);
router.post('/admins', requirePermission('admins:manage'), ops.adminSaveAdmin);
router.patch('/admins/:id', requirePermission('admins:manage'), ops.adminSaveAdmin);
router.delete('/admins/:id', requirePermission('admins:manage'), ops.adminDeleteAdmin);
router.get('/audit-logs', requirePermission('audit:read'), ops.adminAuditLogs);
router.get('/settings', requirePermission('settings:write'), ops.getAdminSettings);
router.put('/settings', requirePermission('settings:write'), ops.saveAdminSettings);

/* Admin-side customer management helpers */
router.get('/customers/:id/export', requirePermission('customers:read'), ops.adminGetCustomer);

export default router;
