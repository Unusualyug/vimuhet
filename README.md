# VIMUHET — MERN storefront

Responsive Indian-fashion storefront built with React/JSX, Vite, Framer Motion and Express/Mongoose. See `IMPLEMENTATION_AUDIT.md` for the honest scope and remaining launch blockers.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
cp server/.env.example server/.env
cp client/.env.example client/.env
# Fill server/.env. Leave VITE_API_URL empty for Vite's same-origin /api proxy.
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

Storefront: `http://localhost:5173`; API health: `http://localhost:5000/api/health`. MongoDB connection is required for product and order operations. The UI intentionally shows empty/loading/error states rather than fake merchandise; publish products/categories in the database before storefront shopping works.

## Optional local demo catalog

The project deliberately starts with no fictional merchandise. For a local visual preview, an explicit and reversible demo seed creates three categories and six clearly marked `Demo` products. It does not create customer accounts, orders, reviews, coupons, or payments, and it does not upload anything to Cloudinary.

From the project root in Git Bash, with MongoDB configured:

```sh
cd server
DEMO_CATALOG_CONFIRM=seed-vimuhet-demo npm run seed:demo
```

Refresh `http://localhost:5173/` and `http://localhost:5173/products`. The demo catalog uses the supplied local assets and records only product slugs beginning with `demo-`.

To remove only those demo products later:

```sh
cd server
DEMO_CATALOG_CONFIRM=remove-vimuhet-demo npm run remove:demo
```

The cleanup leaves your real products untouched. It only removes a demo category if the script itself created it.

## User-supplied visual asset integration

Optimized supplied images are organized under `client/public/assets/` and mapped in `client/public/assets/ASSET_MANIFEST.md`. The homepage now uses the supplied heritage-courtyard hero with a dedicated mobile crop, database-configured category labels with local category-image fallbacks, a supplied lookbook flat-lay, and a matching story image. The contact-sheet image and image with baked-in campaign text are deliberately not used. Product image samples are stored for admin upload, not inserted as fictitious products. Confirm licensing and catalog accuracy before commercial use.

## Current functionality

- Storefront home, database-backed category browsing, product search/category/price/size/availability filters, sorting, product detail galleries, size/color selection, material/care display, stock messaging, wishlist and local persistent bag.
- Guest checkout collects address and email, server prices from the product records, grants an unguessable order access code, reserves stock with conditional atomic updates, and launches Razorpay Checkout when configured. Server checks payment signature and independently fetches captured payment status/amount. Webhook signature check uses exact raw body; event IDs are stored and duplicates suppressed. Failed/expired/cancelled unpaid payment attempts restore inventory and release reserved limited-use coupons; a late capture after cancellation enters the refund path. Order email is issued only after a verified capture.
- Customer registration/login, generic password-reset response and hashed, one-use reset token email, protected order history; guest order receipt is accessible with the one-time access code.
- Admin-protected dark operations console at `/admin` with responsive navigation; live date-filtered dashboard aggregations; product search/pagination/create/edit/draft/publish/archive and CSV export; category add/visibility controls; aggregate stock adjustments with reasoned movement ledger; paginated/searchable order list, order detail, tracking and internal notes; customer directory/history; newsletter consent list; integration status; and an admin audit log. Product gallery uploads use signed Cloudinary URLs. API enforces admin role checks and paid-before-fulfillment transitions.
- Gmail SMTP branded HTML/text messages for welcome, reset, order/payment/status updates and consent-based newsletter confirmation. Newsletter consent and unsubscribe tokens are persisted; message failures do not undo an order and are currently logged rather than placed in a durable retry queue.
- Security utility tests for exact webhook-body HMAC, malformed signatures, and Razorpay checkout signature pairing.

## First administrator setup

The preferred setup uses environment credentials; do not hardcode administrator credentials in the client or source code.

1. Configure `MONGODB_URI` and a unique `JWT_SECRET` of at least 32 characters in `server/.env`.
2. Set `ADMIN_NAME` (optional), `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The password must be at least 14 characters. Keep it in a secret manager or local ignored `.env` file, never commit it.
3. On startup after MongoDB connects, the API creates the initial admin with a bcrypt-hashed password if no administrator exists. It does not change credentials for an existing admin, and it refuses to elevate an existing customer account. After successful provisioning, remove `ADMIN_PASSWORD` from the environment. For an existing account, use the password-reset flow rather than expecting environment changes to overwrite its password.

A one-time alternative is `POST /api/setup/bootstrap-admin`, guarded by `ADMIN_BOOTSTRAP_KEY`. Use it only from a trusted machine and remove/rotate the key immediately after success. It refuses bootstrap after an administrator already exists.

## External services

- **Atlas**: set `MONGODB_URI`; restrict network access and database roles, enable backups, and use production credentials only in the hosting secret manager.
- **Cloudinary**: set cloud name/key/secret server-side. Signed upload signatures are scoped to the product folder and accepted formats/size. Uploads use optimized URLs when supplied by Cloudinary. Never expose API secret.
- **Razorpay**: set test-mode `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a distinct `RAZORPAY_WEBHOOK_SECRET` in `server/.env`; do **not** add payment secrets to the Vite client environment. Configure HTTPS webhook `https://<api-domain>/api/payments/webhook` for `payment.captured`, `payment.failed`, and `refund.processed`. Test capture, failure, duplicate webhook, delayed capture and refund events before changing to live keys. Razorpay merchant activation/onboarding, a reachable HTTPS API and MongoDB are required to launch.
- **Gmail SMTP**: enable 2-Step Verification and create an App Password if allowed. Configure `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`, `EMAIL_ENABLED=true`. Do not use a normal Gmail password. Gmail limits apply; consider a transactional provider for higher volumes.
- `CLIENT_URL` must exactly match deployed site origin; frontend public config must contain no service secrets. Vite development uses a same-origin proxy to the API.

## Razorpay payment setup

Payment code is ready for a **sandbox test**, but credentials alone are not enough: MongoDB must be connected, the deployed API must be reachable by Razorpay over HTTPS, and the webhook must be configured.

1. Generate a unique `JWT_SECRET` (32+ characters) and set `MONGODB_URI`, `CLIENT_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in the server secret manager or `server/.env`. Use Razorpay **test-mode** credentials first.
2. Deploy the API and storefront. Set `CLIENT_URL` to the exact storefront origin; if API and storefront differ, set only public `VITE_API_URL` to the API `/api` base URL. Never set a Razorpay secret in the client.
3. In Razorpay Dashboard configure `https://<api-domain>/api/payments/webhook` and subscribe to `payment.captured`, `payment.failed`, and `refund.processed`; copy its webhook secret to `RAZORPAY_WEBHOOK_SECRET`.
4. Confirm `/api/health` reports `db: "connected"`, then perform test-mode success, failure, abandonment/expiry, duplicate webhook, late-capture/refund and refund-event checks. Only then use live keys.

The code deliberately treats browser checkout success as provisional: a payment is confirmed only after server signature validation plus a Razorpay API capture/amount/currency check or a valid webhook. No payment secret is required in frontend configuration.

## Checks

```sh
npm run build --prefix client
npm test --prefix server
npm audit --prefix server --omit=dev
```

External integrations require your own service credentials and sandbox tests. A successful local build or signature unit test does **not** prove Atlas, Cloudinary, Razorpay, SMTP, deliverability, or production operation.

## Explicit launch blockers / limitations

- No external service credentials were supplied in this workspace; Atlas, SMTP, Cloudinary, Razorpay and webhooks were not live-tested. The API health check previously reported database disconnected.
- Access tokens are kept in browser localStorage for account APIs; for a production deployment, prefer secure httpOnly sameSite cookies plus CSRF protection, stronger session revocation, and CSP.
- Payment event processing is idempotent for already processed event IDs, but the event/outbox workflow is not a durable exactly-once queue; crashes across provider/db/email side effects need reconciliation and retry tooling.
- Stock is decremented atomically and restored on reservation expiry/cancellation, but multi-document reservation/order creation is not wrapped in a MongoDB transaction. Add replica-set transaction semantics and reconciliation for partial failures before production.
- Guest checkout currently supports order lookup/cancellation via access code, but customer order history is account-only. Refund initiation is an admin full-refund request; partial refunds and richer cancellation/refund UX are not included.
- The admin console is an operational foundation, not the complete requested commerce-management suite. Customer directory and analytics are basic; inventory is product-level rather than variant-level. stored support inbox, storefront CMS, transactional email delivery logs/retry, granular admin roles/permissions, CSV import validation, sales tax/shipping configuration, full category/collection image/SEO editing, variant stock reconciliation, and several report/export workflows remain unimplemented. Category image upload is not exposed in the UI.
- Password reset is implemented, email verification is not. Newsletter is intentionally not wired or storing consent; the storefront should not claim subscription until this is added.
- Size guide currently presents size labels and advises checking the physical garment label; it does not invent body measurements. Add a brand-approved per-product size chart to catalog data.
- Confirm rights to the user-supplied campaign/product photography, and confirm that each future catalog photo depicts the actual item. Verify real pricing, and have the merchant provide/review final legal policies and support details.
- No production deployment, end-to-end UI tests, accessibility audit, load test, backup/restore drill, or full Razorpay sandbox suite has been performed. No claim of free production hosting is made; provider quotas, payment fees, verification and commercial terms vary.

Add demo catalog data
cd /d/vimuhet/vimuhet_1.2/server
DEMO_CATALOG_CONFIRM=seed-vimuhet-demo node scripts/seed-demo-catalog.js

Remove demo catalog data later
cd /d/vimuhet/vimuhet_1.2/server
DEMO_CATALOG_CONFIRM=remove-vimuhet-demo node scripts/remove-demo-catalog.js

app password: lkaeraudzcousfgc
