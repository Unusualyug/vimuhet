"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Counter } from "@/components/Motion";
import { HourlyBars, PlatformBars, TrafficChart } from "./Charts";
import { formatINR, platformMeta } from "@/lib/constants";
import { adminFetch } from "@/lib/admin-client";

function StatCard({ label, value, sub, tone = "gold", delay = 0, suffix = "" }) {
  const tones = {
    gold: "linear-gradient(135deg,#ffb15c,#ff7a00)",
    rose: "linear-gradient(135deg,#ff6bb5,#ff2d6f)",
    violet: "linear-gradient(135deg,#a78bfa,#6d28d9)",
    mint: "linear-gradient(135deg,#55e6c1,#0f9b8e)",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-3xl border border-white/8 bg-ink-2/60 p-6"
    >
      <span
        className="absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-25 blur-2xl transition-transform duration-700 group-hover:scale-150"
        style={{ background: tones[tone] }}
      />
      <p className="relative text-[0.58rem] uppercase tracking-[0.3em] text-cream/40">{label}</p>
      <p className="relative mt-3 font-display text-4xl text-cream">
        <Counter to={value} suffix={suffix} />
      </p>
      {sub && <p className="relative mt-2 text-xs text-cream/40">{sub}</p>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/stats");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
      setUpdatedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl border border-white/8 bg-ink-2/40" />
        ))}
      </div>
    );
  }

  const t = stats.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.22em] text-mint">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-mint animate-ring" />
            <span className="relative h-2 w-2 rounded-full bg-mint" />
          </span>
          Live
        </span>
        <span className="text-[0.62rem] uppercase tracking-[0.22em] text-cream/35">
          Auto-refreshing · updated {updatedAt}
        </span>
        <button
          type="button"
          onClick={load}
          className="ml-auto rounded-full border border-white/12 px-5 py-2 text-[0.6rem] uppercase tracking-[0.22em] text-cream/60 transition hover:border-gold hover:text-gold"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total visitors" value={t.totalVisits} sub={`${t.uniqueVisitors} unique sessions`} tone="gold" delay={0} />
        <StatCard label="Visits today" value={t.visitsToday} sub={`${t.visitsWeek} in last 7 days`} tone="violet" delay={0.06} />
        <StatCard label="Marketplace clicks" value={t.totalClicks} sub="Amazon · Flipkart · Meesho · Myntra" tone="rose" delay={0.12} />
        <StatCard label="Clicks today" value={t.clicksToday} sub={`${t.clicksWeek} in last 7 days`} tone="mint" delay={0.18} />
        <StatCard label="Click-through rate" value={t.ctr} suffix="%" sub="clicks per visit" tone="rose" delay={0.24} />
        <StatCard label="Products live" value={t.activeProducts} sub={`${t.totalProducts} total in catalogue`} tone="gold" delay={0.3} />
        <StatCard label="Featured styles" value={t.featuredProducts} sub="shown on the homepage" tone="violet" delay={0.36} />
        <StatCard label="Avg clicks / product" value={t.totalProducts ? Math.round((t.totalClicks / t.totalProducts) * 10) / 10 : 0} sub="all time" tone="mint" delay={0.42} />
      </div>

      <TrafficChart series={stats.series} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformBars byPlatform={stats.byPlatform} />
        <HourlyBars hourly={stats.hourly} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-3xl border border-white/8 bg-ink-2/60 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Most tapped products</h3>
            <Link href="/admin/products" className="text-[0.6rem] uppercase tracking-[0.22em] text-gold">
              Manage →
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {stats.topProducts.map((p, i) => {
              const img = (p.images || [])[0];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 rounded-2xl border border-white/6 bg-ink/40 p-3"
                >
                  <span className="font-display text-lg text-cream/25">{String(i + 1).padStart(2, "0")}</span>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-14 w-11 rounded-lg object-cover" />
                  ) : (
                    <div className="h-14 w-11 rounded-lg bg-white/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${p.slug}`} className="block truncate text-sm text-cream/85 hover:text-gold">
                      {p.name}
                    </Link>
                    <p className="text-[0.6rem] uppercase tracking-[0.2em] text-cream/35">
                      {formatINR(p.price)} · {p.clicksToday} today
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl">{p.clicks}</p>
                    <p className="text-[0.55rem] uppercase tracking-[0.2em] text-cream/35">taps</p>
                  </div>
                </motion.div>
              );
            })}
            {!stats.topProducts.length && <p className="text-sm text-cream/40">No products yet.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-ink-2/60 p-6">
          <h3 className="font-display text-xl">Live click stream</h3>
          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.22em] text-cream/35">Latest marketplace taps</p>
          <div className="mt-5 space-y-2">
            {stats.recentClicks.map((c) => {
              const meta = platformMeta(c.platform);
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-ink/40 px-3 py-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[0.55rem] font-bold text-ink"
                    style={{ background: meta.gradient }}
                  >
                    {meta.short}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-cream/70">{c.productName || "Product"}</span>
                  <span className="shrink-0 text-[0.55rem] uppercase tracking-[0.16em] text-cream/30">
                    {new Date(c.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
            {!stats.recentClicks.length && (
              <p className="text-sm text-cream/40">No clicks recorded yet. Tap a buy button on the storefront.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
