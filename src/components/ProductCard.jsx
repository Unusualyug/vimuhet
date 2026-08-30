"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PlatformDots } from "./PlatformButtons";
import { categoryLabel, discountPercent, formatINR, platformMeta } from "@/lib/constants";
import { trackAndOpen } from "@/lib/client-utils";

export default function ProductCard({ product, index = 0, priority = false }) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const primary = images[0];
  const secondary = images[1] || images[0];
  const discount = discountPercent(product.price, product.originalPrice);
  const links = (product.links || []).filter((l) => l && l.url).slice(0, 3);

  return (
    <motion.article
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 4) * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden rounded-[26px] border border-white/8 bg-ink-3">
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            {primary ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={primary}
                  alt={product.name}
                  loading={priority ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover transition-all duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.08] group-hover:opacity-0"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={secondary}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-all duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100 group-hover:opacity-100"
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-4xl">👗</div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent opacity-80" />

            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {discount > 0 && (
                <span
                  className="rounded-full px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-ink"
                  style={{ background: "var(--grad)" }}
                >
                  {discount}% off
                </span>
              )}
              {product.badge && (
                <span className="rounded-full border border-white/20 bg-ink/60 px-3 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-cream/80 backdrop-blur">
                  {product.badge}
                </span>
              )}
            </div>

            <div className="pointer-events-none absolute inset-x-4 bottom-4 translate-y-3 opacity-0 transition-all duration-500 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
              <div className="flex flex-wrap gap-1.5">
                {links.map((link) => {
                  const meta = platformMeta(link.platform);
                  return (
                    <button
                      key={link.platform}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        trackAndOpen({ product, platform: link.platform, url: link.url });
                      }}
                      className="btn-shine rounded-full px-3 py-2 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-ink shadow-lg"
                      style={{ background: meta.gradient }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="mt-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/product/${product.slug}`}>
            <h3 className="font-display text-[1.05rem] leading-snug text-cream transition-colors group-hover:text-gold">
              {product.name}
            </h3>
          </Link>
          <PlatformDots product={product} />
        </div>
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-cream/35">
          {categoryLabel(product.category)} · {product.fit}
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold text-cream">{formatINR(product.price)}</span>
          {Number(product.originalPrice) > Number(product.price) && (
            <span className="text-sm text-cream/35 line-through">{formatINR(product.originalPrice)}</span>
          )}
          <Link
            href={`/product/${product.slug}`}
            className="ml-auto text-[0.62rem] uppercase tracking-[0.2em] text-cream/45 transition-colors hover:text-cream"
          >
            View →
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
