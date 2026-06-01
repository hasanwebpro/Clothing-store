import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../../api/orders.api';
import toast from 'react-hot-toast';

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
  pending:    '🛒',
  confirmed:  '✅',
  processing: '📦',
  shipped:    '🚚',
  delivered:  '🏠',
  cancelled:  '❌',
  refunded:   '💸',
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

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => ordersApi.getOrder(orderNumber).then((r) => r.data),
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(order.id),
    onSuccess: () => {
      toast.success('Order cancelled');
      queryClient.invalidateQueries(['order', orderNumber]);
      queryClient.invalidateQueries(['orders']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not cancel order'),
  });

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
  const isCancellable = ['pending', 'confirmed'].includes(order.status);
  const currentStep = STEPS.findIndex(s => s.key === order.status);
  const statusColor = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const deliveryDays = daysUntil(order.estimated_delivery);

  return (
    <div className="space-y-5 max-w-3xl">

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
              onClick={() => { if (window.confirm('Cancel this order?')) cancelMutation.mutate(); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              disabled={cancelMutation.isLoading}
            >
              Cancel Order
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
            <div className="text-3xl">🎉</div>
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

      {/* ── Status History Timeline ── */}
      {order.status_history?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-neutral-800 text-sm mb-4">Timeline</h2>
          <div className="space-y-0">
            {[...order.status_history].reverse().map((h, i) => (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 bg-neutral-50 border border-neutral-100">
                    {STATUS_HISTORY_ICONS[h.new_status] || '📋'}
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
        </div>
      </div>

      <Link to="/account/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium block">
        ← Back to Orders
      </Link>
    </div>
  );
}
