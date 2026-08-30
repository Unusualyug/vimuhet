"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, formatINR } from "@/lib/constants";

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-low", label: "Price ↑" },
  { key: "price-high", label: "Price ↓" },
  { key: "discount", label: "Biggest discount" },
];

export default function ShopClient({ initialCategory = "all" }) {
  const [category, setCategory] = useState(initialCategory);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState(4000);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (q.trim()) params.set("q", q.trim());
        if (sort) params.set("sort", sort);
        const res = await fetch(`/api/products?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        setItems(data.items || []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [category, q, sort]);

  const visible = useMemo(() => items.filter((p) => Number(p.price) <= maxPrice), [items, maxPrice]);

  const tabs = [{ key: "all", label: "Everything", emoji: "✦" }, ...CATEGORIES];

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">The catalogue</p>
        <h1 className="mt-4 font-display text-5xl leading-[1.02] sm:text-6xl">
          Shop <span className="text-gradient">every</span> VIMUHET piece
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream/50">
          Filter by category, price or what&apos;s new. Every product opens with live marketplace prices and one-tap
          checkout links.
        </p>
      </motion.div>

      <div className="sticky top-[4.6rem] z-40 mt-10 -mx-5 border-y border-white/8 bg-ink/85 px-5 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = category === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCategory(tab.key)}
                  className={`relative shrink-0 rounded-full px-4 py-2 text-[0.62rem] uppercase tracking-[0.2em] transition-colors ${
                    isActive ? "text-ink" : "text-cream/60 hover:text-cream"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="shopTab"
                      className="absolute inset-0 rounded-full"
                      style={{ background: "var(--grad)" }}
                      transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab.emoji ? `${tab.emoji} ` : ""}
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search hoodies, kurta…"
                className="w-full rounded-full border border-white/12 bg-ink-2/70 py-2.5 pl-10 pr-4 text-sm text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none sm:w-56"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/35">⌕</span>
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-full border border-white/12 bg-ink-2/70 px-4 py-2.5 text-sm text-cream/80 focus:border-gold focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key} className="bg-ink">
                  {s.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.2em] text-cream/45">
              under {formatINR(maxPrice)}
              <input
                type="range"
                min={499}
                max={4000}
                step={100}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-white/15 accent-rose"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between text-[0.62rem] uppercase tracking-[0.24em] text-cream/35">
        <span>{visible.length} styles</span>
        {loading && <span className="text-gold">curating…</span>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-7 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {visible.map((product, i) => (
            <motion.div
              key={product.id}
              layout
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.35 }}
            >
              <ProductCard product={product} index={i} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!loading && !visible.length && (
        <div className="mt-24 flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">🧺</span>
          <h3 className="font-display text-2xl">Nothing matches that yet</h3>
          <p className="max-w-sm text-sm text-cream/45">
            Try widening the price range or switching category. New drops land every fortnight.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setQ("");
              setMaxPrice(4000);
            }}
            className="rounded-full border border-white/15 px-6 py-3 text-[0.62rem] uppercase tracking-[0.24em] text-cream/70 hover:border-gold hover:text-gold"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
