import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reviewsApi } from '../../api/reviews.api';
import toast from 'react-hot-toast';

const FILTERS = [
  { key: '',         label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending',  label: 'Pending' },
];

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className="w-3.5 h-3.5" fill={s <= rating ? '#f59e0b' : '#2d3139'} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', status, search],
    queryFn: () => reviewsApi.getAllReviews({ status: status || undefined, search: search || undefined })
      .then((r) => r.data?.results || r.data || []),
  });

  const reviews = data || [];

  const approveMutation = useMutation({
    mutationFn: (id) => reviewsApi.approveReview(id),
    onSuccess: () => { queryClient.invalidateQueries(['admin-reviews']); toast.success('Review approved'); },
    onError: () => toast.error('Could not approve review'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => reviewsApi.deleteReview(id),
    onSuccess: () => { queryClient.invalidateQueries(['admin-reviews']); toast.success('Review deleted'); },
    onError: () => toast.error('Could not delete review'),
  });

  function handleDelete(r) {
    if (window.confirm(`Delete ${r.user_name}'s review of "${r.product_name}"? This cannot be undone.`)) {
      deleteMutation.mutate(r.id);
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Reviews</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8b9098' }}>
          Every review comes from a real, verified-purchase account. Approve, reject, or remove.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStatus(f.key)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              style={status === f.key
                ? { background: '#f1f2f4', color: '#0a0c10' }
                : { background: 'transparent', color: '#8b9098' }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#565a6a' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Reviewer, email or product…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9 pr-3 py-2 rounded-lg text-sm w-64" />
        </div>

        {!isLoading && (
          <span className="text-xs font-medium px-2.5 py-1.5 rounded-lg"
            style={{ background: 'rgba(34,37,46,0.70)', color: '#8b9098', border: '1px solid #2d3139' }}>
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'rgba(28,31,38,0.65)' }} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-20 rounded-xl" style={{ background: 'rgba(28,31,38,0.65)', border: '1px dashed #2d3139' }}>
          <p className="text-sm font-medium" style={{ color: '#565a6a' }}>No reviews found</p>
        </div>
      )}

      {/* List */}
      {!isLoading && reviews.length > 0 && (
        <div className="space-y-2.5">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl p-4"
              style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
              <div className="flex items-start justify-between gap-4">

                {/* Left: reviewer + content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: '#8b5cf6' }}>
                      {(r.user_name || '?')[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm" style={{ color: '#f1f2f4' }}>{r.user_name || 'Unknown'}</span>
                    <span className="font-mono text-[11px]" style={{ color: '#565a6a' }}>{r.user_email}</span>
                    {r.verified_purchase && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Stars rating={r.rating} />
                    <Link to={`/products/${r.product_slug}`} target="_blank"
                      className="text-xs truncate hover:underline" style={{ color: '#8b9098' }}>
                      {r.product_name}
                    </Link>
                  </div>

                  {(r.title || r.body) && (
                    <p className="text-sm mt-2" style={{ color: '#c9ccd2' }}>
                      {r.title && <span className="font-semibold" style={{ color: '#f1f2f4' }}>"{r.title}" </span>}
                      {r.body}
                    </p>
                  )}

                  <p className="text-[10px] mt-2" style={{ color: '#3d424e' }}>
                    {new Date(r.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Right: status + actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border"
                    style={r.is_approved
                      ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }
                      : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.is_approved ? '#10b981' : '#f59e0b' }} />
                    {r.is_approved ? 'Approved' : 'Pending'}
                  </span>

                  <div className="flex items-center gap-2">
                    {!r.is_approved && (
                      <button onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                        Approve
                      </button>
                    )}
                    <button onClick={() => handleDelete(r)} disabled={deleteMutation.isLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                      Delete
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
