# VIMUHET Complete Project

This folder is the complete VIMUHET MERN commerce project, including both the public storefront and the internal admin area.

## Public customer storefront
- `client/src/App.jsx` — home, catalog, product pages, cart, checkout, account, orders, wishlist, stock alerts, reviews, and all public routes.
- `client/src/style.css` — storefront styles.
- `client/public/assets/` — VIMUHET images and brand assets.

## Internal admin area
- `client/src/AdminConsole.jsx` — protected `/admin` operations interface.
- `client/src/admin.css` — admin-only styles.

## API and database
- `server/index.js` — Express API, authentication, checkout, Razorpay verification/webhooks, admin APIs, notifications, and workers.
- `server/models/` — database models.
- `server/services/` — pricing, email, and payment-security services.
- `server/test/` — automated tests.

See `README.md` for installation and environment setup.
