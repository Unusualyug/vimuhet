import AdminShell from "@/components/admin/AdminShell";
import ProductForm from "@/components/admin/ProductForm";
import { cloudinaryEnabled } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <AdminShell
      title="Add a product"
      subtitle="Upload photos, paste the Amazon / Flipkart / Meesho URLs, set the price and publish."
      storageNote={
        cloudinaryEnabled
          ? "Photos upload to Cloudinary as soon as you select them."
          : "Photos are stored in PostgreSQL (add Cloudinary keys to switch)."
      }
    >
      <ProductForm />
    </AdminShell>
  );
}
