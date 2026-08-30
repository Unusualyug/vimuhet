"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal, Marquee } from "@/components/Motion";
import { CATEGORIES } from "@/lib/constants";

export function SectionHeading({ eyebrow, title, copy, action }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <Reveal>
        <div>
          {eyebrow && (
            <p className="flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.4em] text-gold">
              <span className="h-[1px] w-8 bg-gold/60" />
              {eyebrow}
            </p>
          )}
          <h2 className="mt-4 max-w-xl font-display text-4xl leading-[1.05] sm:text-5xl">{title}</h2>
          {copy && <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream/50">{copy}</p>}
        </div>
      </Reveal>
      {action && (
        <Reveal delay={0.12}>
          <Link
            href={action.href}
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-[0.62rem] uppercase tracking-[0.24em] text-cream/70 transition-all hover:border-gold hover:text-gold"
          >
            {action.label}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </Reveal>
      )}
    </div>
  );
}

export function CategoryRail() {
  return (
    <div className="no-scrollbar -mx-5 flex snap-x gap-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0">
      {CATEGORIES.map((cat, i) => (
        <motion.div
          key={cat.key}
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-[62%] snap-start sm:min-w-[32%] lg:min-w-[19%]"
        >
          <Link
            href={`/shop?category=${cat.key}`}
            className="group relative flex h-52 flex-col justify-end overflow-hidden rounded-3xl border border-white/8 bg-ink-3 p-6 transition-all duration-500 hover:-translate-y-2 hover:border-gold/40"
          >
            <span
              className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-60"
              style={{ background: "var(--grad)" }}
            />
            <span className="relative text-4xl transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-110">
              {cat.emoji}
            </span>
            <h3 className="relative mt-auto pt-8 font-display text-2xl">{cat.label}</h3>
            <p className="relative text-[0.62rem] uppercase tracking-[0.24em] text-cream/40">{cat.blurb}</p>
            <span className="relative mt-3 inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.22em] text-gold opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              Explore <span>→</span>
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

export function BigMarquee() {
  const items = ["VIMUHET", "✦", "NEW DROP", "✦", "AMAZON", "✦", "FLIPKART", "✦", "MEESHO", "✦", "MYNTRA", "✦"];
  return (
    <div className="relative overflow-hidden border-y border-white/8 bg-ink-2 py-8">
      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...items, ...items].map((item, i) => (
            <span
              key={i}
              className={`shrink-0 px-6 font-display text-5xl leading-none sm:text-7xl ${
                item === "✦" ? "text-gold" : "text-cream/12"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const REVIEWS = [
  { name: "Ananya R.", city: "Bengaluru", text: "Ordered the chikankari kurta from Meesho in two taps. Fabric feels far above the price.", stars: 5 },
  { name: "Rohit M.", city: "Pune", text: "The navy hoodie is my winter default now. Thick fleece, real stitching, no pilling after 6 washes.", stars: 5 },
  { name: "Sneha K.", city: "Delhi", text: "I love that I can compare Amazon and Flipkart prices right on the VIMUHET site. Saved ₹120.", stars: 4 },
  { name: "Vikram S.", city: "Jaipur", text: "Pathani suit fit is sharp out of the bag. Got it on Prime next-day delivery.", stars: 5 },
  { name: "Meera T.", city: "Kochi", text: "Linen shirt for humid days is unbeatable. Colour exactly like the photos.", stars: 5 },
];

export function Testimonials() {
  return (
    <Marquee
      slow
      items={REVIEWS.map((r) => (
        <div
          key={r.name}
          className="mr-6 flex w-[19rem] shrink-0 flex-col justify-between rounded-3xl border border-white/8 bg-ink-2/70 p-7 sm:w-[24rem]"
        >
          <div className="flex gap-1 text-sm text-gold">{"★".repeat(r.stars)}</div>
          <p className="mt-5 text-sm leading-relaxed text-cream/70">“{r.text}”</p>
          <p className="mt-6 text-[0.62rem] uppercase tracking-[0.24em] text-cream/40">
            {r.name} · {r.city}
          </p>
        </div>
      ))}
    />
  );
}

export function Newsletter() {
  return (
    <Reveal>
      <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-ink-2 px-7 py-14 text-center sm:px-16">
        <div
          className="absolute inset-0 opacity-30 animate-grad"
          style={{ background: "var(--grad-soft)" }}
        />
        <div className="relative">
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">Drop alerts</p>
          <h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
            Be first on every <span className="text-gradient">new drop</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-cream/50">
            One email a fortnight. New styles, marketplace price drops, and early access to festive edits.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const note = form.querySelector("[data-note]");
              if (note) note.textContent = "You're on the list. Watch your inbox ✦";
              form.reset();
            }}
          >
            <input
              required
              type="email"
              placeholder="you@email.com"
              className="w-full rounded-full border border-white/12 bg-ink/60 px-6 py-4 text-sm text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              className="btn-shine shrink-0 rounded-full px-7 py-4 text-[0.62rem] font-bold uppercase tracking-[0.24em] text-ink animate-grad"
              style={{ background: "var(--grad)" }}
            >
              Join
            </button>
          </form>
          <p data-note className="mt-4 text-xs text-mint" />
        </div>
      </div>
    </Reveal>
  );
}
