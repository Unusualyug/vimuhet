import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "vimuhet_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  return process.env.ADMIN_SECRET || process.env.DATABASE_URL || "vimuhet-dev-secret";
}

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "vimuhet@admin";
}

export function adminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createToken() {
  const payload = `${adminUsername()}.${Date.now() + MAX_AGE * 1000}`;
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const expected = sign(encoded);
  if (expected.length !== signature.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const [, expires] = payload.split(".");
    return Number(expires) > Date.now();
  } catch {
    return false;
  }
}

export async function isAdmin() {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Some sandboxed / iframed previews block third-party cookies, which breaks a
 * pure cookie session. So every admin API route accepts EITHER:
 *   - an `Authorization: Bearer <token>` header (primary — works everywhere), or
 *   - the `vimuhet_admin` cookie (fallback — convenient on a normal browser tab).
 */
export async function requireAdminApi(request) {
  const bearer = request?.headers?.get?.("authorization") || request?.headers?.get?.("Authorization");
  if (bearer && bearer.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (verifyToken(token)) return { ok: true };
  }

  const ok = await isAdmin();
  if (ok) return { ok: true };

  return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};
