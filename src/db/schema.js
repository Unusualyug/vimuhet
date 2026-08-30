import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * VIMUHET — schema (JavaScript / Drizzle ORM)
 *
 * products      -> catalogue items shown on the storefront
 * productClicks -> every "Buy on Amazon / Flipkart / Meesho" tap
 * siteVisits    -> storefront visit log (used by the admin analytics panel)
 * uploads       -> local fallback storage when Cloudinary keys are absent
 */

const emptyArray = sql`'[]'::jsonb`;

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    tagline: text("tagline").default(""),
    description: text("description").default(""),
    category: text("category").notNull().default("tshirts"),
    fabric: text("fabric").default(""),
    fit: text("fit").default("Regular"),
    care: text("care").default(""),
    images: jsonb("images").default(emptyArray).notNull(),
    sizes: jsonb("sizes").default(emptyArray).notNull(),
    colors: jsonb("colors").default(emptyArray).notNull(),
    links: jsonb("links").default(emptyArray).notNull(),
    price: integer("price").notNull().default(0),
    originalPrice: integer("original_price").default(0),
    badge: text("badge").default(""),
    rating: integer("rating").default(48),
    inStock: boolean("in_stock").default(true).notNull(),
    featured: boolean("featured").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    views: integer("views").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("products_category_idx").on(table.category)],
);

export const productClicks = pgTable(
  "product_clicks",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id"),
    productName: text("product_name").default(""),
    platform: text("platform").notNull().default("amazon"),
    price: integer("price").default(0).notNull(),
    sessionId: text("session_id").default(""),
    device: text("device").default(""),
    referrer: text("referrer").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("clicks_platform_idx").on(table.platform)],
);

export const siteVisits = pgTable(
  "site_visits",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").default("").notNull(),
    path: text("path").default("/").notNull(),
    device: text("device").default(""),
    referrer: text("referrer").default(""),
    country: text("country").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("visits_session_idx").on(table.sessionId)],
);

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  filename: text("filename").default("upload").notNull(),
  mime: text("mime").default("image/jpeg").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
