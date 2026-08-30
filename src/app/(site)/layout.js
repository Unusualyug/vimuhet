import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function SiteLayout({ children }) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute -left-32 top-[-10%] h-[34rem] w-[34rem] rounded-full opacity-30 animate-blob"
          style={{ background: "radial-gradient(circle,#ff5d8f,transparent 65%)" }}
        />
        <div
          className="absolute right-[-12%] top-[35%] h-[30rem] w-[30rem] rounded-full opacity-25 animate-blob"
          style={{ background: "radial-gradient(circle,#8b5cff,transparent 65%)", animationDelay: "-6s" }}
        />
        <div
          className="absolute bottom-[-10%] left-[30%] h-[26rem] w-[26rem] rounded-full opacity-20 animate-blob"
          style={{ background: "radial-gradient(circle,#ffb15c,transparent 65%)", animationDelay: "-12s" }}
        />
      </div>
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
