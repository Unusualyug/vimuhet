import { useEffect, useState } from 'react';
import { Check, MessageSquare, Star, Trash2, X } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { FilterSelect, Panel, SearchInput, StatCard, StatusPill, TablePagination } from '../../components/admin/AdminUI.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { Rating } from '../../components/ui/Rating.jsx';
import { Textarea } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { formatDate, initials } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export default function AdminReviews() {
  useDocumentTitle('Reviews', 'Moderate customer reviews.');
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const [responding, setResponding] = useState(null);
  const [response, setResponse] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .reviews({ q, status, rating, page, limit: 12 })
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta || {});
      })
      .catch((err) => toast(apiErrorMessage(err, 'Could not load reviews'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, status, rating, page]);

  const moderate = async (row, next) => {
    try {
      await adminApi.moderateReview(row._id, { status: next });
      toast(next === 'APPROVED' ? 'Review published' : 'Review rejected');
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const sendResponse = async () => {
    setBusy(true);
    try {
      await adminApi.moderateReview(responding._id, { adminResponse: response });
      toast('Response saved');
      setResponding(null);
      setResponse('');
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteReview(deleting._id);
      toast('Review deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const counts = meta.counts || {};

  return (
    <div>
      <AdminPageHeader title="Reviews" subtitle="Approve, respond to and moderate customer feedback" breadcrumb="Engagement" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Pending" value={counts.PENDING ?? '0'} icon={Star} tone="amber" loading={loading && !meta.counts} />
        <StatCard label="Approved" value={counts.APPROVED ?? '0'} icon={Check} tone="green" loading={loading && !meta.counts} />
        <StatCard label="Rejected" value={counts.REJECTED ?? '0'} icon={X} tone="red" loading={loading && !meta.counts} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search review text…" className="min-w-[180px] flex-1 sm:max-w-xs" />
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} placeholder="All statuses" options={[{ value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]} />
        <FilterSelect value={rating} onChange={(v) => { setRating(v); setPage(1); }} placeholder="Any rating" options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star` }))} />
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-[var(--surface-sunken)]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Panel>
          <p className="py-10 text-center text-[12.5px] text-[var(--ink-muted)]">No reviews in this view.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <article key={r._id} className="flex flex-col rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-semibold text-[var(--accent)]">
                  {initials(r.customerName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-[var(--ink)]">{r.customerName}</p>
                  <p className="truncate text-[10.5px] text-[var(--ink-muted)]">{r.product?.name} · {formatDate(r.createdAt)}</p>
                </div>
                <StatusPill tone={r.status === 'APPROVED' ? 'green' : r.status === 'REJECTED' ? 'red' : 'amber'}>{r.status}</StatusPill>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Rating value={r.rating} showValue={false} size={12} />
                {r.verifiedPurchase && <span className="text-[9.5px] uppercase tracking-[0.08em] text-[#2F7A4D] dark:text-emerald-400">Verified</span>}
              </div>

              {r.title && <p className="mt-2 text-[12.5px] font-medium text-[var(--ink)]">{r.title}</p>}
              <p className="mt-1 line-clamp-4 text-[12px] leading-relaxed text-[var(--ink-muted)]">{r.comment}</p>

              {r.adminResponse && (
                <div className="mt-2 rounded-lg bg-[var(--surface-sunken)] p-2.5">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Your response</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">{r.adminResponse}</p>
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                {r.status !== 'APPROVED' && (
                  <button onClick={() => moderate(r, 'APPROVED')} className="inline-flex items-center gap-1 rounded-md bg-[#2F7A4D] px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white hover:bg-[#27653f]">
                    <Check size={11} /> Approve
                  </button>
                )}
                {r.status !== 'REJECTED' && (
                  <button onClick={() => moderate(r, 'REJECTED')} className="inline-flex items-center gap-1 rounded-md border border-[var(--line-color)] px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)] hover:border-red-300 hover:text-red-600">
                    <X size={11} /> Reject
                  </button>
                )}
                <button onClick={() => { setResponding(r); setResponse(r.adminResponse || ''); }} className="inline-flex items-center gap-1 rounded-md border border-[var(--line-color)] px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  <MessageSquare size={11} /> Respond
                </button>
                <button onClick={() => setDeleting(r)} className="ml-auto rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-4">
        <TablePagination page={meta.page || 1} totalPages={meta.totalPages || 1} total={meta.total} onChange={setPage} />
      </div>

      <Modal open={Boolean(responding)} onClose={() => setResponding(null)} title="Respond to review" size="sm">
        <Textarea label="Public response" rows={4} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Thank the customer or address their concern…" />
        <p className="mt-2 text-[10.5px] text-[var(--ink-muted)]">Responses appear directly under the review on the product page.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setResponding(null)}>Cancel</Button>
          <Button onClick={sendResponse} loading={busy} disabled={!response.trim()}>Save response</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete this review?"
        message="The product rating will be recalculated immediately. This cannot be undone."
        confirmLabel="Delete review"
      />
    </div>
  );
}
