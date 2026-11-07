import Homepage from '../models/Homepage.js';
import Banner from '../models/Banner.js';
import Product from '../models/Product.js';
import Collection from '../models/Collection.js';
import Review from '../models/Review.js';
import { asyncHandler, created, ok } from '../utils/index.js';
import ApiError from '../utils/ApiError.js';
import { recordAudit } from '../middleware/audit.js';
import { getSettings } from '../services/pricing.service.js';

const DEFAULT_HOMEPAGE = {
  key: 'main',
  announcement: {
    enabled: true,
    messages: ['Flat ₹300 off on your first order', 'Free shipping on orders above ₹1,999'],
    couponCode: 'VIMUHET300',
    offerText: 'Get 20% OFF | Use Code: VIMUHET300',
    freeShippingText: 'Free Shipping on Orders Above ₹999',
  },
  hero: [],
  sections: {
    featuredCollections: { enabled: true, title: 'Curated Collections for You', subtitle: 'Explore our collections' },
    newArrivals: { enabled: true, title: 'New Arrivals', subtitle: 'Freshly crafted pieces, just for you', limit: 8 },
    bestSellers: { enabled: true, title: 'Best Sellers', subtitle: 'Loved and re-ordered by our community', limit: 4 },
    trending: { enabled: true, title: 'Trending Now', subtitle: 'What everyone is wearing this week', limit: 4 },
    promoBanner: { enabled: true, title: 'The Festive Edit', subtitle: 'Hand-embroidered pieces for every celebration', cta: { label: 'Shop Festive', to: '/collection/festive-edit' } },
    brandStory: { enabled: true, title: 'Crafted Slowly, Worn Beautifully', body: 'Vimuhet began with a simple belief — that everyday ethnic wear deserves the same care as occasion wear.', cta: { label: 'Explore Our Story', to: '/about' } },
    testimonials: { enabled: true, title: 'Words From Our Customers', subtitle: 'Real reviews from verified purchases' },
    newsletter: { enabled: true, title: 'Join the Vimuhet Circle', subtitle: 'Early access to collections, private sales and styling notes.', placeholder: 'Enter your email address' },
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
};

export async function ensureHomepage() {
  let doc = await Homepage.findOne({ key: 'main' });
  if (!doc) doc = await Homepage.create(DEFAULT_HOMEPAGE);
  return doc;
}

/* --------------------------------- Public --------------------------------- */

export const publicHomepage = asyncHandler(async (_req, res) => {
  const [homepage, settings, banners] = await Promise.all([
    ensureHomepage().then((h) => h.toObject()),
    getSettings(),
    Banner.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
  ]);

  const now = new Date();
  const liveBanners = banners.filter(
    (b) => (!b.startDate || new Date(b.startDate) <= now) && (!b.endDate || new Date(b.endDate) >= now)
  );

  const [newArrivals, bestSellers, trending, collections, testimonials, categories] = await Promise.all([
    Product.find({ status: 'ACTIVE', isNewArrival: true }).sort({ createdAt: -1 }).limit(homepage.sections?.newArrivals?.limit || 8).lean(),
    Product.find({ status: 'ACTIVE' }).sort({ soldCount: -1 }).limit(homepage.sections?.bestSellers?.limit || 4).lean(),
    Product.find({ status: 'ACTIVE' }).sort({ viewCount: -1, soldCount: -1 }).limit(homepage.sections?.trending?.limit || 4).lean(),
    Collection.find({ isActive: true }).sort({ sortOrder: 1 }).limit(6).lean(),
    Review.find({ status: 'APPROVED' })
      .populate('product', 'name slug')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    (await import('../models/Category.js')).default.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
  ]);

  return ok(res, {
    homepage: { ...homepage, banners: liveBanners },
    settings: {
      general: settings.general,
      shipping: settings.shipping,
      notifications: settings.notifications,
      seo: settings.seo,
    },
    newArrivals,
    bestSellers,
    trending,
    collections,
    testimonials,
    categories,
  });
});

export const publicBanners = asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = { isActive: true };
  if (req.query.position) filter.position = req.query.position;
  const banners = await Banner.find(filter).sort({ sortOrder: 1 }).lean();
  return ok(
    res,
    banners.filter((b) => (!b.startDate || new Date(b.startDate) <= now) && (!b.endDate || new Date(b.endDate) >= now))
  );
});

export const publicSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  return ok(res, {
    general: settings.general,
    shipping: settings.shipping,
    payment: settings.payment,
    seo: settings.seo,
    contact: { email: settings.general.email, phone: settings.general.phone, whatsapp: settings.general.whatsapp },
  });
});

/* ---------------------------------- Admin --------------------------------- */

export const adminGetHomepage = asyncHandler(async (_req, res) => {
  const homepage = await ensureHomepage();
  return ok(res, homepage);
});

export const adminSaveHomepage = asyncHandler(async (req, res) => {
  const homepage = await ensureHomepage();
  const { announcement, hero, sections, status } = req.body;
  if (announcement) Object.assign(homepage.announcement, announcement);
  if (Array.isArray(hero)) homepage.hero = hero;
  if (sections) {
    Object.entries(sections).forEach(([key, value]) => {
      homepage.sections[key] = { ...(homepage.sections[key]?.toObject?.() || homepage.sections[key] || {}), ...value };
    });
    homepage.markModified('sections');
  }
  if (status) homepage.status = status;
  homepage.version += 1;
  homepage.updatedBy = req.admin._id;
  await homepage.save();
  await recordAudit(req, {
    action: 'HOMEPAGE_UPDATE',
    entity: 'Homepage',
    entityId: homepage._id,
    description: `Homepage saved (${status || homepage.status})`,
  });
  return ok(res, homepage, 'Homepage content saved');
});

/* --------------------------------- Banners -------------------------------- */

export const adminListBanners = asyncHandler(async (_req, res) => {
  const banners = await Banner.find().sort({ position: 1, sortOrder: 1 }).lean();
  return ok(res, banners);
});

export const adminSaveBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id) {
    const banner = await Banner.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!banner) throw ApiError.notFound('Banner not found');
    await recordAudit(req, { action: 'BANNER_UPDATE', entity: 'Banner', entityId: banner._id, description: `Updated banner ${banner.title}` });
    return ok(res, banner, 'Banner updated');
  }
  const banner = await Banner.create(req.body);
  await recordAudit(req, { action: 'BANNER_CREATE', entity: 'Banner', entityId: banner._id, description: `Created banner ${banner.title}` });
  return created(res, banner, 'Banner created');
});

export const adminDeleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');
  const { storage } = await import('../services/storage.service.js');
  if (banner.image?.publicId) await storage.destroy(banner.image.publicId);
  await recordAudit(req, { action: 'BANNER_DELETE', entity: 'Banner', entityId: req.params.id, description: `Deleted banner ${banner.title}` });
  return ok(res, null, 'Banner deleted');
});

export const adminReorderBanners = asyncHandler(async (req, res) => {
  const { order = [] } = req.body;
  await Promise.all(order.map((id, i) => Banner.updateOne({ _id: id }, { sortOrder: i })));
  await recordAudit(req, { action: 'BANNER_REORDER', entity: 'Banner', description: 'Banner order updated' });
  return ok(res, null, 'Banner order saved');
});

export default {
  publicHomepage,
  publicBanners,
  publicSettings,
  adminGetHomepage,
  adminSaveHomepage,
  adminListBanners,
  adminSaveBanner,
  adminDeleteBanner,
  adminReorderBanners,
};
