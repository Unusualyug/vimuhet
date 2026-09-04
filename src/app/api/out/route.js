import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  let targetUrl = rawUrl;

  if (targetUrl.includes("openinapp") || targetUrl.includes("urlgeni.us")) {
    targetUrl = rawUrl;
  } else if (targetUrl.includes("amazon.")) {
    const asinMatch = targetUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (asinMatch && asinMatch[1]) {
      targetUrl = `https://www.amazon.in/dp/${asinMatch[1]}?tag=vimuhet-21`;
    }
  }

  return NextResponse.redirect(targetUrl, 307);
}
