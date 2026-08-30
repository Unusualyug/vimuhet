import Link from "next/link";
import Hero from "@/components/home/Hero";
import Spotlight from "@/components/home/Spotlight";
import ProductCard from "@/components/ProductCard";
import { PlatformStrip } from "@/components/PlatformButtons";
import { BigMarquee, CategoryRail, Newsletter, SectionHeading, Testimonials } from "@/components/home/Sections";
import { Reveal } from "@/components/Motion";
import { getStats, listProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, featured, stats] = await Promise.all([
    listProducts({ limit: 8 }),
    listProducts({ featured: true, limit: 6 }),
    getStats(),
  ]);

  const spotlight = featured[0] || products[0];
  const grid = (featured.length > 1 ? featured.slice(1, 7) : products.slice(1, 7)).filter(Boolean);
  const trending = products.slice(0, 8);

  return (
    <>
      <Hero products={products.slice(0, 3)} stats={stats.totals} />

      <section id="marketplaces" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="Where to buy"
          title="One label, four marketplaces"
          copy="Tap any product and we hand you straight to the VIMUHET listing inside the shopping app you already use — with the live price on that platform."
        />
        <div className="mt-12">
          <PlatformStrip />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <SectionHeading
          eyebrow="Categories"
          title="Built around how you dress"
          action={{ href: "/shop", label: "Browse everything" }}
        />
        <div className="mt-12">
          <CategoryRail />
        </div>
      </section>

      <BigMarquee />

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <SectionHeading
          eyebrow="Trending now"
          title="What India is wearing this week"
          action={{ href: "/shop", label: "Shop all styles" }}
        />
        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-7 lg:grid-cols-4">
          {trending.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} priority={i < 4} />
          ))}
        </div>
      </section>

      {spotlight && (
        <section className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div
            className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full opacity-25 animate-blob"
            style={{ background: "radial-gradient(circle,#ffb15c,transparent 65%)" }}
          />
          <div className="relative">
            <Spotlight product={spotlight} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="Editor's picks"
          title="The pieces we keep re-stocking"
          action={{ href: "/shop?sort=discount", label: "Biggest discounts" }}
        />
        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-7 lg:grid-cols-3">
          {grid.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </section>

      <section className="py-16">
        <Testimonials />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: "🚚", title: "Fast marketplace delivery", copy: "Prime, Flipkart Plus and Meesho Next Day — you pick the speed." },
            { icon: "🔁", title: "7-day easy returns", copy: "Every listing follows the marketplace return policy. No arguments." },
            { icon: "🇮🇳", title: "Made in India", copy: "Cut, stitched and finished in Surat by a team we know by name." },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <div className="card-hover h-full rounded-3xl border border-white/8 bg-ink-2/60 p-7">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="mt-5 font-display text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/50">{item.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
        <Newsletter />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-[32px] border border-white/10 bg-ink-2/60 p-9 sm:flex-row sm:items-center">
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-gold">For the VIMUHET team</p>
              <h3 className="mt-3 font-display text-3xl">Upload products, track every click</h3>
              <p className="mt-2 max-w-xl text-sm text-cream/50">
                The admin panel adds styles, attaches Amazon / Flipkart / Meesho links and shows live visitor and
                marketplace-click analytics.
              </p>
            </div>
            <Link
              href="/admin"
              className="btn-shine shrink-0 rounded-full px-8 py-4 text-[0.64rem] font-bold uppercase tracking-[0.24em] text-ink animate-grad"
              style={{ background: "var(--grad)" }}
            >
              Open admin
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
