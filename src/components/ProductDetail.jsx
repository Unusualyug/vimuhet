"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { BuyButtons } from "@/components/PlatformButtons";
import { Reveal } from "@/components/Motion";
import {
  categoryLabel,
  discountPercent,
  formatINR,
  platformMeta,
} from "@/lib/constants";
import { trackAndOpen, cleanMarketplaceUrl } from "@/lib/client-utils";

export default function ProductDetail({ product }) {
  const images = useMemo(
    () => (product.images || []).filter(Boolean),
    [product.images],
  );
  const [active, setActive] = useState(0);
  const [size, setSize] = useState(product.sizes?.[0] || "");
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });
  const [openPane, setOpenPane] = useState("details");
  const [pulse, setPulse] = useState("");

  const discount = discountPercent(product.price, product.originalPrice);
  const best = [...(product.links || [])].sort(
    (a, b) => (a.price || 0) - (b.price || 0),
  )[0];
  const bestMeta = best ? platformMeta(best.platform) : null;

  const panes = [
    {
      key: "details",
      label: "Product story",
      body: product.description || "—",
    },
    {
      key: "fabric",
      label: "Fabric & care",
      body: `${product.fabric || "Premium blend"} · ${product.fit || "Regular"} fit · ${product.care || "Machine wash cold"}`,
    },
    {
      key: "delivery",
      label: "Delivery & returns",
      body: "Dispatched by the marketplace you choose. Amazon Prime, Flipkart Plus and Meesho Next-Day speeds apply. 7-day return window as per the listing.",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 pt-8 sm:px-8">
      <nav className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.24em] text-cream/35">
        <Link href="/" className="hover:text-cream">
          Home
        </Link>
        <span>/</span>
        <Link
          href={`/shop?category=${product.category}`}
          className="hover:text-cream"
        >
          {categoryLabel(product.category)}
        </Link>
        <span>/</span>
        <span className="truncate text-cream/60">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* gallery */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-[32px] border border-white/10 bg-ink-3"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({
                on: true,
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
              });
            }}
            onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={images[active] || "empty"}
                src={images[active]}
                alt={product.name}
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300"
                style={{
                  transformOrigin: `${zoom.x}% ${zoom.y}%`,
                  transform: zoom.on ? "scale(1.7)" : "scale(1)",
                }}
              />
            </AnimatePresence>

            <div className="absolute left-5 top-5 flex flex-col gap-2">
              {discount > 0 && (
                <span
                  className="rounded-full px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-ink"
                  style={{ background: "var(--grad)" }}
                >
                  {discount}% off
                </span>
              )}
              {product.badge && (
                <span className="rounded-full border border-white/20 bg-ink/60 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-cream/80 backdrop-blur">
                  {product.badge}
                </span>
              )}
            </div>

            <div className="absolute inset-y-0 left-3 flex items-center">
              <button
                type="button"
                aria-label="Previous image"
                onClick={() =>
                  setActive((a) => (a - 1 + images.length) % images.length)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink/50 text-cream/80 backdrop-blur transition hover:bg-ink/80"
              >
                ‹
              </button>
            </div>
            <div className="absolute inset-y-0 right-3 flex items-center">
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setActive((a) => (a + 1) % images.length)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink/50 text-cream/80 backdrop-blur transition hover:bg-ink/80"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border transition-all duration-300 ${
                  i === active
                    ? "border-gold"
                    : "border-white/12 opacity-65 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* info */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl">
            {product.name}
          </h1>
          {product.tagline && (
            <p className="mt-3 text-sm uppercase tracking-[0.22em] text-gold/80">
              {product.tagline}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3 text-sm">
            <span className="text-gold">
              {"★".repeat(Math.round((product.rating || 48) / 10))}
            </span>
            <span className="text-cream/40">
              {((product.rating || 48) / 10).toFixed(1)} / 5
            </span>
            <span className="h-1 w-1 rounded-full bg-cream/30" />
            <span className="text-cream/40">
              {product.inStock ? "In stock" : "Sold out"}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap items-end gap-4 border-y border-white/10 py-6">
            <span className="font-display text-5xl">
              {formatINR(product.price)}
            </span>
            {Number(product.originalPrice) > Number(product.price) && (
              <span className="pb-2 text-xl text-cream/35 line-through">
                {formatINR(product.originalPrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="mb-2 rounded-full bg-mint/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.2em] text-mint">
                Save{" "}
                {formatINR(
                  Number(product.originalPrice) - Number(product.price),
                )}
              </span>
            )}
          </div>

          {product.sizes?.length > 0 && (
            <div className="mt-7">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-cream/40">
                Select size
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`relative rounded-xl border px-4 py-2.5 text-xs uppercase tracking-[0.16em] transition-colors ${
                      size === s
                        ? "text-ink"
                        : "border-white/12 text-cream/65 hover:border-gold/60 hover:text-cream"
                    }`}
                  >
                    {size === s && (
                      <motion.span
                        layoutId="sizePill"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: "var(--grad)" }}
                        transition={{
                          type: "spring",
                          stiffness: 340,
                          damping: 28,
                        }}
                      />
                    )}
                    <span className="relative z-10">{s}</span>
                  </button>
                ))}
              </div>
              {size && (
                <p className="mt-2 text-[0.62rem] uppercase tracking-[0.2em] text-mint">
                  Size {size} selected
                </p>
              )}
            </div>
          )}

          {product.colors?.length > 0 && (
            <div className="mt-6">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-cream/40">
                Colour
              </p>
              <p className="mt-2 text-sm text-cream/70">
                {product.colors.join(" · ")}
              </p>
            </div>
          )}

          <div className="mt-9">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-cream/40">
                Buy on your favourite app
              </p>
              {bestMeta && (
                <p className="text-[0.6rem] uppercase tracking-[0.2em] text-cream/35">
                  Best price:{" "}
                  <span style={{ color: bestMeta.color }}>
                    {bestMeta.label}
                  </span>
                </p>
              )}
            </div>
            <BuyButtons product={product} />
            <p className="mt-3 text-[0.62rem] leading-relaxed text-cream/35">
              Tapping a store button opens the VIMUHET listing inside the Amazon
              / Flipkart / Meesho app (or their website on desktop).
            </p>
          </div>

          <div className="mt-9 space-y-3">
            {panes.map((pane) => {
              const open = openPane === pane.key;
              return (
                <div
                  key={pane.key}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-ink-2/50"
                >
                  <button
                    type="button"
                    onClick={() => setOpenPane(open ? "" : pane.key)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm text-cream/80"
                  >
                    {pane.label}
                    <motion.span
                      animate={{ rotate: open ? 45 : 0 }}
                      className="text-gold"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-cream/55">
                          {pane.body}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: "🚚", label: "Fast delivery" },
              { icon: "🔁", label: "Easy returns" },
              { icon: "✅", label: "Genuine product" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/8 bg-ink-2/40 px-2 py-4"
              >
                <span className="text-xl">{item.icon}</span>
                <p className="mt-2 text-[0.58rem] uppercase tracking-[0.18em] text-cream/45">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* mobile sticky buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.6rem] uppercase tracking-[0.2em] text-cream/40">
              {size || "Select size"}
            </p>
            <p className="font-display text-xl">{formatINR(product.price)}</p>
          </div>
          {best && (
            <a
              href={
                best.platform === "amazon"
                  ? cleanMarketplaceUrl(best.url, "amazon")
                  : best.url
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                setPulse(best.platform);
                trackAndOpen({
                  product,
                  platform: best.platform,
                  url: best.url,
                });
              }}
              className="btn-shine ml-auto flex-1 rounded-full px-6 py-3.5 text-[0.64rem] font-bold uppercase tracking-[0.2em] text-ink text-center"
              style={{ background: bestMeta.gradient }}
            >
              Buy on {bestMeta.label}
            </a>
          )}
        </div>
        {pulse && <span className="sr-only">Opening {pulse}</span>}
      </div>

      <Reveal>
        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Compare before you tap",
              c: "Every listing shows the price on each marketplace so you never overpay.",
            },
            {
              t: "No fake stock counts",
              c: "We only link to live VIMUHET listings on the official storefronts.",
            },
            {
              t: "Same product, best route",
              c: "Choose Prime, Plus or Meesho Next-Day depending on how fast you need it.",
            },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-2xl border border-white/8 bg-ink-2/40 p-6"
            >
              <h4 className="font-display text-lg">{item.t}</h4>
              <p className="mt-2 text-sm leading-relaxed text-cream/50">
                {item.c}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
