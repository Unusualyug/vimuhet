import api from './api.js';

const unwrap = (p) => p.then((r) => r.data);

export const catalogApi = {
  products: (params) => unwrap(api.get('/products', { params })),
  product: (slug) => unwrap(api.get(`/products/${slug}`)),
  related: (id, limit = 8) => unwrap(api.get(`/products/${id}/related`, { params: { limit } })),
  frequentlyBought: (id) => unwrap(api.get(`/products/${id}/frequently-bought`)),
  search: (q, limit = 8) => unwrap(api.get('/products/search', { params: { q, limit } })),
  popularSearches: () => unwrap(api.get('/products/popular-searches')),
  categories: () => unwrap(api.get('/categories')),
  category: (slug) => unwrap(api.get(`/categories/${slug}`)),
  collections: () => unwrap(api.get('/collections')),
  collection: (slug) => unwrap(api.get(`/collections/${slug}`)),
  newArrivals: (params) => unwrap(api.get('/new-arrivals', { params })),
  bestSellers: (params) => unwrap(api.get('/best-sellers', { params })),
  trending: (params) => unwrap(api.get('/trending', { params })),
  reviews: (productId, params) => unwrap(api.get(`/products/${productId}/reviews`, { params })),
  sizeStats: (productId) => unwrap(api.get(`/products/${productId}/size-stats`)),
  latestReviews: () => unwrap(api.get('/reviews/latest')),
};

export const homeApi = {
  homepage: () => unwrap(api.get('/homepage')),
  settings: () => unwrap(api.get('/settings/public')),
  banners: (position) => unwrap(api.get('/banners', { params: { position } })),
};

export const authApi = {
  register: (body) => unwrap(api.post('/auth/register', { ...body, guestId: localStorage.getItem('vimuhet_guest_id') })),
  login: (body) => unwrap(api.post('/auth/login', { ...body, guestId: localStorage.getItem('vimuhet_guest_id') })),
  adminLogin: (body) => unwrap(api.post('/auth/admin/login', body)),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  adminMe: () => unwrap(api.get('/auth/admin/me')),
  updateMe: (body) => unwrap(api.patch('/auth/me', body)),
  changePassword: (body) => unwrap(api.post('/auth/change-password', body)),
  forgot: (email) => unwrap(api.post('/auth/forgot-password', { email })),
  reset: (body) => unwrap(api.post('/auth/reset-password', body)),
  verifyEmail: (token) => unwrap(api.post('/auth/verify-email', { token })),
  sessions: () => unwrap(api.get('/auth/sessions')),
  revokeSessions: () => unwrap(api.post('/auth/sessions/revoke-all')),
  requestDeletion: () => unwrap(api.post('/auth/account-deletion')),
  adminChangePassword: (body) => unwrap(api.post('/auth/admin/change-password', body)),
};

export const cartApi = {
  get: () => unwrap(api.get('/cart')),
  add: (body) => unwrap(api.post('/cart/items', body)),
  update: (itemId, quantity) => unwrap(api.patch(`/cart/items/${itemId}`, { quantity })),
  remove: (itemId) => unwrap(api.delete(`/cart/items/${itemId}`)),
  clear: () => unwrap(api.delete('/cart')),
  applyCoupon: (code) => unwrap(api.post('/cart/coupon', { code })),
  removeCoupon: () => unwrap(api.delete('/cart/coupon')),
  moveToWishlist: (itemId) => unwrap(api.post(`/cart/items/${itemId}/wishlist`)),
  wishlist: () => unwrap(api.get('/wishlist')),
  toggleWishlist: (productId) => unwrap(api.post('/wishlist/toggle', { productId })),
  coupons: () => unwrap(api.get('/coupons/public')),
};

export const checkoutApi = {
  create: (body) => unwrap(api.post('/checkout/create', body)),
  verify: (body) => unwrap(api.post('/checkout/verify', body)),
  failed: (body) => unwrap(api.post('/checkout/failed', body)),
  retry: (orderId) => unwrap(api.post('/checkout/retry', { orderId })),
  sandbox: (razorpayOrderId, orderId) => unwrap(api.post('/checkout/sandbox-payment', { razorpayOrderId, orderId })),
  pincode: (pin) => unwrap(api.get(`/checkout/pincode/${pin}`)),
};

export const orderApi = {
  mine: (params) => unwrap(api.get('/orders', { params })),
  detail: (id) => unwrap(api.get(`/orders/${id}`)),
  track: (params) => unwrap(api.get('/orders/track/lookup', { params })),
  cancel: (id, reason) => unwrap(api.post(`/orders/${id}/cancel`, { reason })),
  requestReturn: (id, reason) => unwrap(api.post(`/orders/${id}/return`, { reason })),
};

export const accountApi = {
  addresses: () => unwrap(api.get('/addresses')),
  addAddress: (body) => unwrap(api.post('/addresses', body)),
  updateAddress: (id, body) => unwrap(api.patch(`/addresses/${id}`, body)),
  deleteAddress: (id) => unwrap(api.delete(`/addresses/${id}`)),
  setDefault: (id) => unwrap(api.post(`/addresses/${id}/default`)),
  reviewable: () => unwrap(api.get('/my/reviews/reviewable')),
  myReviews: () => unwrap(api.get('/my/reviews')),
  createReview: (body) => unwrap(api.post('/my/reviews', body)),
  deleteReview: (id) => unwrap(api.delete(`/my/reviews/${id}`)),
};

export const consentApi = {
  policy: () => unwrap(api.get('/cookies/policy')),
  current: (params) => unwrap(api.get('/cookies/consent', { params })),
  save: (body) => unwrap(api.post('/cookies/consent', body)),
  withdraw: (body) => unwrap(api.post('/cookies/withdraw', body || {})),
  recentlyViewed: (params) => unwrap(api.get('/recently-viewed', { params })),
  trackRecentView: (productId) => unwrap(api.post('/recently-viewed', { productId })),
  dataRequest: (body) => unwrap(api.post('/privacy/data-request', body)),
};

export const miscApi = {
  subscribe: (email, source) => unwrap(api.post('/newsletter/subscribe', { email, source })),
  backInStock: (body) => unwrap(api.post('/stock-alerts', body)),
  contact: (body) => unwrap(api.post('/contact', body)),
  track: (body) => unwrap(api.post('/analytics/track', body)),
};

export const adminApi = {
  dashboard: (params) => unwrap(api.get('/admin/dashboard', { params })),
  analytics: (path, params) => unwrap(api.get(`/admin/analytics/${path}`, { params })),
  products: (params) => unwrap(api.get('/admin/products', { params })),
  product: (id) => unwrap(api.get(`/admin/products/${id}`)),
  createProduct: (body) => unwrap(api.post('/admin/products', body)),
  updateProduct: (id, body) => unwrap(api.patch(`/admin/products/${id}`, body)),
  deleteProduct: (id) => unwrap(api.delete(`/admin/products/${id}`)),
  duplicateProduct: (id) => unwrap(api.post(`/admin/products/${id}/duplicate`)),
  bulkProducts: (body) => unwrap(api.post('/admin/products/bulk', body)),
  upload: (files, folder = 'products') => {
    const form = new FormData();
    [...files].forEach((f) => form.append('images', f));
    form.append('folder', folder);
    return unwrap(api.post('/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  deleteMedia: (publicId) => unwrap(api.post('/admin/upload/delete', { publicId })),
  categories: () => unwrap(api.get('/admin/categories')),
  saveCategory: (body, id) => (id ? unwrap(api.patch(`/admin/categories/${id}`, body)) : unwrap(api.post('/admin/categories', body))),
  deleteCategory: (id) => unwrap(api.delete(`/admin/categories/${id}`)),
  collections: () => unwrap(api.get('/admin/collections')),
  saveCollection: (body, id) => (id ? unwrap(api.patch(`/admin/collections/${id}`, body)) : unwrap(api.post('/admin/collections', body))),
  deleteCollection: (id) => unwrap(api.delete(`/admin/collections/${id}`)),
  inventory: (params) => unwrap(api.get('/admin/inventory', { params })),
  updateStock: (body) => unwrap(api.patch('/admin/inventory/stock', body)),
  stockMovements: (params) => unwrap(api.get('/admin/inventory/movements', { params })),
  orders: (params) => unwrap(api.get('/admin/orders', { params })),
  order: (id) => unwrap(api.get(`/admin/orders/${id}`)),
  updateOrderStatus: (id, body) => unwrap(api.patch(`/admin/orders/${id}/status`, body)),
  cancelOrder: (id, reason) => unwrap(api.post(`/admin/orders/${id}/cancel`, { reason })),
  refundOrder: (id, body) => unwrap(api.post(`/admin/orders/${id}/refund`, body)),
  invoice: (id) => unwrap(api.get(`/admin/orders/${id}/invoice`)),
  payments: (params) => unwrap(api.get('/admin/payments', { params })),
  payment: (id) => unwrap(api.get(`/admin/payments/${id}`)),
  recheckPayment: (id) => unwrap(api.post(`/admin/payments/${id}/recheck`)),
  customers: (params) => unwrap(api.get('/admin/customers', { params })),
  customer: (id) => unwrap(api.get(`/admin/customers/${id}`)),
  toggleCustomer: (id) => unwrap(api.patch(`/admin/customers/${id}/toggle`)),
  coupons: (params) => unwrap(api.get('/admin/coupons', { params })),
  saveCoupon: (body, id) => (id ? unwrap(api.patch(`/admin/coupons/${id}`, body)) : unwrap(api.post('/admin/coupons', body))),
  deleteCoupon: (id) => unwrap(api.delete(`/admin/coupons/${id}`)),
  reviews: (params) => unwrap(api.get('/admin/reviews', { params })),
  moderateReview: (id, body) => unwrap(api.patch(`/admin/reviews/${id}`, body)),
  deleteReview: (id) => unwrap(api.delete(`/admin/reviews/${id}`)),
  homepage: () => unwrap(api.get('/admin/homepage')),
  saveHomepage: (body) => unwrap(api.put('/admin/homepage', body)),
  banners: () => unwrap(api.get('/admin/banners')),
  saveBanner: (body, id) => (id ? unwrap(api.patch(`/admin/banners/${id}`, body)) : unwrap(api.post('/admin/banners', body))),
  deleteBanner: (id) => unwrap(api.delete(`/admin/banners/${id}`)),
  contacts: () => unwrap(api.get('/admin/contacts')),
  subscribers: (params) => unwrap(api.get('/admin/subscribers', { params })),
  abandonedCarts: () => unwrap(api.get('/admin/abandoned-carts')),
  notifications: (params) => unwrap(api.get('/admin/notifications', { params })),
  markNotificationsRead: (ids) => unwrap(api.post('/admin/notifications/read', { ids })),
  reports: {
    center: (params) => unwrap(api.get('/admin/reports/center', { params })),
    revenue: (params) => unwrap(api.get('/admin/reports/revenue', { params })),
    customers: (params) => unwrap(api.get('/admin/reports/customers', { params })),
    products: (params) => unwrap(api.get('/admin/reports/products', { params })),
  },
  admins: () => unwrap(api.get('/admin/admins')),
  saveAdmin: (body, id) => (id ? unwrap(api.patch(`/admin/admins/${id}`, body)) : unwrap(api.post('/admin/admins', body))),
  deleteAdmin: (id) => unwrap(api.delete(`/admin/admins/${id}`)),
  auditLogs: (params) => unwrap(api.get('/admin/audit-logs', { params })),
  settings: () => unwrap(api.get('/admin/settings')),
  saveSettings: (body) => unwrap(api.put('/admin/settings', body)),
};
