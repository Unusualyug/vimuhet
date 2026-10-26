# VIMUHET Admin Dashboard — Repository Audit & Phased Implementation Plan

## Audit performed before changes

- **Frontend:** React 18 + Vite, JavaScript/JSX, React Router 7, Framer Motion, Lucide; one main `App.jsx` with custom CSS. No Tailwind currently configured, so preserve this architecture and use the compatible existing CSS/motion stack.
- **Backend:** Express 4 REST API in `server/index.js`, Mongoose 8, dotenv, JWT/bcrypt, role-checking middleware, Express rate limits and Helmet.
- **Existing models:** `Product`, `Category`, `Order`, `User`, `PaymentEvent`, `NewsletterSubscriber`. Orders store line-item snapshots and separate `status`, `paymentStatus`, `refundStatus`; products have aggregate stock and image URL/public ID arrays.
- **Existing admin endpoints:** create/list/delete products; create/update categories; list orders; guarded order status transitions; full Razorpay refund request; signed Cloudinary upload; newsletter subscriber list. Admin middleware checks the database role, not just a client flag.
- **Existing integrations:** server-authoritative checkout, Razorpay verification/webhook idempotency, Cloudinary signed image upload, Nodemailer/Gmail helper. No configured MongoDB/Cloudinary/Razorpay/Gmail credentials are present in this workspace; live data and provider operations therefore cannot be exercised here.
- **Existing admin UI:** `/admin` has small metrics, product/category/order tabs, one-photo product create, category create, status updates, and refund button. No comprehensive dark admin shell yet.
- **Existing tests:** five Node tests cover auth token validation and payment-signature/webhook utilities. Build and server tests have been passing before this dashboard expansion.

## Progress snapshot (this iteration)

- **Implemented/extended:** dark responsive admin shell with all requested navigation labels and honest disabled states for unfinished areas; live aggregation endpoint and range filters; paginated product/category/inventory/order/customer/search/settings/audit APIs; admin dashboard, product create/edit/archive/CSV export, multi-image upload preview, category activation, aggregate stock adjustment ledger, order detail/tracking/internal notes/status history, customer summaries, newsletter consent list, integration status, and key-action audit writes.
- **Schema additions:** optional product SKU/collection/status/threshold/variant metadata; category banner/SEO/order/featured-product metadata; order discounts/tax/shipping tracking/admin notes/status history; new inventory movement and admin audit collections. Existing records remain readable; no destructive migration ran.
- **Still incomplete:** coupons, review moderation, support inbox storage, website CMS, transactional email delivery ledger/retry, granular staff roles/permissions, variant inventory migration/reconciliation tests, CSV import preview/validation, complete collections/category image UI, tax/shipping settings, invoice/legal configuration, and deeper analytics/export. Their sidebar pages explain unavailability rather than claiming features are live.
- **Verification constraints:** MongoDB is not configured here, so aggregations and write endpoints have not been exercised against real records. Visual verification uses mocked API responses only; provider operations remain unverified.

## Feature-to-implementation map

| Requested area | Existing baseline | Planned extension | Verification |
|---|---|---|---|
| Admin shell/navigation | Single `/admin` page | Dark responsive shell, sidebar/drawer, breadcrumbs, search/profile/notifications | Playwright at 320/375/430/768/1024/1440; keyboard checks |
| Dashboard | Basic count/revenue cards | Date-filtered aggregation endpoints, revenue/order trends, recent orders, stock/payment alerts; honest unavailable states | Unit tests for date boundaries/metric definitions; API aggregation tests |
| Products | Basic create/list/delete; simple schema | Search/filter/pagination; edit/draft/publish/archive; SKU, richer metadata, multi-image gallery/Cloudinary cleanup; import/export preview | Validation tests, upload failure tests, CSV parser tests |
| Categories/collections | Create/list/update API; add-only UI | Edit/archive/order, images/SEO/collections, featured products | CRUD and authorization tests |
| Inventory | Variant-aware size/color stock with atomic checkout reservations and order-line variant snapshots; admin variant creation and per-variant adjustments update both variant and aggregate stock | Backfill/reconciliation for legacy stock, variant ledger filtering, stronger concurrent MongoDB tests | Concurrent update/no-negative-stock tests; live database unavailable in this workspace |
| Orders/payments | List, constrained status update, server-verified payment, full refund | Search/date/status filters, order detail/timeline/notes, payment alerts, tracking/invoice where configured | Transition, duplicate webhook, refund and report tests |
| Customers | User model/auth only | Protected customer directory/detail, aggregate order stats, privacy-safe export | Role/privacy tests |
| Coupons/promotions | None | Coupon/campaign models and server-side checkout validation before use | Expiry, eligibility, use-limit/concurrency tests |
| Reviews/support | Contact mail only; no persistent inbox/reviews | Support ticket/review models, moderation and status workflow | Authorization/state tests |
| Website content | Static React content | Versioned CMS content and Cloudinary media endpoints; storefront reads published content | Preview/publication tests |
| Email/notifications | Existing SMTP helper, newsletter; no delivery ledger/retry queue | Email event log/outbox and admin visibility/retry, real event links | Idempotency/retry tests; SMTP sandbox required |
| Analytics/reports | No analytics endpoint | Aggregations from orders/products/customers with explicitly defined gross/discount/refund/net figures and CSV export | Metric calculation tests and date-filter tests |
| Settings/security/audit | `.env` integrations; JWT/admin middleware; env-based initial admin provisioning | Masked integration health, admin roles/permissions, audit trail and secure operational settings | Authorization/audit tests; no secret value returned |

## Implementation sequence

1. **Foundation:** responsive dark admin shell, route structure, loading/error/empty states, API helpers, design tokens; preserve storefront routes and checkout.
2. **Operational core:** dashboard, product/category management, inventory and order/payment management using existing models first; add backward-compatible fields and safe indexes only where necessary.
3. **Customer and communications:** customer directory, persistent support inbox, email status/outbox and retry controls.
4. **Growth/content:** coupons/promotions, reviews, homepage CMS, category/collection curation.
5. **Analytics/security:** report exports, roles/permissions, audit logging, integration status, accessibility and load checks.
6. **Production validation:** MongoDB migration/backfill review, Razorpay/Cloudinary/Gmail sandbox runs, e2e and concurrency tests, backup/restore drill.

## Constraints and non-fabrication rules

- Keep product/order/customer values data-backed; never insert demo records or invented prices, stock, cost, ratings, traffic, profit, or shipping claims.
- Keep payment decisions server-authoritative and preserve existing webhook/stock protections.
- Do not create a duplicate competing email/payment stack.
- Do not claim live integration or production readiness without credentials and verification.
- API changes must retain current route conventions and admin middleware. New fields must have safe defaults for existing MongoDB documents.

## Storefront improvements (user-selected items 1–9)

The user asked to start items 1–9; item 10 remains unspecified and is out of scope. Work is being delivered incrementally. **Current phase implemented:** variant-specific availability on product detail; checkout validates and reserves the selected size/color variant atomically with aggregate stock; order lines snapshot variant ID/SKU/size/color; cancellation, expiry, and reservation rollback restore the matching variant; admin product creation can define size/color/SKU/initial-stock rows; inventory has per-variant adjustments and records variant identity in the movement ledger; product detail supports color-tagged photo selection, accessible gallery zoom, and per-product size-guide content. Existing products without variant rows remain on aggregate stock. Admin product photo reorder/remove and per-photo color tagging are not yet available, so the color-photo selector works only for records whose image metadata already includes a color.

**Still queued across items 1–9:** product discovery suggestions/recently viewed/related/quick add/mobile filter refinement; delivery/returns clarity; order timeline/receipt/return requests; image reorder/remove, scheduled sales, SEO completion; coupon/review/support/CMS/email operations; deeper reports/exports; accessibility and consistent loading/error/confirmation polish. The phase is not complete.

**Validation this phase:** `npm run build --prefix client`, `node --check server/index.js`, and `npm test --prefix server` pass (8/8 tests). MongoDB remains disconnected; checkout reservation/cancellation and inventory writes have not been concurrency-tested against live MongoDB, and provider-backed workflows remain unverified.

## Storefront and product-operations increment (2026-10-25)

This follow-on continues the user-selected scope, not a completion of all requested work:

- Added debounced catalog product suggestions in the global search; a responsive native filter disclosure; quick-add with variant/stock checks; and recently viewed product IDs that are re-fetched from the live catalog, plus same-category recommendations.
- Order details now show tracking only when actual order tracking fields exist and can be printed/saved as a receipt. Paid eligible orders can submit cancellation-review or delivered-order return-review requests; admin staff can mark a request approved/rejected with a note. Review status does **not** automatically cancel, refund, or restock.
- Product admin form now edits gallery order, removes images from the product record, and sets per-image alt text/color tags. Removed Cloudinary assets are intentionally not deleted by this edit flow, avoiding accidental deletion where references may exist.
- Added sale start/end scheduling and SEO fields. Public product responses suppress inactive sale prices and checkout uses the same server-computed effective price.
- Shipping page now reflects the current coded fee (₹99 under ₹2,499; free at/above that threshold) and avoids asserting a delivery estimate. Merchant return eligibility/timeframes still need actual approved policy input.
- Checkout associates valid signed-in customers with new orders; guest access remains supported.

**Remaining:** persistent coupons/reviews/support inbox/CMS/email delivery/retry modules; report expansion/export; safe existing-stock migration/backfill; full return/cancellation policy and invoice/legal details; monitoring/backups/recovery; broad keyboard/screen-reader/contrast/UX sweep; real MongoDB/provider verification. No integration was exercised live because MongoDB and provider credentials are not configured in this workspace.

**Validation for this increment:** client production build passed; server syntax check passed; server suite passed 13/13; mocked Playwright mobile storefront smoke test covered search suggestions, filter disclosure, quick add, recently viewed/related products, with no JS errors or horizontal overflow. This is mocked UI coverage, not live database/provider validation.

## Customer-account and trust features increment (2026-10-25)

Implemented in this increment:

- Account holders can now create, edit, and remove up to ten validated saved delivery addresses. Checkout can prefill either the account's first saved address or an address selected from the account. Addresses remain account-private and are not exposed on storefront routes.
- Account order history remains tied to the signed-in account. A separate guest order lookup uses both the order number and the original 64-character guest access code; it does not expose lookup by email or order number alone. Guest access code is shown again on an accessed guest order.
- Wishlists can be shared by a product-slug link. The recipient sees only currently public catalog products; the share link contains no account identity. A signed-in wishlist remains browser-local at this stage, rather than being synced to the account.
- Added verified-purchase review submission: only a signed-in customer with a delivered, paid order containing the product can submit one review per product. All new reviews remain pending until staff publish or reject them. Public ratings and review totals are derived only from published reviews—no synthetic ratings are shown.
- Added signed-in product questions. Questions remain pending until a staff member provides an answer and publishes them. Admin **Reviews & support** now moderates reviews and product Q&A and audit-logs decisions. Contact-form messages are still email delivery only; a persistent support inbox remains separate follow-up work.
- Added a date-filtered, administrator-only sales-line CSV export from Analytics. It includes order state, current linked category where available, SKU/size/color variant data, quantities and financial fields. Category is labelled as current because the historical order snapshot does not yet retain category.

Still deliberately unimplemented pending operational choices or additional work: account-synced cart merge/recovery and consented reminder delivery; gift notes/wrapping (merchant offering, pricing and fulfillment rules required); stock-alert notification delivery (explicit notification consent plus working email provider required); coupons/gift cards/promotion rules; a stored support inbox; and a structured actual-measurement size-chart editor. Existing product-specific fit/material/care text and size-guide content stay available, but no measurements are invented.

Validation for this increment: server syntax check passed; server tests passed 15/15; client production build passed. Mocked Playwright coverage passed for saved-address display, shared wishlist display, guest order lookup, customer Q&A submission UI, review moderation UI, and CSV-export download action, with no page errors. MongoDB/provider integration remains untested because services are not configured.

## Promotions, gifting and account-cart increment (2026-10-25)

Merchant decisions recorded: VIMUHET offers **gift wrapping with an optional note for ₹99 per order**. Cart reminders are approved as a **single opt-in reminder after 48 hours**; size/color stock alerts are approved as **one alert per subscription**. The two email notification features remain disabled until their explicit-consent records, unsubscribe handling and SMTP delivery/retry work are implemented and tested; no reminder is being sent now.

Implemented now:

- Administrator coupon management: create/edit active rules with percentage or fixed-rupee discount, schedule, minimum merchandise subtotal, total redemption limit, per-customer completed-order limit, first-completed-order eligibility, and internal description. Codes are normalized and coupon writes are audit logged.
- Checkout passes only the code—not a discount or price—to the API. The server independently computes current product pricing, validates coupon eligibility, applies the bounded discount, reserves capacity for limited-use codes during a pending payment, and passes the server total to Razorpay. Coupon reservation is released when an unpaid order is cancelled or expires; captured payments consume it. This requires live database/payment lifecycle verification before launch.
- Analytics CSV export now protects spreadsheet cells from formula injection in addition to the existing administrator authorization and audit entry.
- Gift wrapping UI captures an optional note and shows the chosen ₹99 service; the server ignores browser pricing and snapshots the authoritative wrap fee/note on the order. Customer receipt and admin order detail display the recorded service.
- Signed-in saved bags now merge browser-local and account-persisted selections across devices. The backend rehydrates saved selections from live public products and current variant stock/pricing; checkout still revalidates all stock and prices.

Pending from the approved notification choices: opt-in UI and persistence for stock alerts/reminders, secure unsubscribe paths, SMTP outcome tracking/retries, stock-transition delivery worker and one-time delivery state. These cannot be represented as working customer notifications until SMTP/MongoDB are configured and live-tested.

Validation added: server tests passed 17/17; client build and server syntax check passed. Mocked Playwright checks passed for coupon creation/code submission, gift-wrap/note checkout payload and rendered fee, plus saved-bag merge and single debounced persistence request, with no page errors. These are not live MongoDB/Razorpay/SMTP tests.

## Razorpay payment-completion increment (2026-10-25)

Payment code has been hardened for configuration-driven use:

- Payment confirmation email is no longer sent when a pending order/Razorpay order is created; it is sent only after server-side capture confirmation.
- Added handling for browser-reported and webhook `payment.failed` events. An unpaid failed attempt is atomically moved to cancelled/failed, product stock is restored, and a reserved limited-use coupon is released. The shopper retains their bag and receives a new checkout attempt key.
- Added payment-attempt protection so a cancelled/failed idempotent order cannot be reopened accidentally. A fresh checkout creates a fresh payment attempt.
- A Razorpay order-creation API failure now cancels the just-created unpaid order and releases reserved stock/coupon before reporting that no payment was taken.
- Signed-in customers can cancel their own still-unpaid order; guest cancellation still requires its access code. Existing late-capture/refund and webhook idempotency safeguards remain.
- Documented the exact server-only Razorpay configuration, required webhook events, test-mode sequence and deployment prerequisites in `README.md`. Removed the unused Vite Razorpay-key variable from `client/.env.example`.

**Required before any real payment works:** a connected MongoDB database, `MONGODB_URI`, a 32+ character `JWT_SECRET`, exact `CLIENT_URL`, Razorpay key ID/secret, webhook secret, a public HTTPS API/webhook URL, and Razorpay merchant activation. Only the Razorpay key alone is not enough. No key or provider connection was supplied, so a live Razorpay test remains outstanding.

Validation: server syntax check passed, client production build passed, and server suite passed 17/17. A mocked Razorpay Checkout failure smoke test confirmed the browser reports `/payments/fail`, clears the stale idempotency attempt key, preserves the bag and produces no page error. This is not a live Razorpay or MongoDB transaction test.

## Consent-based notification increment (2026-10-25)

Implemented the user-approved notification rules:

- A customer can subscribe on an unavailable product selection for **one** email if that exact size/color returns to stock. Email is required and the stock-alert consent checkbox is required; duplicate active subscriptions are prevented. The subscription is marked sent before dispatch, and delivery failure/configuration absence reactivates it rather than falsely recording a sent alert. An email unsubscribe link changes only that alert to unsubscribed.
- Signed-in customers can explicitly enable or disable **one 48-hour saved-bag reminder** from Account. The reminder worker only selects consented accounts with a nonempty saved bag unchanged for at least 48 hours and no prior reminder for that saved-bag cycle. The email has its own direct unsubscribe link. Updating the saved bag starts a fresh 48-hour cycle; no message is sent without consent.
- With MongoDB connected, background workers check available stock every five minutes and eligible saved bags hourly. SMTP is used only when configured; if it is unavailable or sending fails, the delivery state is rolled back so a future configured worker can retry.

This is not yet an administrator email-delivery dashboard. Full message delivery log/search/manual retry UI remains a separate improvement, though actual one-time dispatch/retry-on-failure state is now implemented for these two notification types. MongoDB and SMTP must be configured and tested before these emails can operate in production.

Validation: client production build, server syntax check, and the 17 existing server tests passed. No live MongoDB or SMTP service was available for worker/delivery integration testing.
