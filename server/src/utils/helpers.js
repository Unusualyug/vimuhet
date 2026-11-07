import slugifyLib from 'slugify';

export const slugify = (str = '') =>
  slugifyLib(String(str), { lower: true, strict: true, trim: true }) || `item-${Date.now()}`;

export const sku = (prefix = 'VMT') =>
  `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-5)}`;

export const orderNumber = () => `VMT${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

export const otp = () => String(Math.floor(100000 + Math.random() * 900000));

export const randomToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
