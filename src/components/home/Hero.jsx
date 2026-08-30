"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SplitText } from "@/components/Motion";
import { Counter } from "@/components/Motion";
import { formatINR } from "@/lib/constants";
import { trackAndOpen } from "@/lib/client-utils";

export default function Hero({ products = [], stats }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yA = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const yB = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const yC = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [a, b, c] = products;

  return (
    <section ref={ref} className="relative overflow-hidden px-5 pb-24 pt-14 sm:px-8 lg:pt-20">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div style={{ opacity: fade }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.6rem] uppercase tracking-[0.32em] text-cream/60"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-mint animate-ring" />
              <span className="relative h-2 w-2 rounded-full bg-mint" />
            </span>
            Festive drop live · {stats?.activeProducts ?? products.length} styles
          </motion.div>

          <h1 className="mt-7 font-display text-[3.3rem] leading-[0.92] tracking-tight sm:text-7xl lg:text-[5.4rem]">
            <SplitText text="Clothing that" />
            <br />
            <span className="text-shine">
              <SplitText text="moves" delay={0.18} />
            </span>{" "}
            <SplitText text="with you." delay={0.26} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="mt-7 max-w-lg text-[0.98rem] leading-relaxed text-cream/55"
          >
            VIMUHET designs small-batch essentials and festive ethnic wear in India. Pick a piece here, check out on the
            marketplace you already trust — Amazon, Flipkart, Meesho or Myntra. One tap, real reviews, real delivery.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.8 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/shop"
              className="btn-shine group relative overflow-hidden rounded-full px-8 py-4 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-ink animate-grad"
              style={{ background: "var(--grad)" }}
            >
              <span className="relative z-10">Shop the drop</span>
            </Link>
            <Link
              href="#marketplaces"
              className="rounded-full border border-white/15 px-8 py-4 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cream/75 transition-all hover:border-gold hover:text-gold"
            >
              Our marketplaces
            </Link>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 1 }}
            className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-7"
          >
            {[
              { label: "Styles live", value: stats?.activeProducts ?? products.length, suffix: "+" },
              { label: "Marketplaces", value: 4, suffix: "" },
              { label: "Storefront visits", value: stats?.totalVisits ?? 0, suffix: "" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="font-display text-3xl text-cream">
                  <Counter to={item.value} suffix={item.suffix} />
                </dt>
                <dd className="mt-1 text-[0.6rem] uppercase tracking-[0.24em] text-cream/40">{item.label}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* collage */}
        <div className="relative h-[30rem] sm:h-[36rem] lg:h-[42rem]">
          <div
            className="absolute inset-8 rounded-full opacity-45 blur-3xl animate-blob"
            style={{ background: "conic-gradient(from 120deg,#ff5d8f,#ffb15c,#8b5cff,#55e6c1,#ff5d8f)" }}
          />

          {a && (
            <motion.figure
              style={{ y: yA }}
              initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              transition={{ delay: 0.35, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-6 z-20 w-[52%] overflow-hidden rounded-[28px] border border-white/12 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.images?.[0]} alt={a.name} className="aspect-[3/4] w-full object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-4">
                <p className="text-[0.6rem] uppercase tracking-[0.2em] text-cream/60">{a.badge || "Featured"}</p>
                <p className="font-display text-sm leading-tight text-cream">{a.name}</p>
                <p className="mt-1 text-sm font-semibold text-gold">{formatINR(a.price)}</p>
              </figcaption>
            </motion.figure>
          )}

          {b && (
            <motion.figure
              style={{ y: yB }}
              initial={{ opacity: 0, scale: 0.9, rotate: 6 }}
              animate={{ opacity: 1, scale: 1, rotate: 4 }}
              transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 z-10 w-[44%] overflow-hidden rounded-[24px] border border-white/12 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] animate-floaty"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.images?.[0]} alt={b.name} className="aspect-[3/4] w-full object-cover" />
            </motion.figure>
          )}

          {c && (
            <motion.figure
              style={{ y: yC }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-6 right-[6%] z-30 w-[46%] overflow-hidden rounded-[24px] border border-white/12 bg-ink-3 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.images?.[0]} alt={c.name} className="aspect-[4/3] w-full object-cover" />
              <figcaption className="flex items-center justify-between gap-2 p-3">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-cream/60">{c.name}</span>
                <button
                  type="button"
                  onClick={() => trackAndOpen({ product: c, platform: c.links?.[0]?.platform, url: c.links?.[0]?.url })}
                  className="shrink-0 rounded-full px-3 py-1.5 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-ink"
                  style={{ background: "var(--grad)" }}
                >
                  Buy
                </button>
              </figcaption>
            </motion.figure>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -left-2 bottom-16 z-40 hidden h-28 w-28 sm:block"
          >
            <div className="relative h-full w-full animate-spin-slow">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <defs>
                  <path id="circlePath" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
                </defs>
                <text className="fill-cream/70 text-[8.4px] uppercase tracking-[0.3em]">
                  <textPath href="#circlePath">vimuhet · shop on amazon · flipkart · meesho ·</textPath>
                </text>
              </svg>
            </div>
            <span className="absolute inset-0 flex items-center justify-center text-2xl">✦</span>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl items-center gap-3 text-[0.6rem] uppercase tracking-[0.35em] text-cream/30">
        <span className="h-[1px] flex-1 bg-white/10" />
        scroll
        <span className="animate-scroll-hint">↓</span>
        <span className="h-[1px] flex-1 bg-white/10" />
      </div>
    </section>
  );
}
