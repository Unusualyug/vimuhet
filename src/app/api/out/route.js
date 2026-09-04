import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  let targetUrl = rawUrl;

  // 1. If it's an OpenInApp or smart link, leave it as-is
  if (targetUrl.includes("openinapp") || targetUrl.includes("urlgeni.us")) {
    targetUrl = rawUrl;
  }
  // 2. If it's a standard Amazon URL, clean it to /dp/ASIN format with your affiliate tag
  else if (targetUrl.includes("amazon.")) {
    const asinMatch = targetUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (asinMatch && asinMatch[1]) {
      targetUrl = `https://www.amazon.in/dp/${asinMatch[1]}?tag=vimuhet-21`;
    }
  }

  // HTTP 307 Redirect forces iOS and Android to trigger native app deep-linking natively
  return NextResponse.redirect(targetUrl, 307);
}
