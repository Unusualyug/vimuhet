import { requireAdminApi } from "@/lib/auth";
import { getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const stats = await getStats();
  return Response.json(stats);
}
