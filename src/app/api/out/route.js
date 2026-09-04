export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new Response("Missing URL", { status: 400 });
  }

  let targetUrl = rawUrl;

  // Format Amazon URLs to clean /dp/ASIN web format with your tag
  if (targetUrl.includes("amazon.")) {
    const asinMatch = targetUrl.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (asinMatch && asinMatch[1]) {
      targetUrl = `https://www.amazon.in/dp/${asinMatch[1]}?tag=vimuhet-21`;
    }
  }

  // Returning an HTML response with window.location.replace forces mobile browsers
  // (Chrome & Safari) to load the Web page inside the browser tab and BYPASS the native app!
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Opening Amazon Web...</title>
        <style>
          body { background: #0b0b0e; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        </style>
      </head>
      <body>
        <p>Opening product on Amazon Web...</p>
        <script>
          window.location.replace(${JSON.stringify(targetUrl)});
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
