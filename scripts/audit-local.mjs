import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const base = "http://localhost:5173";
const viewports = [
  [320, 568],
  [320, 640],
  [360, 640],
  [360, 740],
  [375, 667],
  [375, 812],
  [390, 844],
  [393, 852],
  [412, 915],
  [414, 896],
  [430, 932],
  [440, 956],
  [568, 320],
  [640, 360],
  [740, 360],
  [844, 390],
  [932, 430],
  [600, 800],
  [768, 1024],
  [800, 1280],
  [960, 600],
  [1024, 768],
  [1180, 820],
  [1194, 834],
  [1024, 600],
  [1280, 720],
  [1280, 800],
  [1366, 768],
  [1366, 900],
  [1440, 900],
  [1536, 864],
  [1600, 900],
  [1680, 1050],
  [1920, 1080],
  [1920, 1200],
  [2560, 1080],
  [2560, 1440],
  [3440, 1440],
  [1280, 600],
  [1440, 650],
  [1024, 500],
  [800, 600],
  [390, 667],
];
const product = {
  _id: "demo-product-1",
  name: "Demo Modern Fusion Set",
  slug: "demo-modern-fusion-set",
  category: "Indo-Western",
  price: 3599,
  salePrice: null,
  stock: 10,
  sizes: ["S", "M", "L"],
  colors: ["Terracotta", "Sand"],
  description:
    "A clearly marked demo product for storefront layout validation.",
  material: "Demo fabric",
  care: "Demo care instruction — replace with verified garment care.",
  images: [
    {
      url: "/assets/categories/indo-western.webp",
      alt: "Demo modern fusion set",
      color: "Terracotta",
    },
    {
      url: "/assets/lookbook/everyday-edit.webp",
      alt: "Demo modern fusion set detail",
      color: "Sand",
    },
  ],
  variants: [
    { _id: "variant-1", size: "S", color: "Terracotta", stock: 4 },
    { _id: "variant-2", size: "M", color: "Terracotta", stock: 3 },
    { _id: "variant-3", size: "L", color: "Terracotta", stock: 3 },
  ],
  published: true,
};
const products = [
  product,
  {
    ...product,
    _id: "demo-product-2",
    name: "Demo Heritage Kurta",
    slug: "demo-heritage-kurta",
    category: "Ethnic Wear",
    price: 2199,
    stock: 4,
    images: [
      {
        url: "/assets/categories/ethnic-wear.webp",
        alt: "Demo heritage kurta",
      },
    ],
  },
  {
    ...product,
    _id: "demo-product-3",
    name: "Demo Sunset Layer",
    slug: "demo-sunset-layer",
    category: "Western Wear",
    price: 1899,
    stock: 0,
    images: [
      { url: "/assets/categories/western-wear.webp", alt: "Demo sunset layer" },
    ],
  },
  {
    ...product,
    _id: "demo-product-4",
    name: "Demo Everyday Co-ord",
    slug: "demo-everyday-co-ord",
    category: "Indo-Western",
    price: 2799,
    stock: 6,
    images: [
      {
        url: "/assets/lookbook/everyday-edit.webp",
        alt: "Demo everyday co-ord",
      },
    ],
  },
];
const categories = [
  {
    _id: "category-western",
    name: "Western Wear",
    image: { url: "/assets/categories/western-wear.webp" },
  },
  {
    _id: "category-ethnic",
    name: "Ethnic Wear",
    image: { url: "/assets/categories/ethnic-wear.webp" },
  },
  {
    _id: "category-indo",
    name: "Indo-Western",
    image: { url: "/assets/categories/indo-western.webp" },
  },
];
function response(url) {
  const path = url.pathname;
  if (path === "/api/categories") return categories;
  if (path === "/api/products") return products;
  if (path === "/api/products/demo-modern-fusion-set") return product;
  if (path.endsWith("/reviews"))
    return { items: [], summary: { count: 0, average: null } };
  if (path.endsWith("/questions")) return { items: [] };
  return {};
}
const routes = [
  "/",
  "/products",
  "/products/demo-modern-fusion-set",
  "/wishlist",
  "/cart",
  "/checkout",
  "/account",
  "/reset-password",
  "/contact",
  "/faq",
  "/about",
  "/shipping-returns",
  "/order-lookup",
  "/orders",
  "/orders/test-order",
  "/admin",
];
const browser = await chromium.launch({ headless: true });
const results = [];
for (const [width, height] of viewports) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.route("https://vimuhet-api.onrender.com/**", (route) => {
    const url = new URL(route.request().url());
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(response(url)),
    });
  });
  for (const route of routes) {
    const errors = [];
    const consoleListener = (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    };
    page.on("console", consoleListener);
    try {
      await page.addInitScript(
        (p) => {
          sessionStorage.setItem("vimuh-splash-seen", "1");
          localStorage.setItem("vimuh-cart", JSON.stringify([p]));
        },
        {
          productId: "demo-product-1",
          name: "Demo Modern Fusion Set",
          slug: "demo-modern-fusion-set",
          price: 3599,
          quantity: 1,
          stock: 10,
          size: "M",
          color: "Terracotta",
          image: "/assets/categories/indo-western.webp",
        },
      );
      const responseObj = await page.goto(base + route, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(250);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement,
          body = document.body,
          w = innerWidth,
          h = innerHeight;
        const overflow = Math.max(doc.scrollWidth, body.scrollWidth) - w;
        const fixed = [...document.querySelectorAll("body *")]
          .filter((el) => getComputedStyle(el).position === "fixed")
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              cls: String(el.className).slice(0, 80),
              left: Math.round(r.left),
              top: Math.round(r.top),
              right: Math.round(r.right),
              bottom: Math.round(r.bottom),
              w: Math.round(r.width),
              h: Math.round(r.height),
            };
          });
        const bad = [...document.querySelectorAll("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect(),
              s = getComputedStyle(el);
            if (
              s.display === "none" ||
              s.visibility === "hidden" ||
              r.width < 2 ||
              r.height < 2
            )
              return false;
            if (
              el.closest(
                ".circle-category-track,.ticker div,.search-suggestions",
              )
            )
              return false;
            return (
              (r.left < -2 || r.right > w + 2) &&
              !["hidden", "clip", "auto", "scroll"].includes(s.overflowX) &&
              !el.parentElement?.matches(".circle-category-row,.ticker")
            );
          })
          .slice(0, 10)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              cls: String(el.className).slice(0, 80),
              left: Math.round(r.left),
              right: Math.round(r.right),
              width: Math.round(r.width),
            };
          });
        const tinyButtons = [
          ...document.querySelectorAll("button,a,input,select,textarea"),
        ].filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.width > 0 && r.height > 0 && r.height < 32 && el.closest("main")
          );
        }).length;
        return {
          overflow,
          bad,
          fixed,
          tinyButtons,
          scrollHeight: doc.scrollHeight,
          viewHeight: h,
        };
      });
      results.push({
        width,
        height,
        route,
        status: responseObj?.status(),
        errors: [...new Set(errors)],
        ...metrics,
      });
    } catch (error) {
      results.push({ width, height, route, error: String(error) });
    }
    page.off("console", consoleListener);
  }
  await page.close();
}
await browser.close();
await writeFile(
  "/home/user/audit-local.json",
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify(
    {
      cases: results.length,
      issues: results.filter(
        (r) => r.error || r.overflow > 1 || r.bad?.length || r.errors?.length,
      ),
    },
    null,
    2,
  ),
);
