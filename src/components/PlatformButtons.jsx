"use client";

import { PLATFORMS, formatINR, platformMeta } from "@/lib/constants";
import { trackAndOpen, cleanMarketplaceUrl } from "@/lib/client-utils";

/** Marketplace buttons used on the product detail page */
// src/components/PlatformButtons.jsx (BuyButtons component)

// src/components/PlatformButtons.jsx

export function BuyButtons({ product, layout = "stack" }) {
  const links = (product.links || []).filter((l) => l && l.url);

  if (!links.length) {
    return <p className="text-sm text-cream/50">Store links coming soon.</p>;
  }

  return (
    <div
      className={layout === "stack" ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}
    >
      {links.map((link, i) => {
        const meta = platformMeta(link.platform);

        // POINT TO YOUR API BRIDGE INSTEAD OF AMAZON
        const bridgeUrl = `/api/out?url=${encodeURIComponent(link.url)}`;

        return (
          <a
            key={`${link.platform}-${i}`}
            href={bridgeUrl}
            // NO onClick logic needed here!
            // The browser follows the link to your API,
            // and the API handles the redirect.
            rel="noopener noreferrer"
            className="btn-shine group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 px-5 py-4 text-left cursor-pointer"
            style={{ background: meta.soft }}
          >
            <span className="relative z-10 flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[0.7rem] font-bold text-ink"
                style={{ background: meta.gradient }}
              >
                {meta.short}
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-wide text-cream">
                  Buy on {meta.label}
                </span>
              </span>
            </span>
            <span className="relative z-10 text-right">
              <span className="block font-display text-lg text-cream">
                ₹{link.price}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
export function PlatformDots({ product }) {
  const links = (product.links || []).filter((l) => l && l.url);
  return (
    <div className="flex items-center gap-1.5">
      {links.map((link) => {
        const meta = platformMeta(link.platform);
        return (
          <span
            key={link.platform}
            title={`${meta.label} · ${formatINR(link.price || product.price)}`}
            className="h-1.5 w-6 rounded-full"
            style={{ background: meta.gradient }}
          />
        );
      })}
    </div>
  );
}

export function PlatformStrip() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLATFORMS.map((p) => (
        <a
          key={p.key}
          href={p.url}
          className="group relative overflow-hidden rounded-3xl border border-white/10 p-6"
          style={{ background: p.soft }}
        >
          <span
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-ink"
            style={{ background: p.gradient }}
          >
            {p.short}
          </span>
          <h3 className="relative mt-5 font-display text-2xl">{p.label}</h3>
        </a>
      ))}
    </div>
  );
}
