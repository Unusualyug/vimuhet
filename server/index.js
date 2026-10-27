import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import Product from "./models/Product.js";
import User from "./models/User.js";
import Order from "./models/Order.js";
import Category from "./models/Category.js";
import PaymentEvent from "./models/PaymentEvent.js";
import NewsletterSubscriber from "./models/NewsletterSubscriber.js";
import Coupon from "./models/Coupon.js";
import Review from "./models/Review.js";
import ProductQuestion from "./models/ProductQuestion.js";
import StockAlertSubscription from "./models/StockAlertSubscription.js";
import InventoryMovement from "./models/InventoryMovement.js";
import AdminAudit from "./models/AdminAudit.js";
import AnalyticsEvent from "./models/AnalyticsEvent.js";
import { auth, admin } from "./middleware/auth.js";
import {
  sendWelcome,
  sendOrder,
  sendReset,
  sendNewsletterWelcome,
  sendContactMessage,
  sendStockAlert,
  sendCartReminder,
} from "./services/email.js";
import {
  verifyWebhook,
  verifyCheckoutSignature,
  safeEqualHex,
} from "./services/paymentSecurity.js";
import { effectivePrice, publicProduct } from "./services/pricing.js";
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60e3, max: 30 }));
// Razorpay webhook requires the exact unparsed body. Register before express.json.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) return res.sendStatus(503);
      const sig = req.headers["x-razorpay-signature"];
      if (!verifyWebhook(req.body, sig, process.env.RAZORPAY_WEBHOOK_SECRET))
        return res.sendStatus(400);
      const event = JSON.parse(req.body.toString());
      const eventId = req.headers["x-razorpay-event-id"];
      if (!eventId) return res.status(400).json({ error: "Missing event id" });
      let priorEvent = await PaymentEvent.findOne({ eventId });
      if (priorEvent?.processedAt)
        return res.json({ received: true, duplicate: true });
      if (!priorEvent)
        await PaymentEvent.create({
          eventId,
          event: event.event,
          payload: event,
        });
      if (event.event === "payment.captured") {
        const p = event.payload.payment.entity;
        const order = await Order.findOneAndUpdate(
          {
            razorpayOrderId: p.order_id,
            paymentStatus: "pending",
            status: "pending_payment",
            total: { $eq: p.amount / 100 },
            currency: "INR",
          },
          {
            paymentStatus: "paid",
            status: "confirmed",
            razorpayPaymentId: p.id,
            paidAt: new Date(),
          },
          { new: true },
        );
        if (order) {
          await consumeCouponReservation(order);
          await sendOrder(order.email, order).catch(console.error);
        } else {
          const late = await Order.findOne({ razorpayOrderId: p.order_id });
          if (
            late &&
            late.status === "cancelled" &&
            late.refundStatus === "none"
          ) {
            const rz = new Razorpay({
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET,
            });
            late.refundStatus = "pending";
            late.razorpayPaymentId = p.id;
            await late.save();
            const refund = await rz.payments.refund(p.id, {
              amount: p.amount,
              notes: {
                orderNumber: late.number,
                reason: "Payment captured after reservation expired",
              },
            });
            late.refundId = refund.id;
            late.refundStatus =
              refund.status === "processed" ? "processed" : "pending";
            if (late.refundStatus === "processed") {
              late.paymentStatus = "refunded";
              late.status = "refunded";
            }
            await late.save();
          }
        }
      }
      if (event.event === "payment.failed") {
        const p = event.payload.payment?.entity,
          failed = await Order.findOne({
            razorpayOrderId: p?.order_id,
            status: "pending_payment",
            paymentStatus: "pending",
          });
        if (failed) await voidPendingPayment(failed, true);
      }
      if (event.event === "refund.processed") {
        const r = event.payload.refund.entity;
        await Order.findOneAndUpdate(
          { refundId: r.id },
          {
            refundStatus: "processed",
            paymentStatus: "refunded",
            status: "refunded",
          },
        );
      }
      await PaymentEvent.updateOne(
        { eventId },
        { $set: { processedAt: new Date() } },
      );
      return res.json({ received: true });
    } catch {
      return res.sendStatus(400);
    }
  },
);
app.use(express.json({ limit: "1mb" }));
const api = express.Router();
api.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use("/api", api);
const analyticsWriteLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  ANALYTICS_EVENT_TYPES = new Set([
    "page_view",
    "product_view",
    "add_to_bag",
    "checkout_started",
  ]);
const analyticsHash = (value) =>
  crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
function analyticsPath(value) {
  const path = String(value || "")
    .split("?")[0]
    .trim();
  if (
    !path.startsWith("/") ||
    path.length > 180 ||
    /[\u0000-\u001f]/.test(path)
  )
    return null;
  return path.replace(/\/+/g, "/") || "/";
}
function analyticsExpiry(at) {
  const days = Number(process.env.ANALYTICS_RETENTION_DAYS || 0);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return undefined;
  const expiresAt = new Date(at);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  return expiresAt;
}
const GIFT_WRAP_FEE_INR = 99;
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const checkoutError = (message, status = 400) =>
  Object.assign(new Error(message), { expose: true, status });
function couponCustomerMatch(userId, email) {
  const checks = [];
  if (userId) checks.push({ user: userId });
  if (email) checks.push({ email: String(email).trim().toLowerCase() });
  return checks.length === 1 ? checks[0] : { $or: checks };
}
function couponWindowFilter(now) {
  return {
    $and: [
      {
        $or: [
          { startsAt: { $exists: false } },
          { startsAt: null },
          { startsAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { endsAt: { $exists: false } },
          { endsAt: null },
          { endsAt: { $gt: now } },
        ],
      },
    ],
  };
}
async function reserveCoupon(code, subtotal, userId, email) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalized))
    throw checkoutError("Enter a valid coupon code");
  const now = new Date(),
    coupon = await Coupon.findOne({ code: normalized, active: true });
  if (!coupon) throw checkoutError("This coupon is unavailable");
  if (
    (coupon.startsAt && coupon.startsAt > now) ||
    (coupon.endsAt && coupon.endsAt <= now)
  )
    throw checkoutError("This coupon is not active right now");
  if (subtotal < coupon.minSubtotal)
    throw checkoutError(
      `This coupon requires a subtotal of ₹${Number(coupon.minSubtotal).toLocaleString("en-IN")}`,
    );
  const customer = couponCustomerMatch(userId, email);
  if (
    coupon.firstOrderOnly &&
    (await Order.exists({
      ...customer,
      paymentStatus: { $in: ["paid", "refunded"] },
    }))
  )
    throw checkoutError(
      "This coupon is only available for a first completed order",
    );
  if (coupon.maxUsesPerCustomer > 0) {
    const used = await Order.countDocuments({
      ...customer,
      coupon: coupon._id,
      paymentStatus: { $in: ["paid", "refunded"] },
    });
    if (used >= coupon.maxUsesPerCustomer)
      throw checkoutError(
        "This coupon has already reached its use limit for this customer",
      );
  }
  const availability =
    coupon.maxRedemptions > 0
      ? {
          $expr: {
            $lt: [
              {
                $add: [
                  { $ifNull: ["$redemptionCount", 0] },
                  { $ifNull: ["$reservedCount", 0] },
                ],
              },
              "$maxRedemptions",
            ],
          },
        }
      : {};
  const reserved = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      active: true,
      ...couponWindowFilter(now),
      ...availability,
    },
    { $inc: { reservedCount: 1 } },
    { new: true },
  );
  if (!reserved)
    throw checkoutError("This coupon has reached its redemption limit");
  const discount =
    reserved.discountType === "percentage"
      ? subtotal * (reserved.discountValue / 100)
      : reserved.discountValue;
  return {
    coupon: reserved,
    discountTotal: Number(Math.max(0, Math.min(subtotal, discount)).toFixed(2)),
  };
}
async function releaseCouponReservation(order) {
  if (!order?.coupon || !order.couponReservationHeld) return;
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, couponReservationHeld: true },
    { $set: { couponReservationHeld: false } },
    { new: true },
  );
  if (claimed)
    await Coupon.updateOne(
      { _id: claimed.coupon, reservedCount: { $gt: 0 } },
      { $inc: { reservedCount: -1 } },
    );
}
async function consumeCouponReservation(order) {
  if (!order?.coupon || !order.couponReservationHeld) return;
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, couponReservationHeld: true },
    { $set: { couponReservationHeld: false } },
    { new: true },
  );
  if (claimed)
    await Coupon.updateOne(
      { _id: claimed.coupon, reservedCount: { $gt: 0 } },
      { $inc: { reservedCount: -1, redemptionCount: 1 } },
    );
}
async function voidPendingPayment(order, paymentFailed = false) {
  if (!order) return null;
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: "pending_payment", paymentStatus: "pending" },
    {
      $set: {
        status: "cancelled",
        ...(paymentFailed ? { paymentStatus: "failed" } : {}),
      },
    },
    { new: true },
  );
  if (updated) {
    await restoreReserved(updated.items);
    await releaseCouponReservation(updated);
  }
  return updated;
}
async function deliverStockAlert(alert, product) {
  const token = crypto.randomBytes(32).toString("hex"),
    claimed = await StockAlertSubscription.findOneAndUpdate(
      { _id: alert._id, status: "active" },
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          unsubscribeTokenHash: crypto
            .createHash("sha256")
            .update(token)
            .digest("hex"),
        },
      },
      { new: true },
    );
  if (!claimed) return;
  const base = String(process.env.CLIENT_URL || "").replace(/\/$/, "");
  try {
    const result = await sendStockAlert(claimed.email, {
      productName: product.name,
      url: `${base}/products/${encodeURIComponent(product.slug)}`,
      unsubscribeUrl: `${base}/stock-alerts/unsubscribe?token=${encodeURIComponent(token)}`,
    });
    if (result?.skipped) throw Error("Email is not configured");
  } catch {
    await StockAlertSubscription.updateOne(
      { _id: claimed._id, status: "sent" },
      {
        $set: { status: "active" },
        $unset: { sentAt: 1, unsubscribeTokenHash: 1 },
      },
    );
  }
}
async function processAvailableStockAlerts() {
  const alerts = await StockAlertSubscription.find({ status: "active" })
    .sort({ createdAt: 1 })
    .limit(50);
  for (const alert of alerts) {
    const product = await Product.findOne({
      _id: alert.product,
      published: true,
    });
    if (!product) continue;
    const variant = alert.variantId
        ? product.variants.id(alert.variantId)
        : null,
      available = variant
        ? variant.stock > 0
        : !product.variants?.length && product.stock > 0;
    if (available) await deliverStockAlert(alert, product);
  }
}
async function processCartReminders() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000),
    people = await User.find({
      role: "customer",
      cartReminderConsent: true,
      cartReminderLastSentAt: null,
      savedCartUpdatedAt: { $lte: cutoff },
      "savedCart.0": { $exists: true },
    }).limit(50);
  for (const person of people) {
    const token = crypto.randomBytes(32).toString("hex"),
      claimed = await User.findOneAndUpdate(
        {
          _id: person._id,
          cartReminderConsent: true,
          cartReminderLastSentAt: null,
        },
        {
          $set: {
            cartReminderLastSentAt: new Date(),
            cartReminderUnsubscribeTokenHash: crypto
              .createHash("sha256")
              .update(token)
              .digest("hex"),
          },
        },
        { new: true },
      );
    if (!claimed) continue;
    const base = String(process.env.CLIENT_URL || "").replace(/\/$/, "");
    try {
      const result = await sendCartReminder(claimed.email, {
        name: claimed.name,
        url: `${base}/cart`,
        unsubscribeUrl: `${base}/cart-reminders/unsubscribe?token=${encodeURIComponent(token)}`,
      });
      if (result?.skipped) throw Error("Email is not configured");
    } catch {
      await User.updateOne(
        {
          _id: claimed._id,
          cartReminderLastSentAt: claimed.cartReminderLastSentAt,
        },
        {
          $set: { cartReminderLastSentAt: null },
          $unset: { cartReminderUnsubscribeTokenHash: 1 },
        },
      );
    }
  }
}
function normalizeAddress(input = {}) {
  const fields = [
      "name",
      "phone",
      "line1",
      "line2",
      "city",
      "state",
      "pincode",
    ],
    out = {};
  for (const field of fields) out[field] = String(input[field] || "").trim();
  if (
    out.name.length < 2 ||
    out.name.length > 120 ||
    out.phone.replace(/\D/g, "").length < 7 ||
    out.phone.length > 30 ||
    out.line1.length < 3 ||
    out.line1.length > 240 ||
    out.line2.length > 240 ||
    out.city.length < 2 ||
    out.city.length > 100 ||
    out.state.length < 2 ||
    out.state.length > 100 ||
    !/^[-A-Za-z0-9 ]{4,12}$/.test(out.pincode)
  )
    return null;
  return out;
}
async function restoreReserved(items) {
  for (const item of items || []) {
    const id = item.id || item.product,
      quantity = Number(item.quantity) || 0;
    if (!id || quantity <= 0) continue;
    if (item.variantId)
      await Product.updateOne(
        { _id: id, "variants._id": item.variantId },
        { $inc: { stock: quantity, "variants.$[v].stock": quantity } },
        { arrayFilters: [{ "v._id": item.variantId }] },
      );
    else await Product.updateOne({ _id: id }, { $inc: { stock: quantity } });
  }
}
api.get("/health", (req, res) =>
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
api.post("/contact", async (req, res) => {
  const { name, email, message } = req.body || {};
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.length > 100 ||
    typeof email !== "string" ||
    !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ||
    typeof message !== "string" ||
    message.trim().length < 10 ||
    message.length > 4000
  )
    return res.status(400).json({
      error: "Enter a valid name, email and message (10–4,000 characters)",
    });
  try {
    await sendContactMessage({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    return res
      .status(202)
      .json({ message: "Your message was sent to the VIMUHET team." });
  } catch {
    return res.status(503).json({
      error:
        "Contact email is temporarily unavailable. Please try again later.",
    });
  }
});
api.use((req, res, next) =>
  mongoose.connection.readyState === 1
    ? next()
    : res.status(503).json({ error: "Database is not connected" }),
);
api.post("/analytics/events", analyticsWriteLimit, async (req, res) => {
  const body = req.body || {},
    eventType = String(body.eventType || ""),
    visitorId = String(body.visitorId || ""),
    sessionId = String(body.sessionId || ""),
    path = analyticsPath(body.path),
    productSlug =
      body.productSlug == null
        ? null
        : String(body.productSlug || "")
            .trim()
            .toLowerCase();
  if (
    body.consent !== true ||
    !ANALYTICS_EVENT_TYPES.has(eventType) ||
    !/^[A-Za-z0-9_-]{20,180}$/.test(visitorId) ||
    !/^[A-Za-z0-9_-]{20,180}$/.test(sessionId) ||
    !path ||
    (productSlug !== null && !/^[a-z0-9-]{1,180}$/.test(productSlug))
  )
    return res.status(400).json({ error: "Invalid anonymous analytics event" });
  try {
    const occurredAt = new Date(),
      event = {
        visitorHash: analyticsHash(visitorId),
        sessionHash: analyticsHash(sessionId),
        eventType,
        path,
        productSlug,
        occurredAt,
      },
      expiresAt = analyticsExpiry(occurredAt);
    if (expiresAt) event.expiresAt = expiresAt;
    await AnalyticsEvent.create(event);
    return res.status(202).json({ accepted: true });
  } catch {
    return res
      .status(400)
      .json({ error: "Unable to record anonymous analytics event" });
  }
});
api.post("/newsletter", async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  if (
    req.body.consent !== true ||
    !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)
  )
    return res
      .status(400)
      .json({ error: "A valid email and explicit consent are required" });
  const raw = crypto.randomBytes(32).toString("hex");
  try {
    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          subscribed: true,
          consentedAt: new Date(),
          unsubscribeTokenHash: crypto
            .createHash("sha256")
            .update(raw)
            .digest("hex"),
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
    sendNewsletterWelcome(email, raw).catch(console.error);
    return res.status(202).json({
      message:
        "Thanks for subscribing. You can unsubscribe using the link in your email.",
    });
  } catch {
    return res.status(500).json({ error: "Unable to save subscription" });
  }
});
api.post("/newsletter/unsubscribe", async (req, res) => {
  const hash = crypto
    .createHash("sha256")
    .update(String(req.body.token || ""))
    .digest("hex");
  const subscriber = await NewsletterSubscriber.findOneAndUpdate(
    { unsubscribeTokenHash: hash, subscribed: true },
    { $set: { subscribed: false } },
    { new: true },
  );
  return subscriber
    ? res.json({ message: "You have been unsubscribed." })
    : res.status(404).json({
        error: "This unsubscribe link is invalid or has already been used.",
      });
});
api.get("/products", async (req, res, next) => {
  try {
    const q = { published: true };
    if (req.query.category) q.category = req.query.category;
    if (req.query.search) q.$text = { $search: req.query.search };
    if (req.query.size) q.sizes = String(req.query.size);
    if (req.query.color) q.colors = String(req.query.color);
    if (req.query.inStock === "true") q.stock = { $gt: 0 };
    if (req.query.min || req.query.max)
      q.price = {
        $gte: Number(req.query.min) || 0,
        ...(req.query.max ? { $lte: Number(req.query.max) } : {}),
      };
    let sort = { createdAt: -1 };
    if (req.query.sort === "price_asc") sort = { price: 1 };
    if (req.query.sort === "price_desc") sort = { price: -1 };
    if (req.query.sort === "popular") sort = { popularity: -1 };
    const rows = await Product.find(q).sort(sort).limit(100);
    res.json(rows.map(publicProduct));
  } catch (e) {
    next(e);
  }
});
api.get("/categories", async (req, res) =>
  res.json(
    await Category.find({ active: true }).sort({ displayOrder: 1, name: 1 }),
  ),
);
api.post("/products/:slug/stock-alerts", async (req, res) => {
  const email = String(req.body.email || "")
      .trim()
      .toLowerCase(),
    size = String(req.body.size || "").trim(),
    color = String(req.body.color || "").trim();
  if (req.body.consent !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({
      error: "A valid email and explicit stock-alert consent are required",
    });
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      published: true,
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    const variant = product.variants?.length
      ? product.variants.find((v) => v.size === size && v.color === color)
      : null;
    if (product.variants?.length && !variant)
      return res.status(400).json({ error: "Choose a valid size and color" });
    if ((variant ? variant.stock : product.stock) > 0)
      return res
        .status(409)
        .json({ error: "That selection is currently available" });
    const existing = await StockAlertSubscription.findOne({
      product: product._id,
      variantId: variant?._id,
      status: "active",
      email,
    });
    if (existing)
      return res.json({
        message: "You are already subscribed for this selection.",
      });
    await StockAlertSubscription.create({
      product: product._id,
      variantId: variant?._id,
      size,
      color,
      email,
      status: "active",
      consentedAt: new Date(),
    });
    res.status(201).json({
      message:
        "You are subscribed. We will send one email if this selection returns to stock.",
    });
  } catch (e) {
    res.status(e.code === 11000 ? 200 : 400).json({
      message:
        e.code === 11000
          ? "You are already subscribed for this selection."
          : undefined,
      error: e.code === 11000 ? undefined : "Unable to save stock alert",
    });
  }
});
api.post("/stock-alerts/unsubscribe", async (req, res) => {
  const hash = crypto
      .createHash("sha256")
      .update(String(req.body.token || ""))
      .digest("hex"),
    alert = await StockAlertSubscription.findOneAndUpdate(
      { unsubscribeTokenHash: hash, status: "sent" },
      { $set: { status: "unsubscribed" } },
      { new: true },
    );
  alert
    ? res.json({
        message:
          "You will not receive any further emails for this stock alert.",
      })
    : res.status(404).json({
        error: "This stock-alert link is invalid or has already been used",
      });
});
function feedbackPage(query = {}) {
  const page = Math.max(1, parseInt(query.page || "1", 10) || 1),
    limit = Math.min(50, Math.max(1, parseInt(query.limit || "10", 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
}
function feedbackAuthor(name) {
  const first = String(name || "Customer")
    .trim()
    .split(/\s+/)[0]
    .slice(0, 56);
  return first || "Customer";
}
const reviewWriteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
api.get("/products/:slug/reviews", async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      published: true,
    }).select("_id");
    if (!product) return res.status(404).json({ error: "Product not found" });
    const { page, limit, skip } = feedbackPage(req.query);
    const [items, total, summary] = await Promise.all([
      Review.find({ product: product._id, status: "published" })
        .select("authorLabel rating title body verifiedPurchase createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ product: product._id, status: "published" }),
      Review.aggregate([
        { $match: { product: product._id, status: "published" } },
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);
    res.json({
      items,
      total,
      page,
      limit,
      summary: {
        count: summary[0]?.count || 0,
        average: summary[0]?.average || null,
      },
    });
  } catch {
    return res.status(400).json({ error: "Unable to load reviews" });
  }
});
api.post(
  "/products/:slug/reviews",
  reviewWriteLimit,
  auth,
  async (req, res) => {
    const rating = Number(req.body.rating),
      title = String(req.body.title || "").trim(),
      body = String(req.body.body || "").trim();
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      title.length < 3 ||
      title.length > 120 ||
      body.length < 10 ||
      body.length > 2000
    )
      return res.status(400).json({
        error:
          "Use a 1–5 rating, title of 3–120 characters and review of 10–2,000 characters",
      });
    try {
      const product = await Product.findOne({
        slug: req.params.slug,
        published: true,
      }).select("_id");
      if (!product) return res.status(404).json({ error: "Product not found" });
      const purchase = await Order.findOne({
        user: req.user.id,
        paymentStatus: "paid",
        status: "delivered",
        "items.product": product._id,
      }).select("_id");
      if (!purchase)
        return res.status(403).json({
          error:
            "Only a delivered, paid purchase from this account can be reviewed",
        });
      if (await Review.exists({ product: product._id, user: req.user.id }))
        return res.status(409).json({
          error: "You have already submitted a review for this product",
        });
      const user = await User.findById(req.user.id).select("name");
      if (!user) return res.sendStatus(401);
      await Review.create({
        product: product._id,
        user: req.user.id,
        order: purchase._id,
        authorLabel: feedbackAuthor(user.name),
        rating,
        title,
        body,
        verifiedPurchase: true,
        status: "pending",
      });
      res.status(201).json({
        message:
          "Thanks — your verified-purchase review is awaiting moderation.",
      });
    } catch (e) {
      res.status(e?.code === 11000 ? 409 : 400).json({
        error:
          e?.code === 11000
            ? "You have already submitted a review for this product"
            : "Unable to submit review",
      });
    }
  },
);
api.get("/products/:slug/questions", async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      published: true,
    }).select("_id");
    if (!product) return res.status(404).json({ error: "Product not found" });
    const { page, limit, skip } = feedbackPage(req.query);
    const [items, total] = await Promise.all([
      ProductQuestion.find({ product: product._id, status: "published" })
        .select("authorLabel question answer createdAt answeredAt")
        .sort({ answeredAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductQuestion.countDocuments({
        product: product._id,
        status: "published",
      }),
    ]);
    res.json({ items, total, page, limit });
  } catch {
    return res.status(400).json({ error: "Unable to load product questions" });
  }
});
api.post(
  "/products/:slug/questions",
  reviewWriteLimit,
  auth,
  async (req, res) => {
    const question = String(req.body.question || "").trim();
    if (question.length < 5 || question.length > 1000)
      return res
        .status(400)
        .json({ error: "Question must be 5–1,000 characters" });
    try {
      const product = await Product.findOne({
        slug: req.params.slug,
        published: true,
      }).select("_id");
      if (!product) return res.status(404).json({ error: "Product not found" });
      const user = await User.findById(req.user.id).select("name");
      if (!user) return res.sendStatus(401);
      await ProductQuestion.create({
        product: product._id,
        user: req.user.id,
        authorLabel: feedbackAuthor(user.name),
        question,
        status: "pending",
      });
      res
        .status(201)
        .json({ message: "Thanks — your question is awaiting an answer." });
    } catch {
      return res.status(400).json({ error: "Unable to submit question" });
    }
  },
);
api.get("/products/:slug", async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, published: true });
  p
    ? res.json(publicProduct(p))
    : res.status(404).json({ error: "Product not found" });
});
api.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 10)
      return res.status(400).json({
        error:
          "Name, email and a password of at least 10 characters are required",
      });
    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });
    sendWelcome(user.email, user.name).catch(console.error);
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 400).json({
      error:
        e.code === 11000 ? "Email already registered" : "Registration failed",
    });
  }
});
api.post("/auth/login", async (req, res) => {
  const user = await User.findOne({
    email: String(req.body.email || "").toLowerCase(),
  }).select("+passwordHash");
  if (
    !user ||
    !(await bcrypt.compare(req.body.password || "", user.passwordHash))
  )
    return res.status(401).json({ error: "Invalid email or password" });
  res.json({
    token: jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
api.post("/auth/forgot-password", async (req, res) => {
  const generic = {
    message:
      "If an account matches that address, password reset instructions will be sent.",
  };
  try {
    const email = String(req.body.email || "")
        .toLowerCase()
        .trim(),
      user = await User.findOne({ email });
    if (user) {
      const raw = crypto.randomBytes(32).toString("hex");
      user.resetTokenHash = crypto
        .createHash("sha256")
        .update(raw)
        .digest("hex");
      user.resetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      const url = `${process.env.CLIENT_URL}/reset-password?token=${encodeURIComponent(raw)}`;
      sendReset(user.email, user.name, url).catch(console.error);
    }
    return res.json(generic);
  } catch {
    return res.json(generic);
  }
});
api.post("/auth/reset-password", async (req, res) => {
  try {
    const raw = String(req.body.token || ""),
      hash = crypto.createHash("sha256").update(raw).digest("hex"),
      user = await User.findOne({
        resetTokenHash: hash,
        resetExpires: { $gt: new Date() },
      });
    if (!user)
      return res
        .status(400)
        .json({ error: "Reset link is invalid or expired" });
    if (typeof req.body.password !== "string" || req.body.password.length < 10)
      return res
        .status(400)
        .json({ error: "Password must be at least 10 characters" });
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.resetTokenHash = undefined;
    user.resetExpires = undefined;
    await user.save();
    return res.json({ message: "Password updated. Please sign in." });
  } catch {
    return res.status(400).json({ error: "Unable to reset password" });
  }
});
api.get("/auth/me", auth, async (req, res) => {
  const u = await User.findById(req.user.id);
  if (!u) return res.sendStatus(404);
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    addresses: u.addresses,
    cartReminderConsent: Boolean(u.cartReminderConsent),
  });
});
api.post("/auth/me/addresses", auth, async (req, res) => {
  const address = normalizeAddress(req.body || {});
  if (!address)
    return res.status(400).json({
      error:
        "Enter a valid name, phone, street address, city, state and postal code",
    });
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.sendStatus(404);
    if (u.addresses.length >= 10)
      return res.status(409).json({ error: "You can save up to 10 addresses" });
    u.addresses.push(address);
    await u.save();
    res.status(201).json({ addresses: u.addresses });
  } catch {
    return res.status(400).json({ error: "Unable to save address" });
  }
});
api.patch("/auth/me/addresses/:addressId", auth, async (req, res) => {
  const address = normalizeAddress(req.body || {});
  if (!address)
    return res.status(400).json({
      error:
        "Enter a valid name, phone, street address, city, state and postal code",
    });
  try {
    const set = Object.fromEntries(
      Object.entries(address).map(([key, value]) => [
        `addresses.$.${key}`,
        value,
      ]),
    );
    const u = await User.findOneAndUpdate(
      { _id: req.user.id, "addresses._id": req.params.addressId },
      { $set: set },
      { new: true, runValidators: true },
    );
    u ? res.json({ addresses: u.addresses }) : res.sendStatus(404);
  } catch {
    return res.status(400).json({ error: "Unable to update address" });
  }
});
api.delete("/auth/me/addresses/:addressId", auth, async (req, res) => {
  try {
    const u = await User.findOneAndUpdate(
      { _id: req.user.id, "addresses._id": req.params.addressId },
      { $pull: { addresses: { _id: req.params.addressId } } },
      { new: true },
    );
    u ? res.json({ addresses: u.addresses }) : res.sendStatus(404);
  } catch {
    return res.status(400).json({ error: "Unable to remove address" });
  }
});
function normalizeSavedCart(items) {
  if (!Array.isArray(items) || items.length > 30)
    throw checkoutError("A saved bag can contain up to 30 selections");
  const seen = new Set(),
    rows = [];
  for (const item of items) {
    const product = String(item.productId || item.product || ""),
      variantId = String(item.variantId || ""),
      size = String(item.size || "").trim(),
      color = String(item.color || "").trim(),
      quantity = Number(item.quantity),
      key = `${product}|${variantId}|${size}|${color}`;
    if (
      !mongoose.isValidObjectId(product) ||
      (variantId && !mongoose.isValidObjectId(variantId)) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      size.length > 30 ||
      color.length > 60 ||
      seen.has(key)
    )
      throw checkoutError(
        "Saved bag includes an invalid or duplicate selection",
      );
    seen.add(key);
    rows.push({
      product,
      variantId: variantId || undefined,
      size,
      color,
      quantity,
    });
  }
  return rows;
}
async function hydratedSavedCart(user) {
  const saved = user?.savedCart || [],
    ids = [
      ...new Set(saved.map((item) => String(item.product)).filter(Boolean)),
    ],
    products = ids.length
      ? await Product.find({ _id: { $in: ids }, published: true })
      : [],
    byId = new Map(products.map((product) => [String(product._id), product])),
    items = [];
  for (const row of saved) {
    const product = byId.get(String(row.product));
    if (!product) continue;
    const variant = product.variants?.length
      ? product.variants.find(
          (v) =>
            String(v._id) === String(row.variantId) ||
            (v.size === row.size && v.color === row.color),
        )
      : null;
    if (product.variants?.length && !variant) continue;
    const stock = variant ? variant.stock : product.stock,
      photo =
        product.images?.find(
          (image) =>
            image.color &&
            image.color.toLowerCase() === String(row.color || "").toLowerCase(),
        ) || product.images?.[0];
    items.push({
      productId: product._id,
      variantId: variant?._id,
      sku: variant?.sku || product.sku,
      slug: product.slug,
      name: product.name,
      price: effectivePrice(product),
      image: photo?.url,
      size: row.size,
      color: row.color,
      quantity: row.quantity,
      stock,
    });
  }
  return items;
}
api.get("/auth/me/cart", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.sendStatus(404);
    res.json({
      items: await hydratedSavedCart(user),
      updatedAt: user.savedCartUpdatedAt || null,
    });
  } catch {
    return res.status(400).json({ error: "Unable to load saved bag" });
  }
});
api.put("/auth/me/cart", auth, async (req, res) => {
  try {
    const savedCart = normalizeSavedCart(req.body?.items || []),
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { savedCart, savedCartUpdatedAt: new Date() } },
        { new: true },
      );
    if (!user) return res.sendStatus(404);
    res.json({
      items: await hydratedSavedCart(user),
      updatedAt: user.savedCartUpdatedAt,
    });
  } catch (e) {
    res
      .status(e.expose ? e.status : 400)
      .json({ error: e.expose ? e.message : "Unable to save bag" });
  }
});
api.patch("/auth/me/cart-reminder", auth, async (req, res) => {
  const consent = req.body?.consent === true;
  try {
    const updates = consent
        ? {
            cartReminderConsent: true,
            cartReminderConsentedAt: new Date(),
            cartReminderLastSentAt: null,
          }
        : {
            cartReminderConsent: false,
            cartReminderConsentedAt: null,
            cartReminderLastSentAt: null,
            cartReminderUnsubscribeTokenHash: null,
          },
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true },
      );
    user
      ? res.json({ cartReminderConsent: Boolean(user.cartReminderConsent) })
      : res.sendStatus(404);
  } catch {
    return res
      .status(400)
      .json({ error: "Unable to update cart-reminder preference" });
  }
});
api.post("/cart-reminders/unsubscribe", async (req, res) => {
  const hash = crypto
      .createHash("sha256")
      .update(String(req.body.token || ""))
      .digest("hex"),
    user = await User.findOneAndUpdate(
      { cartReminderUnsubscribeTokenHash: hash, cartReminderConsent: true },
      {
        $set: {
          cartReminderConsent: false,
          cartReminderConsentedAt: null,
          cartReminderLastSentAt: null,
          cartReminderUnsubscribeTokenHash: null,
        },
      },
      { new: true },
    );
  user
    ? res.json({ message: "Cart reminders are off." })
    : res.status(404).json({
        error: "This cart-reminder link is invalid or has already been used",
      });
});
api.post("/setup/bootstrap-admin", async (req, res) => {
  if (
    !process.env.ADMIN_BOOTSTRAP_KEY ||
    req.headers["x-bootstrap-key"] !== process.env.ADMIN_BOOTSTRAP_KEY
  )
    return res.sendStatus(404);
  try {
    if (await User.exists({ role: "admin" }))
      return res.status(409).json({ error: "An administrator already exists" });
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 14)
      return res.status(400).json({
        error: "Email and a password of at least 14 characters are required",
      });
    const user = await User.create({
      name: name || "VIMUHET Admin",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
    });
    return res
      .status(201)
      .json({ id: user.id, email: user.email, role: user.role });
  } catch {
    return res.status(400).json({ error: "Unable to create administrator" });
  }
});
api.post("/orders", async (req, res) => {
  const reserved = [];
  let createdOrder,
    customerId = null,
    couponReservation = null;
  try {
    if (req.headers.authorization) {
      try {
        customerId = jwt.verify(
          req.headers.authorization.replace(/^Bearer\s+/i, ""),
          process.env.JWT_SECRET,
        ).id;
      } catch {
        return res.sendStatus(401);
      }
    }
    const { items, email, shipping, couponCode, gift: giftInput } = req.body;
    const giftWrapped = giftInput?.wrapped === true,
      giftNote = String(giftInput?.note || "").trim();
    if (giftNote.length > 500)
      return res
        .status(400)
        .json({ error: "Gift note must be 500 characters or fewer" });
    if (
      !Array.isArray(items) ||
      !items.length ||
      items.length > 30 ||
      !email ||
      !shipping?.pincode ||
      !shipping?.name ||
      !shipping?.line1
    )
      return res.status(400).json({
        error: "Valid items, email and delivery details are required",
      });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
      return res
        .status(503)
        .json({ error: "Online checkout is not available right now" });
    const idem = String(req.headers["idempotency-key"] || "").slice(0, 100);
    if (!idem)
      return res.status(400).json({ error: "Idempotency-Key is required" });
    const prior = await Order.findOne({ idempotencyKey: idem });
    if (prior) {
      if (
        prior.email !== String(email).trim().toLowerCase() ||
        String(prior.user || "") !== String(customerId || "")
      )
        return res.status(409).json({
          error:
            "This checkout key is already associated with a different order identity",
        });
      if (
        prior.status !== "pending_payment" ||
        prior.paymentStatus !== "pending"
      )
        return res.status(409).json({
          error:
            "This payment attempt is no longer active. Try checkout again.",
        });
      const guestCode = crypto
        .createHmac("sha256", process.env.JWT_SECRET)
        .update(`guest:${idem}`)
        .digest("hex");
      if (!prior.razorpayOrderId) {
        const rz = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const rp = await rz.orders.create({
          amount: Math.round(prior.total * 100),
          currency: "INR",
          receipt: prior.number,
          notes: { internalOrderId: String(prior._id) },
          payment_capture: 1,
        });
        prior.razorpayOrderId = rp.id;
        await prior.save();
      }
      return res.json({
        order: prior,
        guestCode,
        payment: {
          mode: "razorpay",
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: prior.razorpayOrderId,
          amount: Math.round(prior.total * 100),
          currency: "INR",
        },
      });
    }
    const ids = [...new Set(items.map((i) => i.productId))];
    const products = await Product.find({ _id: { $in: ids }, published: true });
    if (products.length !== ids.length)
      return res
        .status(400)
        .json({ error: "One or more products are unavailable" });
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const orderItems = [];
    for (const i of items) {
      const p = byId.get(String(i.productId)),
        quantity = Number(i.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
        return res.status(400).json({ error: "Invalid quantity" });
      const size = String(i.size || ""),
        color = String(i.color || "");
      if (p.sizes?.length && !p.sizes.includes(size))
        return res
          .status(400)
          .json({ error: `Choose a valid size for ${p.name}` });
      if (p.colors?.length && !p.colors.includes(color))
        return res
          .status(400)
          .json({ error: `Choose a valid color for ${p.name}` });
      const variant = p.variants?.length
        ? p.variants.find((v) => v.size === size && v.color === color)
        : null;
      if (p.variants?.length && !variant)
        return res.status(400).json({
          error: `Choose a valid size and color combination for ${p.name}`,
        });
      if (variant && variant.stock < quantity)
        return res.status(409).json({
          error: `That size and color of ${p.name} is no longer available`,
        });
      orderItems.push({
        product: p._id,
        variantId: variant?._id,
        sku: variant?.sku || p.sku,
        name: p.name,
        quantity,
        unitPrice: effectivePrice(p),
        size,
        color,
        image: (
          p.images?.find(
            (photo) =>
              photo.color && photo.color.toLowerCase() === color.toLowerCase(),
          ) || p.images?.[0]
        )?.url,
      });
    }
    const grouped = new Map();
    for (const i of orderItems) {
      const key = `${i.product}:${i.variantId || "aggregate"}`,
        entry = grouped.get(key) || {
          id: i.product,
          variantId: i.variantId,
          quantity: 0,
        };
      entry.quantity += i.quantity;
      grouped.set(key, entry);
    }
    for (const { id: productId, quantity, variantId } of grouped.values()) {
      const result = variantId
        ? await Product.updateOne(
            {
              _id: productId,
              published: true,
              stock: { $gte: quantity },
              variants: {
                $elemMatch: { _id: variantId, stock: { $gte: quantity } },
              },
            },
            { $inc: { stock: -quantity, "variants.$[v].stock": -quantity } },
            {
              arrayFilters: [
                { "v._id": variantId, "v.stock": { $gte: quantity } },
              ],
            },
          )
        : await Product.updateOne(
            { _id: productId, published: true, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
          );
      if (result.modifiedCount !== 1) {
        await restoreReserved(reserved);
        return res.status(409).json({
          error:
            "Stock changed while you were checking out. Please refresh your bag.",
        });
      }
      reserved.push({ id: productId, quantity, variantId });
    }
    const subtotal = orderItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
      shippingFee = subtotal >= 2499 ? 0 : 99;
    couponReservation = await reserveCoupon(
      couponCode,
      subtotal,
      customerId,
      email,
    );
    const discountTotal = couponReservation?.discountTotal || 0,
      giftFee = giftWrapped ? GIFT_WRAP_FEE_INR : 0,
      total = Number(
        (Math.max(0, subtotal - discountTotal) + shippingFee + giftFee).toFixed(
          2,
        ),
      ),
      guestCode = crypto
        .createHmac("sha256", process.env.JWT_SECRET)
        .update(`guest:${idem}`)
        .digest("hex");
    createdOrder = await Order.create({
      number: `VM${Date.now().toString().slice(-9)}`,
      idempotencyKey: idem,
      guestCodeHash: crypto
        .createHash("sha256")
        .update(guestCode)
        .digest("hex"),
      reservationExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      user: customerId || undefined,
      items: orderItems,
      email,
      shipping,
      gift: {
        wrapped: giftWrapped,
        note: giftWrapped ? giftNote : "",
        fee: giftFee,
      },
      subtotal,
      coupon: couponReservation?.coupon._id,
      couponCode: couponReservation?.coupon.code,
      couponReservationHeld: Boolean(couponReservation),
      discountTotal,
      shippingFee,
      total,
    });
    let payment = { mode: "pending", message: "Payment setup is incomplete" };
    try {
      const rz = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        }),
        rp = await rz.orders.create({
          amount: Math.round(createdOrder.total * 100),
          currency: "INR",
          receipt: createdOrder.number,
          notes: { internalOrderId: String(createdOrder._id) },
          payment_capture: 1,
        });
      createdOrder.razorpayOrderId = rp.id;
      await createdOrder.save();
      payment = {
        mode: "razorpay",
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: rp.id,
        amount: rp.amount,
        currency: rp.currency,
      };
    } catch {
      await voidPendingPayment(createdOrder);
      throw checkoutError(
        "We could not start secure payment. No payment was taken; please try again.",
        502,
      );
    }
    res.status(201).json({ order: createdOrder, guestCode, payment });
  } catch (e) {
    if (reserved.length && !createdOrder)
      await restoreReserved(reserved).catch(() => {});
    if (couponReservation && !createdOrder)
      await Coupon.updateOne(
        { _id: couponReservation.coupon._id, reservedCount: { $gt: 0 } },
        { $inc: { reservedCount: -1 } },
      ).catch(() => {});
    if (e.code === 11000) {
      const prior = await Order.findOne({
        idempotencyKey: String(req.headers["idempotency-key"] || ""),
      });
      if (prior)
        return res
          .status(200)
          .json({ order: prior, error: "Order request was already processed" });
    }
    if (e.expose) return res.status(e.status || 400).json({ error: e.message });
    console.error(e);
    res.status(400).json({ error: "Unable to create order" });
  }
});
api.post("/payments/fail", async (req, res) => {
  try {
    const razorpayOrderId = String(req.body.razorpay_order_id || ""),
      guestCode = String(req.body.guestCode || ""),
      order = await Order.findOne({ razorpayOrderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    const hash = crypto.createHash("sha256").update(guestCode).digest("hex");
    if (!guestCode || !safeEqualHex(hash, order.guestCodeHash || ""))
      return res.status(403).json({ error: "Order access denied" });
    const updated = await voidPendingPayment(order, true);
    res.json({ cancelled: Boolean(updated) });
  } catch {
    return res.status(400).json({ error: "Unable to record payment failure" });
  }
});
api.post("/payments/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      guestCode,
    } = req.body;
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) return res.status(404).json({ error: "Order not found" });
    const providedHash = crypto
      .createHash("sha256")
      .update(String(guestCode || ""))
      .digest("hex");
    if (!guestCode || !safeEqualHex(providedHash, order.guestCodeHash || ""))
      return res.status(403).json({ error: "Order access denied" });
    if (order.paymentStatus === "paid") {
      await consumeCouponReservation(order);
      return res.json({ verified: true, order });
    }
    if (
      !verifyCheckoutSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET,
      )
    )
      return res
        .status(400)
        .json({ error: "Payment signature verification failed" });
    const rz = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const verifiedPayment = await rz.payments.fetch(razorpay_payment_id);
    if (
      verifiedPayment.order_id !== order.razorpayOrderId ||
      verifiedPayment.status !== "captured" ||
      verifiedPayment.currency !== "INR" ||
      verifiedPayment.amount !== Math.round(order.total * 100)
    )
      return res
        .status(400)
        .json({ error: "Payment is not captured for the expected amount" });
    if (order.status === "cancelled") {
      const refund = await rz.payments.refund(razorpay_payment_id, {
        amount: verifiedPayment.amount,
        notes: {
          orderNumber: order.number,
          reason: "Payment captured after order cancellation",
        },
      });
      order.razorpayPaymentId = razorpay_payment_id;
      order.refundId = refund.id;
      order.refundStatus =
        refund.status === "processed" ? "processed" : "pending";
      order.paymentStatus =
        order.refundStatus === "processed" ? "refunded" : "paid";
      if (order.refundStatus === "processed") order.status = "refunded";
      await order.save();
      return res.json({ verified: true, refunded: true, order });
    }
    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.razorpayPaymentId = razorpay_payment_id;
    order.paidAt = new Date();
    await order.save();
    await consumeCouponReservation(order);
    sendOrder(order.email, order).catch(console.error);
    res.json({ verified: true, order });
  } catch {
    return res.status(400).json({ error: "Payment verification failed" });
  }
});
api.get("/orders/mine", auth, async (req, res) =>
  res.json(await Order.find({ user: req.user.id }).sort({ createdAt: -1 })),
);
api.get("/orders/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.sendStatus(404);
  if (req.headers.authorization) {
    try {
      const user = jwt.verify(
        req.headers.authorization.replace(/^Bearer\s+/i, ""),
        process.env.JWT_SECRET,
      );
      if (String(order.user) !== String(user.id)) return res.sendStatus(403);
    } catch {
      return res.sendStatus(401);
    }
  } else {
    const hash = crypto
      .createHash("sha256")
      .update(String(req.query.code || ""))
      .digest("hex");
    if (!req.query.code || !safeEqualHex(hash, order.guestCodeHash || ""))
      return res.sendStatus(403);
  }
  res.json(order);
});
api.post("/orders/lookup", async (req, res) => {
  const number = String(req.body.number || "")
      .trim()
      .toUpperCase(),
    code = String(req.body.accessCode || "").trim();
  if (!/^VM[A-Z0-9-]{5,32}$/.test(number) || !/^[a-f0-9]{64}$/i.test(code))
    return res.status(400).json({
      error: "Enter the order number and 64-character guest access code",
    });
  try {
    const hash = crypto.createHash("sha256").update(code).digest("hex"),
      order = await Order.findOne({ number, guestCodeHash: hash }).select(
        "_id",
      );
    order
      ? res.json({ orderId: order._id })
      : res
          .status(404)
          .json({ error: "Order number or access code was not recognized" });
  } catch {
    return res.status(400).json({ error: "Unable to look up this order" });
  }
});
api.post("/orders/:id/cancel", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.sendStatus(404);
    if (req.headers.authorization) {
      try {
        const user = jwt.verify(
          req.headers.authorization.replace(/^Bearer\s+/i, ""),
          process.env.JWT_SECRET,
        );
        if (!order.user || String(order.user) !== String(user.id))
          return res.sendStatus(403);
      } catch {
        return res.sendStatus(401);
      }
    } else {
      const hash = crypto
        .createHash("sha256")
        .update(String(req.body.guestCode || ""))
        .digest("hex");
      if (!req.body.guestCode || !safeEqualHex(hash, order.guestCodeHash || ""))
        return res.sendStatus(403);
    }
    if (order.paymentStatus === "paid" || order.status !== "pending_payment")
      return res
        .status(409)
        .json({ error: "Paid or processed orders require support to cancel" });
    const cancelled = await voidPendingPayment(order);
    if (!cancelled)
      return res.status(409).json({ error: "Order was already updated" });
    res.json(cancelled);
  } catch {
    return res.status(400).json({ error: "Unable to cancel order" });
  }
});
api.post("/orders/:id/requests", async (req, res) => {
  const type = String(req.body.type || ""),
    reason = String(req.body.reason || "").trim();
  if (
    !["cancellation", "return"].includes(type) ||
    reason.length < 10 ||
    reason.length > 1000
  )
    return res.status(400).json({
      error: "Choose a request type and provide a reason (10–1,000 characters)",
    });
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.sendStatus(404);
    if (req.headers.authorization) {
      try {
        const user = jwt.verify(
          req.headers.authorization.replace(/^Bearer\s+/i, ""),
          process.env.JWT_SECRET,
        );
        if (!order.user || String(order.user) !== String(user.id))
          return res.sendStatus(403);
      } catch {
        return res.sendStatus(401);
      }
    } else {
      const hash = crypto
        .createHash("sha256")
        .update(String(req.body.guestCode || ""))
        .digest("hex");
      if (!req.body.guestCode || !safeEqualHex(hash, order.guestCodeHash || ""))
        return res.sendStatus(403);
    }
    const eligible =
      type === "cancellation"
        ? order.paymentStatus === "paid" &&
          ["confirmed", "processing"].includes(order.status)
        : order.paymentStatus === "paid" && order.status === "delivered";
    if (!eligible)
      return res.status(409).json({
        error:
          type === "cancellation"
            ? "Only confirmed or processing paid orders can request cancellation review."
            : "Return review can only be requested for a delivered paid order.",
      });
    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: order.status,
        paymentStatus: "paid",
        customerRequests: { $not: { $elemMatch: { type, status: "pending" } } },
      },
      {
        $push: {
          customerRequests: {
            type,
            status: "pending",
            reason,
            requestedAt: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!updated)
      return res.status(409).json({
        error: "A pending request already exists or the order changed.",
      });
    res.status(201).json(updated);
  } catch {
    return res.status(400).json({ error: "Unable to submit order request" });
  }
});
api.patch(
  "/admin/orders/:id/requests/:requestId",
  auth,
  admin,
  async (req, res) => {
    const status = String(req.body.status || ""),
      reviewNote = String(req.body.reviewNote || "").trim();
    if (
      !["approved", "rejected"].includes(status) ||
      reviewNote.length < 3 ||
      reviewNote.length > 1000
    )
      return res.status(400).json({
        error:
          "Choose approved or rejected and provide a review note (3–1,000 characters)",
      });
    try {
      const order = await Order.findOneAndUpdate(
        {
          _id: req.params.id,
          customerRequests: {
            $elemMatch: { _id: req.params.requestId, status: "pending" },
          },
        },
        {
          $set: {
            "customerRequests.$.status": status,
            "customerRequests.$.reviewedAt": new Date(),
            "customerRequests.$.reviewedBy": req.user.id,
            "customerRequests.$.reviewNote": reviewNote,
          },
        },
        { new: true },
      );
      if (!order)
        return res
          .status(409)
          .json({ error: "Request not found or already reviewed" });
      await writeAudit(
        req.user.id,
        "order.customer-request.review",
        "Order",
        order._id,
        `Reviewed ${req.params.requestId} as ${status}`,
      );
      res.json(order);
    } catch {
      return res.status(400).json({ error: "Unable to review request" });
    }
  },
);
const writeAudit = (actor, action, recordType, recordId, summary) =>
  AdminAudit.create({
    actor,
    action,
    recordType,
    recordId: String(recordId || ""),
    summary: String(summary || "").slice(0, 500),
  }).catch((e) => console.error("Admin audit write failed:", e.message));
api.get("/admin/reviews", auth, admin, async (req, res) => {
  try {
    const status = ["pending", "published", "rejected"].includes(
      String(req.query.status || ""),
    )
      ? String(req.query.status)
      : "";
    const { page, limit, skip } = feedbackPage(req.query),
      filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      Review.find(filter)
        .populate("product", "name slug")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch {
    return res.status(400).json({ error: "Unable to load reviews" });
  }
});
api.patch("/admin/reviews/:id", auth, admin, async (req, res) => {
  const status = String(req.body.status || ""),
    moderationNote = String(req.body.moderationNote || "").trim();
  if (
    !["published", "rejected"].includes(status) ||
    moderationNote.length > 1000
  )
    return res.status(400).json({
      error:
        "Choose published or rejected and keep the moderation note under 1,000 characters",
    });
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          moderationNote,
          moderatedBy: req.user.id,
          moderatedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!review) return res.sendStatus(404);
    await writeAudit(
      req.user.id,
      "review.moderate",
      "Review",
      review._id,
      `Set review status to ${status}`,
    );
    res.json(review);
  } catch {
    return res.status(400).json({ error: "Unable to moderate review" });
  }
});
api.get("/admin/questions", auth, admin, async (req, res) => {
  try {
    const status = ["pending", "published", "rejected"].includes(
      String(req.query.status || ""),
    )
      ? String(req.query.status)
      : "";
    const { page, limit, skip } = feedbackPage(req.query),
      filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      ProductQuestion.find(filter)
        .populate("product", "name slug")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductQuestion.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch {
    return res.status(400).json({ error: "Unable to load questions" });
  }
});
api.patch("/admin/questions/:id", auth, admin, async (req, res) => {
  const status = String(req.body.status || ""),
    answer = String(req.body.answer || "").trim(),
    moderationNote = String(req.body.moderationNote || "").trim();
  if (
    !["published", "rejected"].includes(status) ||
    moderationNote.length > 1000 ||
    (status === "published" && (answer.length < 3 || answer.length > 2000))
  )
    return res.status(400).json({
      error:
        status === "published"
          ? "Published answers must be 3–2,000 characters"
          : "Choose published or rejected and keep the moderation note under 1,000 characters",
    });
  try {
    const updates = {
      status,
      moderationNote,
      answeredBy: req.user.id,
      answeredAt: new Date(),
    };
    if (status === "published") updates.answer = answer;
    const question = await ProductQuestion.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true },
    );
    if (!question) return res.sendStatus(404);
    await writeAudit(
      req.user.id,
      "question.moderate",
      "ProductQuestion",
      question._id,
      `Set product question status to ${status}`,
    );
    res.json(question);
  } catch {
    return res.status(400).json({ error: "Unable to moderate question" });
  }
});
function couponPayload(input = {}, current = {}) {
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key),
    value = (key, fallback) => (has(key) ? input[key] : fallback),
    code = String(value("code", current.code || ""))
      .trim()
      .toUpperCase(),
    description = String(
      value("description", current.description || ""),
    ).trim(),
    discountType = String(
      value("discountType", current.discountType || ""),
    ).trim(),
    discountValue = Number(value("discountValue", current.discountValue)),
    minSubtotal = Number(value("minSubtotal", current.minSubtotal ?? 0)),
    maxRedemptions = Number(
      value("maxRedemptions", current.maxRedemptions ?? 0),
    ),
    maxUsesPerCustomer = Number(
      value("maxUsesPerCustomer", current.maxUsesPerCustomer ?? 0),
    ),
    active = Boolean(value("active", current.active ?? true)),
    firstOrderOnly = Boolean(
      value("firstOrderOnly", current.firstOrderOnly ?? false),
    );
  const parseDate = (key, fallback) => {
      const raw = value(key, fallback);
      if (raw === null || raw === "") return null;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime()))
        throw Error(`${key === "startsAt" ? "Start" : "End"} date is invalid`);
      return date;
    },
    startsAt = parseDate("startsAt", current.startsAt || null),
    endsAt = parseDate("endsAt", current.endsAt || null);
  if (!/^[A-Z0-9_-]{3,32}$/.test(code))
    throw Error(
      "Coupon code must use 3–32 letters, numbers, hyphens or underscores",
    );
  if (
    description.length > 240 ||
    !["percentage", "fixed"].includes(discountType) ||
    !Number.isFinite(discountValue) ||
    discountValue <= 0 ||
    (discountType === "percentage" && discountValue > 100) ||
    !Number.isFinite(minSubtotal) ||
    minSubtotal < 0 ||
    ![maxRedemptions, maxUsesPerCustomer].every(
      (n) => Number.isInteger(n) && n >= 0,
    ) ||
    (startsAt && endsAt && endsAt <= startsAt)
  )
    throw Error(
      "Enter a valid discount, eligibility, redemption limit and date window",
    );
  return {
    code,
    description,
    active,
    discountType,
    discountValue,
    minSubtotal,
    maxRedemptions,
    maxUsesPerCustomer,
    firstOrderOnly,
    startsAt,
    endsAt,
  };
}
api.get("/admin/coupons", auth, admin, async (req, res) => {
  try {
    const { page, limit, skip } = feedbackPage(req.query),
      active =
        req.query.active === ""
          ? undefined
          : req.query.active === "true"
            ? true
            : req.query.active === "false"
              ? false
              : undefined,
      filter = active === undefined ? {} : { active };
    const [items, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  } catch {
    return res.status(400).json({ error: "Unable to load coupons" });
  }
});
api.post("/admin/coupons", auth, admin, async (req, res) => {
  try {
    const coupon = await Coupon.create(couponPayload(req.body));
    await writeAudit(
      req.user.id,
      "coupon.create",
      "Coupon",
      coupon._id,
      `Created coupon ${coupon.code}`,
    );
    res.status(201).json(coupon);
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 400).json({
      error:
        e.code === 11000
          ? "Coupon code already exists"
          : e.message || "Invalid coupon",
    });
  }
});
api.patch("/admin/coupons/:id", auth, admin, async (req, res) => {
  try {
    const existing = await Coupon.findById(req.params.id);
    if (!existing) return res.sendStatus(404);
    const coupon = await Coupon.findByIdAndUpdate(
      existing._id,
      couponPayload(req.body, existing.toObject()),
      { new: true, runValidators: true },
    );
    await writeAudit(
      req.user.id,
      "coupon.update",
      "Coupon",
      coupon._id,
      `Updated coupon ${coupon.code}`,
    );
    res.json(coupon);
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 400).json({
      error:
        e.code === 11000
          ? "Coupon code already exists"
          : e.message || "Invalid coupon",
    });
  }
});
function dashboardRange(query = {}) {
  const now = new Date();
  let from, to;
  if (query.from || query.to) {
    from = new Date(query.from);
    to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
      throw Error("Use valid ISO dates for from and to");
    to.setUTCHours(23, 59, 59, 999);
  } else {
    to = new Date(now);
    to.setUTCHours(23, 59, 59, 999);
    from = new Date(to);
    const range = query.range || "30d";
    if (range === "today") from.setUTCHours(0, 0, 0, 0);
    else if (range === "7d") from.setUTCDate(from.getUTCDate() - 6);
    else if (range === "month")
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    else from.setUTCDate(from.getUTCDate() - 29);
  }
  if (to < from || to - from > 366 * 24 * 60 * 60 * 1000)
    throw Error("Date range must be ordered and no longer than 366 days");
  return { from, to };
}
api.get("/admin/search", auth, admin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2 || q.length > 100)
    return res
      .status(400)
      .json({ error: "Search must contain 2–100 characters" });
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    rx = new RegExp(safe, "i");
  try {
    const [products, orders, customers] = await Promise.all([
      Product.find({ $or: [{ name: rx }, { sku: rx }, { category: rx }] })
        .select("name slug sku category price status published")
        .limit(6)
        .lean(),
      Order.find({ $or: [{ number: rx }, { email: rx }] })
        .select("number email total status paymentStatus createdAt")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      User.find({ role: "customer", $or: [{ name: rx }, { email: rx }] })
        .select("name email createdAt")
        .limit(6)
        .lean(),
    ]);
    res.json({ products, orders, customers });
  } catch {
    return res.status(400).json({ error: "Search failed" });
  }
});
function csvCell(value) {
  const raw = String(value ?? ""),
    v = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[\",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}
api.get("/admin/reports/sales.csv", auth, admin, async (req, res) => {
  try {
    const { from, to } = dashboardRange(req.query),
      orders = await Order.find({ createdAt: { $gte: from, $lte: to } })
        .select(
          "number email createdAt paymentStatus refundStatus status items subtotal discountTotal shippingFee taxTotal total currency",
        )
        .populate("items.product", "category")
        .lean(),
      headers = [
        "Order number",
        "Placed at UTC",
        "Payment status",
        "Refund status",
        "Order status",
        "Customer email",
        "Product",
        "Product ID",
        "Current product category",
        "SKU",
        "Size",
        "Color",
        "Quantity",
        "Unit price INR",
        "Line gross INR",
        "Order subtotal INR",
        "Order discount INR",
        "Shipping INR",
        "Tax INR",
        "Order total INR",
        "Currency",
      ],
      rows = [];
    for (const order of orders) {
      for (const item of order.items || []) {
        const product = item.product;
        rows.push([
          order.number,
          new Date(order.createdAt).toISOString(),
          order.paymentStatus,
          order.refundStatus,
          order.status,
          order.email,
          item.name,
          product?._id || item.product || "",
          product?.category || "",
          item.sku || "",
          item.size || "",
          item.color || "",
          item.quantity || 0,
          item.unitPrice || 0,
          (item.quantity || 0) * (item.unitPrice || 0),
          order.subtotal || 0,
          order.discountTotal || 0,
          order.shippingFee || 0,
          order.taxTotal || 0,
          order.total || 0,
          order.currency || "INR",
        ]);
      }
    }
    const csv =
      "\uFEFF" +
      [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    await writeAudit(
      req.user.id,
      "report.sales.export",
      "Report",
      "sales",
      `Exported ${rows.length} sales line(s) from ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vimuhet-sales-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`,
    );
    res.type("text/csv; charset=utf-8").send(csv);
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message || "Unable to export sales report" });
  }
});
api.get("/admin/visitor-analytics", auth, admin, async (req, res) => {
  try {
    const { from, to } = dashboardRange(req.query),
      match = { occurredAt: { $gte: from, $lte: to } },
      [report] = await AnalyticsEvent.aggregate([
        { $match: match },
        {
          $facet: {
            uniqueVisitors: [
              { $group: { _id: "$visitorHash" } },
              { $count: "count" },
            ],
            visits: [{ $group: { _id: "$sessionHash" } }, { $count: "count" }],
            eventTotals: [
              { $group: { _id: "$eventType", count: { $sum: 1 } } },
            ],
            daily: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$occurredAt",
                      timezone: "UTC",
                    },
                  },
                  visitors: { $addToSet: "$visitorHash" },
                  visits: { $addToSet: "$sessionHash" },
                  pageViews: {
                    $sum: {
                      $cond: [{ $eq: ["$eventType", "page_view"] }, 1, 0],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  date: "$_id",
                  uniqueVisitors: { $size: "$visitors" },
                  visits: { $size: "$visits" },
                  pageViews: 1,
                },
              },
              { $sort: { date: 1 } },
            ],
            topPages: [
              { $match: { eventType: "page_view" } },
              {
                $group: {
                  _id: "$path",
                  views: { $sum: 1 },
                  visitors: { $addToSet: "$visitorHash" },
                },
              },
              {
                $project: {
                  _id: 0,
                  path: "$_id",
                  views: 1,
                  uniqueVisitors: { $size: "$visitors" },
                },
              },
              { $sort: { views: -1, path: 1 } },
              { $limit: 8 },
            ],
            topProducts: [
              {
                $match: {
                  eventType: "product_view",
                  productSlug: { $ne: null },
                },
              },
              {
                $group: {
                  _id: "$productSlug",
                  views: { $sum: 1 },
                  visitors: { $addToSet: "$visitorHash" },
                },
              },
              {
                $project: {
                  _id: 0,
                  slug: "$_id",
                  views: 1,
                  uniqueVisitors: { $size: "$visitors" },
                },
              },
              { $sort: { views: -1, slug: 1 } },
              { $limit: 8 },
            ],
          },
        },
      ]),
      eventCounts = Object.fromEntries(
        (report?.eventTotals || []).map((row) => [row._id, row.count]),
      );
    res.json({
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: "UTC",
      },
      metrics: {
        uniqueVisitors: report?.uniqueVisitors?.[0]?.count || 0,
        visits: report?.visits?.[0]?.count || 0,
        pageViews: eventCounts.page_view || 0,
        productViews: eventCounts.product_view || 0,
        addToBag: eventCounts.add_to_bag || 0,
        checkoutStarts: eventCounts.checkout_started || 0,
      },
      daily: report?.daily || [],
      topPages: report?.topPages || [],
      topProducts: report?.topProducts || [],
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.message || "Unable to load visitor analytics" });
  }
});
api.get("/admin/dashboard", auth, admin, async (req, res) => {
  try {
    const { from, to } = dashboardRange(req.query),
      createdAt = { $gte: from, $lte: to };
    const [
      orders,
      orderCount,
      customerCount,
      productCount,
      lowStock,
      lowStockCount,
      outOfStock,
      recentOrders,
      recentCustomers,
      activity,
    ] = await Promise.all([
      Order.find({ createdAt })
        .select(
          "number email total subtotal discountTotal shippingFee taxTotal status paymentStatus refundStatus items createdAt",
        )
        .lean(),
      Order.countDocuments({ createdAt }),
      User.countDocuments({ role: "customer", createdAt }),
      Product.countDocuments({}),
      Product.find({
        stock: { $gt: 0 },
        $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 5] }] },
      })
        .select("name sku category stock lowStockThreshold status")
        .sort({ stock: 1 })
        .limit(12)
        .lean(),
      Product.countDocuments({
        stock: { $gt: 0 },
        $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 5] }] },
      }),
      Product.countDocuments({ stock: 0 }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select(
          "number email total status paymentStatus refundStatus createdAt",
        )
        .lean(),
      User.find({ role: "customer", createdAt })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("name email createdAt")
        .lean(),
      AdminAudit.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("actor", "name email")
        .lean(),
    ]);
    const captured = orders.filter((o) =>
        ["paid", "refunded"].includes(o.paymentStatus),
      ),
      grossSales = captured.reduce((s, o) => s + (o.subtotal || 0), 0),
      discounts = captured.reduce((s, o) => s + (o.discountTotal || 0), 0),
      capturedTotal = captured.reduce((s, o) => s + (o.total || 0), 0),
      refunded = orders
        .filter((o) => o.refundStatus === "processed")
        .reduce((s, o) => s + (o.total || 0), 0);
    const days = new Map(),
      cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    const lastDay = new Date(to);
    lastDay.setUTCHours(0, 0, 0, 0);
    while (cursor <= lastDay) {
      const day = cursor.toISOString().slice(0, 10);
      days.set(day, { date: day, orders: 0, revenue: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (const o of orders) {
      const day = new Date(o.createdAt).toISOString().slice(0, 10),
        v = days.get(day);
      if (v) {
        v.orders++;
        if (["paid", "refunded"].includes(o.paymentStatus))
          v.revenue += o.total || 0;
      }
    }
    const bestMap = new Map();
    for (const o of orders)
      if (["paid", "refunded"].includes(o.paymentStatus))
        for (const i of o.items || []) {
          const key = i.product?.toString() || i.name,
            entry = bestMap.get(key) || { name: i.name, units: 0, revenue: 0 };
          entry.units += i.quantity || 0;
          entry.revenue += (i.quantity || 0) * (i.unitPrice || 0);
          bestMap.set(key, entry);
        }
    const statusCounts = await Order.aggregate([
      { $match: { createdAt } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    res.json({
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: "UTC",
      },
      metrics: {
        totalOrders: orderCount,
        totalCustomers: customerCount,
        totalProducts: productCount,
        grossSales,
        discounts,
        capturedTotal,
        refunds: refunded,
        netCollected: capturedTotal - refunded,
        averageCapturedOrderValue: captured.length
          ? capturedTotal / captured.length
          : 0,
        pendingOrders: orders.filter((o) => o.status === "pending_payment")
          .length,
        processingOrders: orders.filter((o) => o.status === "processing")
          .length,
        refundedOrders: orders.filter((o) => o.refundStatus === "processed")
          .length,
        lowStockProducts: lowStockCount,
        outOfStockProducts: outOfStock,
        paymentFailures: orders.filter((o) => o.paymentStatus === "failed")
          .length,
      },
      salesByDay: [...days.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      ordersByStatus: statusCounts,
      bestSellers: [...bestMap.values()]
        .sort((a, b) => b.units - a.units)
        .slice(0, 8),
      lowStock,
      recentOrders,
      recentCustomers,
      recentActivity: activity.map((a) => ({
        ...a,
        actor: a.actor ? { name: a.actor.name, email: a.actor.email } : null,
      })),
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Unable to load dashboard" });
  }
});
api.get("/admin/customers", auth, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1),
      limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit || "25", 10) || 25),
      ),
      search = String(req.query.search || "").trim(),
      filter = search
        ? {
            role: "customer",
            $or: [
              {
                name: new RegExp(
                  search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "i",
                ),
              },
              {
                email: new RegExp(
                  search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "i",
                ),
              },
            ],
          }
        : { role: "customer" },
      [rows, total] = await Promise.all([
        User.find(filter)
          .select("name email addresses createdAt")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(filter),
      ]),
      ids = rows.map((u) => u._id),
      stats = ids.length
        ? await Order.aggregate([
            { $match: { user: { $in: ids } } },
            {
              $group: {
                _id: "$user",
                orderCount: { $sum: 1 },
                totalSpent: {
                  $sum: {
                    $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0],
                  },
                },
                lastOrder: { $max: "$createdAt" },
              },
            },
          ])
        : [],
      byId = new Map(stats.map((x) => [String(x._id), x]));
    res.json({
      items: rows.map((u) => {
        const s = byId.get(String(u._id)) || {};
        return {
          id: u._id,
          name: u.name,
          email: u.email,
          addresses: u.addresses || [],
          createdAt: u.createdAt,
          orderCount: s.orderCount || 0,
          totalSpent: s.totalSpent || 0,
          lastOrder: s.lastOrder || null,
        };
      }),
      page,
      limit,
      total,
    });
  } catch (e) {
    res.status(400).json({ error: "Unable to load customers" });
  }
});
api.get("/admin/customers/:id", auth, admin, async (req, res) => {
  try {
    const u = await User.findById(req.params.id)
      .select("name email addresses createdAt")
      .lean();
    if (!u) return res.sendStatus(404);
    const orders = await Order.find({ user: u._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select(
        "number items subtotal discountTotal shippingFee total status paymentStatus refundStatus createdAt",
      )
      .lean();
    res.json({
      customer: {
        id: u._id,
        name: u.name,
        email: u.email,
        addresses: u.addresses || [],
        createdAt: u.createdAt,
      },
      orders,
    });
  } catch {
    return res.status(400).json({ error: "Unable to load customer" });
  }
});
api.get("/admin/inventory", auth, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1),
      limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit || "50", 10) || 50),
      ),
      search = String(req.query.search || "").trim(),
      query = search
        ? {
            $or: [
              {
                name: new RegExp(
                  search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "i",
                ),
              },
              {
                sku: new RegExp(
                  search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "i",
                ),
              },
              {
                category: new RegExp(
                  search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "i",
                ),
              },
            ],
          }
        : {},
      [items, total] = await Promise.all([
        Product.find(query)
          .select(
            "name slug sku category stock lowStockThreshold variants published status updatedAt",
          )
          .sort({ stock: 1, name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Product.countDocuments(query),
      ]);
    res.json({ items, page, limit, total });
  } catch {
    return res.status(400).json({ error: "Unable to load inventory" });
  }
});
api.post("/admin/inventory/:id/adjust", auth, admin, async (req, res) => {
  const delta = Number(req.body.delta),
    reason = String(req.body.reason || "").trim();
  if (
    !Number.isInteger(delta) ||
    delta === 0 ||
    Math.abs(delta) > 100000 ||
    reason.length < 3 ||
    reason.length > 300
  )
    return res.status(400).json({
      error:
        "Enter a non-zero whole-number adjustment and a reason (3–300 characters)",
    });
  try {
    if (
      await Product.exists({
        _id: req.params.id,
        "variants.0": { $exists: true },
      })
    )
      return res.status(409).json({
        error:
          "This product is tracked by variant. Adjust its individual size/color variant instead.",
      });
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, stock: { $gte: Math.max(0, -delta) } },
      { $inc: { stock: delta } },
      { new: true, runValidators: true },
    );
    if (!product)
      return res.status(409).json({
        error: "Product not found or adjustment would make stock negative",
      });
    const movement = await InventoryMovement.create({
      product: product._id,
      actor: req.user.id,
      previousStock: product.stock - delta,
      newStock: product.stock,
      delta,
      reason,
    });
    await writeAudit(
      req.user.id,
      "inventory.adjust",
      "Product",
      product._id,
      `Stock ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)}: ${reason}`,
    );
    res.json({ product, movement });
  } catch {
    return res
      .status(400)
      .json({ error: "Inventory adjustment could not be saved" });
  }
});
api.post(
  "/admin/inventory/:id/variants/:variantId/adjust",
  auth,
  admin,
  async (req, res) => {
    const delta = Number(req.body.delta),
      reason = String(req.body.reason || "").trim();
    if (
      !Number.isInteger(delta) ||
      delta === 0 ||
      Math.abs(delta) > 100000 ||
      reason.length < 3 ||
      reason.length > 300
    )
      return res.status(400).json({
        error:
          "Enter a non-zero whole-number adjustment and a reason (3–300 characters)",
      });
    try {
      const product = await Product.findOneAndUpdate(
        {
          _id: req.params.id,
          stock: { $gte: Math.max(0, -delta) },
          variants: {
            $elemMatch: {
              _id: req.params.variantId,
              stock: { $gte: Math.max(0, -delta) },
            },
          },
        },
        { $inc: { stock: delta, "variants.$[v].stock": delta } },
        {
          new: true,
          runValidators: true,
          arrayFilters: [
            {
              "v._id": req.params.variantId,
              "v.stock": { $gte: Math.max(0, -delta) },
            },
          ],
        },
      );
      if (!product)
        return res.status(409).json({
          error: "Variant not found or adjustment would make stock negative",
        });
      const variant = product.variants.id(req.params.variantId);
      const movement = await InventoryMovement.create({
        product: product._id,
        variantId: variant._id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        actor: req.user.id,
        previousStock: variant.stock - delta,
        newStock: variant.stock,
        delta,
        reason,
      });
      await writeAudit(
        req.user.id,
        "inventory.variant.adjust",
        "Product",
        product._id,
        `Adjusted ${variant.size}/${variant.color} by ${delta}: ${reason}`,
      );
      res.json({ product, variant, movement });
    } catch {
      return res
        .status(400)
        .json({ error: "Variant adjustment could not be saved" });
    }
  },
);
api.get("/admin/inventory/:id/movements", auth, admin, async (req, res) => {
  try {
    const items = await InventoryMovement.find({ product: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("actor", "name email")
      .lean();
    res.json(items);
  } catch {
    return res.status(400).json({ error: "Unable to load inventory history" });
  }
});
api.get("/admin/audit", auth, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1),
      limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit || "50", 10) || 50),
      ),
      [items, total] = await Promise.all([
        AdminAudit.find()
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("actor", "name email")
          .lean(),
        AdminAudit.countDocuments(),
      ]);
    res.json({ items, page, limit, total });
  } catch {
    return res.status(400).json({ error: "Unable to load audit activity" });
  }
});
api.get("/admin/settings/status", auth, admin, async (req, res) =>
  res.json({
    mongodb: mongoose.connection.readyState === 1,
    cloudinary: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
    ),
    razorpay: Boolean(
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_WEBHOOK_SECRET,
    ),
    email: Boolean(
      process.env.EMAIL_ENABLED === "true" &&
      process.env.GMAIL_USER &&
      process.env.GMAIL_APP_PASSWORD,
    ),
  }),
);
api.get("/admin/newsletter", auth, admin, async (req, res) =>
  res.json(
    await NewsletterSubscriber.find()
      .sort({ createdAt: -1 })
      .select("email consentedAt subscribed createdAt"),
  ),
);
api.post("/admin/cloudinary/sign", auth, admin, async (req, res) => {
  try {
    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
      apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim(),
      apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
    if (!cloudName || !apiKey || !apiSecret)
      return res.status(503).json({ error: "Cloudinary is not configured" });
    const { v2: c } = await import("cloudinary");
    c.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const timestamp = Math.floor(Date.now() / 1000),
      folder = "vimuhet/products",
      allowed_formats = "jpg,png,webp",
      max_file_size = 8000000;
    const stringToSign = `allowed_formats=${allowed_formats}&folder=${folder}&timestamp=${timestamp}`,
      signature = crypto
        .createHash("sha256")
        .update(`${stringToSign}${apiSecret}`, "utf8")
        .digest("hex");
    res.json({
      timestamp,
      folder,
      allowed_formats,
      max_file_size,
      signature,
      apiKey,
      cloudName,
    });
  } catch {
    return res.status(500).json({ error: "Unable to create upload signature" });
  }
});
api.get("/admin/categories", auth, admin, async (req, res) =>
  res.json(await Category.find().sort({ displayOrder: 1, name: 1 }).lean()),
);
api.post("/admin/categories", auth, admin, async (req, res) => {
  try {
    const c = await Category.create({
      name: req.body.name,
      slug: req.body.slug || slugify(req.body.name),
      description: req.body.description,
      image: req.body.image,
      bannerImage: req.body.bannerImage,
      active: req.body.active ?? true,
      displayOrder: Number(req.body.displayOrder) || 0,
      seoTitle: req.body.seoTitle,
      seoDescription: req.body.seoDescription,
    });
    await writeAudit(
      req.user.id,
      "category.create",
      "Category",
      c._id,
      `Created category ${c.name}`,
    );
    res.status(201).json(c);
  } catch {
    return res.status(400).json({ error: "Invalid or duplicate category" });
  }
});
api.patch("/admin/categories/:id", auth, admin, async (req, res) => {
  try {
    const allowed = [
        "name",
        "slug",
        "description",
        "image",
        "bannerImage",
        "active",
        "displayOrder",
        "seoTitle",
        "seoDescription",
        "featuredProductIds",
      ],
      data = Object.fromEntries(
        Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)),
      );
    if (data.name && !data.slug) data.slug = slugify(data.name);
    const c = await Category.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!c) return res.sendStatus(404);
    await writeAudit(
      req.user.id,
      "category.update",
      "Category",
      c._id,
      `Updated category ${c.name}`,
    );
    res.json(c);
  } catch {
    return res.status(400).json({ error: "Invalid category" });
  }
});
api.get("/admin/products", auth, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1),
      limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit || "25", 10) || 25),
      ),
      filter = {},
      search = String(req.query.search || "").trim();
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: new RegExp(safe, "i") },
        { sku: new RegExp(safe, "i") },
        { category: new RegExp(safe, "i") },
      ];
    }
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status === "published") filter.published = true;
    else if (req.query.status === "draft")
      filter.$and = [{ published: false }, { status: { $ne: "archived" } }];
    else if (req.query.status === "archived") filter.status = "archived";
    const sort = req.query.sort === "price" ? { price: 1 } : { createdAt: -1 },
      [items, total] = await Promise.all([
        Product.find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
      ]);
    res.json({ items, page, limit, total });
  } catch {
    return res.status(400).json({ error: "Unable to load products" });
  }
});
api.post("/admin/products", auth, admin, async (req, res) => {
  try {
    const d = req.body || {};
    if (d.variants !== undefined) {
      if (!Array.isArray(d.variants) || d.variants.length > 100)
        return res
          .status(400)
          .json({ error: "Variants must be a list of at most 100 entries" });
      const seen = new Set();
      for (const v of d.variants) {
        const size = String(v.size || "").trim(),
          color = String(v.color || "").trim(),
          stock = Number(v.stock),
          key = `${size.toLowerCase()}|${color.toLowerCase()}`;
        if (
          !size ||
          !color ||
          !Number.isInteger(stock) ||
          stock < 0 ||
          seen.has(key)
        )
          return res.status(400).json({
            error:
              "Each variant needs a unique size/color pair and non-negative whole-number stock",
          });
        seen.add(key);
        v.size = size;
        v.color = color;
        v.stock = stock;
        v.sku =
          String(v.sku || "")
            .trim()
            .toUpperCase() || undefined;
      }
      if (d.variants.length) {
        d.sizes = [...new Set(d.variants.map((v) => v.size))];
        d.colors = [...new Set(d.variants.map((v) => v.color))];
        d.stock = d.variants.reduce((n, v) => n + v.stock, 0);
      }
    }
    if (
      typeof d.name !== "string" ||
      !d.name.trim() ||
      typeof d.category !== "string" ||
      !d.category.trim() ||
      !Number.isFinite(Number(d.price)) ||
      Number(d.price) < 0 ||
      !Number.isInteger(Number(d.stock)) ||
      Number(d.stock) < 0
    )
      return res.status(400).json({
        error:
          "Name, category, non-negative price and whole-number stock are required",
      });
    if (
      d.salePrice != null &&
      (Number(d.salePrice) < 0 || Number(d.salePrice) > Number(d.price))
    )
      return res.status(400).json({
        error: "Sale price must be between zero and the regular price",
      });
    const saleStart = d.saleStartsAt ? new Date(d.saleStartsAt) : null,
      saleEnd = d.saleEndsAt ? new Date(d.saleEndsAt) : null;
    if (
      (saleStart && Number.isNaN(saleStart.getTime())) ||
      (saleEnd && Number.isNaN(saleEnd.getTime())) ||
      (saleStart && saleEnd && saleEnd <= saleStart)
    )
      return res.status(400).json({
        error: "Sale dates must be valid and the end must follow the start",
      });
    const data = {
      ...d,
      name: d.name.trim(),
      collectionName: d.collectionName || d.collection,
      sku: String(d.sku || "").trim() || undefined,
      price: Number(d.price),
      stock: Number(d.stock),
      slug: d.slug || slugify(d.name),
      status: d.status || (d.published ? "published" : "draft"),
      published: d.status ? d.status === "published" : Boolean(d.published),
    };
    delete data.collection;
    const product = await Product.create(data);
    await writeAudit(
      req.user.id,
      "product.create",
      "Product",
      product._id,
      `Created product ${product.name}`,
    );
    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({
      error:
        e.code === 11000
          ? "Product slug or SKU already exists"
          : "Invalid product",
    });
  }
});
api.patch("/admin/products/:id", auth, admin, async (req, res) => {
  try {
    const allowed = [
        "name",
        "slug",
        "sku",
        "shortDescription",
        "description",
        "category",
        "collection",
        "collectionName",
        "productType",
        "images",
        "price",
        "salePrice",
        "saleStartsAt",
        "saleEndsAt",
        "sizes",
        "colors",
        "lowStockThreshold",
        "material",
        "fabric",
        "fit",
        "style",
        "care",
        "sizeGuide",
        "shippingWeight",
        "featured",
        "published",
        "status",
        "seoTitle",
        "seoDescription",
      ],
      data = Object.fromEntries(
        Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)),
      );
    if (data.collection && !data.collectionName)
      data.collectionName = data.collection;
    delete data.collection;
    if (data.sku !== undefined) {
      const sku = String(data.sku || "").trim();
      if (sku) data.sku = sku;
      else delete data.sku;
    }
    if (data.name && !data.slug) data.slug = slugify(data.name);
    if (data.status === "published") data.published = true;
    else if (data.status === "draft" || data.status === "archived")
      data.published = false;
    else if (data.published != null)
      data.status = data.published ? "published" : "draft";
    if (data.status === "archived") data.archivedAt = new Date();
    else if (data.status === "published" || data.status === "draft")
      data.archivedAt = null;
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.sendStatus(404);
    if (
      data.price != null &&
      (!Number.isFinite(Number(data.price)) || Number(data.price) < 0)
    )
      return res.status(400).json({ error: "Invalid product price" });
    const finalPrice = data.price == null ? existing.price : Number(data.price),
      finalSale =
        data.salePrice === null
          ? null
          : data.salePrice == null
            ? existing.salePrice
            : Number(data.salePrice);
    if (finalSale != null && (finalSale < 0 || finalSale > finalPrice))
      return res.status(400).json({
        error: "Sale price must be between zero and the regular price",
      });
    const startValue =
        data.saleStartsAt === null
          ? null
          : data.saleStartsAt == null
            ? existing.saleStartsAt
            : data.saleStartsAt,
      endValue =
        data.saleEndsAt === null
          ? null
          : data.saleEndsAt == null
            ? existing.saleEndsAt
            : data.saleEndsAt,
      saleStart = startValue ? new Date(startValue) : null,
      saleEnd = endValue ? new Date(endValue) : null;
    if (
      (saleStart && Number.isNaN(saleStart.getTime())) ||
      (saleEnd && Number.isNaN(saleEnd.getTime())) ||
      (saleStart && saleEnd && saleEnd <= saleStart)
    )
      return res.status(400).json({
        error: "Sale dates must be valid and the end must follow the start",
      });
    if (
      data.stock != null &&
      (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0)
    )
      return res
        .status(400)
        .json({ error: "Stock must be a non-negative whole number" });
    if (
      data.salePrice != null &&
      data.price != null &&
      Number(data.salePrice) > Number(data.price)
    )
      return res
        .status(400)
        .json({ error: "Sale price cannot exceed regular price" });
    const p = await Product.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!p) return res.sendStatus(404);
    await writeAudit(
      req.user.id,
      "product.update",
      "Product",
      p._id,
      `Updated product ${p.name}`,
    );
    res.json(p);
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 400).json({
      error:
        e.code === 11000
          ? "Product SKU or slug already exists"
          : "Invalid product",
    });
  }
});
api.delete("/admin/products/:id", auth, admin, async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.sendStatus(404);
    if (await Order.exists({ "items.product": p._id }))
      return res.status(409).json({
        error:
          "Product is referenced by order history. Archive it instead of deleting.",
      });
    await Product.deleteOne({ _id: p._id });
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const { v2: c } = await import("cloudinary");
      c.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      for (const i of p.images || [])
        if (i.publicId) {
          const usedByProduct = await Product.exists({
              _id: { $ne: p._id },
              "images.publicId": i.publicId,
            }),
            usedByCategory = await Category.exists({
              $or: [
                { "image.publicId": i.publicId },
                { "bannerImage.publicId": i.publicId },
              ],
            }),
            usedByOrder = i.url
              ? await Order.exists({ "items.image": i.url })
              : false;
          if (!usedByProduct && !usedByCategory && !usedByOrder)
            await c.uploader.destroy(i.publicId).catch(console.error);
        }
    }
    await writeAudit(
      req.user.id,
      "product.delete",
      "Product",
      p._id,
      `Deleted product ${p.name}`,
    );
    res.sendStatus(204);
  } catch {
    return res.status(400).json({ error: "Unable to delete product" });
  }
});
api.post("/admin/orders/:id/refund", auth, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.sendStatus(404);
    if (order.paymentStatus !== "paid" || !order.razorpayPaymentId)
      return res
        .status(409)
        .json({ error: "Only captured payments can be refunded" });
    if (order.refundStatus === "pending" || order.refundStatus === "processed")
      return res.json(order);
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: "paid", refundStatus: "none" },
      { $set: { refundStatus: "pending" } },
      { new: true },
    );
    if (!claimed)
      return res.status(409).json({
        error:
          "A refund request is already in progress or the order changed; reconcile before retrying",
      });
    const rz = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const refund = await rz.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(order.total * 100),
      notes: {
        orderNumber: order.number,
        reason: String(req.body.reason || "Customer request").slice(0, 200),
      },
    });
    order.refundId = refund.id;
    order.refundStatus =
      refund.status === "processed" ? "processed" : "pending";
    if (order.refundStatus === "processed") order.paymentStatus = "refunded";
    await order.save();
    await writeAudit(
      req.user.id,
      "order.refund.request",
      "Order",
      order._id,
      `Full refund requested for order ${order.number}`,
    );
    return res.json(order);
  } catch (e) {
    return res.status(502).json({
      error:
        "Refund request could not be confirmed; reconcile with Razorpay before retrying",
    });
  }
});
api.get("/admin/orders", auth, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1),
      limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit || "25", 10) || 25),
      ),
      filter = {},
      search = String(req.query.search || "").trim();
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { number: new RegExp(safe, "i") },
        { email: new RegExp(safe, "i") },
      ];
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const end = new Date(req.query.to);
        end.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  } catch {
    return res.status(400).json({ error: "Unable to load orders" });
  }
});
api.get("/admin/orders/:id", auth, admin, async (req, res) => {
  try {
    const o = await Order.findById(req.params.id)
      .populate("user", "name email")
      .lean();
    o ? res.json(o) : res.sendStatus(404);
  } catch {
    return res.status(400).json({ error: "Unable to load order" });
  }
});
api.post("/admin/orders/:id/notes", auth, admin, async (req, res) => {
  const note = String(req.body.note || "").trim();
  if (note.length < 2 || note.length > 1000)
    return res.status(400).json({ error: "Note must be 2–1,000 characters" });
  try {
    const o = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          adminNotes: { actor: req.user.id, note, createdAt: new Date() },
        },
      },
      { new: true },
    );
    if (!o) return res.sendStatus(404);
    await writeAudit(
      req.user.id,
      "order.note",
      "Order",
      o._id,
      "Added an internal order note",
    );
    res.json({ id: o._id, adminNotes: o.adminNotes });
  } catch {
    return res.status(400).json({ error: "Unable to save order note" });
  }
});
api.patch("/admin/orders/:id/shipping", auth, admin, async (req, res) => {
  const carrier = String(req.body.carrier || "")
      .trim()
      .slice(0, 120),
    trackingNumber = String(req.body.trackingNumber || "")
      .trim()
      .slice(0, 120),
    trackingUrl = String(req.body.trackingUrl || "")
      .trim()
      .slice(0, 1000);
  if (trackingUrl && !/^https:\/\//i.test(trackingUrl))
    return res.status(400).json({ error: "Tracking URL must use HTTPS" });
  try {
    const o = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { carrier, trackingNumber, trackingUrl } },
      { new: true, runValidators: true },
    );
    if (!o) return res.sendStatus(404);
    await writeAudit(
      req.user.id,
      "order.shipping.update",
      "Order",
      o._id,
      "Updated shipping tracking information",
    );
    res.json(o);
  } catch {
    return res.status(400).json({ error: "Unable to update shipping" });
  }
});
api.patch("/admin/orders/:id/status", auth, admin, async (req, res) => {
  const allowed = [
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  if (!allowed.includes(req.body.status))
    return res.status(400).json({ error: "Invalid status" });
  const o = await Order.findById(req.params.id);
  if (!o) return res.sendStatus(404);
  if (
    ["confirmed", "processing", "shipped", "delivered"].includes(
      req.body.status,
    ) &&
    o.paymentStatus !== "paid"
  )
    return res
      .status(409)
      .json({ error: "A paid and verified order is required for fulfillment" });
  const transitions = {
    pending_payment: ["cancelled"],
    confirmed: ["processing"],
    processing: ["shipped"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
    refunded: [],
  };
  if (!transitions[o.status]?.includes(req.body.status))
    return res.status(409).json({ error: "Invalid order status transition" });
  const fromStatus = o.status,
    updated = await Order.findOneAndUpdate(
      { _id: o._id, status: fromStatus, paymentStatus: o.paymentStatus },
      {
        $set: { status: req.body.status },
        $push: {
          statusHistory: {
            from: fromStatus,
            to: req.body.status,
            actor: req.user.id,
            at: new Date(),
          },
        },
      },
      { new: true },
    );
  if (!updated)
    return res.status(409).json({ error: "Order changed; refresh and retry" });
  if (updated.status === "cancelled") {
    await restoreReserved(updated.items);
    await releaseCouponReservation(updated);
  }
  sendOrder(updated.email, updated).catch(console.error);
  await writeAudit(
    req.user.id,
    "order.status.update",
    "Order",
    updated._id,
    `Changed order status from ${fromStatus} to ${updated.status}`,
  );
  res.json(updated);
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});
async function provisionAdminFromEnv() {
  const rawEmail = process.env.ADMIN_EMAIL,
    password = process.env.ADMIN_PASSWORD;
  if (!rawEmail && !password) return;
  if (!rawEmail || !password)
    throw Error(
      "Set both ADMIN_EMAIL and ADMIN_PASSWORD to provision the initial administrator",
    );
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error("ADMIN_EMAIL must be a valid email address");
  if (password.length < 14)
    throw Error("ADMIN_PASSWORD must be at least 14 characters");
  const configured = await User.findOne({ email }).select("role");
  if (configured) {
    if (configured.role !== "admin")
      throw Error(
        "ADMIN_EMAIL belongs to a non-admin account; refusing automatic role escalation",
      );
    console.log(
      "Configured administrator already exists; stored credentials were not changed",
    );
    return;
  }
  if (await User.exists({ role: "admin" })) {
    console.warn(
      "ADMIN_EMAIL was not provisioned because an administrator already exists",
    );
    return;
  }
  await User.create({
    name: process.env.ADMIN_NAME || "VIMUHET Admin",
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
  });
  console.log(
    `Initial administrator provisioned for ${email}; remove ADMIN_PASSWORD from the environment after setup`,
  );
}
const port = process.env.PORT || 5000;
if (process.env.MONGODB_URI) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error(
      "JWT_SECRET must be a unique random value of at least 32 characters",
    );
    process.exit(1);
  }
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      await provisionAdminFromEnv();
      setInterval(async () => {
        try {
          const expired = await Order.find({
            status: "pending_payment",
            reservationExpiresAt: { $lte: new Date() },
          }).limit(100);
          for (const candidate of expired) {
            const claimed = await Order.findOneAndUpdate(
              { _id: candidate._id, status: "pending_payment" },
              { $set: { status: "cancelled" } },
              { new: true },
            );
            if (claimed) {
              await restoreReserved(claimed.items);
              await releaseCouponReservation(claimed);
            }
          }
        } catch (e) {
          console.error("Inventory reservation expiry job failed");
        }
      }, 60_000);
      setInterval(
        () =>
          processAvailableStockAlerts().catch((e) =>
            console.error("Stock alert worker failed:", e.message),
          ),
        5 * 60_000,
      );
      setInterval(
        () =>
          processCartReminders().catch((e) =>
            console.error("Cart reminder worker failed:", e.message),
          ),
        60 * 60_000,
      );
      processAvailableStockAlerts().catch((e) =>
        console.error("Stock alert worker failed:", e.message),
      );
      processCartReminders().catch((e) =>
        console.error("Cart reminder worker failed:", e.message),
      );
      app.listen(port, "0.0.0.0", () => console.log(`VIMUHET API on ${port}`));
    })
    .catch((e) => {
      console.error("API startup failed:", e.message);
      process.exit(1);
    });
} else {
  app.listen(port, "0.0.0.0", () =>
    console.log(
      `VIMUHET API on ${port} (MongoDB not configured; DB routes unavailable)`,
    ),
  );
}
