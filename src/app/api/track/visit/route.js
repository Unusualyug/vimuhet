import { recordVisit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await recordVisit({
      sessionId: body.sessionId,
      path: body.path,
      device: deviceOf(request),
      referrer: body.referrer,
    });
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json({ ok: false }, { status: 200 });
  }
}

function deviceOf(request) {
  const ua = request.headers.get("user-agent") || "";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}
