# VIMUHET — animated clothing storefront + admin console

A two-interface website for the VIMUHET clothing label:

- **Storefront (public)** — animated marketing site + catalogue. Shoppers tap a product, land on a
  rich product page, and then jump straight into the **Amazon / Flipkart / Meesho / Myntra app**
  (native app deep-link on mobile, website on desktop).
- **Admin console (private)** — upload products with **multiple photos**, paste each marketplace URL
  with its own price, set original price vs current price, and watch **live visitor + click
  analytics**.

---

## Stack

| Layer | Technology |
| --- | --- |
| UI | **React 19** (JSX, no TypeScript) + Tailwind CSS v4 + Framer Motion |
| Server / API | **Node.js** — Next.js App Router route handlers (Express-style REST endpoints under `/api`) |
| Database | **PostgreSQL** via Drizzle ORM (`src/db/schema.js`) |
| Media | **Cloudinary** (`src/lib/cloudinary.js`) with automatic PostgreSQL fallback |

Everything is written in **JavaScript** — there are no `.ts` / `.tsx` files in the app code.

> The MERN mapping: **M**odels → `src/db/schema.js` (Drizzle tables), **E**xpress-style controllers →
> `src/app/api/**/route.js`, **R**eact views → `src/app` + `src/components`, **N**ode runtime →
> Next.js server. The platform provides PostgreSQL instead of MongoDB, so documents are stored as
> JSONB columns (`images`, `sizes`, `colors`, `links`) — the same shape a Mongo document would have.

---

## Features

### Storefront
- Animated preloader, scroll progress bar, drifting gradient blobs, grain, marquees.
- Kinetic hero with parallax product collage and animated counters.
- Category rail, trending grid (image cross-fade on hover + quick-buy pills per marketplace).
- 3-D tilt "Spotlight" product block with hover-zoom gallery.
- `/shop` with animated filter tabs, live search, sort and price slider.
- `/product/[slug]` — gallery with cursor zoom, size selector, discount maths, accordions, related
  products and a sticky mobile buy bar.
- **Buy buttons** track the click (`/api/track/click`) and then open the marketplace app/web.

### Admin console (`/admin`)
- Cookie-session login (`/admin/login`) — HMAC-signed token, `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
- Dashboard: total visitors, unique sessions, visits today/week, **marketplace clicks**, clicks
  today/week, CTR, product counts, 14-day traffic chart, clicks-by-marketplace bars, hourly visits,
  most-tapped products, live click stream. Auto-refreshes every 20 s.
- Products table: search, filter, live/hidden + featured toggles, delete, edit.
- Product form: **multi-photo upload** (drag & drop several files at once, progress bar, reorder,
  set cover, remove, paste URL), marketplace links + per-store price, current price vs original
  price (auto discount %), sizes, colours, badge, fit, fabric, care, visibility switches.

---

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | DB ping |
| GET | `/api/products` | Public catalogue (`category`, `q`, `sort`, `limit`) |
| POST | `/api/products` | Create product *(admin)* |
| GET/PUT/DELETE | `/api/products/:id` | Read / update (`{ patch }` for toggles) / delete *(admin)* |
| POST | `/api/admin/login` / `/api/admin/logout` | Session |
| GET | `/api/admin/stats` | Visitor + click analytics *(admin)* |
| POST | `/api/admin/upload` | Multi-file image upload → Cloudinary or DB *(admin)* |
| GET | `/api/uploads/:id` | Serve a DB-stored image |
| POST | `/api/track/visit` | Storefront visit (deduped per session/path per 30 min) |
| POST | `/api/track/click` | Marketplace button tap |

---

## Local development

```bash
npm install
npx drizzle-kit push     # create tables
npm run dev              # http://localhost:3000
```

The catalogue seeds itself (15 demo products) the first time the storefront renders on an empty
database. The admin dashboard also starts with 14 days of sample analytics so the charts are
readable; real visits and clicks accumulate on top of them.

**Admin login:** `admin` / `vimuhet@admin` (override with `ADMIN_USERNAME` / `ADMIN_PASSWORD`).

### Enabling Cloudinary
Fill `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env` and
restart — uploads move to Cloudinary automatically (the admin sidebar shows which mode is active).
