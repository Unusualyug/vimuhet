import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Camera, Loader2 } from 'lucide-react';
import Rating, { RatingBars } from '../ui/Rating.jsx';
import Button from '../ui/Button.jsx';
import { catalogApi, accountApi } from '../../services/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Pagination } from '../ui/States.jsx';
import { formatDate } from '../../utils/format.js';

export default function ReviewsPanel({ product }) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState('');
  const [loading, setLoading] = useState(true);
  // Whether this signed-in customer has a delivered order for this product and
  // has not reviewed it yet — drives the "Write a review" call to action below.
  const [canReview, setCanReview] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setCanReview(false);
      return undefined;
    }
    let alive = true;
    accountApi
      .reviewable()
      .then((res) => {
        if (!alive) return;
        const list = res.data || [];
        setCanReview(list.some((item) => String(item.product?._id) === String(product._id)));
      })
      .catch(() => alive && setCanReview(false));
    return () => {
      alive = false;
    };
  }, [user, product._id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    catalogApi
      .reviews(product._id, { page, limit: 6, ...(ratingFilter ? { rating: ratingFilter } : {}) })
      .then((res) => {
        if (!alive) return;
        setData(res.data || []);
        setMeta(res.meta || null);
      })
      .catch(() => alive && setData([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [product._id, page, ratingFilter]);

  const total = product.reviewCount || 0;

  return (
    <div id="reviews" className="scroll-mt-28">
      <h2 className="mb-5 font-display text-2xl">Reviews {total > 0 && <span className="text-[var(--ink-muted)]">({total})</span>}</h2>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl leading-none">{(product.rating || 0).toFixed(1)}</span>
            <span className="pb-1 text-[11px] text-[var(--ink-muted)]">/ 5</span>
          </div>
          <Rating value={product.rating} showValue={false} size={14} className="mt-1.5" />
          <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">Based on {total} verified reviews</p>
          <div className="mt-4">
            <RatingBars breakdown={product.ratingBreakdown || [0, 0, 0, 0, 0]} total={total} />
          </div>
          <div className="mt-4 space-y-1.5 border-t border-[var(--line-color)] pt-4">
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRatingFilter(String(r) === ratingFilter ? '' : String(r));
                  setPage(1);
                }}
                className={`block w-full rounded px-2 py-1 text-left text-[12px] transition ${
                  String(r) === ratingFilter ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]'
                }`}
              >
                {r} star{r > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          {canReview ? (
            <div className="mt-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)]/40 p-3">
              <p className="text-[11.5px] leading-relaxed text-[var(--ink)]">
                Your order for this piece has been delivered — you can share your experience with other shoppers.
              </p>
              <Button to="/account/reviews" size="sm" className="mt-2.5 w-full">
                Write a review
              </Button>
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-[var(--surface-sunken)] p-3 text-[11px] leading-relaxed text-[var(--ink-muted)]">
              {user ? (
                <>
                  Only customers who purchased and received this piece can write a review.{' '}
                  <Link to="/account/orders" className="text-[var(--accent)] underline-offset-2 hover:underline">
                    View your orders
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-[var(--accent)] underline-offset-2 hover:underline">
                    Sign in
                  </Link>{' '}
                  to write a review — only verified buyers can.
                </>
              )}
            </p>
          )}
        </div>

        <div>
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-[var(--ink-muted)]">
              <Loader2 size={16} className="animate-spin" /> Loading reviews…
            </div>
          ) : data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--line-color)] px-5 py-10 text-center text-sm text-[var(--ink-muted)]">
              No reviews {ratingFilter ? `for ${ratingFilter} stars` : 'yet'} — be the first once your order arrives.
            </div>
          ) : (
            <ul className="space-y-5">
              {data.map((r) => (
                <li key={r._id} className="border-b border-[var(--line-color)] pb-5 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rating value={r.rating} showValue={false} size={12} />
                    {r.title && <p className="text-[13.5px] font-semibold text-[var(--ink)]">{r.title}</p>}
                    {r.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#2F7A4D]/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#2F7A4D] dark:text-emerald-400">
                        <BadgeCheck size={10} /> Verified
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">{r.comment}</p>
                  {r.images?.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {r.images.map((img, i) => (
                        <img key={i} src={img.url} alt="Customer photo" className="h-16 w-14 rounded-md object-cover" loading="lazy" />
                      ))}
                    </div>
                  )}
                  <p className="mt-2.5 flex items-center gap-2 text-[11px] text-[var(--ink-muted)]">
                    <span className="font-medium text-[var(--ink)]">{r.customerName}</span> · {formatDate(r.createdAt)}
                    {r.images?.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                        <Camera size={11} /> Photo review
                      </span>
                    )}
                  </p>
                  {r.adminResponse && (
                    <div className="mt-3 rounded-lg border-l-2 border-[var(--accent)] bg-[var(--surface-sunken)] px-3 py-2 text-[12px] text-[var(--ink-muted)]">
                      <span className="font-semibold text-[var(--ink)]">Vimuhet:</span> {r.adminResponse}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {meta?.totalPages > 1 && (
            <div className="mt-6">
              <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
