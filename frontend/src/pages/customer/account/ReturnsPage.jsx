/**
 * ReturnsPage — the View for the customer's "Request Return / Refund / Exchange"
 * history (the read side of those use cases; requests are raised from the
 * order detail page).
 *
 * SDA Note: View only. Data is fetched through ordersApi (Controller boundary)
 * with React Query; the OrderReturn Model + its State Machine live on the
 * backend (apps/orders).
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../../api/orders.api';
import { IconArrowReturn, IconBanknotes, IconArrowPath, IconCube } from '../../../components/ui/Icons';

const STATUS_STYLE = {
  requested: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Requested' },
  approved:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Approved' },
  rejected:  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Rejected' },
  completed: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Completed' },
};
const KIND_ICON = {
  return:   <IconArrowReturn className="w-5 h-5 text-brand-500" />,
  refund:   <IconBanknotes className="w-5 h-5 text-emerald-500" />,
  exchange: <IconArrowPath className="w-5 h-5 text-blue-500" />,
};

export default function ReturnsPage() {
  const { data: returns, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: () => ordersApi.getReturns().then(r => r.data?.results || r.data || []),
  });

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!returns?.length) return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
        <IconArrowReturn className="w-9 h-9 text-neutral-400" />
      </div>
      <h2 className="font-display font-bold mb-2 text-xl text-neutral-900">No returns yet</h2>
      <p className="text-neutral-500 mb-6">Requests for returns, refunds, or exchanges will appear here.</p>
      <Link to="/account/orders" className="btn-primary px-8 py-3">View Orders</Link>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl md:text-4xl font-bold" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>Returns &amp; Refunds</h1>

      {returns.map((r) => {
        const st = STATUS_STYLE[r.status] || STATUS_STYLE.requested;
        return (
          <div key={r.id} className="card p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
                {KIND_ICON[r.kind] || <IconCube className="w-5 h-5 text-neutral-400" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 text-sm">
                  {r.kind_display} <span className="text-neutral-400 font-normal">· {r.reason_display}</span>
                </p>
                <Link to={`/account/orders/${r.order_number}`} className="text-xs text-brand-600 hover:text-brand-700 font-mono">
                  {r.order_number}
                </Link>
                {r.admin_note && <p className="text-xs text-neutral-600 mt-1"><span className="font-semibold">Support:</span> {r.admin_note}</p>}
                <p className="text-[10px] text-neutral-400 mt-1">
                  {new Date(r.created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
              style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
              {st.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
