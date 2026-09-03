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

const KEY = "vimuhet_session_id";

export function sessionId() {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = `s_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function deviceType() {
  if (typeof window === "undefined") return "";
  if (/mobile|android|iphone/i.test(navigator.userAgent)) return "mobile";
  if (/ipad|tablet/i.test(navigator.userAgent)) return "tablet";
  return "desktop";
}

/** Automatically cleans Amazon links to standard /dp/ASIN format with affiliate tag */
export function cleanMarketplaceUrl(url = "", platform = "") {
  if (!url) return "#";

  if (platform === "amazon" || url.includes("amazon.")) {
    const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (asinMatch && asinMatch[1]) {
      return `https://www.amazon.in/dp/${asinMatch[1]}?tag=vimuhet-21`;
    }
  }

  return url;
}

/** Logs a marketplace tap then hands the shopper over to Amazon / Flipkart / Meesho. */
export function trackAndOpen({ product, platform, url, onDone }) {
  // 1. Clean the URL to ensure mobile deep-linking & affiliate tag work properly
  const cleanUrl = cleanMarketplaceUrl(url, platform);

  // 2. Prepare tracking payload
  const payload = JSON.stringify({
    productId: product?.id,
    productName: product?.name,
    platform,
    price: product?.price || 0,
    sessionId: sessionId(),
    referrer: typeof document !== "undefined" ? document.referrer : "",
  });

  // 3. Send tracking event
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track/click", blob);
    } else {
      fetch("/api/track/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    /* never block the shopper */
  }

  onDone?.();

  // 4. Open the link natively for Mobile vs Desktop
  const isMobile = deviceType() === "mobile";

  if (isMobile) {
    window.location.href = cleanUrl;
  } else {
    window.open(cleanUrl, "_blank", "noopener,noreferrer");
  }
}
