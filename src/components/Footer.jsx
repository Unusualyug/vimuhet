"use client";

import Link from "next/link";
import { Marquee } from "./Motion";
import { CATEGORIES, PLATFORMS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/5 bg-ink-2">
      <div
        className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full opacity-25 animate-blob"
        style={{
          background: "radial-gradient(circle,#8b5cff,transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/">
              <img
                src="/images/vimuhet-logo.png"
                alt="Vimuhet"
                className="h-14 w-auto object-contain"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/50">
              A modern Indian clothing label. We design, you choose your
              marketplace — every piece is one tap away on Amazon, Flipkart,
              Meesho and Myntra.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <a
                  key={p.key}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.2em] text-cream/60 transition hover:-translate-y-0.5 hover:text-ink"
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
            </div>
          </div>

          <FooterCol
            title="Shop"
            items={CATEGORIES.map((c) => ({
              label: c.label,
              href: `/shop?category=${c.key}`,
            }))}
          />
          <FooterCol
            title="Company"
            items={[
              { label: "Shop all", href: "/shop" },
              { label: "Admin panel", href: "/admin" },
              { label: "Analytics", href: "/admin" },
              { label: "Home", href: "/" },
            ]}
          />
          <div>
            <h4 className="text-[0.62rem] uppercase tracking-[0.35em] text-gold">
              Support
            </h4>
            <ul className="mt-5 space-y-3 text-sm text-cream/55">
              <li>hello@vimuhet.in</li>
              <li>Mon–Sat, 10am – 7pm IST</li>
              <li>Surat · Gujarat · India</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-y border-white/5 py-5 text-[0.7rem] uppercase tracking-[0.4em] text-cream/25">
        <Marquee
          items={[
            "Made in India",
            "Small-batch production",
            "Fair wages",
            "Low waste",
            "Ship across India",
          ]}
          slow
        />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-cream/35 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} VIMUHET. All rights reserved.</p>
        <p>Next.js · Node · React · PostgreSQL · Cloudinary</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <h4 className="text-[0.62rem] uppercase tracking-[0.35em] text-gold">
        {title}
      </h4>
      <ul className="mt-5 space-y-3 text-sm">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-cream/55 transition-colors hover:text-cream"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
