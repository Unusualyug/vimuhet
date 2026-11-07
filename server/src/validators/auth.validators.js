import { body } from 'express-validator';

export const registerRules = [
  body('fullName').trim().isLength({ min: 2, max: 80 }).withMessage('Please enter your full name'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('mobile').optional({ checkFalsy: true }).matches(/^[0-9+\-\s]{10,15}$/).withMessage('Enter a valid mobile number'),
];

export const loginRules = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotRules = [body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail()];

export const resetRules = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

export const profileRules = [
  body('fullName').optional().trim().isLength({ min: 2, max: 80 }),
  body('mobile').optional({ checkFalsy: true }).matches(/^[0-9+\-\s]{10,15}$/).withMessage('Enter a valid mobile number'),
];
