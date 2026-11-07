# Vimuhet — Premium Ethnic Wear

Full-stack e-commerce application: React storefront + admin CMS, Express API, MongoDB.

This archive is the **complete source** of the application as delivered, including the full
audit report (`AUDIT-REPORT.md`) documenting every change made and how each was verified.

---

## What's inside

```
vimuhet/
├── AUDIT-REPORT.md          full audit, fixes and verification evidence
├── client/                  React 19 + Vite 8 storefront and admin panel
│   ├── public/              static assets served as-is (banners, product imagery)
│   └── src/
│       ├── components/      ui/ shop/ product/ admin/ consent/ whatsapp/
│       ├── context/         auth, cart, store, consent, theme, quick-view, ui
│       ├── layouts/         CustomerLayout, Header, Footer, AdminLayout
│       ├── pages/           shop/ admin/ auth/ account/ checkout/ info/
│       ├── services/        api client + endpoint definitions
│       ├── styles/          Tailwind 4 entry + design tokens
│       ├── constants/       WhatsApp config, sizes, sort options
│       └── utils/           image srcset builder, formatters, validators
└── server/                  Express 5 API
    ├── .env.example         copy to .env and adjust
    └── src/
        ├── config/          env, db, logger, mail, cloudinary, razorpay
        ├── controllers/     auth, catalog, cart, orders, payments, cms, admin
        ├── middleware/      auth, consent, rate limit, error, upload, validate
        ├── models/          Mongoose schemas
        ├── routes/          route definitions
        ├── seed/            demo catalogue + admin user
        ├── services/        pricing, e-invoice, mail, analytics
        ├── tests/           node:test integration suite
        └── webhooks/        Razorpay webhook handler
```

**Not included** (regenerate them, don't copy them): `node_modules/`, `client/dist/`,
`server/logs/`. See *Setup* below.

---

## Requirements

| | Version used |
|---|---|
| Node.js | 20.20.2 (18+ should work) |
| npm | 10+ |
| MongoDB | 7.0 (local, or an Atlas URI) |

---

## Setup

### 1. Database

Local MongoDB:

```bash
mongod --dbpath /path/to/data --port 27017
```

…or point `MONGODB_URI` at an Atlas cluster.

### 2. Server

```bash
cd server
npm install
cp .env.example .env      # then edit
npm run seed              # creates the admin user + demo catalogue
npm run dev               # http://localhost:5000
```

The `.env` shipped here is a working local-development config: the database URL points at
`127.0.0.1:27017`, and the JWT secrets are local dev strings. **Replace every secret and the
admin password before deploying anywhere public.** Payment and SMTP keys are intentionally
blank — with no Razorpay keys the checkout runs in its stub mode, and with no SMTP details mail
falls back to a console transport, so the app is fully usable without either.

### 3. Client

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:5000`; no client-side environment file is needed for
local development.

---

## Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@vimuhet.com` | `Admin@12345` |
| Customer | `riya@example.com` | `Customer@123` |

The admin panel lives at `/admin`.

---

## Scripts

**Client** (`client/`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR on :5173 |
| `npm run build` | production build to `dist/` |
| `npm run preview` | serve the built bundle on :4173 |
| `npm run lint` | oxlint (the project's linter — not ESLint) |

**Server** (`server/`)

| Command | What it does |
|---|---|
| `npm run dev` | nodemon with reload |
| `npm start` | plain `node src/server.js` |
| `npm run seed` | idempotent seed: admin user, categories, products, CMS content |
| `npm test` | integration suite (`node --test`) — **11/11 expected** |
| `npm run retention` | data-retention cleanup job |

---

## Things worth knowing before you edit

- **The WhatsApp number lives in one place:** `client/src/constants/whatsapp.js`
  (`WHATSAPP_NUMBER = '918140214051'`). The floating button, header chip and contact page all
  import it. The human-readable support phone is a CMS setting
  (`Admin → Settings → Support phone`), seeded from `server/src/seed/index.js`, and is used by
  the footer, contact page and admin invoice.
- **Linter is oxlint, not ESLint.** `npm run lint` in `client/`.
- **Dark mode is class-driven** (`html.dark`), set through `ThemeContext`.
- **Consent precedence:** `x-consent` header → `vimuhet_consent` cookie → deny-all. The cookie
  banner covers the hero, so any screenshot tooling must pre-set that key in `localStorage`.
- **API responses use an envelope:** `{ success, message, data, meta? }`.
- **Auth:** Bearer access token + httpOnly refresh cookie (`vimuhet_rt`). Tokens are kept under
  `vimuhet_token` / `vimuhet_admin_token`.
- **Images** go through `client/src/utils/format.js`, which builds `srcset`/`sizes` and switches
  to Cloudinary transformations automatically when a cloud name is configured.
- **`transition-all` is avoided** on purpose (performance); use named properties.

---

## Verification status at delivery

| Check | Result |
|---|---|
| Server integration tests | 11 / 11 |
| Functional browser suite (interactions, routes, admin) | 41 / 41 |
| Layout regression (13 routes × 4 viewports × 2 themes) | 0 overflow · 0 broken images · 0 console errors |
| Route sweep | 12 / 12 |
| WhatsApp behaviour | 32 / 32 |
| Phone-number integrity | 36 / 36 |
| Cookie consent | 33 / 33 |
| Lint (oxlint) | 0 errors |
| Production build | ✓ |

Full detail, measurements and methodology are in **`AUDIT-REPORT.md`**.
