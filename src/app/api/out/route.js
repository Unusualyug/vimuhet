import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let targetUrl = searchParams.get("url");

  if (!targetUrl) return NextResponse.redirect(new URL("/", request.url));

  // AGGRESSIVE CLEANING
  // This looks for ANY 10-character string starting with B0...
  // which is almost always an Amazon ASIN
  const asinMatch = targetUrl.match(/B[A-Z0-9]{9}/i);

  if (asinMatch) {
    // We rebuild the link from scratch to ensure it's 100% clean
    const cleanAsin = asinMatch[0].toUpperCase();
    const finalAmazonUrl = `https://www.amazon.in/dp/${cleanAsin}`;

    return NextResponse.redirect(finalAmazonUrl, {
      status: 302,
      headers: {
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  }

  // If not Amazon, just go to the URL provided
  return NextResponse.redirect(targetUrl, { status: 302 });
}
