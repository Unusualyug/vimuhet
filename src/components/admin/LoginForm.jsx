"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { saveAdminToken } from "@/lib/admin-client";

export default function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "jay", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid username or password");
        setBusy(false);
        return;
      }
      // Save token to localStorage — this is the primary auth mechanism
      if (data.token) {
        saveAdminToken(data.token);
        // Pass token in URL — works even when localStorage is blocked (e.g. iframes)
        window.location.href =
          "/admin?_token=" + encodeURIComponent(data.token);
      } else {
        window.location.href = "/admin";
      }
    } catch {
      setError("Network error, try again");
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <div
        className="absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full opacity-30 animate-blob"
        style={{
          background: "radial-gradient(circle,#ff5d8f,transparent 65%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-ink-2/80 p-9 backdrop-blur-xl"
      >
        <Link href="/" className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl font-display text-xl font-bold text-ink animate-grad"
            style={{ background: "var(--grad)" }}
          >
            V
          </span>
          <span className="font-display text-xl tracking-[0.2em]">VIMUHET</span>
        </Link>

        <h1 className="mt-9 font-display text-3xl">Admin sign in</h1>
        <p className="mt-2 text-sm text-cream/45">
          Manage products, store links and analytics.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-[0.58rem] uppercase tracking-[0.3em] text-cream/40">
              Username
            </span>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/12 bg-ink/60 px-4 py-3.5 text-sm text-cream focus:border-gold focus:outline-none"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="text-[0.58rem] uppercase tracking-[0.3em] text-cream/40">
              Password
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/12 bg-ink/60 px-4 py-3.5 text-sm text-cream focus:border-gold focus:outline-none"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-xs text-rose"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-shine w-full rounded-xl px-6 py-4 text-[0.64rem] font-bold uppercase tracking-[0.24em] text-ink animate-grad disabled:opacity-60"
            style={{ background: "var(--grad)" }}
          >
            {busy ? "Signing in…" : "Enter console"}
          </button>
        </form>

        <div className="mt-7 rounded-xl border border-white/8 bg-ink/50 p-4 text-[0.68rem] leading-relaxed text-cream/40">
          Credentials: <span className="text-gold">jay</span> /{" "}
          <span className="text-gold"></span>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.24em] text-cream/40 hover:text-cream"
        >
          ← Back to storefront
        </Link>
      </motion.div>
    </div>
  );
}
