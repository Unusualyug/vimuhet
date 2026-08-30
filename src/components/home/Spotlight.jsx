"use client";

import Link from "next/link";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useState } from "react";
import { BuyButtons } from "@/components/PlatformButtons";
import { Reveal } from "@/components/Motion";
import { categoryLabel, discountPercent, formatINR } from "@/lib/constants";

export default function Spotlight({ product }) {
  const [active, setActive] = useState(0);
  const rx = useSpring(useMotionValue(0), { stiffness: 140, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 140, damping: 18 });
  const transform = useMotionTemplate`perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  const glare = useMotionTemplate`radial-gradient(circle at 50% 50%, rgba(255,255,255,0.22), transparent 65%)`;

  if (!product) return null;
  const images = (product.images || []).filter(Boolean);
  const discount = discountPercent(product.price, product.originalPrice);

  function onMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 14);
    rx.set(-py * 14);
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <Reveal>
        <motion.div
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          style={{ transform }}
          className="relative aspect-[4/5] overflow-hidden rounded-[36px] border border-white/10 bg-ink-3 p-3"
        >
          <div className="relative h-full w-full overflow-hidden rounded-[28px]">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${src}-${i}`}
                src={src}
                alt={product.name}
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  i === active ? "scale-100 opacity-100" : "scale-105 opacity-0"
                }`}
              />
            ))}
            <motion.div style={{ background: glare }} className="pointer-events-none absolute inset-0" />
          </div>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((src, i) => (
              <button
                key={`thumb-${i}`}
                type="button"
                aria-label={`View image ${i + 1}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className={`h-14 w-11 overflow-hidden rounded-lg border transition-all duration-300 ${
                  i === active ? "border-gold opacity-100" : "border-white/20 opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          {discount > 0 && (
            <span
              className="absolute right-6 top-6 rounded-full px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-ink"
              style={{ background: "var(--grad)" }}
            >
              {discount}% off
            </span>
          )}
        </motion.div>
      </Reveal>

      <div>
        <Reveal>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">Spotlight of the week</p>
          <h2 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">{product.name}</h2>
          <p className="mt-3 text-sm uppercase tracking-[0.24em] text-cream/40">
            {categoryLabel(product.category)} · {product.fit} fit
          </p>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-cream/55">{product.description}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-end gap-4">
            <span className="font-display text-5xl text-cream">{formatINR(product.price)}</span>
            {Number(product.originalPrice) > Number(product.price) && (
              <span className="pb-2 text-xl text-cream/35 line-through">{formatINR(product.originalPrice)}</span>
            )}
            <span className="mb-2 rounded-full border border-mint/40 bg-mint/10 px-3 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-mint">
              You save {formatINR(Number(product.originalPrice || 0) - Number(product.price || 0))}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(product.sizes || []).map((size) => (
              <span
                key={size}
                className="rounded-lg border border-white/12 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.18em] text-cream/60"
              >
                {size}
              </span>
            ))}
          </div>

          <div className="mt-8">
            <p className="mb-3 text-[0.6rem] uppercase tracking-[0.3em] text-cream/40">Choose your marketplace</p>
            <BuyButtons product={product} />
          </div>

          <Link
            href={`/product/${product.slug}`}
            className="mt-7 inline-flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.26em] text-cream/60 transition-colors hover:text-gold"
          >
            Full product details <span>→</span>
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
