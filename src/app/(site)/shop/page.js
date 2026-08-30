import ShopClient from "@/components/shop/ShopClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop all — VIMUHET",
  description: "Browse every VIMUHET style with live Amazon, Flipkart and Meesho prices.",
};

export default async function ShopPage({ searchParams }) {
  const params = await searchParams;
  const category = typeof params?.category === "string" ? params.category : "all";
  return <ShopClient initialCategory={category} />;
}
