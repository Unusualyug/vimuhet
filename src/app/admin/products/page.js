import AdminShell from "@/components/admin/AdminShell";
import ProductsTable from "@/components/admin/ProductsTable";
import { cloudinaryEnabled } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <AdminShell
      title="Products"
      subtitle="Toggle visibility, feature styles for the homepage, or edit photos and marketplace links."
      storageNote={
        cloudinaryEnabled
          ? "Images upload straight to Cloudinary."
          : "Images are stored in PostgreSQL until Cloudinary keys are added."
      }
    >
      <ProductsTable />
    </AdminShell>
  );
}
