export const metadata = {
  title: "VIMUHET Admin",
  description: "Product and analytics console for VIMUHET.",
};

export default function AdminLayout({ children }) {
  return <div className="min-h-screen bg-ink">{children}</div>;
}
