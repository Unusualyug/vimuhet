// src/app/api/out/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Final sanity check for Amazon links
  if (targetUrl.includes("amazon")) {
    const asinMatch = targetUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (asinMatch) {
      targetUrl = `https://www.amazon.in/dp/${asinMatch[1]}?tag=vimuhet-21`; // tag is optional
    }
  }

  // The secret sauce: We send a 302 redirect directly from the server.
  // This is much more stable for mobile apps than Javascript redirects.
  return NextResponse.redirect(targetUrl, {
    status: 302,
    headers: {
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    },
  });
}
