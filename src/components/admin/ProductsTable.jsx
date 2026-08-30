"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { categoryLabel, formatINR, platformMeta } from "@/lib/constants";
import { adminFetch } from "@/lib/admin-client";

export default function ProductsTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [savingId, setSavingId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch("/api/products?all=1");
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(id, body) {
    setSavingId(id);
    try {
      const res = await adminFetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch: body }),
      });
      if (res.ok) {
        const { product } = await res.json();
        setItems((list) => list.map((item) => (item.id === product.id ? { ...item, ...product } : item)));
      }
    } finally {
      setSavingId("");
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    setSavingId(product.id);
    try {
      const res = await adminFetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (res.ok) setItems((list) => list.filter((item) => item.id !== product.id));
    } finally {
      setSavingId("");
    }
  }

  const visible = useMemo(() => {
    return items.filter((item) => {
      const matchQ = q
        ? `${item.name} ${item.category} ${item.tagline || ""}`.toLowerCase().includes(q.toLowerCase())
        : true;
      const matchFilter =
        filter === "all"
          ? true
          : filter === "active"
            ? item.active
            : filter === "hidden"
              ? !item.active
              : filter === "featured"
                ? item.featured
                : item.category === filter;
      return matchQ && matchFilter;
    });
  }, [items, q, filter]);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-ink-2/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-xl border border-white/12 bg-ink/60 px-4 py-2.5 text-sm text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none sm:w-64"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-white/12 bg-ink/60 px-4 py-2.5 text-sm text-cream/80 focus:border-gold focus:outline-none"
          >
            <option value="all" className="bg-ink">
              All products
            </option>
            <option value="active" className="bg-ink">
              Live only
            </option>
            <option value="hidden" className="bg-ink">
              Hidden
            </option>
            <option value="featured" className="bg-ink">
              Featured
            </option>
            <option value="tshirts" className="bg-ink">
              T-Shirts
            </option>
            <option value="shirts" className="bg-ink">
              Shirts
            </option>
            <option value="kurtas" className="bg-ink">
              Kurtas
            </option>
            <option value="hoodies" className="bg-ink">
              Hoodies
            </option>
            <option value="dresses" className="bg-ink">
              Dresses
            </option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[0.6rem] uppercase tracking-[0.22em] text-cream/35">{visible.length} items</span>
          <Link
            href="/admin/products/new"
            className="btn-shine rounded-xl px-5 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-ink animate-grad"
            style={{ background: "var(--grad)" }}
          >
            + Add product
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <AnimatePresence initial={false}>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="h-24 animate-pulse rounded-2xl border border-white/8 bg-ink-2/40" />
            ))}

          {!loading &&
            visible.map((product, i) => {
              const img = (product.images || [])[0];
              const links = product.links || [];
              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-ink-2/50 p-4 sm:flex-row sm:items-center"
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-24 w-20 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="h-24 w-20 shrink-0 rounded-xl bg-white/5" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/product/${product.slug}`} className="truncate font-display text-lg hover:text-gold">
                        {product.name}
                      </Link>
                      {product.featured && (
                        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] text-gold">
                          Featured
                        </span>
                      )}
                      {!product.active && (
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] text-cream/40">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[0.6rem] uppercase tracking-[0.2em] text-cream/35">
                      {categoryLabel(product.category)} · {product.fit} · {(product.images || []).length} photos
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-cream">{formatINR(product.price)}</span>
                      {Number(product.originalPrice) > Number(product.price) && (
                        <span className="text-xs text-cream/35 line-through">{formatINR(product.originalPrice)}</span>
                      )}
                      <span className="flex gap-1.5">
                        {links.map((l) => {
                          const meta = platformMeta(l.platform);
                          return (
                            <span
                              key={l.platform}
                              title={`${meta.label}: ${l.url}`}
                              className="h-1.5 w-6 rounded-full"
                              style={{ background: meta.gradient }}
                            />
                          );
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Toggle
                      label="Live"
                      on={product.active}
                      busy={savingId === product.id}
                      onClick={() => patch(product.id, { active: !product.active })}
                    />
                    <Toggle
                      label="Featured"
                      on={product.featured}
                      busy={savingId === product.id}
                      onClick={() => patch(product.id, { featured: !product.featured })}
                    />
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="rounded-xl border border-white/12 px-4 py-2 text-[0.58rem] uppercase tracking-[0.18em] text-cream/70 transition hover:border-gold hover:text-gold"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(product)}
                      className="rounded-xl border border-white/12 px-4 py-2 text-[0.58rem] uppercase tracking-[0.18em] text-cream/50 transition hover:border-rose hover:text-rose"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {!loading && !visible.length && (
          <div className="rounded-3xl border border-white/8 bg-ink-2/40 p-14 text-center">
            <p className="font-display text-2xl">No products match</p>
            <p className="mt-2 text-sm text-cream/45">Try a different search or add your first product.</p>
            <Link
              href="/admin/products/new"
              className="mt-6 inline-block rounded-full px-6 py-3 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-ink"
              style={{ background: "var(--grad)" }}
            >
              Add product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, on, onClick, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[0.58rem] uppercase tracking-[0.18em] transition disabled:opacity-50 ${
        on ? "border-mint/40 bg-mint/10 text-mint" : "border-white/12 text-cream/45 hover:text-cream"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? "bg-mint" : "bg-cream/30"}`} />
      {label}
    </button>
  );
}
