"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import AdminGate from "./AdminGate";
import { clearAdminToken } from "@/lib/admin-client";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "◎" },
  { href: "/admin/products", label: "Products", icon: "▤" },
  { href: "/admin/products/new", label: "Add product", icon: "＋" },
];

export default function AdminShell({ children, title, subtitle, storageNote }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    clearAdminToken();
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  }

  return (
    <AdminGate>
      <div className="min-h-screen bg-ink text-cream">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div
            className="absolute left-[-10%] top-[-10%] h-[26rem] w-[26rem] rounded-full opacity-25 animate-blob"
            style={{
              background: "radial-gradient(circle,#8b5cff,transparent 65%)",
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[-6%] h-[24rem] w-[24rem] rounded-full opacity-20 animate-blob"
            style={{
              background: "radial-gradient(circle,#ff5d8f,transparent 65%)",
              animationDelay: "-8s",
            }}
          />
        </div>

        <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
          <aside className="lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-r lg:border-white/8">
            <div className="flex items-center justify-between gap-4 p-6">
              <Link href="/" className="flex items-center gap-3">
                <img
                  src="/images/vimuhet-logo.png"
                  alt="Vimuhet"
                  className="h-10 w-auto rounded-md object-contain"
                />
                <span className="block text-[0.55rem] uppercase tracking-[0.3em] text-cream/35">
                  Admin console
                </span>
              </Link>
            </div>

            <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:overflow-visible lg:px-4">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                      active
                        ? "text-ink"
                        : "text-cream/60 hover:bg-white/5 hover:text-cream"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="adminNav"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: "var(--grad)" }}
                        transition={{
                          type: "spring",
                          stiffness: 340,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10 text-base">{item.icon}</span>
                    <span className="relative z-10 whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
              <Link
                href="/"
                className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm text-cream/45 transition-colors hover:bg-white/5 hover:text-cream"
              >
                <span className="text-base">↗</span>
                <span className="whitespace-nowrap">View storefront</span>
              </Link>
            </nav>

            <div className="hidden px-6 lg:block">
              <div className="rounded-2xl border border-white/8 bg-ink-2/60 p-4">
                <p className="text-[0.55rem] uppercase tracking-[0.28em] text-gold">
                  Image storage
                </p>
                <p className="mt-2 text-xs leading-relaxed text-cream/50">
                  {storageNote}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                disabled={busy}
                className="mt-4 w-full rounded-xl border border-white/10 px-4 py-3 text-[0.62rem] uppercase tracking-[0.24em] text-cream/60 transition hover:border-rose hover:text-rose disabled:opacity-50"
              >
                {busy ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-5 pb-20 pt-6 sm:px-8">
            <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-4xl leading-none sm:text-5xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-3 max-w-2xl text-sm text-cream/45">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={logout}
                className="self-start rounded-full border border-white/10 px-5 py-2.5 text-[0.6rem] uppercase tracking-[0.22em] text-cream/55 transition hover:border-rose hover:text-rose lg:hidden"
              >
                Sign out
              </button>
            </header>
            {children}
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
