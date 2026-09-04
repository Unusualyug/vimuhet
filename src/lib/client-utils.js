// "use client";

// const KEY = "vimuhet_session_id";

// export function sessionId() {
//   if (typeof window === "undefined") return "";
//   try {
//     let id = window.localStorage.getItem(KEY);
//     if (!id) {
//       id = `s_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
//       window.localStorage.setItem(KEY, id);
//     }
//     return id;
//   } catch {
//     return "anon";
//   }
// }

// export function deviceType() {
//   if (typeof window === "undefined") return "";
//   if (/mobile|android|iphone/i.test(navigator.userAgent)) return "mobile";
//   if (/ipad|tablet/i.test(navigator.userAgent)) return "tablet";
//   return "desktop";
// }

// /** Logs a marketplace tap then hands the shopper over to Amazon / Flipkart / Meesho. */
// export function trackAndOpen({ product, platform, url, onDone }) {
//   const payload = JSON.stringify({
//     productId: product?.id,
//     productName: product?.name,
//     platform,
//     price: product?.price || 0,
//     sessionId: sessionId(),
//     referrer: typeof document !== "undefined" ? document.referrer : "",
//   });

//   try {
//     if (typeof navigator !== "undefined" && navigator.sendBeacon) {
//       const blob = new Blob([payload], { type: "application/json" });
//       navigator.sendBeacon("/api/track/click", blob);
//     } else {
//       fetch("/api/track/click", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: payload,
//         keepalive: true,
//       });
//     }
//   } catch {
//     /* never block the shopper */
//   }

//   onDone?.();

//   // Try the native app first, then fall back to the web store.
//   const isMobile = deviceType() === "mobile";
//   if (!isMobile || !url) {
//     window.open(url, "_blank", "noopener,noreferrer");
//     return;
//   }

//   const appMap = {
//     amazon: "com.amazon.mobile.shopping://www.amazon.in/",
//     flipkart: "flipkart://",
//     meesho: "meesho://home",
//     myntra: "myntra://",
//   };
//   const appUrl = appMap[platform];

//   if (!appUrl) {
//     window.open(url, "_blank", "noopener,noreferrer");
//     return;
//   }

//   let fellBack = false;
//   const fallback = () => {
//     if (fellBack) return;
//     fellBack = true;
//     window.open(url, "_blank", "noopener,noreferrer");
//   };
//   const timer = setTimeout(fallback, 1200);
//   const clear = () => {
//     clearTimeout(timer);
//     window.removeEventListener("pagehide", clear);
//     window.removeEventListener("blur", clear);
//   };
//   window.addEventListener("pagehide", clear);
//   window.addEventListener("blur", clear);

//   try {
//     window.location.href = appUrl;
//   } catch {
//     fallback();
//   }
// }

"use client";

/**
 * 1. SESSION & DEVICE HELPERS
 * Needed by VisitTracker.jsx and analytics
 */
export function sessionId() {
  if (typeof window === "undefined") return "";
  const key = "vimuhet_sid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID?.() || String(Date.now());
    localStorage.setItem(key, id);
  }
  return id;
}

export function deviceType() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * 2. AMAZON REDIRECT FIX
 * Strips junk to ensure Amazon App opens the product, not home page.
 */
export function cleanMarketplaceUrl(url, platform) {
  if (!url || typeof url !== "string") return "#";

  const raw = url.trim();
  const p = String(platform || "").toLowerCase();

  if (p === "amazon") {
    // Look for the 10-character Amazon ASIN
    const asinMatch = raw.match(
      /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i,
    );
    const asin = asinMatch ? asinMatch[1] : null;

    if (asin) {
      return `https://www.amazon.in/dp/${asin.toUpperCase()}`;
    }
  }

  if (p === "flipkart") {
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      const pid = u.searchParams.get("pid");
      const path = u.pathname.replace(/\/+$/, "");
      if (pid) return `https://www.flipkart.com${path}?pid=${pid}`;
      return `https://www.flipkart.com${path}`;
    } catch {
      return raw.split("?")[0];
    }
  }

  return raw;
}

/**
 * 3. TRACKING LOGIC
 */
export async function trackAndOpen({ product, platform, url }) {
  try {
    const finalUrl = cleanMarketplaceUrl(url, platform);

    await fetch("/api/track/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product?.id,
        productName: product?.name || "",
        platform,
        price: product?.price || 0,
        sessionId: sessionId(),
        device: deviceType(),
        referrer: typeof document !== "undefined" ? document.referrer : "",
        url: finalUrl,
      }),
      keepalive: true,
    });
  } catch (err) {
    console.error("Tracking failed", err);
  }
}
