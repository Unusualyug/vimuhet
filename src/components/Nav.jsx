"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ScrollProgress } from "./Motion";
import { PLATFORMS } from "@/lib/constants";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop All" },
  { href: "/shop?category=kurtas", label: "Ethnic" },
  { href: "/shop?category=hoodies", label: "Street" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <ScrollProgress />
      <div className="relative z-[70] overflow-hidden border-b border-white/5 bg-ink-2/80 py-2 text-[0.6rem] uppercase tracking-[0.4em] text-cream/50">
        <div className="marquee-wrap">
          <div className="marquee-track slow">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0">
                {[
                  "Free shipping on Amazon Prime",
                  "New festive drop live",
                  "COD available on Meesho",
                  "7-day easy returns",
                  "Made in India",
                  "Up to 60% off this week",
                ].map((text) => (
                  <span key={text} className="flex items-center gap-3 px-8">
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    {text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-[60] transition-all duration-500 ${
          scrolled
            ? "glass border-b border-white/5 py-3"
            : "border-b border-transparent py-6"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <img
              src="/images/vimuhet-logo.png"
              alt="Vimuhet"
              className="h-10 w-auto rounded-md object-contain"
            />
            <span className="font-display text-xl tracking-[0.22em] text-cream transition-colors group-hover:text-gold">
              VIMUHET
            </span>
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="underline-slide text-[0.7rem] uppercase tracking-[0.28em] text-cream/65 transition-colors hover:text-cream"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {PLATFORMS.slice(0, 3).map((p) => (
              <a
                key={p.key}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.22em] text-cream/55 transition-all hover:-translate-y-0.5 hover:border-transparent hover:text-ink"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = p.gradient;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {p.label}
              </a>
            ))}
            <Link
              href="/admin"
              className="btn-shine rounded-full px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-ink animate-grad"
              style={{ background: "var(--grad)" }}
            >
              Admin
            </Link>
          </div>

          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-full border border-white/10 md:hidden"
          >
            <span
              className={`h-[1.5px] w-4 bg-cream transition-transform duration-300 ${open ? "translate-y-[6px] rotate-45" : ""}`}
            />
            <span
              className={`h-[1.5px] w-4 bg-cream transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`h-[1.5px] w-4 bg-cream transition-transform duration-300 ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
            />
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden md:hidden"
            >
              <div className="mx-5 mt-4 space-y-1 rounded-2xl border border-white/10 bg-ink-2/95 p-4">
                {LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block py-2 text-sm uppercase tracking-[0.2em] text-cream/75"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="mt-2 block rounded-xl px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink"
                  style={{ background: "var(--grad)" }}
                >
                  Admin panel
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
