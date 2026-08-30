"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import ImageUploader from "./ImageUploader";
import { CATEGORIES, PLATFORMS, SIZE_OPTIONS, discountPercent, formatINR, slugify } from "@/lib/constants";
import { adminFetch } from "@/lib/admin-client";

const EMPTY = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  category: "tshirts",
  fabric: "",
  fit: "Regular",
  care: "",
  sizes: ["S", "M", "L", "XL"],
  colors: "",
  price: "",
  originalPrice: "",
  badge: "",
  rating: 48,
  inStock: true,
  featured: false,
  active: true,
  sortOrder: 0,
};

export default function ProductForm({ product }) {
  const router = useRouter();
  const editing = Boolean(product?.id);

  const [form, setForm] = useState(
    product
      ? {
          ...EMPTY,
          ...product,
          colors: Array.isArray(product.colors) ? product.colors.join(", ") : "",
          sizes: Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L", "XL"],
          price: product.price ?? "",
          originalPrice: product.originalPrice ?? "",
        }
      : EMPTY,
  );
  const [images, setImages] = useState(product?.images || []);
  const [links, setLinks] = useState(() => {
    const existing = product?.links || [];
    return PLATFORMS.map((p) => {
      const found = existing.find((l) => l.platform === p.key);
      return { platform: p.key, url: found?.url || "", price: found?.price ?? "" };
    });
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const set = (key) => (event) => {
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const slugPreview = useMemo(() => slugify(form.slug || form.name) || "product-url", [form.slug, form.name]);
  const discount = discountPercent(form.price, form.originalPrice);

  function toggleSize(size) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
    }));
  }

  function setLink(index, key, value) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setOk("");

    if (!form.name.trim()) return setError("Product name is required.");
    if (!images.length) return setError("Upload at least one product photo.");
    if (!Number(form.price)) return setError("Enter the current selling price.");
    const activeLinks = links.filter((l) => l.url.trim());
    if (!activeLinks.length) return setError("Paste at least one marketplace URL.");

    setBusy(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice: Number(form.originalPrice) || 0,
        colors: form.colors,
        images,
        links: activeLinks.map((l) => ({
          platform: l.platform,
          url: l.url.trim(),
          price: l.price === "" ? Number(form.price) : Number(l.price),
        })),
      };

      const res = await adminFetch(editing ? `/api/products/${product.id}` : "/api/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save the product.");
        setBusy(false);
        return;
      }
      setOk(editing ? "Product updated." : "Product published.");
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Panel step="1" title="Product photos" note="Select multiple images at once — they upload to Cloudinary.">
          <ImageUploader images={images} onChange={setImages} />
        </Panel>

        <Panel step="2" title="Marketplace links & prices" note="Paste the live product URL for each store. Shoppers tap and land in that app.">
          <div className="space-y-4">
            {links.map((link, i) => {
              const meta = PLATFORMS[i];
              return (
                <div key={link.platform} className="rounded-2xl border border-white/8 bg-ink/40 p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-[0.65rem] font-bold text-ink"
                      style={{ background: meta.gradient }}
                    >
                      {meta.short}
                    </span>
                    <span className="font-display text-lg">{meta.label}</span>
                    {link.url && (
                      <span className="ml-auto flex items-center gap-1.5 text-[0.55rem] uppercase tracking-[0.2em] text-mint">
                        <span className="h-1.5 w-1.5 rounded-full bg-mint" /> linked
                      </span>
                    )}
                  </div>
                  <input
                    value={link.url}
                    onChange={(e) => setLink(i, "url", e.target.value)}
                    placeholder={`${meta.url}/your-vimuhet-listing`}
                    className="mt-3 w-full rounded-xl border border-white/12 bg-ink-2/70 px-4 py-3 text-sm text-cream placeholder:text-cream/25 focus:border-gold focus:outline-none"
                  />
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <label className="block">
                      <span className="text-[0.55rem] uppercase tracking-[0.24em] text-cream/40">
                        Price on {meta.label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={link.price}
                        onChange={(e) => setLink(i, "price", e.target.value)}
                        placeholder={String(form.price || 0)}
                        className="mt-1.5 w-36 rounded-xl border border-white/12 bg-ink-2/70 px-4 py-2.5 text-sm text-cream focus:border-gold focus:outline-none"
                      />
                    </label>
                    <p className="text-[0.58rem] leading-relaxed text-cream/35">
                      Leave blank to use the main price. The lowest price is highlighted to shoppers.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel step="3" title="Description" note="This is what shoppers read on the product page.">
          <Field label="Product story">
            <textarea
              rows={5}
              value={form.description}
              onChange={set("description")}
              placeholder="Fabric feel, fit notes, styling ideas…"
              className="w-full rounded-xl border border-white/12 bg-ink-2/70 px-4 py-3 text-sm text-cream placeholder:text-cream/25 focus:border-gold focus:outline-none"
            />
          </Field>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Fabric">
              <input value={form.fabric} onChange={set("fabric")} placeholder="100% combed cotton, 240 GSM" className={inputCls} />
            </Field>
            <Field label="Fit">
              <input value={form.fit} onChange={set("fit")} placeholder="Regular / Oversized / Slim" className={inputCls} />
            </Field>
            <Field label="Care instructions">
              <input value={form.care} onChange={set("care")} placeholder="Machine wash cold" className={inputCls} />
            </Field>
            <Field label="Colours (comma separated)">
              <input value={form.colors} onChange={set("colors")} placeholder="Cloud White, Ink Black" className={inputCls} />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel step="4" title="Basics" note="Name, category and pricing shown across the storefront.">
          <Field label="Product name *">
            <input value={form.name} onChange={set("name")} placeholder="VIMUHET Everyday Cotton Tee" className={inputCls} />
          </Field>
          <div className="mt-4">
            <Field label="URL slug">
              <input value={form.slug} onChange={set("slug")} placeholder={slugPreview} className={inputCls} />
            </Field>
            <p className="mt-1.5 text-[0.58rem] text-cream/30">/product/{slugPreview}</p>
          </div>
          <div className="mt-4">
            <Field label="Tagline">
              <input value={form.tagline} onChange={set("tagline")} placeholder="240 GSM combed cotton" className={inputCls} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select value={form.category} onChange={set("category")} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key} className="bg-ink">
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Badge">
              <input value={form.badge} onChange={set("badge")} placeholder="Bestseller / New Drop" className={inputCls} />
            </Field>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Current price (₹) *">
              <input type="number" min="0" value={form.price} onChange={set("price")} placeholder="549" className={inputCls} />
            </Field>
            <Field label="Original price / MRP (₹)">
              <input
                type="number"
                min="0"
                value={form.originalPrice}
                onChange={set("originalPrice")}
                placeholder="1299"
                className={inputCls}
              />
            </Field>
          </div>

          {discount > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl border border-mint/30 bg-mint/10 px-4 py-3 text-xs text-mint"
            >
              {discount}% off · shopper pays {formatINR(form.price)} instead of {formatINR(form.originalPrice)}
            </motion.p>
          )}
        </Panel>

        <Panel step="5" title="Sizes & visibility">
          <p className="text-[0.55rem] uppercase tracking-[0.24em] text-cream/40">Available sizes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((size) => {
              const on = form.sizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`rounded-xl border px-3.5 py-2 text-[0.62rem] uppercase tracking-[0.16em] transition ${
                    on ? "border-gold bg-gold/15 text-gold" : "border-white/12 text-cream/50 hover:text-cream"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-3">
            <Check label="Live on the storefront" checked={form.active} onChange={set("active")} />
            <Check label="Feature on the homepage" checked={form.featured} onChange={set("featured")} />
            <Check label="In stock" checked={form.inStock} onChange={set("inStock")} />
          </div>

          <div className="mt-5">
            <Field label="Sort order">
              <input type="number" value={form.sortOrder} onChange={set("sortOrder")} className={inputCls} />
            </Field>
          </div>
        </Panel>

        <div className="sticky bottom-4 rounded-3xl border border-white/10 bg-ink-2/90 p-5 backdrop-blur-xl">
          {error && <p className="mb-3 rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-xs text-rose">{error}</p>}
          {ok && <p className="mb-3 rounded-xl border border-mint/30 bg-mint/10 px-4 py-3 text-xs text-mint">{ok}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="btn-shine flex-1 rounded-xl px-6 py-4 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-ink animate-grad disabled:opacity-60"
              style={{ background: "var(--grad)" }}
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Publish product"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="rounded-xl border border-white/12 px-5 py-4 text-[0.6rem] uppercase tracking-[0.2em] text-cream/55 transition hover:text-cream"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/12 bg-ink-2/70 px-4 py-3 text-sm text-cream placeholder:text-cream/25 focus:border-gold focus:outline-none";

function Panel({ step, title, note, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-white/8 bg-ink-2/50 p-6"
    >
      <div className="mb-5 flex items-start gap-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm text-ink"
          style={{ background: "var(--grad)" }}
        >
          {step}
        </span>
        <div>
          <h2 className="font-display text-xl">{title}</h2>
          {note && <p className="mt-1 text-xs text-cream/40">{note}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[0.55rem] uppercase tracking-[0.24em] text-cream/40">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-ink/40 px-4 py-3">
      <span className="text-xs text-cream/70">{label}</span>
      <span className="relative flex h-5 w-9 shrink-0 items-center">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="h-5 w-9 rounded-full bg-white/15 transition-colors peer-checked:bg-mint/60" />
        <span className="absolute left-0.5 h-4 w-4 rounded-full bg-cream transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
