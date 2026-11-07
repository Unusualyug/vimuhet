import { Skeleton } from './States.jsx';
import { ProductCardSkeleton } from './ProductCard.jsx';

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--line-color)] p-4">
          <Skeleton className="h-14 w-14 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line-color)]">
      <div className="flex gap-4 bg-[var(--surface-sunken)] px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-t border-[var(--line-color)] px-4 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Product-page skeleton, sized from the real layout rather than guessed.
 *
 * Measured on the live page: the two-column grid is 1,205px tall at 1440, 1,227
 * at 1024 and 1,841 at 390 (the columns stack below `lg`). The old version drew
 * a ~500–700px block, so replacing it with real content re-laid out everything
 * beneath — a single 0.037 shift on the product page. These blocks reproduce the
 * gallery column and the info column's vertical rhythm at both breakpoints.
 */
export function DetailSkeleton() {
  return (
    <div className="grid gap-8 min-h-[1840px] sm:min-h-[1990px] lg:min-h-[1210px] lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      {/* Gallery column: 500px stage on mobile, full column height on desktop. */}
      <div className="space-y-3">
        <Skeleton className="h-[500px] w-full rounded-2xl sm:h-[560px] lg:aspect-[4/5] lg:h-auto" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-16 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Info column: stacked rows matching the real heading/price/variant/CTA
          rhythm, plus the accordion block below it. */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-14 rounded" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-5/6 rounded" />
        <div className="pt-1">
          <Skeleton className="h-3 w-16 rounded" />
          <div className="mt-2 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-12 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-12 flex-1 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default ProductGridSkeleton;

/**
 * Route-level fallback used while a lazily-loaded page chunk is in flight.
 *
 * Deliberately not a spinner: it reuses the same skeleton language as the pages
 * themselves, and — importantly — reserves a plausible page height so the
 * footer does not jump upward and then get pushed back down when the real
 * content arrives. Because <CustomerLayout> keeps the header mounted outside
 * this boundary, a navigation never blanks the whole screen.
 */
export function RouteFallback() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="mt-4 h-9 w-64 rounded-lg" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[248px_1fr] lg:gap-10">
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-4 w-28 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full rounded" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Homepage hero skeleton.
 *
 * The homepage previously reserved a fixed 440/500/560px block while the real
 * hero — copy stacked above the artwork below `lg` — is ~878px tall on a phone.
 * On any load slow enough to paint the skeleton (cold cache, throttled mobile)
 * that mismatch produced a ~0.38 layout shift, almost twice the "poor" CLS
 * threshold, right at the top of the page. These are the measured heights of
 * the real hero at each breakpoint, so the swap is now invisible.
 */
export function HeroSkeleton() {
  return (
    <div className="bg-[var(--surface-sunken)]" aria-busy="true">
      <div className="flex flex-col lg:block lg:h-[560px]">
        <div className="order-1 lg:absolute lg:inset-0 lg:order-none lg:pointer-events-none">
          <div className="container-page flex h-full items-center">
            <div className="w-full max-w-xl py-9 sm:py-11 lg:py-10">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-10 bg-[var(--accent)]/30" />
                <Skeleton className="h-2.5 w-32 rounded" />
              </div>
              <Skeleton className="h-[38px] w-[85%] rounded-lg sm:h-[56px] lg:h-[58px]" />
              <Skeleton className="mt-2 h-[38px] w-[62%] rounded-lg sm:h-[56px] lg:h-[58px]" />
              <Skeleton className="mt-5 h-3 w-[70%] rounded" />
              <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row sm:mt-8">
                <Skeleton className="h-11 w-full rounded-full min-[420px]:w-[146px] sm:h-12" />
                <Skeleton className="h-11 w-full rounded-full min-[420px]:w-[235px] sm:h-12" />
              </div>
            </div>
          </div>
        </div>
        <div className="relative order-2 aspect-[4/5] max-h-[54vh] w-full overflow-hidden sm:max-h-[62vh] lg:absolute lg:inset-0 lg:order-none lg:h-full lg:max-h-none lg:aspect-auto">
          <div className="skeleton absolute inset-0 rounded-none" />
        </div>
      </div>
    </div>
  );
}
