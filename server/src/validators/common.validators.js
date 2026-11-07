import { body } from 'express-validator';

export const addressRules = [
  body('fullName').trim().notEmpty().withMessage('Recipient name is required'),
  body('mobile').matches(/^[0-9+\-\s]{10,15}$/).withMessage('Enter a valid mobile number'),
  body('house').trim().notEmpty().withMessage('House / flat number is required'),
  body('street').trim().notEmpty().withMessage('Street is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').matches(/^\d{6}$/).withMessage('Enter a valid 6-digit PIN code'),
];

export const checkoutRules = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Recipient name is required'),
  body('shippingAddress.mobile').matches(/^[0-9+\-\s]{10,15}$/).withMessage('Enter a valid mobile number'),
  body('shippingAddress.house').trim().notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.street').trim().notEmpty().withMessage('Address line 2 is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode').matches(/^\d{6}$/).withMessage('Enter a valid 6-digit PIN code'),
  body('customer.email').optional().isEmail().withMessage('Enter a valid email address'),
];

export const verifyPaymentRules = [
  body('orderId').isMongoId().withMessage('A valid order reference is required'),
  body('razorpay_order_id').notEmpty().withMessage('Gateway order id is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Gateway payment id is required'),
  body('razorpay_signature').notEmpty().withMessage('Gateway signature is required'),
];

export const cartAddRules = [
  body('productId').isMongoId().withMessage('Invalid product'),
  body('variantId').isMongoId().withMessage('Please select a size and colour'),
  body('quantity').optional().isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10'),
];

export const reviewRules = [
  body('productId').isMongoId(),
  body('orderId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Choose a rating between 1 and 5'),
  body('comment').trim().isLength({ min: 10, max: 2000 }).withMessage('Please write at least 10 characters'),
];

export const contactRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Please enter your name'),
  body('email').isEmail().withMessage('Enter a valid email address'),
  body('subject').trim().notEmpty().withMessage('Please choose a subject'),
  body('message').trim().isLength({ min: 10, max: 3000 }).withMessage('Please write at least 10 characters'),
];

export const couponRules = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('type').isIn(['PERCENTAGE', 'FIXED']).withMessage('Choose a discount type'),
  body('value').isFloat({ min: 0 }).withMessage('Discount value is required'),
  body('expiryDate').isISO8601().withMessage('Expiry date is required'),
];

export const productRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Selling price is required'),
  body('mrp').isFloat({ min: 0 }).withMessage('MRP is required'),
  body('category').isMongoId().withMessage('Choose a category'),
];

export const bannerRules = [body('title').trim().notEmpty().withMessage('Banner title is required')];
