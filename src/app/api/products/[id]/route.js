import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema.js";
import { requireAdminApi } from "@/lib/auth";
import { parseProductBody } from "@/lib/product-payload";
import { getProductById, uniqueSlug } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ product });
}

export async function PUT(request, { params }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await getProductById(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Toggle-style partial updates (active / featured) come through with a `patch` key.
  if (body && body.patch) {
    const patch = {};
    if (typeof body.patch.active === "boolean") patch.active = body.patch.active;
    if (typeof body.patch.featured === "boolean") patch.featured = body.patch.featured;
    if (typeof body.patch.inStock === "boolean") patch.inStock = body.patch.inStock;
    if (body.patch.sortOrder !== undefined) patch.sortOrder = Number(body.patch.sortOrder) || 0;
    patch.updatedAt = new Date();
    const [updated] = await db.update(products).set(patch).where(eq(products.id, Number(id))).returning();
    return Response.json({ product: updated });
  }

  const { payload, errors } = parseProductBody(body);
  if (errors.length) return Response.json({ error: errors.join(". ") }, { status: 400 });

  const slug = body.slug ? await uniqueSlug(body.slug, id) : await uniqueSlug(payload.name, id);
  const [updated] = await db
    .update(products)
    .set({ ...payload, slug })
    .where(eq(products.id, Number(id)))
    .returning();

  return Response.json({ product: updated });
}

export async function DELETE(request, { params }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  await db.delete(products).where(eq(products.id, Number(id)));
  return Response.json({ ok: true });
}
