"use client";

// Three-layer token storage so at least one works in any environment:
// URL param > sessionStorage > localStorage > in-memory fallback
let memoryToken = "";

function getFromURL() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  return url.searchParams.get("_token") || "";
}

function stripTokenFromURL() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.has("_token")) {
    url.searchParams.delete("_token");
    window.history.replaceState({}, "", url.pathname + url.search);
  }
}

export function saveAdminToken(token) {
  memoryToken = token;
  try { window.sessionStorage.setItem("vat", token); } catch {}
  try { window.localStorage.setItem("vat", token); } catch {}
}

export function getAdminToken() {
  if (typeof window === "undefined") return memoryToken || "";
  // 1. Check URL (just arrived from login redirect)
  const fromURL = getFromURL();
  if (fromURL) {
    memoryToken = fromURL;
    try { window.sessionStorage.setItem("vat", fromURL); } catch {}
    try { window.localStorage.setItem("vat", fromURL); } catch {}
    stripTokenFromURL();
    return fromURL;
  }
  // 2. Check sessionStorage (same-origin iframe)
  try {
    const fromSS = window.sessionStorage.getItem("vat");
    if (fromSS) { memoryToken = fromSS; return fromSS; }
  } catch {}
  // 3. Check localStorage (normal browser)
  try {
    const fromLS = window.localStorage.getItem("vat");
    if (fromLS) { memoryToken = fromLS; return fromLS; }
  } catch {}
  // 4. Memory fallback (in-memory SPA, won't survive refresh)
  return memoryToken || "";
}

export function clearAdminToken() {
  memoryToken = "";
  try { window.sessionStorage.removeItem("vat"); } catch {}
  try { window.localStorage.removeItem("vat"); } catch {}
}

export async function adminFetch(url, options = {}) {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers, cache: options.cache || "no-store" });
}
