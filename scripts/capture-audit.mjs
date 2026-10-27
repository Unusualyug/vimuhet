import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const product = {
  _id: "demo-product-1",
  name: "Demo Modern Fusion Set",
  slug: "demo-modern-fusion-set",
  category: "Indo-Western",
  price: 3599,
  stock: 10,
  sizes: ["S", "M", "L"],
  colors: ["Terracotta", "Sand"],
  description:
    "A clearly marked demo product for storefront layout validation.",
  material: "Demo fabric",
  care: "Demo care",
  images: [
    {
      url: "/assets/categories/indo-western.webp",
      alt: "Demo Modern Fusion Set",
    },
    {
      url: "/assets/lookbook/everyday-edit.webp",
      alt: "Demo Modern Fusion Set detail",
    },
  ],
  variants: [{ _id: "v1", size: "S", color: "Terracotta", stock: 4 }],
};
const publicMock = (u) =>
  u.pathname === "/api/categories"
    ? [
        {
          _id: "c1",
          name: "Western Wear",
          image: { url: "/assets/categories/western-wear.webp" },
        },
        {
          _id: "c2",
          name: "Ethnic Wear",
          image: { url: "/assets/categories/ethnic-wear.webp" },
        },
        {
          _id: "c3",
          name: "Indo-Western",
          image: { url: "/assets/categories/indo-western.webp" },
        },
      ]
    : u.pathname.endsWith("/reviews")
      ? { items: [], summary: { count: 0, average: null } }
      : u.pathname.endsWith("/questions")
        ? { items: [] }
        : u.pathname === "/api/products"
          ? [
              product,
              {
                ...product,
                _id: "2",
                name: "Demo Heritage Kurta",
                slug: "demo-heritage-kurta",
                images: [{ url: "/assets/categories/ethnic-wear.webp" }],
              },
            ]
          : u.pathname.includes("demo-modern-fusion-set")
            ? product
            : {};
const adminMock = (u) =>
  u.pathname.endsWith("/dashboard")
    ? {
        metrics: {
          orders: 26,
          netRevenue: 74250,
          pendingOrders: 5,
          lowStockCount: 3,
        },
        salesByDay: [],
        recentOrders: [],
        lowStock: [],
        recentActivity: [],
      }
    : u.pathname.endsWith("/visitor-analytics")
      ? {
          metrics: {
            approximateUniqueBrowsers: 102,
            visits: 193,
            pageViews: 465,
            productViews: 173,
            addToBag: 42,
            checkoutStarts: 18,
          },
          pageViews: [],
          events: [],
        }
      : { items: [], total: 0 };
const caps = [
  ["public-landscape-640", "/", { width: 640, height: 360 }, false, "public"],
  [
    "product-mobile-390",
    "/products/demo-modern-fusion-set",
    { width: 390, height: 844 },
    false,
    "public",
  ],
  [
    "catalog-tablet-768",
    "/products",
    { width: 768, height: 1024 },
    false,
    "public",
  ],
  ["admin-mobile-390", "/admin", { width: 390, height: 844 }, false, "admin"],
  [
    "admin-desktop-1440",
    "/admin/analytics",
    { width: 1440, height: 900 },
    false,
    "admin",
  ],
];
for (const [name, path, viewport, full, kind] of caps) {
  const p = await b.newPage({ viewport });
  await p.addInitScript((kind) => {
    sessionStorage.setItem("vimuh-splash-seen", "1");
    if (kind === "admin") {
      localStorage.setItem("vimuh-token", "test-token");
      localStorage.setItem(
        "vimuh-user",
        JSON.stringify({
          role: "admin",
          name: "Audit Admin",
          email: "audit@example.invalid",
        }),
      );
    }
  }, kind);
  await p.route("https://vimuhet-api.onrender.com/**", (r) => {
    const u = new URL(r.request().url());
    const body = kind === "admin" ? adminMock(u) : publicMock(u);
    r.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });
  await p.goto("http://localhost:5173" + path, {
    waitUntil: "domcontentloaded",
  });
  await p.waitForTimeout(750);
  if (name === "admin-mobile-390") {
    await p.getByRole("button", { name: "Open menu" }).click();
    await p.waitForTimeout(350);
  }
  await p.screenshot({ path: "/home/user/" + name + ".png", fullPage: full });
  await p.close();
}
await b.close();
