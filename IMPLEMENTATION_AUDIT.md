# VIMUHET repository audit and implementation status

## Audit performed
Inspected the repository tree and reviewed React/Vite app, stylesheet, package manifests, API routes, Mongoose models, auth middleware, email/payment helpers and environment templates. This is the newly created repository from earlier turns; the supplied workspace did not include any previous VIMUHET source or data, so no existing application behavior could be preserved or baseline-tested.

## Implemented in this iteration

- Replaced in-code sample product catalog with database-backed catalog, search/category/price/size/availability filtering and sorting; clear empty/loading/error behavior. Product detail pages have image gallery, size/color selections, stock, product info and size guide dialog. Added wishlist, About, Contact, FAQ and Shipping/Returns pages; contact submission uses the configured admin SMTP inbox.
- Persistent local bag and wishlist; cart totals, free-shipping threshold and guest checkout; checkout starts Razorpay only when configured, submits server-validated order, and uses order access code.
- Account registration/sign-in, one-time hashed password reset flow, account order history, guest order receipt and unpaid-order cancellation.
- Built a responsive dark Admin Studio at `/admin` with a 12-area sidebar, profile/logout, global authorized search, dark theme, reduced-motion page transitions and mobile drawer. Implemented live date-filtered dashboard aggregations (gross merchandise, discounts, captured/refunded/net collected, orders, customer count, low/out-of-stock, payment failures, trend, best sellers, recent records), product search/pagination/create/edit/archive/CSV export/multi-file signed Cloudinary upload previews, category creation/activation, reasoned atomic aggregate stock adjustments with inventory movement ledger, paginated order search/status/payment filters, order detail/tracking/internal notes/status history, customer directory/order history, newsletter consent list, integration health, and admin audit log. Added `InventoryMovement` and `AdminAudit` models and backward-compatible optional Product/Category/Order fields.
- Implemented protected reporting/customer/inventory/search/settings APIs, admin audit writes for key product/category/inventory/order operations, safe hard-delete refusal for order-referenced products, shared-image reference checks before Cloudinary deletion, paginated filtered API responses, explicit empty/error states, and env-based one-time admin provisioning. Existing environment admin credentials are hashed; existing admin records are not overwritten.
- Remaining modules are not complete: coupons and server checkout rules, review moderation, stored support inbox, website CMS, email delivery log/retry queue, granular staff roles, variant-level stock ledger, validated CSV import, full tax/shipping settings, complete collections/category image CMS, and broader reports/exports. These areas show explicit not-enabled status rather than fake controls or figures.
- Server-side authoritative prices, current-stock checks, conditional inventory decrement and expiry restoration; payment state held pending until verified, signature verification plus Razorpay payment status/amount fetch; raw-body webhook HMAC and event-ID persistence/deduplication; request idempotency key.
- Added optimized local WebP assets made from the user-supplied images, responsive desktop/mobile hero `<picture>`, responsive Cloudinary `srcSet` handling, image loading/error fallbacks and a page-use asset manifest. Contact sheet and text-overlay graphic intentionally excluded.
- Gmail SMTP helper with escaped HTML, text alternative, welcome/reset/order messages and order line variants/address. Explicit-consent newsletter subscriber model, confirmation mail and one-use unsubscribe token. Added bootstrap endpoint guarded by separate one-time secret and disabled after an administrator exists.
- Payment signature utility tests added.

## Verified in workspace

- `npm run build --prefix client`: passed after storefront changes.
- `node --check server/index.js`: passed after API changes.
- `npm test --prefix server`: 5 unit tests passed (auth token validation and Razorpay signature/raw body utilities).
- `npm audit --prefix server --omit=dev`: 0 vulnerabilities at time of check.
- No Atlas, Cloudinary, Razorpay, Gmail or deployment credentials provided. No live provider test was possible. Earlier health probe returned `db: disconnected`; live commerce is not verified.

## Visual review pass (latest)
- Reworked the landing page into a campaign-style hero, six circular category links, database-backed arrival cards, editorial lookbook/story sections, and the existing newsletter/footer.
- Updated desktop navigation to match the reference and added usable mobile search plus a bottom quick-navigation bar. Catalog filters now use a desktop sidebar that collapses on narrow screens. Styled profile/account, checkout progress, cart summary, admin metrics, and support pages within the ivory/beige/terracotta design system.
- Added responsive hero picture crops and Cloudinary `srcSet` where supported, lazy loading for below-fold photos, reduced-motion support, and small-screen-specific layout rules.
- Captured and reviewed desktop/mobile screenshots, then ran Playwright route/overflow checks across 16 routes at 320, 375, 430, 768, 1024 and 1440 px (96 viewport-route combinations). With mocked catalog/account fixtures, no horizontal overflow or page-level JS errors were found. Also exercised mobile search/menu and product-to-cart behavior. The configured real database remains disconnected, so these UI checks used mock responses for visual coverage and do not validate live data or payments.
- Production build and five server tests pass. Contact textarea styling and the homepage empty-catalog state were improved during review.

## Important outstanding launch risks

- No integration/e2e tests for orders, stock concurrency, failed/delayed/duplicate Razorpay events, refunds, access authorization, email failure/retry, admin or responsive browser flows.
- Reservation and order are not one MongoDB transaction; exact-once payment event side-effects and durable email outbox are not complete. Event-retry and partial failure reconciliation need production work.
- LocalStorage bearer token should move to secure httpOnly cookie sessions plus CSRF strategy; bootstrap must be access-restricted, rate-limited and removed/rotated immediately.
- Refund UX supports full admin-requested refund only; no partial refunds/customer refund lifecycle. Guest cancellation supports unpaid only.
- Admin’s current CMS, coupon/promotion, review/support inbox, email delivery log/retry, granular staff permissions, variant-level inventory, CSV import, complete analytics/report exports and category/collection image management are not implemented yet. Current metrics and directory features are basic and require a connected database for live verification.
- Newsletter form is visual only and does not collect consent; no tracking-number/courier fields or status email retry queue. Email verification and shipping notification remain missing.
- Size chart has no fabricated measurements and needs actual VIMUHET garment data.
- Replace stock/brand editorial Unsplash photography with owned/licensed assets. Legal policies/support address must be supplied by business.
- Deployment, Atlas backup restore, a11y audit, performance/load tests, Razorpay sandbox, SMTP, and Cloudinary upload/deletion all remain unverified.


## Follow-on storefront improvement phase (2026-10-25)

The user chose to start improvements 1–9. Current increment adds variant-level size/color stock from product creation through server-authoritative checkout reservation, order-line snapshots, cancellation/expiry restoration, and admin inventory adjustment. Product detail uses variant stock to label/disable unavailable size/color selections, switches to tagged photos when available, supports accessible image zoom, and renders an optional product-specific size guide. Legacy products without variants keep aggregate stock behavior. Admin can create variant rows and adjust their stock; existing variants are displayed read-only in product edit to avoid unsafe stock overwrites. Image color tags/reordering/removal, discovery features, post-purchase tools, operations modules, reports, accessibility sweep, and general UX polish remain queued.

Validation: storefront production build passed; server syntax check passed; server tests passed 10/10. The database is disconnected, so MongoDB atomic writes and full checkout/cancellation lifecycle are not yet verified with a database.

## Storefront/product-operations increment (2026-10-25)

Added debounced header search suggestions, a mobile-collapsible filter disclosure, quick add with variant stock checks, live-refetched recently viewed products and same-category recommendations. Order detail now shows actual tracking fields and printable order totals; customers can submit cancellation/return review requests for eligible paid order states, and admins can record an approved/rejected review note without triggering automatic cancellation/refund. Product administration now includes image reorder/remove/alt/color metadata, scheduled sale dates and SEO fields. Public catalog pricing suppresses inactive sales and checkout uses server-side effective pricing. Checkout now associates signed-in orders with the account. Shipping-page wording reflects the implemented ₹99/free-over-₹2,499 calculation and does not invent delivery estimates.

Validation: client production build passed; server syntax check passed; tests passed 13/13; mocked Playwright smoke passed for search suggestions, mobile filters, quick add, recent/related products and no horizontal overflow or page errors. MongoDB remains disconnected; no concurrency, integration provider, or real order lifecycle test was run. Existing aggregate stock has not been migrated to variants. Coupon/review/support/CMS/email modules, expanded reports, real policy/legal content, accessibility sweep, backups/monitoring/recovery, and live integration verification remain outstanding.

## Customer account, feedback and reporting increment (2026-10-25)

Implemented saved-address CRUD for signed-in accounts with checkout prefill; protected guest order lookup requiring the original high-entropy guest access code plus order number; and shareable public-product wishlist links without account identifiers. Added persistent `Review` and `ProductQuestion` models and APIs: reviews require the same signed-in account to have a delivered, paid purchase containing the product, are limited to one per product/customer, and remain pending until moderation; questions require sign-in and likewise remain pending. Only published reviews are exposed publicly, including the calculated rating summary, so there are no invented ratings. Admin support now moderates reviews/Q&A and writes audit entries.

Added Analytics CSV export for the selected reporting date range with order, product, current category (when product remains linked), SKU/size/color, quantity and financial columns. Download is protected by the existing administrator authorization and is audit logged.

Validation: `node --check server/index.js`, client production build, and 15/15 server tests passed. Mocked Playwright checks passed for account address rendering, shared wishlist display, guest order lookup, customer question submission, admin review moderation and analytics CSV download; no JavaScript page errors were observed. The checks do not constitute live MongoDB, SMTP, Razorpay or Cloudinary verification. MongoDB remains reported as disconnected.

Not yet implemented: account-synced saved carts/cart-recovery messaging; gift support; back-in-stock notification delivery; coupon/gift-card rules; stored support inbox; structured actual-measurement size charts; and broader requested operational/integration work. Merchant choices and consent/policy details are still required before enabling gifts or marketing/reminder notifications.

## Promotions, gifting and saved-bag increment (2026-10-25)

Merchant-selected gift wrapping is implemented as an optional ₹99 per-order service with an optional 500-character note. Fee and note are validated/snapshotted server-side, included in the payment total, and visible to the customer order receipt and authorized admin order view. Browser-side values cannot determine the actual fee.

Added a `Coupon` model and administrator coupon UI/API. Rules support percentage/fixed discounts, schedules, subtotal thresholds, redemption caps, per-customer completed-order caps and first-completed-order eligibility. Checkout obtains live product prices server-side and calculates the final discount/total there. Pending payment orders reserve limited coupon capacity; unpaid cancellation/expiry releases it; captured payment paths consume it. Coupon rules and CSV exports are audit logged. Sales CSV now additionally escapes formula-leading spreadsheet cells.

Added account-persisted saved bags. A signed-in browser merges local and saved selections, then syncs a compact product/variant/quantity representation. The API rehydrates the saved bag against current published product, variant stock and effective prices; it does not treat a saved bag as inventory reservation or a checkout price authority.

The merchant approved a single consented cart reminder after 48 hours and a one-time size/color stock alert. Delivery has **not** been implemented or claimed as active: consent/unsubscribe records, stock-alert model/worker, SMTP delivery/retries and live provider verification remain required. MongoDB remains disconnected, so coupon concurrency, reservation release/consumption, saved-bag persistence and all notification behavior need integration coverage before launch.

Validation: server syntax check, production client build and 17/17 server tests passed. Mocked Playwright verified coupon admin creation and checkout code forwarding, gift-wrap/note forwarding and fee display, and saved-bag merge/single persistence request; no page errors occurred.

## Razorpay payment-completion increment (2026-10-25)

Hardened the code-level Razorpay lifecycle: pending order creation no longer sends an order confirmation; confirmation is sent only after server-side signature plus captured-payment validation or a valid capture webhook. Browser-reported payment failure and Razorpay `payment.failed` webhook now void a still-pending order, restore stock, and release a limited-use coupon reservation. A Razorpay order-creation API error similarly voids the new unpaid order. Cancelled/failed idempotent attempts are explicitly rejected so a retry generates a fresh attempt. Signed-in ownership is accepted for an unpaid order cancellation; guests retain guest-code authorization.

The storefront still exposes only the Razorpay public key returned from the server for its server-created order. Server-side secret, webhook secret, product pricing, coupon calculation and captured-payment checks are retained. README now provides the required server-only variables and webhook event setup. `client/.env.example` no longer implies a frontend Razorpay key is needed.

Validation: syntax check, client production build and 17/17 server tests passed. A mocked Razorpay Checkout failure flow posted the failure report, removed its stale idempotency key, kept the bag, and raised no JavaScript error. No Razorpay account, webhook, MongoDB transaction, merchant onboarding or live test payment was available; live configuration and sandbox lifecycle testing remain mandatory before launch.

## Consent-based stock and cart notifications (2026-10-25)

Added `StockAlertSubscription` persistence, a product-detail opt-in form for an unavailable selected variant, variant-aware availability processing, one-time send state, failure reactivation, and direct per-alert unsubscribe. Added account-level cart-reminder consent, direct unsubscribe, and a worker selecting consented saved bags that remain unchanged for 48 hours. Both emails use the existing SMTP configuration and explicit consent; no email is sent merely because a cart exists. Worker delivery marks send state before dispatch and rolls it back on skipped/failed SMTP so it can retry when configured.

The notification system is code-complete but not live-verified: MongoDB is disconnected and SMTP credentials are not configured. No durable admin delivery-log/retry dashboard exists yet, so operational delivery observability remains outstanding. Client build, server syntax check, and 17/17 existing server tests passed after the implementation.
