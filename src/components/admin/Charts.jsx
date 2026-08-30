"use client";

import { motion } from "framer-motion";
import { platformMeta } from "@/lib/constants";

/** Animated dual-line area chart for visits vs marketplace clicks. */
export function TrafficChart({ series = [] }) {
  const w = 760;
  const h = 240;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const max = Math.max(4, ...series.map((s) => Math.max(s.visits, s.clicks)));
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const step = series.length > 1 ? innerW / (series.length - 1) : innerW;

  const toPoint = (value, i) => [pad.left + i * step, pad.top + innerH - (value / max) * innerH];

  const line = (key) =>
    series.map((s, i) => toPoint(s[key], i)).reduce((acc, [x, y], idx) => `${acc}${idx ? "L" : "M"}${x},${y}`, "");
  const area = (key) => {
    if (!series.length) return "";
    const points = series.map((s, i) => toPoint(s[key], i));
    return `${points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")} L${points[points.length - 1][0]},${
      pad.top + innerH
    } L${points[0][0]},${pad.top + innerH} Z`;
  };

  return (
    <div className="rounded-3xl border border-white/8 bg-ink-2/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl">Traffic & clicks · last 14 days</h3>
          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.22em] text-cream/35">Storefront visits vs store taps</p>
        </div>
        <div className="flex gap-5 text-[0.6rem] uppercase tracking-[0.2em] text-cream/45">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold" /> Visits
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose" /> Clicks
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="mt-5 w-full" preserveAspectRatio="none" style={{ height: 240 }}>
        <defs>
          <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9b26a" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#e9b26a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="clickFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5d8f" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#ff5d8f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad.left}
            x2={w - pad.right}
            y1={pad.top + innerH * t}
            y2={pad.top + innerH * t}
            stroke="rgba(248,243,234,0.07)"
            strokeWidth="1"
          />
        ))}

        <motion.path
          d={area("visits")}
          fill="url(#visitFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        <motion.path
          d={area("clicks")}
          fill="url(#clickFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.15 }}
        />
        <motion.path
          d={line("visits")}
          fill="none"
          stroke="#e9b26a"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
        <motion.path
          d={line("clicks")}
          fill="none"
          stroke="#ff5d8f"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, delay: 0.2, ease: "easeInOut" }}
        />

        {series.map((s, i) => {
          const [x, y] = toPoint(s.clicks, i);
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#ff5d8f" opacity={0.85} />;
        })}

        {series.map((s, i) =>
          i % 2 === 0 ? (
            <text
              key={s.label}
              x={pad.left + i * step}
              y={h - 6}
              fill="rgba(248,243,234,0.35)"
              fontSize="10"
              textAnchor="middle"
            >
              {s.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function PlatformBars({ byPlatform = [] }) {
  const max = Math.max(1, ...byPlatform.map((p) => p.clicks));
  if (!byPlatform.length) {
    return (
      <div className="rounded-3xl border border-white/8 bg-ink-2/60 p-6 text-sm text-cream/45">
        No marketplace clicks yet — share a product link to get started.
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-white/8 bg-ink-2/60 p-6">
      <h3 className="font-display text-xl">Clicks by marketplace</h3>
      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.22em] text-cream/35">Where shoppers check out</p>
      <div className="mt-6 space-y-5">
        {byPlatform.map((row, i) => {
          const meta = platformMeta(row.platform);
          return (
            <div key={row.platform}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-cream/75">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: meta.gradient }} />
                  {meta.label}
                </span>
                <span className="font-display text-base text-cream">{row.clicks}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: meta.gradient }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(row.clicks / max) * 100}%` }}
                  transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HourlyBars({ hourly = [] }) {
  const max = Math.max(1, ...hourly.map((h) => h.visits));
  return (
    <div className="rounded-3xl border border-white/8 bg-ink-2/60 p-6">
      <h3 className="font-display text-xl">Visits by hour</h3>
      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.22em] text-cream/35">Last 12 hours</p>
      <div className="mt-6 flex h-36 items-end gap-1.5">
        {hourly.map((h, i) => (
          <div key={`${h.label}-${i}`} className="flex flex-1 flex-col items-center gap-2">
            <motion.div
              className="w-full rounded-t-md"
              style={{ background: "linear-gradient(180deg,#8b5cff,#ff5d8f)" }}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (h.visits / max) * 100)}%` }}
              transition={{ duration: 0.8, delay: i * 0.04 }}
            />
            <span className="text-[0.5rem] text-cream/30">{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
