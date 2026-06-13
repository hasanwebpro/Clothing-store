import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../../api/orders.api';
import toast from 'react-hot-toast';
import {
  IconShoppingCart, IconCheckCircle, IconCube, IconTruck, IconHome,
  IconXCircle, IconBanknotes, IconClipboard, IconArrowReturn, IconArrowPath, IconSparkles,
} from '../../../components/ui/Icons';

const CANCEL_REASONS = [
  { value: 'changed_mind',       label: 'Changed my mind' },
  { value: 'wrong_item',         label: 'Ordered the wrong item' },
  { value: 'better_price',       label: 'Found a better price elsewhere' },
  { value: 'shipping_too_slow',  label: 'Shipping takes too long' },
  { value: 'duplicate_order',    label: 'Duplicate / accidental order' },
  { value: 'other',              label: 'Other' },
];

// ── Cancel order modal ────────────────────────────────────────────────────────
function CancelModal({ orderNumber, onClose, onConfirm, isLoading }) {
  const [reason, setReason] = useState('changed_mind');
  const [note, setNote] = useState('');

  function handleSubmit() {
    const text = note.trim() ? `${reason}: ${note.trim()}` : reason;
    onConfirm(text);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50">
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 text-sm">Cancel Order</h3>
              <p className="text-xs text-neutral-400 font-mono">{orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Warning */}
          <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-red-700">This action cannot be undone. Your order will be cancelled immediately.</span>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Why are you cancelling?
            </label>
            <div className="mt-2 space-y-1.5">
              {CANCEL_REASONS.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                    reason === r.value
                      ? 'border-red-300 bg-red-50'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}>
                  <input
                    type="radio"
                    name="cancel_reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-red-500 flex-shrink-0"
                  />
                  <span className={`text-sm ${reason === r.value ? 'text-red-700 font-medium' : 'text-neutral-700'}`}>
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Additional details <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Tell us more…"
              className="input mt-2 w-full resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary py-2.5">
              Keep Order
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}
            >
              {isLoading ? 'Cancelling…' : 'Cancel Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const RETURN_KINDS = [
  { value: 'return',   label: 'Return Item',   desc: 'Send it back',    icon: <IconArrowReturn className="w-5 h-5 text-brand-500" /> },
  { value: 'refund',   label: 'Refund',        desc: 'Get money back',  icon: <IconBanknotes className="w-5 h-5 text-emerald-500" /> },
  { value: 'exchange', label: 'Exchange',      desc: 'Swap for another', icon: <IconArrowPath className="w-5 h-5 text-blue-500" /> },
];
const RETURN_REASONS = [
  { value: 'wrong_size',       label: 'Wrong size / does not fit' },
  { value: 'damaged',          label: 'Arrived damaged or defective' },
  { value: 'wrong_item',       label: 'Received the wrong item' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'changed_mind',     label: 'Changed my mind' },
  { value: 'other',            label: 'Other' },
];
const RETURN_STATUS_STYLE = {
  requested: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Requested' },
  approved:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Approved' },
  rejected:  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Rejected' },
  completed: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Completed' },
};

// ── Return / refund / exchange request modal ─────────────────────────────────
function ReturnModal({ orderId, onClose, onDone }) {
  const [kind, setKind] = useState('return');
  const [reason, setReason] = useState('wrong_size');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => ordersApi.requestReturn(orderId, { kind, reason, customer_note: note }),
    onSuccess: () => { toast.success('Request submitted'); onDone(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not submit request'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-900">Request Return / Refund</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Kind */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">What would you like to do?</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {RETURN_KINDS.map(k => (
                <button key={k.value} type="button" onClick={() => setKind(k.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${kind === k.value ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                  <div className="flex items-center justify-center mb-0.5">{k.icon}</div>
                  <div className="text-xs font-semibold text-neutral-800 mt-1">{k.label}</div>
                  <div className="text-[10px] text-neutral-400">{k.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="input mt-2 w-full">
              {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Details (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Tell us more…" className="input mt-2 w-full resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary py-2.5">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isLoading}
              className="flex-1 btn-primary py-2.5">
              {mutation.isLoading ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status pipeline ────────────────────────────────────────────────────────────
const STEPS = [
  {
    key: 'pending',
    label: 'Order Placed',
    desc: 'We received your order',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    desc: 'Order verified & accepted',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'processing',
    label: 'Processing',
    desc: 'Being packed at warehouse',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: 'shipped',
    label: 'Shipped',
    desc: 'On the way to you',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'delivered',
    label: 'Delivered',
    desc: 'Package received',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
];

const STATUS_COLORS = {
  pending:    { badge: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-400'  },
  confirmed:  { badge: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-400'   },
  processing: { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-400' },
  shipped:    { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',     dot: 'bg-cyan-400'   },
  delivered:  { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  cancelled:  { badge: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-400'    },
  refunded:   { badge: 'bg-neutral-100 text-neutral-500 border-neutral-200', dot: 'bg-neutral-400' },
};

const STATUS_HISTORY_ICONS = {
  pending:    <IconShoppingCart className="w-4 h-4 text-amber-500" />,
  confirmed:  <IconCheckCircle className="w-4 h-4 text-blue-500" />,
  processing: <IconCube className="w-4 h-4 text-violet-500" />,
  shipped:    <IconTruck className="w-4 h-4 text-cyan-500" />,
  delivered:  <IconHome className="w-4 h-4 text-emerald-500" />,
  cancelled:  <IconXCircle className="w-4 h-4 text-red-500" />,
  refunded:   <IconBanknotes className="w-4 h-4 text-neutral-500" />,
};

function formatDate(d) {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatDateTime(d) {
  return new Date(d).toLocaleString('en-PK', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target - today) / 86400000);
  return diff;
}

// Build a clean printable invoice in a new window → user can Save as PDF.
function downloadInvoice(order) {
  const fmt = (n) => 'PKR ' + Number(n).toLocaleString();
  const rows = (order.items || []).map((i) => `
    <tr>
      <td>${i.product_name}</td>
      <td style="color:#888">${i.sku}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${fmt(i.unit_price)}</td>
      <td style="text-align:right">${fmt(i.total_price)}</td>
    </tr>`).join('');
  const addr = order.shipping_address || {};
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${order.order_number}</title>
  <style>
    *{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;box-sizing:border-box}
    body{margin:0;padding:40px;color:#1a1b2a}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #EC6EAD;padding-bottom:20px;margin-bottom:24px}
    .brand{font-size:28px;font-weight:800}.brand span{color:#EC6EAD}
    .muted{color:#888;font-size:13px}
    h2{font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:20px 0 8px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;border-bottom:2px solid #eee;padding:8px 6px}
    td{padding:10px 6px;border-bottom:1px solid #f0f0f0;font-size:14px}
    .totals{margin-top:16px;margin-left:auto;width:280px;font-size:14px}
    .totals div{display:flex;justify-content:space-between;padding:5px 0}
    .totals .grand{border-top:2px solid #1a1b2a;margin-top:6px;padding-top:10px;font-weight:800;font-size:17px}
    .foot{margin-top:40px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:16px}
    .grid{display:flex;gap:40px}.grid>div{flex:1}
  </style></head><body>
    <div class="head">
      <div><div class="brand">VOGUE<span>.</span></div><div class="muted">Premium Fashion · Pakistan</div></div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:700">INVOICE</div>
        <div class="muted">${order.order_number}</div>
        <div class="muted">${new Date(order.created_at).toLocaleDateString('en-PK',{year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
    </div>
    <div class="grid">
      <div><h2>Billed To</h2><div>${addr.street||''}</div><div>${addr.city||''}${addr.province?', '+addr.province:''}</div><div>${addr.country||''}</div></div>
      <div style="text-align:right"><h2>Payment</h2><div style="text-transform:capitalize">${(order.payment_method||'').replace('_',' ')}</div><div class="muted" style="text-transform:capitalize">Status: ${order.payment_status}</div><div class="muted" style="text-transform:capitalize">Order: ${order.status}</div></div>
    </div>
    <h2>Items</h2>
    <table><thead><tr><th>Product</th><th>SKU</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>
      ${Number(order.discount_amount) > 0 ? `<div style="color:#16a34a"><span>Discount</span><span>−${fmt(order.discount_amount)}</span></div>` : ''}
      <div><span>Shipping</span><span>${Number(order.shipping_cost) === 0 ? 'Free' : fmt(order.shipping_cost)}</span></div>
      <div class="grand"><span>Total</span><span>${fmt(order.total_amount)}</span></div>
    </div>
    <div class="foot">Thank you for shopping with VOGUE · support@vogue.pk · +92 42 111 86483</div>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const queryClient = useQueryClient();
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => ordersApi.getOrder(orderNumber).then((r) => r.data),
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason) => ordersApi.cancelOrder(order.id, reason),
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries(['order', orderNumber]);
      queryClient.invalidateQueries(['orders']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not cancel order'),
  });

  function handleCancelConfirm(reason) {
    cancelMutation.mutate(reason, {
      onSuccess: () => setCancelModalOpen(false),
    });
  }

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  if (!order) return (
    <div className="text-center py-16">
      <p className="text-neutral-500">Order not found.</p>
      <Link to="/account/orders" className="btn-primary mt-4 inline-flex">Back to Orders</Link>
    </div>
  );

  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const isCancellable = ['pending', 'confirmed', 'processing'].includes(order.status);
  const currentStep = STEPS.findIndex(s => s.key === order.status);
  const statusColor = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const deliveryDays = daysUntil(order.estimated_delivery);

  const returns = order.returns || [];
  const hasOpenReturn = returns.some(r => ['requested', 'approved'].includes(r.status));
  const canRequestReturn = order.status === 'delivered' && !hasOpenReturn;

  return (
    <div className="space-y-5 max-w-3xl">

      {returnModalOpen && (
        <ReturnModal
          orderId={order.id}
          onClose={() => setReturnModalOpen(false)}
          onDone={() => {
            setReturnModalOpen(false);
            queryClient.invalidateQueries(['order', orderNumber]);
          }}
        />
      )}

      {cancelModalOpen && (
        <CancelModal
          orderNumber={order.order_number}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={handleCancelConfirm}
          isLoading={cancelMutation.isLoading}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-medium mb-1">Order</p>
          <h1 className="font-mono text-2xl font-bold text-neutral-900">{order.order_number}</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Placed {new Date(order.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${statusColor.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
            {order.status}
          </span>
          {isCancellable && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              disabled={cancelMutation.isLoading}
            >
              {cancelMutation.isLoading ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {/* ── Estimated Delivery Banner ── */}
      {!isCancelled && order.estimated_delivery && (
        <div className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #eff6ff 100%)', border: '1px solid #f0abfc' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#EC6EAD,#3494E6)' }}>
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Estimated Delivery</p>
            <p className="font-bold text-neutral-900 text-lg leading-tight">{formatDate(order.estimated_delivery)}</p>
            {deliveryDays !== null && (
              <p className="text-sm mt-0.5" style={{ color: '#EC6EAD' }}>
                {deliveryDays < 0
                  ? 'Expected by today'
                  : deliveryDays === 0
                  ? 'Expected today!'
                  : deliveryDays === 1
                  ? 'Arrives tomorrow'
                  : `${deliveryDays} days away`}
              </p>
            )}
          </div>
          {order.status === 'delivered' && (
            <IconSparkles className="w-7 h-7 text-emerald-400 flex-shrink-0" />
          )}
        </div>
      )}

      {/* ── Rider Card (when shipped) ── */}
      {order.rider_name && !isCancelled && (
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
            {order.rider_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-400 font-medium">Your Rider</p>
            <p className="font-semibold text-neutral-900 text-sm">{order.rider_name}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(6,182,212,0.12)', color: '#0891b2' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              On the way
            </span>
          </div>
        </div>
      )}

      {/* ── Tracking Note ── */}
      {order.tracking_note && !isCancelled && (
        <div className="rounded-xl px-4 py-3 text-sm text-neutral-700 flex items-start gap-2"
          style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}>
          <svg className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
          </svg>
          <span>{order.tracking_note}</span>
        </div>
      )}

      {/* ── Progress Tracker ── */}
      {!isCancelled && (
        <div className="card p-6">
          <h2 className="font-semibold text-neutral-800 text-sm mb-6">Order Progress</h2>

          {/* Desktop horizontal */}
          <div className="hidden sm:flex items-start">
            {STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              const future = i > currentStep;
              return (
                <div key={step.key} className="flex items-start flex-1 last:flex-none">
                  <div className="flex flex-col items-center w-full">
                    {/* Icon circle */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      done    ? 'bg-neutral-900 text-white shadow-md' :
                      active  ? 'text-white shadow-lg ring-4 ring-offset-1' :
                                'bg-neutral-100 text-neutral-300'
                    }`}
                      style={active ? { background: 'linear-gradient(135deg,#EC6EAD,#7b5ea7)', ringColor: 'rgba(236,110,173,0.2)' } : {}}
                    >
                      {done ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-5 h-5">{step.icon}</div>
                      )}
                    </div>
                    <p className={`text-xs font-semibold mt-2 text-center leading-tight ${
                      done || active ? 'text-neutral-900' : 'text-neutral-400'
                    }`}>{step.label}</p>
                    <p className="text-[10px] text-neutral-400 text-center mt-0.5 leading-tight px-1">{step.desc}</p>
                  </div>
                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mt-5 mx-1">
                      <div className={`h-0.5 rounded-full transition-all duration-500 ${i < currentStep ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile vertical */}
          <div className="flex sm:hidden flex-col gap-0">
            {STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      done    ? 'bg-neutral-900 text-white' :
                      active  ? 'text-white' : 'bg-neutral-100 text-neutral-300'
                    }`} style={active ? { background: 'linear-gradient(135deg,#EC6EAD,#7b5ea7)' } : {}}>
                      {done ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : <div className="w-4 h-4">{step.icon}</div>}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 rounded-full ${i < currentStep ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-semibold ${done || active ? 'text-neutral-900' : 'text-neutral-400'}`}>{step.label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cancelled / Refunded banner ── */}
      {isCancelled && (
        <div className="rounded-2xl p-5 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg className="w-6 h-6 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          <div>
            <p className="font-semibold text-red-700 capitalize">{order.status}</p>
            <p className="text-sm text-red-400 mt-0.5">This order has been {order.status}.</p>
          </div>
        </div>
      )}

      {/* ── Returns / Refunds / Exchange ── */}
      {(canRequestReturn || returns.length > 0) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-800 text-sm">Returns &amp; Refunds</h2>
            {canRequestReturn && (
              <button onClick={() => setReturnModalOpen(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors">
                Request Return / Refund / Exchange
              </button>
            )}
          </div>

          {returns.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Not happy with your order? You can request a return, refund, or exchange within 30 days of delivery.
            </p>
          ) : (
            <div className="space-y-2">
              {returns.map((r) => {
                const st = RETURN_STATUS_STYLE[r.status] || RETURN_STATUS_STYLE.requested;
                return (
                  <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-neutral-100">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">
                        {r.kind_display} · <span className="font-normal text-neutral-500">{r.reason_display}</span>
                      </p>
                      {r.customer_note && <p className="text-xs text-neutral-400 mt-0.5">"{r.customer_note}"</p>}
                      {r.admin_note && (
                        <p className="text-xs mt-1 text-neutral-600"><span className="font-semibold">Support:</span> {r.admin_note}</p>
                      )}
                      <p className="text-[10px] text-neutral-400 mt-1">
                        {new Date(r.created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Status History Timeline ── */}
      {order.status_history?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-neutral-800 text-sm mb-4">Timeline</h2>
          <div className="space-y-0">
            {[...order.status_history].reverse().map((h, i) => (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-neutral-50 border border-neutral-100">
                    {STATUS_HISTORY_ICONS[h.new_status] || <IconClipboard className="w-4 h-4 text-neutral-400" />}
                  </div>
                  {i < order.status_history.length - 1 && (
                    <div className="w-px flex-1 bg-neutral-100 mt-1 mb-1" style={{ minHeight: 16 }} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-neutral-900 text-sm capitalize">{h.new_status}</p>
                    <p className="text-[10px] text-neutral-400 tabular-nums flex-shrink-0">{formatDateTime(h.changed_at)}</p>
                  </div>
                  {h.note && <p className="text-xs text-neutral-500 mt-0.5">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Items ── */}
      <div className="card p-5">
        <h2 className="font-semibold text-neutral-800 text-sm mb-4">Items Ordered</h2>
        <div className="space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 text-sm truncate">{item.product_name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">SKU: {item.sku} · Qty: {item.quantity}</p>
              </div>
              <p className="font-bold text-neutral-900 text-sm flex-shrink-0">PKR {Number(item.total_price).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 space-y-2 text-sm">
          <h2 className="font-semibold text-neutral-800 mb-3">Delivery Address</h2>
          {order.shipping_address && (
            <div className="text-neutral-600 space-y-0.5">
              <p>{order.shipping_address.street}</p>
              <p>{order.shipping_address.city}{order.shipping_address.province ? `, ${order.shipping_address.province}` : ''}</p>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-2 text-sm">
          <h2 className="font-semibold text-neutral-800 mb-3">Payment Summary</h2>
          <div className="flex justify-between text-neutral-500"><span>Subtotal</span><span>PKR {Number(order.subtotal).toLocaleString()}</span></div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−PKR {Number(order.discount_amount).toLocaleString()}</span></div>
          )}
          <div className="flex justify-between text-neutral-500"><span>Shipping</span><span>{Number(order.shipping_cost) === 0 ? 'Free' : `PKR ${Number(order.shipping_cost).toLocaleString()}`}</span></div>
          <div className="flex justify-between font-bold text-neutral-900 border-t border-neutral-100 pt-2">
            <span>Total</span><span>PKR {Number(order.total_amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Payment</span>
            <span className="capitalize">{order.payment_method?.replace('_', ' ')}</span>
          </div>
          <button onClick={() => downloadInvoice(order)}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Invoice
          </button>
        </div>
      </div>

      <Link to="/account/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium block">
        ← Back to Orders
      </Link>
    </div>
  );
}
