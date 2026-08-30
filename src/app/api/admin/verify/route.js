import { requireAdminApi } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  return Response.json({ ok: true });
}
