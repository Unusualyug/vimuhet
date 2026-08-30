import { db } from "@/db";
import { uploads } from "@/db/schema.js";
import { requireAdminApi } from "@/lib/auth";
import { cloudinaryEnabled, uploadImage } from "@/lib/cloudinary";
import { ensureSchema } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per image

export async function POST(request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  await ensureSchema();

  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f) => typeof f !== "string" && f && f.size > 0);
  if (!files.length) {
    const single = form.get("file");
    if (single && typeof single !== "string") files.push(single);
  }
  if (!files.length) return Response.json({ error: "No files received" }, { status: 400 });

  const uploaded = [];
  const failed = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      failed.push({ name: file.name, reason: "Larger than 8 MB" });
      continue;
    }
    if (!/^image\//.test(file.type || "image/jpeg")) {
      failed.push({ name: file.name, reason: "Not an image" });
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      let url;
      if (cloudinaryEnabled) {
        url = await uploadImage(buffer, file.name || "vimuhet.jpg");
      } else {
        const [row] = await db
          .insert(uploads)
          .values({
            filename: file.name || "upload",
            mime: file.type || "image/jpeg",
            data: buffer.toString("base64"),
          })
          .returning({ id: uploads.id });
        url = `/api/uploads/${row.id}`;
      }
      uploaded.push({ url, name: file.name });
    } catch (error) {
      failed.push({ name: file.name, reason: error?.message || "Upload failed" });
    }
  }

  return Response.json({
    uploaded,
    failed,
    storage: cloudinaryEnabled ? "cloudinary" : "local",
  });
}
