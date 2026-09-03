"use client";

import { PLATFORMS, formatINR, platformMeta } from "@/lib/constants";
import { trackAndOpen, cleanMarketplaceUrl } from "@/lib/client-utils";

/** Big marketplace buttons used on the product detail page. */
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
        const price = Number(link.price || product.price || 0);
        const targetUrl = cleanMarketplaceUrl(link.url, link.platform);

        return (
          /* Standard HTML <a> tag without Framer Motion or target="_blank" to match WhatsApp behavior */
          <a
            key={`${link.platform}-${i}`}
            href={targetUrl}
            onClick={() => {
              trackAndOpen({ product, platform: link.platform, url: link.url });
            }}
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
                <span className="block text-[0.68rem] uppercase tracking-[0.2em] text-cream/45">
                  Opens app or website
                </span>
              </span>
            </span>
            <span className="relative z-10 text-right">
              <span className="block font-display text-lg text-cream">
                {formatINR(price)}
              </span>
              {price !== Number(product.price) && (
                <span className="block text-[0.62rem] uppercase tracking-[0.2em] text-cream/40">
                  {price < Number(product.price)
                    ? "lowest here"
                    : "listed price"}
                </span>
              )}
            </span>
            <span
              className="absolute inset-0 -z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: meta.gradient, opacity: 0.16 }}
            />
          </a>
        );
      })}
    </div>
  );
}

/** Compact platform strip used on product cards. */
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
      {PLATFORMS.map((p, i) => (
        <a
          key={p.key}
          href={p.url}
          className="group relative overflow-hidden rounded-3xl border border-white/10 p-6"
          style={{ background: p.soft }}
        >
          <span
            className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition-all duration-700 group-hover:scale-150"
            style={{ background: p.gradient }}
          />
          <span
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-ink"
            style={{ background: p.gradient }}
          >
            {p.short}
          </span>
          <h3 className="relative mt-5 font-display text-2xl">{p.label}</h3>
          <p className="relative mt-1 text-xs uppercase tracking-[0.24em] text-cream/45">
            Official store
          </p>
          <span className="relative mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cream/70">
            Visit
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}
