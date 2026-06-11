import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  published: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  draft:     { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   dot: 'bg-amber-400' },
};

export default function SellerProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => productsApi.getMyProducts().then((r) => r.data?.results || r.data || []),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.deleteProduct(id),
    onSuccess: () => { queryClient.invalidateQueries(['seller-products']); toast.success('Product deleted'); },
    onError: (err) => toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Could not delete product'),
  });

  const filtered = (data || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-white/90">My Products</h1>
          <p className="text-sm mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>Manage your product listings</p>
        </div>
        <Link to="/seller/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
          style={{ background:'linear-gradient(135deg,#ff006e,#ff75bb)', color:'#fff', boxShadow:'0 4px 16px rgba(255,0,110,0.3)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Product
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'rgba(255,255,255,0.25)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search products…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9 pr-4 py-2 rounded-lg text-sm w-56" />
        </div>
        {data && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)' }}>
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background:'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-medium mb-4" style={{ color:'rgba(255,255,255,0.4)' }}>
            {search ? 'No matching products' : 'No products yet'}
          </p>
          {!search && (
            <Link to="/seller/products/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background:'linear-gradient(135deg,#ff006e,#ff75bb)' }}>
              Add Your First Product
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
                {['Product','Category','Price','Status',''].map((h, i) => (
                  <th key={i} className={`text-left px-5 py-3.5 text-[10px] font-bold tracking-[0.15em] uppercase ${i === 1 ? 'hidden md:table-cell' : i === 3 ? 'hidden sm:table-cell' : ''}`}
                    style={{ color:'rgba(255,255,255,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, idx) => {
                const st = product.is_published ? STATUS_STYLE.published : STATUS_STYLE.draft;
                return (
                  <tr key={product.id} className="group transition-colors"
                    style={{ borderBottom: idx < filtered.length-1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                          {product.primary_image
                            ? <img src={product.primary_image} alt="" className="w-full h-full object-cover" />
                            : <svg className="w-5 h-5" style={{ color:'rgba(255,255,255,0.2)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" /></svg>
                          }
                        </div>
                        <div>
                          <p className="font-semibold truncate max-w-[180px]" style={{ color:'rgba(255,255,255,0.85)' }}>{product.name}</p>
                          <p className="text-[10px] capitalize mt-0.5" style={{ color:'rgba(255,255,255,0.3)' }}>{product.product_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-sm" style={{ color:'rgba(255,255,255,0.45)' }}>{product.category?.name || '—'}</td>
                    <td className="px-5 py-4 font-bold tabular-nums" style={{ color:'rgba(255,255,255,0.85)' }}>
                      PKR {Number(product.sale_price || product.base_price).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${st.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {product.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/seller/products/${product.id}/edit`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                          style={{ background:'rgba(255,0,110,0.10)', color:'#ff75bb', border:'1px solid rgba(255,0,110,0.20)' }}>
                          Edit
                        </Link>
                        <button onClick={() => { if (window.confirm(`Delete "${product.name}"?`)) deleteMutation.mutate(product.id); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                          style={{ background:'rgba(239,68,68,0.08)', color:'rgba(239,68,68,0.7)', border:'1px solid rgba(239,68,68,0.15)' }}>
                          Delete
                        </button>
                      </div>
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
