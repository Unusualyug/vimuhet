/**
 * Vimuhet demo seed.
 *
 * IMPORTANT: every document created here is flagged `isDemo: true` so business
 * data generated during real use can be distinguished from this development
 * sample content. Images point at local responsive copies served from
 * /media (Cloudinary URLs are used automatically once uploads go through the
 * admin panel).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDB, disconnectDB } from '../config/db.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { slugify } from '../utils/helpers.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Collection from '../models/Collection.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Setting from '../models/Setting.js';
import Homepage from '../models/Homepage.js';
import Banner from '../models/Banner.js';
import Subscriber from '../models/Subscriber.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import VisitorSession from '../models/VisitorSession.js';

const MEDIA = '/media/products';
const img = (name, color = '', type = 'gallery', i = 0) => ({
  url: `${MEDIA}/${name}-1000.jpg`,
  publicId: `local-seed/${name}`,
  alt: 'Vimuhet ethnic wear',
  type,
  color,
  sortOrder: i,
});

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const images = {
  wine: 'kurti-wine-embroidered',
  blush: 'kurti-blush-anarkali',
  teal: 'kurti-teal-cotton',
  mustard: 'kurti-mustard-festive',
  lilac: 'kurti-lilac-chikankari',
  ivory: 'kurti-ivory-print',
  navy: 'kurti-navy-kurta-set',
  sage: 'kurti-sage-office',
  rose: 'kurti-rose-embroidered',
  black: 'kurti-black-bandhani',
};

const CATEGORIES = [
  { name: 'Everyday Kurtis', icon: 'Shirt', shortDescription: 'Easy, breathable pieces for every day', image: images.ivory },
  { name: 'Office Wear', icon: 'Briefcase', shortDescription: 'Polished silhouettes for work', image: images.sage },
  { name: 'Festive Wear', icon: 'Sparkles', shortDescription: 'Celebration-ready embroidery', image: images.mustard },
  { name: 'Designer Kurtis', icon: 'Crown', shortDescription: 'Statement craftsmanship', image: images.wine },
  { name: 'Cotton Kurtis', icon: 'Leaf', shortDescription: 'Pure cotton comfort', image: images.teal },
  { name: 'Anarkali Kurtis', icon: 'Flower2', shortDescription: 'Flared, fluid silhouettes', image: images.blush },
  { name: 'Kurti Sets', icon: 'Layers', shortDescription: 'Complete looks, thoughtfully paired', image: images.navy },
];

const COLLECTIONS = [
  { name: 'Everyday Essentials', tagline: 'Soft, breathable, endlessly wearable', image: images.ivory, theme: 'ivory' },
  { name: 'Office Edit', tagline: 'Quiet confidence for the workday', image: images.sage, theme: 'sage' },
  { name: 'Festive Edit', tagline: 'Hand-embroidered celebration pieces', image: images.mustard, theme: 'gold' },
  { name: 'Designer Studio', tagline: 'Limited-run craft-led silhouettes', image: images.wine, theme: 'burgundy' },
  { name: 'Cotton Club', tagline: 'Pure cotton, all-day comfort', image: images.teal, theme: 'teal' },
  { name: 'Kurti Sets', tagline: 'Thoughtfully coordinated sets', image: images.navy, theme: 'navy' },
];

const PRODUCTS = [
  {
    name: 'Elegant Embroidered Kurti',
    key: 'wine',
    category: 'Designer Kurtis',
    collections: ['Designer Studio', 'Festive Edit'],
    price: 1299,
    mrp: 1999,
    images: [images.wine, images.rose, images.mustard, images.lilac],
    colors: [
      { name: 'Wine', hex: '#78152F' },
      { name: 'Rose', hex: '#D9A5A5' },
      { name: 'Mustard', hex: '#C99A2E' },
    ],
    fabric: 'Georgette',
    pattern: 'Embroidered',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'V-Neck',
    length: 'Calf Length',
    occasion: 'Festive',
    fit: 'Straight',
    sold: 148,
    views: 3820,
    featured: true,
    tags: ['embroidered', 'festive', 'best seller'],
    description:
      'A wine-coloured straight kurti in soft georgette, finished with intricate gold zari embroidery along the placket, sleeves and hem. Cut for an easy, flattering drape that moves beautifully.',
  },
  {
    name: 'Floral Anarkali Kurti',
    key: 'blush',
    category: 'Anarkali Kurtis',
    collections: ['Festive Edit', 'Designer Studio'],
    price: 1999,
    mrp: 2999,
    images: [images.blush, images.rose, images.mustard, images.wine],
    colors: [
      { name: 'Blush', hex: '#E7B7B7' },
      { name: 'Rose', hex: '#D9A5A5' },
      { name: 'Ivory', hex: '#FFF9F3' },
    ],
    fabric: 'Cotton Silk',
    pattern: 'Floral Print',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'Round Neck',
    length: 'Ankle Length',
    occasion: 'Festive',
    fit: 'Flared',
    sold: 96,
    views: 2640,
    featured: true,
    tags: ['anarkali', 'floral', 'festive'],
    description:
      'A blush floral anarkali with a softly flared hem and matching printed dupatta. Hand-block-inspired motifs run across the border for a quietly rich finish.',
  },
  {
    name: 'Cotton Straight Kurti',
    key: 'teal',
    category: 'Cotton Kurtis',
    collections: ['Cotton Club', 'Everyday Essentials'],
    price: 1499,
    mrp: 1999,
    images: [images.teal, images.sage, images.ivory, images.lilac],
    colors: [
      { name: 'Teal', hex: '#1F6F6B' },
      { name: 'Sage', hex: '#8A9A7B' },
      { name: 'Ivory', hex: '#FFF9F3' },
    ],
    fabric: 'Cotton',
    pattern: 'Solid',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'Round Neck',
    length: 'Calf Length',
    occasion: 'Casual',
    fit: 'Straight',
    sold: 212,
    views: 4110,
    featured: true,
    tags: ['cotton', 'everyday', 'best seller'],
    description:
      'Breathable pure cotton with a clean straight cut and delicate white thread work at the neckline. The piece you will reach for on repeat.',
  },
  {
    name: 'Festive Gota Kurti',
    key: 'mustard',
    category: 'Festive Wear',
    collections: ['Festive Edit'],
    price: 2299,
    mrp: 3499,
    images: [images.mustard, images.wine, images.rose, images.blush],
    colors: [
      { name: 'Mustard', hex: '#C99A2E' },
      { name: 'Wine', hex: '#78152F' },
      { name: 'Blush', hex: '#E7B7B7' },
    ],
    fabric: 'Silk Blend',
    pattern: 'Embroidered',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'Sweetheart',
    length: 'Ankle Length',
    occasion: 'Wedding',
    fit: 'Flared',
    sold: 74,
    views: 1980,
    featured: true,
    tags: ['festive', 'gota patti', 'wedding'],
    description:
      'A mustard anarkali with traditional gota patti detailing and a coordinated dupatta — made for celebrations that run late into the evening.',
  },
  {
    name: 'Chikankari Kurti',
    key: 'lilac',
    category: 'Everyday Kurtis',
    collections: ['Everyday Essentials', 'Designer Studio'],
    price: 1599,
    mrp: 2299,
    images: [images.lilac, images.ivory, images.blush, images.teal],
    colors: [
      { name: 'Lilac', hex: '#B9A6D6' },
      { name: 'Ivory', hex: '#FFF9F3' },
      { name: 'Wine', hex: '#78152F' },
    ],
    fabric: 'Cotton',
    pattern: 'Chikankari',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'Round Neck',
    length: 'Calf Length',
    occasion: 'Casual',
    fit: 'Straight',
    sold: 118,
    views: 3010,
    featured: true,
    tags: ['chikankari', 'cotton', 'embroidered'],
    description:
      'Fine white chikankari thread work on soft lilac mul cotton. Delicate by design, comfortable by nature.',
  },
  {
    name: 'Ivory Block Print Kurti',
    key: 'ivory',
    category: 'Cotton Kurtis',
    collections: ['Cotton Club', 'Everyday Essentials'],
    price: 1199,
    mrp: 1699,
    images: [images.ivory, images.teal, images.lilac, images.sage],
    colors: [
      { name: 'Ivory', hex: '#FFF9F3' },
      { name: 'Rose', hex: '#D9A5A5' },
      { name: 'Teal', hex: '#1F6F6B' },
    ],
    fabric: 'Cotton',
    pattern: 'Block Print',
    sleeve: 'Short Sleeves',
    neckline: 'Mandarin Collar',
    length: 'Calf Length',
    occasion: 'Casual',
    fit: 'Straight',
    sold: 164,
    views: 3620,
    featured: false,
    tags: ['block print', 'cotton', 'everyday'],
    description:
      'Hand-block-printed maroon motifs scattered across an ivory cotton base, finished with a soft coordinating dupatta.',
  },
  {
    name: 'Navy Chanderi Kurta Set',
    key: 'navy',
    category: 'Kurti Sets',
    collections: ['Kurti Sets', 'Designer Studio'],
    price: 2499,
    mrp: 3599,
    images: [images.navy, images.sage, images.wine, images.ivory],
    colors: [
      { name: 'Navy', hex: '#232A46' },
      { name: 'Teal', hex: '#1F6F6B' },
      { name: 'Ivory', hex: '#FFF9F3' },
    ],
    fabric: 'Chanderi',
    pattern: 'Solid',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'V-Neck',
    length: 'Calf Length',
    occasion: 'Party',
    fit: 'Straight',
    sold: 58,
    views: 1540,
    featured: true,
    tags: ['kurta set', 'chanderi', 'designer'],
    description:
      'A navy chanderi kurta with matching palazzo and a sheer printed dupatta — a complete, quietly luxurious look.',
  },
  {
    name: 'Sage Linen Office Kurti',
    key: 'sage',
    category: 'Office Wear',
    collections: ['Office Edit', 'Everyday Essentials'],
    price: 1399,
    mrp: 1899,
    images: [images.sage, images.ivory, images.teal, images.navy],
    colors: [
      { name: 'Sage', hex: '#8A9A7B' },
      { name: 'Ivory', hex: '#FFF9F3' },
      { name: 'Navy', hex: '#232A46' },
    ],
    fabric: 'Linen',
    pattern: 'Solid',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'Mandarin Collar',
    length: 'Knee Length',
    occasion: 'Workwear',
    fit: 'Straight',
    sold: 132,
    views: 2890,
    featured: false,
    tags: ['office', 'linen', 'minimal'],
    description:
      'A minimal linen straight kurti with a slim placket and side slits — sharp enough for work, soft enough for the commute.',
  },
  {
    name: 'Rose Zari Kurti',
    key: 'rose',
    category: 'Designer Kurtis',
    collections: ['Designer Studio', 'Festive Edit'],
    price: 1799,
    mrp: 2599,
    images: [images.rose, images.wine, images.blush, images.mustard],
    colors: [
      { name: 'Rose', hex: '#D9A5A5' },
      { name: 'Wine', hex: '#78152F' },
      { name: 'Ivory', hex: '#FFF9F3' },
    ],
    fabric: 'Georgette',
    pattern: 'Embroidered',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'Round Neck',
    length: 'Calf Length',
    occasion: 'Party',
    fit: 'A-Line',
    sold: 88,
    views: 2210,
    featured: false,
    tags: ['zari', 'party', 'designer'],
    description:
      'Dusty rose georgette with fine gold zari along the neckline and sleeves, finished with hand-set pearls.',
  },
  {
    name: 'Black Bandhani Kurti',
    key: 'black',
    category: 'Everyday Kurtis',
    collections: ['Everyday Essentials', 'Designer Studio'],
    price: 1099,
    mrp: 1599,
    images: [images.black, images.wine, images.navy, images.teal],
    colors: [
      { name: 'Black', hex: '#161616' },
      { name: 'Wine', hex: '#78152F' },
      { name: 'Teal', hex: '#1F6F6B' },
    ],
    fabric: 'Rayon',
    pattern: 'Bandhani',
    sleeve: 'Three Quarter Sleeves',
    neckline: 'Round Neck',
    length: 'Calf Length',
    occasion: 'Casual',
    fit: 'Straight',
    sold: 178,
    views: 3450,
    featured: false,
    tags: ['bandhani', 'everyday', 'mirror work'],
    description:
      'Black bandhani tie-dye with red accents and small mirror-work detailing. Easy, striking, and endlessly repeatable.',
  },
];

const REVIEW_TEXT = [
  { rating: 5, title: 'Beautifully finished', comment: 'The embroidery is even finer in person and the fabric has a lovely weight. Fits true to size.' },
  { rating: 5, title: 'Wore it to a wedding', comment: 'Received so many compliments. The dupatta and colour are exactly as shown in the photos.' },
  { rating: 4, title: 'Lovely, slightly long', comment: 'Beautiful piece — I am 5\'2" so I had it shortened a little. The stitching quality is excellent.' },
  { rating: 5, title: 'My third order', comment: 'Consistent quality every single time. Wash care instructions were clear and it held colour well.' },
  { rating: 4, title: 'Comfortable for all day', comment: 'Breathable cotton, no irritation, and the neckline is neatly done. Would have liked one more colour.' },
  { rating: 5, title: 'Exactly like the photos', comment: 'Delivery was quick and packaging felt premium. The colour is a rich, deep wine.' },
];

const NAMES = ['Riya Sharma', 'Ananya Patel', 'Meera Nair', 'Ishita Verma', 'Kavya Iyer', 'Sneha Kulkarni', 'Divya Menon', 'Aarohi Gupta'];

const pick = (arr, i) => arr[i % arr.length];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function clearDemo() {
  await Promise.all([
    Order.deleteMany({ isDemo: true }),
    Payment.deleteMany({ isDemo: true }),
    Review.deleteMany({ isDemo: true }),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Collection.deleteMany({}),
    Homepage.deleteMany({}),
    Banner.deleteMany({}),
    Coupon.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
    VisitorSession.deleteMany({}),
    Subscriber.deleteMany({}),
  ]);
}

async function seed() {
  await connectDB();
  logger.info('Seeding Vimuhet demo data…');
  await clearDemo();

  /* ------------------------------- Settings ------------------------------- */
  await Setting.findOneAndUpdate(
    { key: 'store' },
    {
      $set: {
        general: {
          storeName: 'Vimuhet',
          tagline: 'Premium Ethnic Wear',
          email: 'care@vimuhet.com',
          /* Same line as `whatsapp` below. It was seeded with the placeholder
             9876543210, so the footer, the contact page and the mobile menu
             all showed a number that isn't the business line. */
          phone: '+91 81402 14051',
          whatsapp: '918140214051',
          address: '4th Floor, Sunbeam House, Ashram Road, Ahmedabad, Gujarat 380009',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          social: { instagram: 'https://instagram.com', facebook: 'https://facebook.com', pinterest: 'https://pinterest.com', youtube: '' },
        },
        shipping: {
          shippingCharge: 99,
          freeShippingThreshold: 1999,
          codEnabled: false,
          returnWindowDays: 7,
          estimatedDeliveryDays: 5,
        },
      },
    },
    { upsert: true }
  );

  /* --------------------------------- Admin -------------------------------- */
  let admin = await Admin.findOne({ email: env.seed.adminEmail }).select('+password');
  if (!admin) {
    admin = await Admin.create({
      name: 'Vimuhet Admin',
      email: env.seed.adminEmail,
      password: env.seed.adminPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    await admin.save();
  } else if (!admin.password) {
    admin.password = env.seed.adminPassword;
    await admin.save();
  }
  logger.info(`Admin ready: ${env.seed.adminEmail}`);

  /* -------------------------------- Customers ------------------------------ */
  const customers = [];
  for (let i = 0; i < 6; i += 1) {
    const email = i === 0 ? 'riya@example.com' : `customer${i + 1}@example.com`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        fullName: NAMES[i],
        email,
        mobile: `98${rand(10000000, 99999999)}`,
        password: 'Customer@123',
        isEmailVerified: true,
        marketingOptIn: true,
      });
    }
    customers.push(user);
  }
  logger.info(`Customers ready: ${customers.map((c) => c.email).join(', ')} (password Customer@123)`);

  /* --------------------------- Categories / sets --------------------------- */
  const categoryDocs = {};
  for (const [i, cat] of CATEGORIES.entries()) {
    categoryDocs[cat.name] = await Category.create({
      name: cat.name,
      slug: slugify(cat.name),
      description: `${cat.name} at Vimuhet — thoughtfully designed ethnic wear with premium fabrics and finishes. Every piece is quality-checked before it reaches you.`,
      shortDescription: cat.shortDescription,
      image: { url: `${MEDIA}/${cat.image}-700.jpg`, publicId: `local-seed/${cat.image}` },
      icon: cat.icon,
      sortOrder: i,
      isFeatured: true,
      isActive: true,
    });
  }

  const collectionDocs = {};
  for (const [i, col] of COLLECTIONS.entries()) {
    collectionDocs[col.name] = await Collection.create({
      name: col.name,
      slug: slugify(col.name),
      tagline: col.tagline,
      description: `${col.tagline}. ${col.name} brings together pieces chosen for fabric, fit and finish — designed to be worn often and kept for years.`,
      image: { url: `${MEDIA}/${col.image}-700.jpg`, publicId: `local-seed/${col.image}` },
      theme: col.theme,
      isFeatured: true,
      sortOrder: i,
      isActive: true,
    });
  }

  /* --------------------------------- Coupons ------------------------------- */
  await Coupon.create([
    {
      code: 'VIMUHET300',
      description: 'Flat ₹300 off on orders above ₹1,999',
      type: 'FIXED',
      value: 300,
      minOrderValue: 1999,
      usageLimit: 500,
      usageLimitPerCustomer: 1,
      expiryDate: new Date(Date.now() + 60 * 86400000),
      isActive: true,
      createdBy: admin._id,
    },
    {
      code: 'FESTIVE10',
      description: '10% off festive edit, up to ₹500',
      type: 'PERCENTAGE',
      value: 10,
      maxDiscount: 500,
      minOrderValue: 1499,
      usageLimit: 1000,
      usageLimitPerCustomer: 2,
      expiryDate: new Date(Date.now() + 30 * 86400000),
      isActive: true,
      createdBy: admin._id,
    },
    {
      code: 'FREESHIP',
      description: 'Free shipping on any order',
      type: 'FIXED',
      value: 0,
      minOrderValue: 0,
      freeShipping: true,
      usageLimitPerCustomer: 3,
      expiryDate: new Date(Date.now() + 90 * 86400000),
      isActive: true,
      createdBy: admin._id,
    },
  ]);

  /* -------------------------------- Products ------------------------------- */
  const productDocs = [];
  for (const [index, p] of PRODUCTS.entries()) {
    const baseSku = `VMT-${String(1001 + index)}`;
    const variants = [];
    SIZES.forEach((size, si) => {
      p.colors.forEach((color, ci) => {
        const out = (index + si + ci) % 13 === 0;
        variants.push({
          sku: `${baseSku}-${size}-${color.name.slice(0, 3).toUpperCase()}`,
          size,
          color: color.name,
          price: p.price,
          mrp: p.mrp,
          stock: out ? 0 : rand(2, 24),
          reserved: 0,
          lowStockThreshold: 4,
        });
      });
    });

    const productImages = [];
    p.images.forEach((name, i) => {
      productImages.push(img(name, p.colors[i]?.name || p.colors[0].name, i === 0 ? 'front' : i === 1 ? 'model' : 'gallery', i));
    });

    const doc = await Product.create({
      name: p.name,
      slug: `${slugify(p.name)}-${baseSku.slice(-4).toLowerCase()}`,
      sku: baseSku,
      shortDescription: p.description.split('.')[0],
      description: p.description,
      category: categoryDocs[p.category]._id,
      collections: p.collections.map((c) => collectionDocs[c]._id),
      price: p.price,
      mrp: p.mrp,
      stock: variants.reduce((s, v) => s + v.stock, 0),
      lowStockThreshold: 4,
      variants,
      colors: p.colors,
      sizes: SIZES,
      images: productImages,
      attributes: {
        fabric: p.fabric,
        pattern: p.pattern,
        sleeve: p.sleeve,
        neckline: p.neckline,
        length: p.length,
        fit: p.fit,
        occasion: p.occasion,
        work: p.pattern === 'Embroidered' ? 'Hand embroidery' : 'Printed',
        washCare: 'Dry clean recommended. Gentle hand wash in cold water, do not bleach, iron on reverse.',
        packageContains: '1 Kurti' + (p.category === 'Kurti Sets' ? ' + 1 Palazzo + 1 Dupatta' : ''),
      },
      status: 'ACTIVE',
      isFeatured: p.featured,
      isNewArrival: index < 6,
      tags: p.tags,
      soldCount: p.sold,
      viewCount: p.views,
      isDemo: true,
      publishedAt: new Date(Date.now() - (index + 1) * 86400000 * 3),
    });
    productDocs.push(doc);
    await Category.updateOne({ _id: doc.category }, { $inc: { productCount: 1 } });
  }

  /* -------------------------------- Reviews -------------------------------- */
  let reviewSeed = 0;
  for (const product of productDocs) {
    const count = rand(3, 6);
    for (let i = 0; i < count; i += 1) {
      const user = pick(customers, reviewSeed + i);
      const text = pick(REVIEW_TEXT, reviewSeed + i);
      const exists = await Review.findOne({ product: product._id, user: user._id });
      if (exists) continue;
      await Review.create({
        product: product._id,
        user: user._id,
        customerName: user.fullName,
        rating: text.rating,
        title: text.title,
        comment: text.comment,
        verifiedPurchase: true,
        status: 'APPROVED',
        isDemo: true,
      });
    }
    await Review.recalcProductRating(product._id);
    reviewSeed += 2;
  }

  /* ------------------------------ Demo orders ------------------------------ */
  const statuses = ['DELIVERED', 'DELIVERED', 'SHIPPED', 'PROCESSING', 'CONFIRMED', 'CANCELLED', 'PENDING'];
  for (let i = 0; i < 24; i += 1) {
    const customer = pick(customers, i);
    const product = pick(productDocs, i * 3);
    const variant = pick(product.variants.filter((v) => v.stock > 0), i) || product.variants[0];
    const qty = 1 + (i % 2);
    const subtotal = variant.price * qty;
    const shipping = subtotal >= 1999 ? 0 : 99;
    const created = new Date(Date.now() - i * 2 * 86400000 - rand(0, 40000000));
    const status = pick(statuses, i);
    const paid = !['PENDING', 'CANCELLED'].includes(status);

    const order = await Order.create({
      orderNumber: `VMT${String(100000 + i)}`,
      user: customer._id,
      customer: { fullName: customer.fullName, email: customer.email, mobile: customer.mobile },
      shippingAddress: {
        fullName: customer.fullName,
        mobile: customer.mobile,
        house: `${rand(1, 40)}B`,
        street: 'Sunrise Residency',
        area: 'Navrangpura',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380009',
        country: 'India',
      },
      items: [
        {
          product: product._id,
          variantId: variant._id,
          name: product.name,
          slug: product.slug,
          sku: variant.sku,
          image: product.images[0]?.url,
          size: variant.size,
          color: variant.color,
          price: variant.price,
          mrp: variant.mrp,
          quantity: qty,
          total: subtotal,
        },
      ],
      pricing: {
        subtotal,
        mrpTotal: variant.mrp * qty,
        productDiscount: variant.mrp * qty - subtotal,
        shipping,
        tax: Math.round(subtotal * 0.05),
        total: subtotal + shipping,
        currency: 'INR',
      },
      payment: {
        method: pick(['UPI', 'CARD', 'NETBANKING'], i),
        status: paid ? 'PAID' : status === 'CANCELLED' ? 'FAILED' : 'PENDING',
        provider: 'razorpay',
        razorpayOrderId: `order_demo_${i}`,
        razorpayPaymentId: paid ? `pay_demo_${i}` : undefined,
        paidAt: paid ? created : undefined,
        verifiedAt: paid ? created : undefined,
      },
      status,
      statusHistory: [
        { status: 'PENDING', at: created, note: 'Order created', by: 'customer' },
        ...(paid ? [{ status: 'CONFIRMED', at: created, note: 'Payment verified', by: 'system' }] : []),
        ...(['DELIVERED', 'SHIPPED', 'PROCESSING'].includes(status)
          ? [{ status, at: new Date(created.getTime() + 86400000), note: 'Demo status', by: 'admin' }]
          : []),
      ],
      shipping: {
        courier: paid ? 'Delhivery' : '',
        trackingNumber: paid ? `DLV${rand(100000000, 999999999)}` : '',
        estimatedDelivery: new Date(created.getTime() + 5 * 86400000),
        shippedAt: ['SHIPPED', 'DELIVERED'].includes(status) ? new Date(created.getTime() + 86400000) : undefined,
        deliveredAt: status === 'DELIVERED' ? new Date(created.getTime() + 3 * 86400000) : undefined,
      },
      stockCommitted: paid,
      invoiceNumber: paid ? `INV-VMT${String(100000 + i)}` : '',
      isDemo: true,
      createdAt: created,
      updatedAt: created,
    });

    if (paid) {
      await Payment.create({
        user: customer._id,
        order: order._id,
        orderNumber: order.orderNumber,
        razorpayOrderId: order.payment.razorpayOrderId,
        razorpayPaymentId: order.payment.razorpayPaymentId,
        amount: order.pricing.total,
        status: 'PAID',
        method: order.payment.method,
        signatureVerified: true,
        amount: order.pricing.total,
        paidAt: created,
        isDemo: true,
        createdAt: created,
      });
    }
  }

  // Customer stats
  for (const customer of customers) {
    const agg = await Order.aggregate([
      { $match: { user: customer._id, 'payment.status': 'PAID' } },
      { $group: { _id: null, orders: { $sum: 1 }, spent: { $sum: '$pricing.total' } } },
    ]);
    await User.updateOne(
      { _id: customer._id },
      { $set: { stats: { orders: agg[0]?.orders || 0, spent: agg[0]?.spent || 0 } } }
    );
  }

  /* -------------------------------- Homepage ------------------------------- */
  const homepage = await Homepage.create({
    key: 'main',
    announcement: {
      enabled: true,
      messages: ['Flat ₹300 off on your first order — code VIMUHET300', 'Free shipping on orders above ₹1,999', 'New: The Festive Edit is here'],
      couponCode: 'VIMUHET300',
      offerText: 'Get 20% OFF | Use Code: VIMUHET300',
      freeShippingText: 'Free Shipping on Orders Above ₹999',
    },
    hero: [
      {
        eyebrow: 'PREMIUM ETHNIC WEAR',
        title: 'Elegance That Speaks',
        titleAccent: 'Your Style',
        subtitle: 'Discover timeless ethnic wear crafted to make every moment beautiful.',
        image: { url: '/media/banners/hero-1-2000.jpg', publicId: 'local-seed/hero-1' },
        mobileImage: { url: '/media/banners/hero-1-mobile-720.jpg', publicId: 'local-seed/hero-1-mobile' },
        primaryCta: { label: 'Shop Now', to: '/shop' },
        secondaryCta: { label: 'Explore Collection', to: '/collections' },
        align: 'left',
        isActive: true,
        sortOrder: 0,
      },
      {
        eyebrow: 'THE FESTIVE EDIT',
        title: 'Celebrate In',
        titleAccent: 'Quiet Luxury',
        subtitle: 'Hand-embroidered pieces for every celebration on your calendar.',
        image: { url: '/media/banners/hero-2-2000.jpg', publicId: 'local-seed/hero-2' },
        mobileImage: { url: '/media/banners/hero-2-mobile-720.jpg', publicId: 'local-seed/hero-2-mobile' },
        primaryCta: { label: 'Shop Festive', to: '/collection/festive-edit' },
        secondaryCta: { label: 'View Lookbook', to: '/collections' },
        align: 'left',
        isActive: true,
        sortOrder: 1,
      },
      {
        eyebrow: 'EVERYDAY COTTON',
        title: 'Softness You Can',
        titleAccent: 'Live In',
        subtitle: 'Breathable pure cotton kurtis, cut for the way you actually move.',
        image: { url: '/media/banners/hero-3-2000.jpg', publicId: 'local-seed/hero-3' },
        mobileImage: { url: '/media/banners/hero-3-mobile-720.jpg', publicId: 'local-seed/hero-3-mobile' },
        primaryCta: { label: 'Shop Cotton', to: '/category/cotton-kurtis' },
        secondaryCta: { label: 'Explore Collection', to: '/collections' },
        align: 'left',
        isActive: true,
        sortOrder: 2,
      },
    ],
    sections: {
      featuredCollections: {
        enabled: true,
        title: 'Curated Collections for You',
        subtitle: 'Explore our collections',
        collectionIds: Object.values(collectionDocs).map((c) => c._id),
      },
      newArrivals: { enabled: true, title: 'New Arrivals', subtitle: 'Freshly crafted pieces, newly added to the studio', limit: 8 },
      bestSellers: { enabled: true, title: 'Best Sellers', subtitle: 'The pieces our community keeps coming back to', limit: 4 },
      trending: { enabled: true, title: 'Trending Now', subtitle: 'What everyone is wearing this week', limit: 4 },
      promoBanner: {
        enabled: true,
        title: 'The Festive Edit',
        subtitle: 'Hand-embroidered silhouettes for celebrations that run late into the evening.',
        image: { url: '/media/banners/promo-festive-2000.jpg', publicId: 'local-seed/promo' },
        cta: { label: 'Shop Festive', to: '/collection/festive-edit' },
      },
      brandStory: {
        enabled: true,
        title: 'Crafted Slowly, Worn Beautifully',
        body: 'Vimuhet began with a simple belief — that everyday ethnic wear deserves the same care as occasion wear. We work with small craft clusters, choose fabrics for how they feel after ten washes, and finish every seam as if it were the outside.',
        image: { url: '/media/banners/brand-story-1000.jpg', publicId: 'local-seed/story' },
        cta: { label: 'Explore Our Story', to: '/about' },
      },
      testimonials: { enabled: true, title: 'Words From Our Customers', subtitle: 'Verified reviews from real purchases' },
      newsletter: {
        enabled: true,
        title: 'Join the Vimuhet Circle',
        subtitle: 'Early access to collections, private sales and styling notes — no noise.',
        placeholder: 'Enter your email address',
      },
      trustStrip: {
        enabled: true,
        items: [
          { title: 'Free Shipping', subtitle: 'On orders above ₹999', icon: 'Truck' },
          { title: 'Secure Payments', subtitle: '100% protected checkout', icon: 'ShieldCheck' },
          { title: 'Easy Returns', subtitle: 'Within 7 days', icon: 'RotateCcw' },
          { title: 'Special Offers', subtitle: 'Members-only access', icon: 'Gift' },
        ],
      },
    },
    status: 'PUBLISHED',
    updatedBy: admin._id,
  });

  /* --------------------------------- Banners ------------------------------- */
  const banners = [
    { title: 'The Festive Edit', subtitle: 'Hand-embroidered celebration pieces', position: 'HOME_MID', image: 'promo-festive', ctaLabel: 'Shop Festive', ctaLink: '/collection/festive-edit' },
    { title: 'Cotton Club', subtitle: 'Pure cotton, all-day comfort', position: 'CATEGORY_TOP', image: 'hero-3', ctaLabel: 'Shop Cotton', ctaLink: '/collection/cotton-club' },
    { title: 'Designer Studio', subtitle: 'Limited-run craft-led silhouettes', position: 'COLLECTION_TOP', image: 'hero-2', ctaLabel: 'Explore', ctaLink: '/collection/designer-studio' },
  ];
  for (const [i, b] of banners.entries()) {
    await Banner.create({
      title: b.title,
      subtitle: b.subtitle,
      image: { url: `/media/banners/${b.image}-2000.jpg`, publicId: `local-seed/${b.image}` },
      ctaLabel: b.ctaLabel,
      ctaLink: b.ctaLink,
      position: b.position,
      isActive: true,
      sortOrder: i,
    });
  }

  /* -------------------------------- Analytics ------------------------------ */
  const events = [];
  const sessions = [];
  const paths = ['/', '/shop', '/product/elegant-embroidered-kurti-1001', '/collections', '/cart', '/about'];
  const sources = ['Direct', 'Google Search', 'Social Media', 'Referral', 'Campaign'];
  const devices = ['Desktop', 'Mobile', 'Mobile', 'Mobile', 'Tablet'];
  const cities = [['Gujarat', 'Ahmedabad'], ['Maharashtra', 'Mumbai'], ['Delhi', 'New Delhi'], ['Karnataka', 'Bengaluru'], ['Tamil Nadu', 'Chennai']];
  const now = Date.now();

  for (let d = 29; d >= 0; d -= 1) {
    const daySessions = rand(18, 52);
    for (let s = 0; s < daySessions; s += 1) {
      const sessionId = `seed-${d}-${s}`;
      const source = pick(sources, s + d);
      const device = pick(devices, s * 2 + d);
      const [state, city] = pick(cities, s + d * 3);
      const startedAt = new Date(now - d * 86400000 - rand(0, 20) * 3600000);
      const pages = rand(1, 6);
      const lastSeen = new Date(startedAt.getTime() + rand(30, 900) * 1000);
      sessions.push({
        sessionId,
        visitorId: `v-${s % 40}-${d}`,
        currentPath: pick(paths, s),
        pageViews: pages,
        isReturning: s % 5 === 0,
        device,
        source,
        browser: 'Chrome',
        os: device === 'Mobile' ? 'Android' : 'Windows',
        city,
        state,
        country: 'India',
        startedAt,
        lastSeenAt: d === 0 ? new Date(now - rand(10, 200) * 1000) : lastSeen,
        endedAt: d === 0 ? undefined : lastSeen,
      });
      for (let p = 0; p < pages; p += 1) {
        events.push({
          type: 'page_view',
          sessionId,
          visitorId: `v-${s % 40}-${d}`,
          path: pick(paths, p + s),
          source,
          device,
          state,
          city,
          country: 'India',
          createdAt: new Date(startedAt.getTime() + p * 60000),
        });
      }
      if (s % 3 === 0) {
        events.push({ type: 'product_view', sessionId, visitorId: `v-${s}`, path: '/product/elegant-embroidered-kurti-1001', source, device, createdAt: new Date(startedAt.getTime() + 120000) });
      }
      if (s % 5 === 0) {
        events.push({ type: 'add_to_cart', sessionId, visitorId: `v-${s}`, path: '/cart', source, device, createdAt: new Date(startedAt.getTime() + 240000) });
      }
      if (s % 11 === 0) {
        events.push({ type: 'checkout_start', sessionId, visitorId: `v-${s}`, path: '/checkout', source, device, createdAt: new Date(startedAt.getTime() + 320000) });
      }
      if (s % 13 === 0) {
        events.push({ type: 'purchase', sessionId, visitorId: `v-${s}`, path: '/checkout/success', source, device, value: rand(1299, 4999), createdAt: new Date(startedAt.getTime() + 420000) });
      }
    }
  }
  await VisitorSession.insertMany(sessions);
  for (let i = 0; i < events.length; i += 500) {
    await AnalyticsEvent.insertMany(events.slice(i, i + 500));
  }

  await Subscriber.create([
    { email: 'priya@example.com', source: 'footer' },
    { email: 'aarti@example.com', source: 'newsletter' },
  ]);

  // Admin media dir for banners (copied by the seeder from generated assets)
  logger.info(`Seeded ${productDocs.length} products, ${CATEGORIES.length} categories, ${COLLECTIONS.length} collections, ${sessions.length} visitor sessions.`);
  logger.info('\nDemo logins:');
  logger.info(`  Admin     : ${env.seed.adminEmail} / ${env.seed.adminPassword}`);
  logger.info('  Customer  : riya@example.com / Customer@123');
  logger.info('  Customer  : customer2@example.com / Customer@123');

  await disconnectDB();
  process.exit(0);
}

seed().catch(async (err) => {
  logger.error('Seed failed:', err.stack || err.message);
  await disconnectDB();
  process.exit(1);
});
