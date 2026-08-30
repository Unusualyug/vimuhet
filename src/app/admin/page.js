import AdminShell from "@/components/admin/AdminShell";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { cloudinaryEnabled } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <AdminShell
      title="Store performance"
      subtitle="Every storefront visit and every Amazon / Flipkart / Meesho tap, counted live."
      storageNote={
        cloudinaryEnabled
          ? "Connected to Cloudinary. Uploaded product photos are stored in your Cloudinary cloud."
          : "Cloudinary keys not found, so photos are stored in PostgreSQL and served from /api/uploads. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to switch to Cloudinary."
      }
    >
      <AdminDashboard />
    </AdminShell>
  );
}
