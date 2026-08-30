import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { productClicks, products, siteVisits } from "@/db/schema.js";
import { seedProducts } from "./seed-data.js";

const globalForStore = globalThis;

export function slugifyBase(value) {
  return String(value || "product")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
}

/** Creates tables when they are missing so the app is never broken by a fresh DB. */
export async function ensureSchema() {
  if (globalForStore.__vimuhetSchemaReady) return;
  await db.execute(sql`
    create table if not exists products (
      id serial primary key,
      name text not null,
      slug text not null unique,
      tagline text default '',
      description text default '',
      category text not null default 'tshirts',
      fabric text default '',
      fit text default 'Regular',
      care text default '',
      images jsonb not null default '[]'::jsonb,
      sizes jsonb not null default '[]'::jsonb,
      colors jsonb not null default '[]'::jsonb,
      links jsonb not null default '[]'::jsonb,
      price integer not null default 0,
      original_price integer default 0,
      badge text default '',
      rating integer default 48,
      in_stock boolean not null default true,
      featured boolean not null default false,
      active boolean not null default true,
      sort_order integer not null default 0,
      views integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
  await db.execute(sql`
    create table if not exists product_clicks (
      id serial primary key,
      product_id integer,
      product_name text default '',
      platform text not null default 'amazon',
      price integer not null default 0,
      session_id text default '',
      device text default '',
      referrer text default '',
      created_at timestamptz not null default now()
    )`);
  await db.execute(sql`
    create table if not exists site_visits (
      id serial primary key,
      session_id text not null default '',
      path text not null default '/',
      device text default '',
      referrer text default '',
      country text default '',
      created_at timestamptz not null default now()
    )`);
  await db.execute(sql`
    create table if not exists uploads (
      id serial primary key,
      filename text not null default 'upload',
      mime text not null default 'image/jpeg',
      data text not null,
      created_at timestamptz not null default now()
    )`);
  await db.execute(
    sql`create index if not exists products_category_idx on products (category)`,
  );
  await db.execute(
    sql`create index if not exists clicks_platform_idx on product_clicks (platform)`,
  );
  await db.execute(
    sql`create index if not exists visits_session_idx on site_visits (session_id)`,
  );
  globalForStore.__vimuhetSchemaReady = true;
}

export async function ensureSeed() {
  await ensureSchema();

  // Guard against concurrent callers (parallel RSC fetches, dev double-invocation, etc.)
  // all racing past the "is it empty" check before the first insert commits.
  if (globalForStore.__vimuhetSeedPromise) {
    return globalForStore.__vimuhetSeedPromise;
  }

  globalForStore.__vimuhetSeedPromise = (async () => {
    const rows = await db.select({ id: products.id }).from(products).limit(1);
    if (rows.length) return;
    // onConflictDoNothing makes this safe even if another request slips
    // a row in between the check above and this insert actually running.
    await db
      .insert(products)
      .values(seedProducts)
      .onConflictDoNothing({ target: products.slug });
  })();

  return globalForStore.__vimuhetSeedPromise;
}

function withDerived(row) {
  const links = Array.isArray(row.links) ? row.links : [];
  const prices = [row.price, ...links.map((l) => Number(l.price || 0))].filter(
    (n) => Number(n) > 0,
  );
  const original = Number(row.originalPrice || 0);
  const price = Number(row.price || 0);
  return {
    ...row,
    discount:
      original > price ? Math.round(((original - price) / original) * 100) : 0,
    bestPrice: prices.length ? Math.min(...prices) : price,
    platforms: links.map((l) => l.platform),
  };
}

export async function listProducts(options = {}) {
  await ensureSeed();
  const {
    category,
    q,
    sort = "featured",
    featured,
    limit,
    includeInactive = false,
  } = options;
  const filters = [];
  if (!includeInactive) filters.push(eq(products.active, true));
  if (category && category !== "all")
    filters.push(eq(products.category, category));
  if (typeof featured === "boolean")
    filters.push(eq(products.featured, featured));
  if (q) {
    filters.push(
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.tagline, `%${q}%`),
        ilike(products.description, `%${q}%`),
        ilike(products.category, `%${q}%`),
      ),
    );
  }

  const orderBy =
    sort === "price-low"
      ? [asc(products.price)]
      : sort === "price-high"
        ? [desc(products.price)]
        : sort === "newest"
          ? [desc(products.createdAt)]
          : sort === "discount"
            ? [
                desc(
                  sql`(${products.originalPrice} - ${products.price})::float / greatest(${products.originalPrice},1)`,
                ),
              ]
            : [asc(products.sortOrder), desc(products.createdAt)];

  const base = db.select().from(products);
  const query = filters.length ? base.where(and(...filters)) : base;
  const ordered = query.orderBy(...orderBy);
  const rows = limit ? await ordered.limit(limit) : await ordered;
  return rows.map(withDerived);
}

export async function getProductBySlug(slug, includeInactive = true) {
  await ensureSeed();
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return rows[0] ? withDerived(rows[0]) : null;
}

export async function getProductById(id) {
  await ensureSchema();
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.id, Number(id)))
    .limit(1);
  return rows[0] ? withDerived(rows[0]) : null;
}

export async function getRelated(product, limit = 4) {
  await ensureSeed();
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.active, true), ne(products.id, product.id)))
    .orderBy(asc(products.sortOrder))
    .limit(12);
  const sameCategory = rows.filter((r) => r.category === product.category);
  const rest = rows.filter((r) => r.category !== product.category);
  return [...sameCategory, ...rest].slice(0, limit).map(withDerived);
}

export async function bumpViews(id) {
  try {
    await db
      .update(products)
      .set({ views: sql`${products.views} + 1` })
      .where(eq(products.id, Number(id)));
  } catch {
    /* analytics must never break the page */
  }
}

export async function uniqueSlug(name, currentId) {
  const base = slugifyBase(name) || "product";
  let candidate = base;
  let n = 2;
  for (;;) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, candidate))
      .limit(1);
    if (!rows.length || (currentId && Number(rows[0].id) === Number(currentId)))
      return candidate;
    candidate = `${base}-${n++}`;
  }
}

export async function recordVisit(payload) {
  await ensureSchema();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const existing = await db
    .select({ id: siteVisits.id })
    .from(siteVisits)
    .where(
      and(
        eq(siteVisits.sessionId, String(payload.sessionId || "")),
        eq(siteVisits.path, String(payload.path || "/")),
        sql`${siteVisits.createdAt} > ${thirtyMinAgo}`,
      ),
    )
    .limit(1);
  if (existing.length) return { recorded: false };
  await db.insert(siteVisits).values({
    sessionId: String(payload.sessionId || "").slice(0, 80),
    path: String(payload.path || "/").slice(0, 200),
    device: String(payload.device || "").slice(0, 40),
    referrer: String(payload.referrer || "").slice(0, 300),
    country: String(payload.country || "").slice(0, 80),
  });
  return { recorded: true };
}

export async function recordClick(payload) {
  await ensureSchema();
  await db.insert(productClicks).values({
    productId: payload.productId ? Number(payload.productId) : null,
    productName: String(payload.productName || "").slice(0, 200),
    platform: String(payload.platform || "amazon").slice(0, 40),
    price: Number(payload.price || 0) || 0,
    sessionId: String(payload.sessionId || "").slice(0, 80),
    device: String(payload.device || "").slice(0, 40),
    referrer: String(payload.referrer || "").slice(0, 300),
  });
}

export async function getStats() {
  await ensureSchema();

  const totalsRes = await db.execute(sql`
    select
      (select count(*) from site_visits) as total_visits,
      (select count(distinct session_id) from site_visits) as unique_visitors,
      (select count(*) from site_visits where created_at >= current_date) as visits_today,
      (select count(*) from site_visits where created_at >= current_date - interval '7 days') as visits_week,
      (select count(*) from product_clicks) as total_clicks,
      (select count(*) from product_clicks where created_at >= current_date) as clicks_today,
      (select count(*) from product_clicks where created_at >= current_date - interval '7 days') as clicks_week,
      (select count(*) from products) as total_products,
      (select count(*) from products where active = true) as active_products,
      (select count(*) from products where featured = true) as featured_products
  `);
  const totals = (totalsRes.rows ? totalsRes.rows[0] : totalsRes[0]) || {};

  const seriesRes = await db.execute(sql`
    select to_char(d.day, 'DD Mon') as label,
      (select count(*) from site_visits v where date_trunc('day', v.created_at) = d.day) as visits,
      (select count(*) from product_clicks c where date_trunc('day', c.created_at) = d.day) as clicks
    from generate_series(
      date_trunc('day', now()) - interval '13 days',
      date_trunc('day', now()),
      interval '1 day'
    ) as d(day)
    order by d.day
  `);
  const series = seriesRes.rows || seriesRes || [];

  const platformRes = await db.execute(sql`
    select platform, count(*)::int as clicks
    from product_clicks
    group by platform
    order by clicks desc
  `);
  const byPlatform = platformRes.rows || platformRes || [];

  const topRes = await db.execute(sql`
    select p.id, p.name, p.slug, p.images, p.price, p.category,
      count(c.id)::int as clicks,
      coalesce(sum(case when c.created_at >= current_date then 1 else 0 end), 0)::int as clicks_today
    from products p
    left join product_clicks c on c.product_id = p.id
    group by p.id
    order by clicks desc, p.created_at desc
    limit 6
  `);
  const topProducts = topRes.rows || topRes || [];

  const recentRes = await db.execute(sql`
    select id, product_name, platform, price, created_at
    from product_clicks
    order by created_at desc
    limit 8
  `);
  const recentClicks = recentRes.rows || recentRes || [];

  const hourlyRes = await db.execute(sql`
    select to_char(d.hour, 'HH24') as label,
      (select count(*) from site_visits v where date_trunc('hour', v.created_at) = d.hour) as visits
    from generate_series(
      date_trunc('hour', now()) - interval '11 hours',
      date_trunc('hour', now()),
      interval '1 hour'
    ) as d(hour)
    order by d.hour
  `);
  const hourly = hourlyRes.rows || hourlyRes || [];

  const totalVisits = Number(totals.total_visits || 0);
  const totalClicks = Number(totals.total_clicks || 0);

  return {
    totals: {
      totalVisits,
      uniqueVisitors: Number(totals.unique_visitors || 0),
      visitsToday: Number(totals.visits_today || 0),
      visitsWeek: Number(totals.visits_week || 0),
      totalClicks,
      clicksToday: Number(totals.clicks_today || 0),
      clicksWeek: Number(totals.clicks_week || 0),
      totalProducts: Number(totals.total_products || 0),
      activeProducts: Number(totals.active_products || 0),
      featuredProducts: Number(totals.featured_products || 0),
      ctr: totalVisits
        ? Math.round((totalClicks / totalVisits) * 1000) / 10
        : 0,
    },
    series: series.map((r) => ({
      label: r.label,
      visits: Number(r.visits || 0),
      clicks: Number(r.clicks || 0),
    })),
    hourly: hourly.map((r) => ({
      label: r.label,
      visits: Number(r.visits || 0),
    })),
    byPlatform: byPlatform.map((r) => ({
      platform: r.platform,
      clicks: Number(r.clicks || 0),
    })),
    topProducts: topProducts.map((r) => ({
      id: Number(r.id),
      name: r.name,
      slug: r.slug,
      images: Array.isArray(r.images) ? r.images : [],
      price: Number(r.price || 0),
      category: r.category,
      clicks: Number(r.clicks || 0),
      clicksToday: Number(r.clicks_today || 0),
    })),
    recentClicks: recentClicks.map((r) => ({
      id: Number(r.id),
      productName: r.product_name,
      platform: r.platform,
      price: Number(r.price || 0),
      createdAt: r.created_at,
    })),
  };
}
