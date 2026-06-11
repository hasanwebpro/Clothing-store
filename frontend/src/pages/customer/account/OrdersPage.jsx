import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../../api/orders.api';
import { Skeleton } from '../../../components/ui/Skeleton';

const STATUS_COLORS = {
  pending:    'badge-warning',
  confirmed:  'badge-info',
  processing: 'badge-info',
  shipped:    'badge-info',
  delivered:  'badge-success',
  cancelled:  'badge-danger',
  refunded:   'badge-neutral',
};

const ALL_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getOrders().then((r) => r.data?.results || r.data || []),
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchSearch = !search || o.order_number.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-4 w-24 rounded-full ml-auto" />
            <Skeleton className="h-6 w-16 rounded-full ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!orders?.length) return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      </div>
      <h2 className="font-display font-bold mb-2" style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>No orders yet</h2>
      <p className="text-neutral-500 mb-6">When you place an order, it will appear here.</p>
      <Link to="/products" className="btn-primary px-8 py-3">Start Shopping</Link>
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl md:text-4xl font-bold"
        style={{ background:"linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 4s linear infinite", filter:"drop-shadow(0 0 8px rgba(236,110,173,0.4))" }}>
        My Orders
      </h1>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            className="input pl-9 py-2.5 text-sm"
            placeholder="Search by order number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input py-2.5 text-sm sm:w-44"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {(search || statusFilter) && (
        <p className="text-xs text-neutral-500">
          {filtered.length} order{filtered.length !== 1 ? 's' : ''} found
          {statusFilter && <> · <button onClick={() => setStatusFilter('')} className="text-brand-600 hover:underline">Clear filter</button></>}
          {search && <> · <button onClick={() => setSearch('')} className="text-brand-600 hover:underline">Clear search</button></>}
        </p>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="card p-8 text-center text-neutral-500 text-sm">
          {search || statusFilter ? 'No orders match your filter.' : 'No orders yet.'}
        </div>
      )}

      {filtered.map((order) => (
        <Link
          key={order.id}
          to={`/account/orders/${order.order_number}`}
          className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow block"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neutral-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{order.order_number}</p>
              <p className="text-sm text-neutral-500">
                {new Date(order.created_at).toLocaleDateString('en-PK', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
                {' · '}
                {order.items_count || order.order_items?.length || ''} item(s)
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-neutral-900">PKR {Number(order.total_amount).toLocaleString()}</p>
            <span className={`badge mt-1 ${STATUS_COLORS[order.status] || 'badge-neutral'} capitalize`}>
              {order.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
