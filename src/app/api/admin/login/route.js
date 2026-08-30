import { ADMIN_COOKIE, cookieOptions, createToken } from "@/lib/auth";
import { ensureSchema } from "@/lib/store";

export const dynamic = "force-dynamic";

// Hardcoded credentials — no env var dependency
const VALID_USERS = [
  { username: "jay", password: "vimuhet@admin" },
  { username: "admin", password: "vimuhet@admin" },
];

export async function POST(request) {
  await ensureSchema();

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  const match = VALID_USERS.find(
    (u) => u.username === username && u.password === password,
  );

  if (!match) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createToken();
  const response = Response.json({ ok: true, token });
  response.headers.append("Set-Cookie", serialize(ADMIN_COOKIE, token, cookieOptions));
  return response;
}

function serialize(name, value, options) {
  const parts = [`${name}=${value}`, `Path=${options.path}`, `Max-Age=${options.maxAge}`, `SameSite=Lax`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}
