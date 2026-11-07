#!/usr/bin/env node
/**
 * Post-deploy verification for a Vimuhet deployment.
 *
 *   node verify-deploy.mjs https://vimuhet-api.onrender.com https://vimuhet-web.onrender.com
 *
 * Checks the things that silently break on Render: the bundle's API URL, CORS
 * agreeing with the refresh cookie, the refresh round-trip keeping you signed
 * in, and the SPA rewrite. Exits non-zero if anything fails.
 */

const [, , API_ARG, WEB_ARG] = process.argv;
if (!API_ARG) {
  console.error("Usage: node verify-deploy.mjs <api-url> [web-url]");
  console.error(
    "  api only : node verify-deploy.mjs https://vimuhet-api-prod.onrender.com",
  );
  console.error(
    "  full     : node verify-deploy.mjs https://vimuhet-api-prod.onrender.com https://vimuhet-web-prod.onrender.com",
  );
  process.exit(2);
}

const API = API_ARG.replace(/\/$/, "");
// With no web URL this runs the API half only — useful right after deploying the
// backend, before the static site exists.
const WEB = WEB_ARG ? WEB_ARG.replace(/\/$/, "") : null;
// CORS is checked against this origin. localhost:5173 is always trusted by the
// API, so it works before a real frontend exists.
const ORIGIN = WEB || "http://localhost:5173";
const CUSTOMER = { email: "riya@example.com", password: "Customer@123" };

let pass = 0;
const fails = [];
const ok = (cond, label, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  ok    ${label}${detail ? "  → " + detail : ""}`);
  } else {
    fails.push(label + (detail ? ` — ${detail}` : ""));
    console.log(`  FAIL  ${label}${detail ? "  → " + detail : ""}`);
  }
};

const j = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { res, body, text };
};

console.log(`\nAPI: ${API}\nWEB: ${WEB || "(not checked — API only)"}\n`);

/* ------------------------------------------------- 0. is the service up at all?
   A Render service that is suspended, paused, or never created answers with its
   own HTML and an x-render-routing header. Without this check every later group
   fails with confusing symptoms ("0 products", "not JSON") instead of the cause. */
const RENDER_ROUTING = {
  "suspend-by-user":
    "suspended or paused by its owner — open the service in the Render dashboard and click Resume",
  "service-not-found":
    "no Render service owns this hostname — check the name in the dashboard URL",
};
console.log("=== 0. Service availability ===");
for (const [label, base] of [["api", API], ...(WEB ? [["web", WEB]] : [])]) {
  try {
    const res = await fetch(`${base}/`, { redirect: "manual" });
    const routing = res.headers.get("x-render-routing");
    const html = (res.headers.get("content-type") || "").includes("text/html");
    if (routing) {
      fails.push(`${label} service is not reachable`);
      console.log(
        `  FAIL  ${label} ${res.status} · x-render-routing: ${routing}`,
      );
      console.log(
        `        → ${RENDER_ROUTING[routing] || "Render says this service is unavailable"}`,
      );
    } else if (label === "web" && !html) {
      fails.push(`${label} did not serve HTML`);
      console.log(
        `  FAIL  web served ${res.headers.get("content-type")} instead of HTML`,
      );
    } else {
      pass++;
      console.log(`  ok    ${label} reachable (${res.status})`);
    }
  } catch (e) {
    fails.push(`${label} unreachable`);
    console.log(`  FAIL  ${label} request failed — ${e.message}`);
  }
}

/* ---------------------------------------------------------------- 1. API up */
console.log("=== 1. API reachable ===");
{
  const t0 = Date.now();
  const { res, body } = await j(`${API}/api/health`);
  const ms = Date.now() - t0;
  ok(
    res.status === 200,
    "GET /api/health is 200",
    `${ms}ms${ms > 5000 ? "  (cold start)" : ""}`,
  );
  ok(body?.success === true, "health envelope is well formed");
}

/* ------------------------------------------------------- 2. API → MongoDB */
console.log("\n=== 2. Database reachable from the API ===");
{
  const { res, body } = await j(`${API}/api/products`);
  const items = body?.data?.products || body?.data || [];
  ok(res.status === 200, "GET /api/products is 200", `status ${res.status}`);
  ok(
    Array.isArray(items) && items.length > 0,
    "seeded catalogue is present",
    Array.isArray(items)
      ? `${items.length} products`
      : "no array — did you run npm run seed?",
  );
}

/* --------------------------------------------- 3. bundle points at the API */
if (WEB) {
  console.log("\n=== 3. Frontend bundle targets this API ===");
  {
    const home = await fetch(WEB + "/");
    ok(
      home.status === 200,
      "static site serves a page",
      `status ${home.status}`,
    );
    const html = await home.text();
    const chunkMatch = html.match(/assets\/endpoints-[A-Za-z0-9_-]+\.js/);
    if (!chunkMatch) {
      // A Vite dev server serves unbundled source; only a production build has hashed chunks.
      console.log(
        "  skip  entry chunk — no hashed bundle in index.html (dev server, or a build that predates VITE_API_BASE_URL)",
      );
    } else {
      ok(true, "entry chunk is referenced in index.html", chunkMatch[0]);
    }

    if (chunkMatch) {
      const chunk = await fetch(`${WEB}/${chunkMatch[0]}`);
      const src = await chunk.text();
      const baked =
        src.match(/https?:\/\/[a-z0-9.-]+\.onrender\.com\/api/i) ||
        src.match(/https?:\/\/[^"']+\/api/);
      const apiHost = API.replace(/^https?:\/\//, "");
      ok(
        Boolean(baked),
        "an absolute API URL is baked into the bundle",
        baked?.[0] || "none — VITE_API_BASE_URL not set at build time",
      );
      if (baked) {
        ok(
          baked[0].includes(apiHost),
          "baked URL points at this API",
          `${baked[0]} vs ${apiHost}`,
        );
        ok(
          /\/api$/.test(baked[0].replace(/["']/g, "")),
          "baked URL ends in /api",
        );
      }
    }
  }
} else {
  console.log("\n=== 3. Frontend bundle — skipped (no web URL given) ===");
}

/* ------------------------------------------------ 4. CORS + cookie agree */
console.log("\n=== 4. CORS and the refresh cookie agree ===");
let cookie = null;
{
  const { res, body } = await j(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify(CUSTOMER),
  });
  const acao = res.headers.get("access-control-allow-origin");
  const acac = res.headers.get("access-control-allow-credentials");
  const setCookie = res.headers.get("set-cookie") || "";

  ok(
    res.status === 200,
    "login succeeds",
    `status ${res.status}${res.status === 429 ? " (rate limited — wait 15 min)" : ""}`,
  );
  ok(Boolean(body?.data?.accessToken), "access token returned");
  ok(
    Boolean(acao),
    "Access-Control-Allow-Origin present",
    acao || "missing → FRONTEND_URL does not match " + ORIGIN,
  );
  ok(
    acao === ORIGIN || acao === "*",
    "Allow-Origin matches the caller origin",
    `${acao} vs ${ORIGIN}`,
  );
  ok(
    acac === "true",
    "Allow-Credentials is true (needed for the cookie)",
    acac || "missing",
  );

  const m = setCookie.match(/vimuhet_rt=([^;]+)/);
  cookie = m?.[1] || null;
  ok(
    Boolean(cookie),
    "refresh cookie set",
    cookie ? "vimuhet_rt present" : "not set",
  );
  ok(
    /Secure/i.test(setCookie),
    "cookie is Secure",
    /Secure/i.test(setCookie) ? "yes" : "no → NODE_ENV is not production",
  );
  ok(
    /SameSite=None/i.test(setCookie),
    "cookie is SameSite=None",
    /SameSite=None/i.test(setCookie)
      ? "yes"
      : `found "${setCookie.match(/SameSite=\w+/i)?.[0] || "none"}" → NODE_ENV is not production, cross-site session will die`,
  );
  ok(/HttpOnly/i.test(setCookie), "cookie is HttpOnly");
}

/* --------------------------------------- 5. refresh round-trip keeps you in */
console.log("\n=== 5. Session survives a refresh (the real test) ===");
if (cookie) {
  const { res, body } = await j(`${API}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      Cookie: `vimuhet_rt=${cookie}`,
    },
  });
  ok(
    res.status === 200,
    "POST /api/auth/refresh is 200",
    `status ${res.status}`,
  );
  ok(Boolean(body?.data?.accessToken), "refresh returns a fresh access token");
} else {
  ok(false, "refresh round-trip", "skipped — no cookie from step 4");
}

/* ------------------------------------------------------- 6. SPA rewrite */
if (WEB) {
  console.log("\n=== 6. SPA rewrite (deep links) ===");
  for (const route of ["/shop", "/admin/login", "/account/orders"]) {
    const r = await fetch(WEB + route);
    const text = r.status === 200 ? await r.text() : "";
    ok(
      r.status === 200 && /<div id="root"|<script/i.test(text),
      `${route} serves the app on a hard refresh`,
      r.status === 200
        ? "ok"
        : `status ${r.status} → add the /* → /index.html rewrite rule`,
    );
  }
} else {
  console.log("\n=== 6. SPA rewrite — skipped (no web URL given) ===");
}

/* ------------------------------------------- 7. CMS settings are correct */
console.log("\n=== 7. Contact details ===");
{
  const { res, body } = await j(`${API}/api/settings/public`);
  const flat = JSON.stringify(body || {});
  ok(res.status === 200, "public settings load", `status ${res.status}`);
  ok(
    flat.includes("918140214051"),
    "WhatsApp number is 918140214051",
    flat.includes("918140214051")
      ? ""
      : "seed/settings mismatch — check admin Settings",
  );
  ok(!flat.includes("9876543210"), "no placeholder 9876543210 anywhere");
}

console.log(`\n===== ${pass} passed, ${fails.length} failed =====`);
if (fails.length) {
  console.log("\nFAILURES:");
  fails.forEach((f) => console.log("  -", f));
  console.log(
    '\nMost failures trace back to DEPLOY-RENDER.md §"The things that actually break this deployment".',
  );
  process.exit(1);
}
if (WEB) {
  console.log(
    "\nDeployment verified. Sign in at",
    WEB + "/login",
    "and reload to confirm the session persists.",
  );
} else {
  console.log(
    "\nBackend verified. Next: create the static site, then re-run this with both URLs.",
  );
}
