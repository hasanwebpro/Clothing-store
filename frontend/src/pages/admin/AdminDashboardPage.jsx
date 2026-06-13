import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import apiClient from '../../api/client';

const adminApi = { getDashboard: () => apiClient.get('/analytics/dashboard/') };

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  blue:    '#3b82f6',
  amber:   '#f59e0b',
  violet:  '#8b5cf6',
  emerald: '#10b981',
  cyan:    '#06b6d4',
  rose:    '#f43f5e',
  indigo:  '#6366f1',
  orange:  '#f97316',
};

const STATUS_COLOR = {
  pending:    C.amber,
  confirmed:  C.blue,
  processing: C.violet,
  shipped:    C.cyan,
  delivered:  C.emerald,
  cancelled:  C.rose,
};

const PAY_COLORS = [C.blue, C.violet, C.emerald];
const CAT_COLORS = [C.blue, C.violet, C.emerald, C.amber, C.cyan, C.rose];

// ── Helpers ───────────────────────────────────────────────────────────────────
const pkr = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const short = (n) => {
  n = Number(n || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};
const fmtDay = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
};

// ── Custom tooltip for revenue chart ─────────────────────────────────────────
function RevTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#1c1f26', border: '1px solid #2d3139' }}>
      <p className="font-semibold text-white mb-1">{fmtDay(label)}</p>
      <p style={{ color: C.blue }}>Revenue: <span className="font-bold">{pkr(payload[0]?.value)}</span></p>
      {payload[1] && <p style={{ color: C.amber }}>Orders: <span className="font-bold">{payload[1]?.value}</span></p>}
    </div>
  );
}

function CatTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#1c1f26', border: '1px solid #2d3139' }}>
      <p className="font-semibold text-white mb-1">{payload[0]?.payload?.name}</p>
      <p style={{ color: C.blue }}>Revenue: <span className="font-bold">{pkr(payload[0]?.value)}</span></p>
    </div>
  );
}

// ── Reusable card shell ───────────────────────────────────────────────────────
function Card({ title, sub, action, children, className = '' }) {
  return (
    <div className={`rounded-xl ${className}`} style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2d3139' }}>
          <div>
            <h2 className="font-semibold text-white text-sm">{title}</h2>
            {sub && <p className="text-xs mt-0.5" style={{ color: '#8b9098' }}>{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, accent, icon, growth }) {
  const up = growth > 0;
  return (
    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider truncate" style={{ color: '#8b9098' }}>{label}</p>
          <p className="text-2xl font-bold text-white mt-1.5 tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs mt-1.5 truncate" style={{ color: '#8b9098' }}>{sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
            {icon}
          </div>
          {growth !== undefined && growth !== 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
              style={up
                ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
              {up ? '▲' : '▼'} {Math.abs(growth)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
const Skel = ({ h = 'h-4', w = 'w-full' }) => (
  <div className={`${h} ${w} rounded-md animate-pulse`} style={{ background: 'rgba(45,49,57,0.8)' }} />
);

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { data: s, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then((r) => r.data),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const totalStatusOrders = s
    ? Object.values(s.order_by_status || {}).reduce((a, b) => a + Number(b || 0), 0)
    : 0;

  const statusPieData = s
    ? Object.entries(s.order_by_status || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k, value: v, color: STATUS_COLOR[k] || '#6b7280' }))
    : [];

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8b9098' }}>
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
          <Link to="/admin/products/new"
            className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            style={{ background: C.blue, color: '#fff' }}>
            + Add Product
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(28,31,38,0.65)' }} />)}
        </div>
      ) : s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Total Revenue" value={`PKR ${short(s.total_revenue)}`}
            sub={`All time · AOV ${pkr(s.avg_order_value)}`} accent={C.blue} growth={s.revenue_growth}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <KPI label="Total Orders" value={s.total_orders?.toLocaleString()}
            sub={`${s.pending_orders} pending · ${s.cancel_rate}% cancel rate`} accent={C.amber} growth={s.orders_growth}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>} />
          <KPI label="Customers" value={s.total_users?.toLocaleString()}
            sub={`${s.new_users_today} joined today`} accent={C.violet} growth={s.users_growth}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
          <KPI label="Products" value={s.total_products?.toLocaleString()}
            sub={`${s.published_products} published · ${s.low_stock_count} low stock`} accent={C.emerald}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
        </div>
      )}

      {/* ── Revenue Trend (30 days) ── */}
      <Card title="Revenue — Last 30 Days" sub="Daily revenue and order count">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center"><Skel h="h-48" w="w-4/5" /></div>
        ) : !s?.daily_revenue?.length ? (
          <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#565a6a' }}>No data yet</div>
        ) : (
          <div className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={s.daily_revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.blue} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2d3139" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: '#565a6a', fontSize: 11 }}
                  tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v) => `${short(v)}`} tick={{ fill: '#565a6a', fontSize: 11 }}
                  tickLine={false} axisLine={false} width={52} />
                <Tooltip content={<RevTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke={C.blue} strokeWidth={2.5}
                  dot={false} activeDot={{ r: 5, fill: C.blue }} />
                <Line type="monotone" dataKey="orders" stroke={C.amber} strokeWidth={1.5}
                  dot={false} strokeDasharray="4 4" yAxisId={0} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#8b9098' }}>
                <span className="w-5 h-0.5 rounded inline-block" style={{ background: C.blue }} /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: '#8b9098' }}>
                <span className="w-5 h-0.5 rounded inline-block border-t-2 border-dashed" style={{ borderColor: C.amber }} /> Orders
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* ── Row: Order status donut + Payment breakdown + Top categories ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Order status donut */}
        <Card title="Order Pipeline" sub="Current status breakdown">
          {isLoading ? (
            <div className="h-56 flex items-center justify-center"><Skel h="h-40" w="w-40" /></div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                    dataKey="value" paddingAngle={2}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} contentStyle={{ background: '#1c1f26', border: '1px solid #2d3139', borderRadius: 10, fontSize: 12 }} itemStyle={{ color: '#d1d5db' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                {statusPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs capitalize truncate" style={{ color: '#8b9098' }}>{d.name}</span>
                    <span className="text-xs font-semibold text-white ml-auto tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Payment method breakdown */}
        <Card title="Revenue by Payment" sub="Split across payment methods">
          {isLoading ? (
            <div className="h-56 flex items-center justify-center"><Skel h="h-40" w="w-40" /></div>
          ) : !s?.revenue_by_payment?.length ? (
            <div className="h-40 flex items-center justify-center text-xs" style={{ color: '#565a6a' }}>No data yet</div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={s.revenue_by_payment} cx="50%" cy="50%" outerRadius={70}
                    dataKey="revenue" nameKey="method" paddingAngle={3}>
                    {s.revenue_by_payment.map((_, i) => (
                      <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => pkr(v)} contentStyle={{ background: '#1c1f26', border: '1px solid #2d3139', borderRadius: 10, fontSize: 12 }} itemStyle={{ color: '#d1d5db' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {s.revenue_by_payment.map((p, i) => (
                  <div key={p.method} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: PAY_COLORS[i % PAY_COLORS.length] }} />
                      <span style={{ color: '#8b9098' }}>{p.method}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: '#565a6a' }}>{p.orders} orders</span>
                      <span className="font-semibold text-white tabular-nums">{pkr(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Category sales */}
        <Card title="Sales by Category" sub="Revenue per product category">
          {isLoading ? (
            <div className="h-56 p-4 space-y-2">{[...Array(5)].map((_, i) => <Skel key={i} h="h-6" />)}</div>
          ) : !s?.category_sales?.length ? (
            <div className="h-40 flex items-center justify-center text-xs" style={{ color: '#565a6a' }}>No data yet</div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={s.category_sales} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90}
                    tick={{ fill: '#8b9098', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => pkr(v)} contentStyle={{ background: '#1c1f26', border: '1px solid #2d3139', borderRadius: 10, fontSize: 12 }} itemStyle={{ color: '#d1d5db' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                    {s.category_sales.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* ── Row: Top products bar + Recent orders ── */}
      <div className="grid lg:grid-cols-5 gap-5">

        {/* Top products */}
        <Card title="Top Products" sub="By units sold" className="lg:col-span-2">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skel key={i} h="h-8" />)}</div>
          ) : !s?.top_products?.length ? (
            <div className="h-40 flex items-center justify-center text-xs" style={{ color: '#565a6a' }}>No orders yet</div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={s.top_products.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110}
                    tick={{ fill: '#8b9098', fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '…' : v} />
                  <Tooltip formatter={(v, name) => [v, name === 'total_sold' ? 'Units sold' : name]}
                    contentStyle={{ background: '#1c1f26', border: '1px solid #2d3139', borderRadius: 10, fontSize: 12 }}
                    itemStyle={{ color: '#d1d5db' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="total_sold" fill={C.blue} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Recent orders */}
        <Card title="Recent Orders" sub="Last 8 transactions" className="lg:col-span-3"
          action={<Link to="/admin/orders" className="text-xs font-medium hover:text-white transition-colors" style={{ color: C.blue }}>View all →</Link>}>
          {isLoading ? (
            <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skel key={i} h="h-10" />)}</div>
          ) : s?.recent_orders?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'rgba(34,37,46,0.70)' }}>
                  <tr>
                    {['Order', 'Customer', 'Status', 'Amount'].map((h, i) => (
                      <th key={h} className={`text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider ${i === 1 ? 'hidden sm:table-cell' : ''}`}
                        style={{ color: '#8b9098', borderBottom: '1px solid #2d3139' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.recent_orders.map((o) => {
                    const sc = { color: STATUS_COLOR[o.status] || '#6b7280' };
                    return (
                      <tr key={o.id} className="hover:bg-[#22252e] transition-colors" style={{ borderTop: '1px solid #2d3139' }}>
                        <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: C.amber }}>{o.order_number}</td>
                        <td className="px-4 py-3 text-sm hidden sm:table-cell" style={{ color: '#d1d5db' }}>{o.customer_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                            style={{ color: sc.color, background: `${sc.color}18`, borderColor: `${sc.color}40` }}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-white text-sm">{pkr(o.total_amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-12 text-sm" style={{ color: '#565a6a' }}>No orders yet</p>
          )}
        </Card>
      </div>

      {/* ── Row: Low stock + Recent reviews ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Low stock alert */}
        <Card title="Low Stock Alert"
          sub={s?.low_stock_count ? `${s.low_stock_count} variant${s.low_stock_count !== 1 ? 's' : ''} need restocking` : 'All stock levels healthy'}
          action={
            s?.low_stock_count > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Action needed
              </span>
            )
          }>
          {isLoading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skel key={i} h="h-10" />)}</div>
          ) : !s?.low_stock_items?.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <svg className="w-10 h-10" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: '#10b981' }}>All stock levels healthy</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'rgba(34,37,46,0.70)' }}>
                  <tr>
                    {['Product', 'SKU', 'In Stock', 'Threshold'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: '#8b9098', borderBottom: '1px solid #2d3139' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.low_stock_items.map((item) => {
                    const critical = item.quantity_on_hand <= 2;
                    return (
                      <tr key={item.id} className="hover:bg-[#22252e] transition-colors" style={{ borderTop: '1px solid #2d3139' }}>
                        <td className="px-4 py-3 text-xs font-medium text-white max-w-[140px] truncate">{item.product_name}</td>
                        <td className="px-4 py-3 font-mono text-[10px]" style={{ color: '#565a6a' }}>{item.sku}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold tabular-nums text-sm" style={{ color: critical ? '#ef4444' : '#f59e0b' }}>
                            {item.quantity_on_hand}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums" style={{ color: '#565a6a' }}>{item.reorder_threshold}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent reviews */}
        <Card title="Recent Reviews" sub="Latest customer feedback"
          action={<Link to="/admin/reviews" className="text-xs font-medium hover:text-white transition-colors" style={{ color: C.blue }}>View all →</Link>}>
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skel key={i} h="h-14" />)}</div>
          ) : !s?.recent_reviews?.length ? (
            <div className="flex items-center justify-center py-10 text-sm" style={{ color: '#565a6a' }}>No reviews yet</div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#2d3139' }}>
              {s.recent_reviews.map((r) => (
                <div key={r.id} className="px-5 py-3.5 hover:bg-[#22252e] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white">{r.customer}</span>
                        <span className="text-[10px]" style={{ color: '#565a6a' }}>·</span>
                        <span className="text-[10px] truncate max-w-[140px]" style={{ color: '#565a6a' }}>{r.product_name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-1 mb-1">
                        {[1,2,3,4,5].map((s) => (
                          <svg key={s} className="w-3 h-3" fill={s <= r.rating ? '#f59e0b' : '#2d3139'} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      {(r.title || r.body) && (
                        <p className="text-xs line-clamp-1" style={{ color: '#8b9098' }}>
                          {r.title ? `"${r.title}" — ` : ''}{r.body}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#3d424e' }}>
                      {new Date(r.created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Quick links ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#565a6a' }}>Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '+ Add Product', to: '/admin/products/new', color: C.blue },
            { label: 'Manage Orders',  to: '/admin/orders',       color: C.amber },
            { label: 'All Products',   to: '/admin/products',     color: C.emerald },
            { label: 'Customers',      to: '/admin/users',        color: C.violet },
            { label: 'Reviews',        to: '/admin/reviews',      color: C.cyan },
            { label: 'Coupons',        to: '/admin/coupons',      color: C.orange },
            { label: 'View Store',     to: '/',                   color: C.rose },
          ].map(({ label, to, color }) => (
            <Link key={to} to={to}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:-translate-y-px cursor-pointer"
              style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139', color: '#d1d5db' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2d3139'; e.currentTarget.style.color = '#d1d5db'; }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
