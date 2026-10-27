import { chromium } from "playwright";

const base = "https://vimuhet-storefront.vercel.app";
const viewports = [
  [320, 568],
  [320, 640],
  [360, 740],
  [375, 812],
  [390, 844],
  [414, 896],
  [568, 320],
  [768, 1024],
  [1024, 768],
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [3440, 1440],
];
const routes = [
  "/",
  "/products",
  "/products/demo-modern-fusion-set",
  "/wishlist",
  "/cart",
  "/checkout",
  "/account",
  "/contact",
  "/faq",
  "/about",
  "/shipping-returns",
  "/order-lookup",
  "/admin",
];
const browser = await chromium.launch({ headless: true });
const results = [];
for (const [width, height] of viewports) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  for (const route of routes) {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    try {
      const response = await page.goto(base + route, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(550);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement,
          body = document.body;
        const w = window.innerWidth;
        const overflow = Math.max(doc.scrollWidth, body.scrollWidth) - w;
        const fixed = [...document.querySelectorAll("*")]
          .filter((el) => getComputedStyle(el).position === "fixed")
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              cls: el.className?.toString().slice(0, 90),
              x: Math.round(r.x),
              y: Math.round(r.y),
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
          .slice(0, 8)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              cls: el.className?.toString().slice(0, 90),
              left: Math.round(r.left),
              right: Math.round(r.right),
              w: Math.round(r.width),
            };
          });
        return {
          overflow,
          fixed,
          bad,
          bodyHeight: Math.round(body.getBoundingClientRect().height),
        };
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
  }
  await page.close();
}
await browser.close();
import { writeFile } from "node:fs/promises";
await writeFile("/home/user/audit-live.json", JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    results.filter(
      (r) => r.error || r.overflow > 1 || r.bad?.length || r.errors?.length,
    ),
    null,
    2,
  ),
);
