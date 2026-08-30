import { requireAdminApi } from "@/lib/auth";
import { parseProductBody } from "@/lib/product-payload";
import { ensureSeed, listProducts, uniqueSlug } from "@/lib/store";
import { db } from "@/db";
import { products } from "@/db/schema.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const wantsAll = searchParams.get("all") === "1";
  const items = await listProducts({
    category: searchParams.get("category") || undefined,
    q: searchParams.get("q") || undefined,
    sort: searchParams.get("sort") || undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    includeInactive: wantsAll && (await requireAdminApi(request)).ok,
  });
  return Response.json({ items, count: items.length });
}

export async function POST(request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { payload, errors } = parseProductBody(body);
  if (errors.length) return Response.json({ error: errors.join(". ") }, { status: 400 });

  const slug = await uniqueSlug(body.slug || payload.name);
  const [created] = await db
    .insert(products)
    .values({ ...payload, slug })
    .returning();

  return Response.json({ product: created }, { status: 201 });
}
