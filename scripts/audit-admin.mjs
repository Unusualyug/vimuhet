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
const routes = [
  "/admin",
  "/admin/products",
  "/admin/categories",
  "/admin/inventory",
  "/admin/orders",
  "/admin/customers",
  "/admin/promotions",
  "/admin/support",
  "/admin/content",
  "/admin/email",
  "/admin/analytics",
  "/admin/settings",
  "/admin/security",
];
function mock(url) {
  const path = url.pathname;
  if (path.endsWith("/dashboard"))
    return {
      metrics: {},
      salesByDay: [],
      recentOrders: [],
      lowStock: [],
      recentActivity: [],
    };
  if (path.endsWith("/visitor-analytics"))
    return { metrics: {}, pageViews: [], events: [] };
  if (path.endsWith("/categories")) return [];
  if (path.endsWith("/products")) return { items: [], total: 0 };
  if (path.endsWith("/inventory")) return { items: [], total: 0 };
  if (path.endsWith("/orders")) return { items: [], total: 0 };
  if (path.endsWith("/customers")) return { items: [], total: 0 };
  if (path.endsWith("/coupons")) return { items: [], total: 0 };
  if (path.endsWith("/reviews") || path.endsWith("/questions"))
    return { items: [], total: 0 };
  if (path.endsWith("/newsletter/subscribers")) return { items: [], total: 0 };
  if (path.endsWith("/email/status")) return { enabled: false };
  if (path.endsWith("/audit")) return { items: [], total: 0 };
  return { items: [], total: 0 };
}
const browser = await chromium.launch({ headless: true });
const results = [];
for (const [width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript(() => {
    sessionStorage.setItem("vimuh-splash-seen", "1");
    localStorage.setItem("vimuh-token", "audit-admin-token");
    localStorage.setItem(
      "vimuh-user",
      JSON.stringify({
        _id: "audit-admin",
        name: "Audit Administrator",
        email: "audit@example.invalid",
        role: "admin",
      }),
    );
  });
  await page.route("https://vimuhet-api.onrender.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(mock(new URL(route.request().url()))),
    }),
  );
  for (const route of routes) {
    const errors = [];
    const listener = (m) => {
      if (m.type() === "error") errors.push(m.text());
    };
    page.on("console", listener);
    try {
      const response = await page.goto(base + route, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(350);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement,
          body = document.body,
          w = innerWidth;
        const overflow = Math.max(doc.scrollWidth, body.scrollWidth) - w;
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
            if (el.closest(".adm-table-wrap")) return false;
            return (
              (r.left < -2 || r.right > w + 2) &&
              !["hidden", "clip", "auto", "scroll"].includes(s.overflowX)
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
        const controls = [
          ...document.querySelectorAll("button,a,input,select,textarea"),
        ].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.height < 32;
        }).length;
        return { overflow, bad, controls };
      });
      results.push({
        width,
        height,
        route,
        status: response?.status(),
        errors: [...new Set(errors)],
        ...metrics,
      });
    } catch (error) {
      results.push({ width, height, route, error: String(error) });
    }
    page.off("console", listener);
  }
  await page.close();
}
await browser.close();
await writeFile(
  "/home/user/audit-admin.json",
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
