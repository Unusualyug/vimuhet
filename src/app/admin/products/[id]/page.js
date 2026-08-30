import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";
import { getProductById } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }) {
  const { id } = await params;
  const found = await getProductById(id);
  if (!found) notFound();

  const { createdAt, updatedAt, views, discount, bestPrice, platforms, ...product } = found;

  return (
    <AdminShell
      title="Edit product"
      subtitle={product.name}
      storageNote="Replace photos, tweak prices per marketplace, or flip the live switch."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 text-[0.6rem] uppercase tracking-[0.22em]">
        <span className="rounded-full border border-white/12 px-4 py-2 text-cream/45">{views} product views</span>
        <Link
          href={`/product/${product.slug}`}
          className="rounded-full border border-white/12 px-4 py-2 text-cream/60 transition hover:border-gold hover:text-gold"
        >
          View on storefront →
        </Link>
      </div>
      <ProductForm product={product} />
    </AdminShell>
  );
}
