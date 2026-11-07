export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

export const ORDER_STATUS = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
];

// Allowed forward transitions for order status (audit-friendly state machine)
export const ORDER_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'RETURN_REQUESTED', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURN_REQUESTED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export const PAYMENT_STATUS = ['CREATED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

export const PAYMENT_METHODS = ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI', 'COD'];

export const PRODUCT_STATUS = ['ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'ARCHIVED'];

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SUPPORT: 'SUPPORT',
};

export const PERMISSIONS = [
  'dashboard:read',
  'analytics:read',
  'products:read',
  'products:write',
  'categories:write',
  'collections:write',
  'inventory:write',
  'orders:read',
  'orders:write',
  'customers:read',
  'payments:read',
  'payments:refund',
  'coupons:write',
  'reviews:moderate',
  'cms:write',
  'reports:read',
  'settings:write',
  'admins:manage',
  'audit:read',
];

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: PERMISSIONS.filter((p) => p !== 'admins:manage'),
  MANAGER: [
    'dashboard:read',
    'analytics:read',
    'products:read',
    'products:write',
    'categories:write',
    'collections:write',
    'inventory:write',
    'orders:read',
    'orders:write',
    'customers:read',
    'payments:read',
    'coupons:write',
    'reviews:moderate',
    'cms:write',
    'reports:read',
  ],
  SUPPORT: ['dashboard:read', 'products:read', 'orders:read', 'orders:write', 'customers:read', 'reviews:moderate'],
};

export const REVIEW_STATUS = ['PENDING', 'APPROVED', 'REJECTED'];

export const BANNER_POSITIONS = [
  'HERO',
  'ANNOUNCEMENT',
  'HOME_MID',
  'CATEGORY_TOP',
  'COLLECTION_TOP',
  'OFFER_STRIP',
];

export const TRAFFIC_SOURCES = ['Direct', 'Google Search', 'Social Media', 'Referral', 'Campaign'];

export const DEVICE_TYPES = ['Desktop', 'Mobile', 'Tablet'];

export const COUPON_TYPES = ['PERCENTAGE', 'FIXED'];

export const ANALYTICS_EVENTS = [
  'page_view',
  'product_view',
  'add_to_cart',
  'remove_from_cart',
  'wishlist_add',
  'checkout_start',
  'purchase',
  'search',
  'newsletter_subscribe',
];

export const LOW_STOCK_THRESHOLD_DEFAULT = 5;
