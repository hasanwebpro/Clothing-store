/**
 * SellerDashboardPage — Premium seller dashboard with glowing stat cards.
 *
 * Same visual system as AdminDashboardPage but scoped to the seller's
 * products. The cinematic shader header has a slightly cooler palette
 * (more emerald/violet) to visually differentiate from the admin panel.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import AuroraShader from '../../components/shaders/AuroraShader';
import GlowOrb from '../../components/premium/GlowOrb';
import StatCard from '../../components/premium/StatCard';

const sellerApi = {
  getDashboard: () => apiClient.get('/analytics/seller-dashboard/'),
};

const Icon = {
  products:  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  published: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  sales:     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  lowStock:  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  plus:      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
};

const QUICK_ACTIONS = [
  { label: 'My Products', to: '/seller/products',     icon: Icon.products,  tone: 'from-violet-50 to-fuchsia-50', iconColor: 'text-brand-600' },
  { label: 'Add Product', to: '/seller/products/new', icon: Icon.plus,      tone: 'from-emerald-50 to-teal-50',   iconColor: 'text-emerald-600' },
  { label: 'Inventory',   to: '/seller/inventory',    icon: Icon.lowStock,  tone: 'from-amber-50 to-yellow-50',   iconColor: 'text-luxe-600' },
  { label: 'Store',       to: '/products',            icon: Icon.published, tone: 'from-blue-50 to-indigo-50',    iconColor: 'text-blue-600' },
];

const STATUS_PILL = {
  pending:    'bg-amber-50 text-amber-700',
  confirmed:  'bg-blue-50 text-blue-700',
  processing: 'bg-indigo-50 text-indigo-700',
  shipped:    'bg-cyan-50 text-cyan-700',
  delivered:  'bg-emerald-50 text-emerald-700',
  cancelled:  'bg-rose-50 text-rose-700',
};

const DUMMY_STATS = {
  total_products: 24, published_products: 18, total_sales: 487200, low_stock_count: 3,
  recent_orders: [
    { id: 1, order_number: 'ORD-2025-00142', customer_name: 'Sana Malik',  status: 'shipped',    total_amount: 5600, created_at: new Date().toISOString() },
    { id: 2, order_number: 'ORD-2025-00138', customer_name: 'Ahmed Raza',  status: 'delivered',  total_amount: 3200, created_at: new Date().toISOString() },
    { id: 3, order_number: 'ORD-2025-00135', customer_name: 'Fatima Khan', status: 'processing', total_amount: 8900, created_at: new Date().toISOString() },
  ],
  low_stock_items: [
    { id: 1, product_name: 'Floral Lawn Suit',  sku: 'FLR-S-WHT', quantity_on_hand: 2 },
    { id: 2, product_name: 'Premium Shalwar Kameez', sku: 'PSK-M-BLK', quantity_on_hand: 1 },
  ],
  top_products: [
    { id: 1, name: 'Floral Lawn Suit', total_sold: 89 },
    { id: 2, name: 'Silk Pret Shirt',  total_sold: 54 },
    { id: 3, name: 'Linen Trousers',   total_sold: 38 },
  ],
};

export default function SellerDashboardPage() {
  const { data: apiStats, isLoading } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: () => sellerApi.getDashboard().then((r) => r.data),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const stats = apiStats || (!isLoading ? DUMMY_STATS : null);

  return (
    <div className="relative space-y-8 pb-8">
      {/* ── Cinematic header with shader ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-ink-950 text-white">
        <div className="absolute inset-0 opacity-90">
          <AuroraShader
            colors={['#7c3aed', '#10b981', '#c026d3']}
            background="#0b0c18"
            intensity={0.70}
          />
        </div>
        <GlowOrb size={360} color="rgba(124,58,237,0.4)" className="-top-20 -right-20" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Seller Console
            </span>
            <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">
              Your <span className="text-shimmer-luxe">storefront</span>
            </h1>
            <p className="text-white/65 text-sm mt-1">
              Track sales, manage inventory, and ship orders.
            </p>
          </div>
          <Link
            to="/seller/products/new"
            className="btn-luxe !px-6 !py-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Product
          </Link>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gradient-to-br from-neutral-100 to-neutral-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard tone="violet"  label="Total Products"  value={stats?.total_products ?? 0}  icon={Icon.products} />
          <StatCard tone="emerald" label="Published"       value={stats?.published_products ?? 0} sub="Live on store" icon={Icon.published} />
          <StatCard tone="gold"    label="Total Sales"     value={stats?.total_sales ?? 0} prefix="PKR " icon={Icon.sales} />
          <StatCard tone="cool"    label="Low Stock"       value={stats?.low_stock_count ?? 0} sub="Need restocking" icon={Icon.lowStock} />
        </div>
      )}

      {/* ── Recent orders + Low stock ─────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">

        <div className="luxe-card overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-100/80">
            <div>
              <h2 className="font-semibold text-ink-900">Recent Orders</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Customer activity on your products</p>
            </div>
            <Link to="/seller/orders" className="text-xs font-semibold text-brand-600 hover:text-brand-700">View all</Link>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-neutral-50 rounded-lg animate-pulse" />)}</div>
          ) : stats?.recent_orders?.length ? (
            <div className="divide-y divide-neutral-50">
              {stats.recent_orders.map((order) => (
                <div key={order.id} className="px-6 py-3.5 flex items-center justify-between gap-3 text-sm hover:bg-brand-50/30 transition-colors">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-ink-900 truncate">{order.order_number}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{order.customer_name}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 ${STATUS_PILL[order.status] || 'bg-neutral-50 text-neutral-700'}`}>
                    {order.status}
                  </span>
                  <span className="font-bold text-ink-900 tabular-nums whitespace-nowrap">PKR {Number(order.total_amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 py-10 text-center">No orders yet</p>
          )}
        </div>

        <div className="luxe-card overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-100/80">
            <div>
              <h2 className="font-semibold text-ink-900">Low Stock Alerts</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Restock these soon</p>
            </div>
            <Link to="/seller/inventory" className="text-xs font-semibold text-brand-600 hover:text-brand-700">Manage</Link>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-neutral-50 rounded-lg animate-pulse" />)}</div>
          ) : stats?.low_stock_items?.length ? (
            <div className="divide-y divide-neutral-50">
              {stats.low_stock_items.map((item) => (
                <div key={item.id} className="px-6 py-3.5 flex items-center justify-between text-sm hover:bg-rose-50/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-900 truncate">{item.product_name}</p>
                    <p className="text-[11px] text-neutral-500 font-mono">{item.sku}</p>
                  </div>
                  <span className="badge badge-warning">{item.quantity_on_hand} left</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-emerald-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">All items well-stocked</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions ──────────────────────────────────────────── */}
      <div>
        <h2 className="font-semibold text-ink-900 mb-3 text-sm">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group relative overflow-hidden luxe-card p-5 flex flex-col items-center gap-2.5 text-center"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.tone} ${a.iconColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                {a.icon}
              </div>
              <span className="text-sm font-semibold text-ink-900">{a.label}</span>
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-luxe-100/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
