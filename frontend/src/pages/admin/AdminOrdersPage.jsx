import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../api/orders.api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];

const STATUS_STYLE = {
  pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)'  },
  confirmed:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)'  },
  processing: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)'  },
  shipped:    { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.25)'   },
  delivered:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)'  },
  cancelled:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)'   },
  refunded:   { color: '#8b9098', bg: 'rgba(139,144,152,0.1)', border: 'rgba(139,144,152,0.2)'  },
};

const PAY_STYLE = {
  paid:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Paid'    },
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Pending' },
  failed:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Failed'  },
};

const AUTO_NOTES = {
  confirmed:  'Your order has been confirmed and is being prepared.',
  processing: 'Your items are being packed and quality-checked at our warehouse.',
  shipped:    'Your package has left our warehouse and is on its way to you.',
  delivered:  'Your package has been delivered. Thank you for shopping with us!',
  cancelled:  'Your order has been cancelled.',
  refunded:   'Your refund has been processed.',
};

// ── Update modal ──────────────────────────────────────────────────────────────
function UpdateModal({ order, onClose, onSave, isLoading }) {
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState('');
  const [riderName, setRiderName] = useState(order.rider_name || '');
  const [trackingNote, setTrackingNote] = useState('');

  const st = STATUS_STYLE[status] || STATUS_STYLE.pending;

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      id: order.id,
      status,
      note: note || AUTO_NOTES[status] || '',
      rider_name: riderName,
      tracking_note: trackingNote || AUTO_NOTES[status] || '',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#1c1f26', border: '1px solid #2d3139' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2d3139' }}>
          <div>
            <h3 className="font-semibold text-white text-sm">Update Order</h3>
            <p className="text-xs mt-0.5 font-mono" style={{ color: '#f59e0b' }}>{order.order_number}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: '#8b9098' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8b9098' }}>
              New Status
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_OPTIONS.map(s => {
                const ss = STATUS_STYLE[s] || STATUS_STYLE.pending;
                const active = status === s;
                return (
                  <button type="button" key={s} onClick={() => setStatus(s)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold capitalize text-left transition-all border"
                    style={{
                      background: active ? ss.bg : 'transparent',
                      color: active ? ss.color : '#8b9098',
                      borderColor: active ? ss.border : '#2d3139',
                    }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rider name — only for shipped */}
          {status === 'shipped' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8b9098' }}>
                Rider Name <span style={{ color: '#565a6a' }}>(auto-assigned if empty)</span>
              </label>
              <input
                type="text"
                value={riderName}
                onChange={e => setRiderName(e.target.value)}
                placeholder="e.g. Ali Hassan"
                className="input-dark w-full rounded-lg text-sm py-2.5 px-3"
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8b9098' }}>
              Customer Note <span style={{ color: '#565a6a' }}>(optional — auto-filled if empty)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder={AUTO_NOTES[status] || 'Add a note for the customer…'}
              className="input-dark w-full rounded-lg text-sm py-2.5 px-3 resize-none"
            />
          </div>

          {/* Custom tracking note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8b9098' }}>
              Tracking Update <span style={{ color: '#565a6a' }}>(shown on order page)</span>
            </label>
            <textarea
              value={trackingNote}
              onChange={e => setTrackingNote(e.target.value)}
              rows={2}
              placeholder={AUTO_NOTES[status] || 'e.g. Your package is in Lahore hub…'}
              className="input-dark w-full rounded-lg text-sm py-2.5 px-3 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'rgba(34,37,46,0.70)', color: '#8b9098', border: '1px solid #2d3139' }}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: isLoading ? '#2d3139' : `linear-gradient(135deg, ${st.color}, ${st.color}cc)`,
                opacity: isLoading ? 0.6 : 1,
              }}>
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [search, setSearch] = useState('');
  const [modalOrder, setModalOrder] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => ordersApi.getOrders().then(r => r.data?.results || r.data || []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => ordersApi.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      toast.success('Order updated');
      setModalOrder(null);
    },
    onError: () => toast.error('Could not update order'),
  });

  const orders = (data || []).filter(o => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (filterPayment && o.payment_status !== filterPayment) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.order_number?.toLowerCase().includes(q) && !o.customer_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const easypaisaPending = (data || []).filter(o => o.payment_method === 'easypaisa' && o.payment_status === 'pending');

  return (
    <div className="space-y-5">

      {/* Modal */}
      {modalOrder && (
        <UpdateModal
          order={modalOrder}
          onClose={() => setModalOrder(null)}
          onSave={updateMutation.mutate}
          isLoading={updateMutation.isLoading}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Orders</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8b9098' }}>Manage fulfilment and payments</p>
      </div>

      {/* Easypaisa alert */}
      {easypaisaPending.length > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              {easypaisaPending.length} Easypaisa payment{easypaisaPending.length > 1 ? 's' : ''} awaiting verification
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8b9098' }}>
              Verify in your Easypaisa app, then set order status to Confirmed.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#565a6a' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Order # or customer…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-dark pl-9 pr-3 py-2 rounded-lg text-sm w-52" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="input-dark py-2 rounded-lg text-sm" style={{ width: 160 }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          className="input-dark py-2 rounded-lg text-sm" style={{ width: 150 }}>
          <option value="">All payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        {!isLoading && (
          <span className="text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(34,37,46,0.70)', color: '#8b9098', border: '1px solid #2d3139' }}>
            {orders.length} result{orders.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(28,31,38,0.65)' }} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && orders.length === 0 && (
        <div className="text-center py-20 rounded-xl" style={{ background: 'rgba(28,31,38,0.65)', border: '1px dashed #2d3139' }}>
          <p className="text-sm font-medium" style={{ color: '#565a6a' }}>No orders found</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && orders.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(34,37,46,0.70)' }}>
              <tr>
                {['Order','Customer','Date','Est. Delivery','Status','Payment','Total',''].map((h, i) => (
                  <th key={i} className={`text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider ${['Customer','Date','Est. Delivery'].includes(h) ? 'hidden lg:table-cell' : ''}`}
                    style={{ color: '#8b9098', borderBottom: '1px solid #2d3139' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const st = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
                const pt = PAY_STYLE[order.payment_status] || PAY_STYLE.pending;
                return (
                  <tr key={order.id} className="hover:bg-[#22252e] transition-colors" style={{ borderTop: '1px solid #2d3139' }}>

                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold" style={{ color: '#f59e0b' }}>
                        {order.order_number}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-white"
                          style={{ background: '#3b82f6' }}>
                          {(order.customer_name || order.user?.first_name || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-sm" style={{ color: '#d1d5db' }}>
                          {order.customer_name || order.user?.first_name || '—'}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs tabular-nums" style={{ color: '#8b9098' }}>
                      {new Date(order.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs tabular-nums" style={{ color: order.estimated_delivery ? '#10b981' : '#565a6a' }}>
                      {order.estimated_delivery
                        ? new Date(order.estimated_delivery + 'T00:00:00').toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })
                        : '—'}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border"
                        style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                        {order.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: pt.bg, color: pt.color }}>
                        {pt.label}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-semibold tabular-nums text-sm text-white">
                      PKR {Number(order.total_amount).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5">
                      <button onClick={() => setModalOrder(order)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        style={{ background: 'rgba(34,37,46,0.70)', color: '#8b9098', border: '1px solid #2d3139' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#2d3139'; e.currentTarget.style.color = '#f1f2f4'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#22252e'; e.currentTarget.style.color = '#8b9098'; }}>
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
