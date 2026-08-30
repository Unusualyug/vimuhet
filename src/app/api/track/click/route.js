import { recordClick } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    await recordClick({
      productId: body.productId,
      productName: body.productName,
      platform: body.platform,
      price: body.price,
      sessionId: body.sessionId,
      referrer: body.referrer,
      device: deviceOf(request),
    });
    return Response.json({ ok: true });
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
