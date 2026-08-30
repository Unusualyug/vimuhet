import { eq } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema.js";
import { ensureSchema } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  await ensureSchema();
  const rows = await db
    .select({ data: uploads.data, mime: uploads.mime })
    .from(uploads)
    .where(eq(uploads.id, Number(id)))
    .limit(1);

  if (!rows.length) return new Response("Not found", { status: 404 });

  const buffer = Buffer.from(rows[0].data, "base64");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": rows[0].mime || "image/jpeg",
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
