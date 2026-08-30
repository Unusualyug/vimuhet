import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-[6rem] leading-none text-cream/10">404</p>
      <h1 className="font-display text-4xl">This piece has moved</h1>
      <p className="max-w-sm text-sm text-cream/50">
        The page you were looking for is not here. Browse the live catalogue instead.
      </p>
      <Link
        href="/shop"
        className="btn-shine rounded-full px-8 py-4 text-[0.64rem] font-bold uppercase tracking-[0.24em] text-ink animate-grad"
        style={{ background: "var(--grad)" }}
      >
        Shop all styles
      </Link>
    </div>
  );
}
