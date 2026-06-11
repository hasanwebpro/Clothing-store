import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import toast from 'react-hot-toast';

function Stars({ rating }) {
  const r = parseFloat(rating) || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} className={`w-3 h-3 ${s <= Math.round(r) ? 'text-amber-400' : 'text-[#2d3139]'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]               = useState('');
  const [filterPublished, setFilterPublished] = useState('');
  const [view, setView]                   = useState('table');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productsApi.getProducts({ page_size: 100 }).then(r => r.data?.results || r.data || []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productsApi.updateProduct(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-products']); toast.success('Product updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.deleteProduct(id),
    onSuccess: () => { queryClient.invalidateQueries(['admin-products']); toast.success('Product deleted'); },
    onError: (err) => toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Could not delete product'),
  });

  const products = (data || []).filter(p => {
    if (filterPublished === 'published' && !p.is_published) return false;
    if (filterPublished === 'draft'     &&  p.is_published) return false;
    return !search || p.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8b9098' }}>
            {products.length} item{products.length !== 1 ? 's' : ''} in catalogue
          </p>
        </div>
        <Link to="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors"
          style={{ background: '#3b82f6', color: '#fff' }}
          onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Link>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#565a6a' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search products…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-dark pl-9 pr-3 py-2 rounded-lg text-sm w-full" />
        </div>

        <select value={filterPublished} onChange={e => setFilterPublished(e.target.value)}
          className="input-dark py-2 rounded-lg text-sm" style={{ width: 150 }}>
          <option value="">All products</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #2d3139' }}>
          {[
            { v: 'table', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
            { v: 'grid',  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
          ].map(({ v, icon }) => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-2 cursor-pointer transition-colors"
              style={view === v
                ? { background: '#3b82f6', color: '#fff' }
                : { background: 'rgba(28,31,38,0.65)', color: '#8b9098' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{icon}</svg>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        view === 'grid'
          ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: 'rgba(28,31,38,0.65)' }}>
                  <div className="aspect-[3/4]" style={{ background: 'rgba(34,37,46,0.70)' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded w-3/4" style={{ background: 'rgba(34,37,46,0.70)' }} />
                    <div className="h-3 rounded w-1/2" style={{ background: 'rgba(34,37,46,0.70)' }} />
                  </div>
                </div>
              ))}
            </div>
          : <div className="space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(28,31,38,0.65)' }} />)}
            </div>
      )}

      {/* Empty */}
      {!isLoading && products.length === 0 && (
        <div className="text-center py-20 rounded-xl" style={{ background: 'rgba(28,31,38,0.65)', border: '1px dashed #2d3139' }}>
          <p className="font-semibold text-sm" style={{ color: '#565a6a' }}>No products found</p>
          <p className="text-xs mt-1" style={{ color: '#3d424e' }}>Try adjusting your filters</p>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {!isLoading && products.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => {
            const pub = product.is_published;
            return (
              <div key={product.id} className="group rounded-xl overflow-hidden flex flex-col transition-all"
                style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#4d5260'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2d3139'}>
                <div className="relative aspect-[3/4] overflow-hidden" style={{ background: 'rgba(34,37,46,0.70)' }}>
                  {product.primary_image
                    ? <img src={product.primary_image} alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-10 h-10" style={{ color: '#3d424e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                  }
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={pub
                        ? { background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                        : { background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                      {pub ? 'Live' : 'Draft'}
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)' }}>
                    <div className="flex gap-2 p-3 w-full">
                      <Link to={`/admin/products/${product.id}/edit`}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-center cursor-pointer text-white"
                        style={{ background: 'rgba(59,130,246,0.8)' }}>
                        Edit
                      </Link>
                      <button
                        onClick={() => updateMutation.mutate({ id: product.id, data: { is_published: !pub } })}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
                        style={pub
                          ? { background: 'rgba(239,68,68,0.8)',  color: '#fff' }
                          : { background: 'rgba(16,185,129,0.8)', color: '#fff' }}>
                        {pub ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col gap-1">
                  {product.brand && (
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
                      {product.brand}
                    </p>
                  )}
                  <p className="text-xs font-semibold leading-tight line-clamp-2 text-white">{product.name}</p>
                  <Stars rating={product.average_rating} />
                  <p className="text-xs font-bold mt-auto text-white tabular-nums">
                    PKR {Number(product.sale_price || product.base_price).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {!isLoading && products.length > 0 && view === 'table' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(28,31,38,0.65)', border: '1px solid #2d3139' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(34,37,46,0.70)' }}>
              <tr>
                {[
                  { label: 'Product',  cls: '' },
                  { label: 'Category', cls: 'hidden md:table-cell' },
                  { label: 'Price',    cls: '' },
                  { label: 'Rating',   cls: 'hidden md:table-cell' },
                  { label: 'Status',   cls: '' },
                  { label: '',         cls: '' },
                ].map((h, i) => (
                  <th key={i} className={`text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider ${h.cls}`}
                    style={{ color: '#8b9098', borderBottom: '1px solid #2d3139' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const pub = product.is_published;
                return (
                  <tr key={product.id} className="hover:bg-[#22252e] transition-colors" style={{ borderTop: '1px solid #2d3139' }}>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ background: 'rgba(34,37,46,0.70)', border: '1px solid #2d3139' }}>
                          {product.primary_image
                            ? <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-5 h-5" style={{ color: '#3d424e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                </svg>
                              </div>
                          }
                        </div>
                        <div>
                          <p className="font-semibold truncate max-w-[180px] text-white">{product.name}</p>
                          {product.brand && (
                            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#f59e0b' }}>
                              {product.brand}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 hidden md:table-cell text-sm" style={{ color: '#8b9098' }}>
                      {product.category_name || '—'}
                    </td>

                    <td className="px-5 py-3.5 font-semibold tabular-nums text-white">
                      PKR {Number(product.sale_price || product.base_price).toLocaleString()}
                      {product.sale_price && product.sale_price < product.base_price && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                          -{Math.round((1 - product.sale_price / product.base_price) * 100)}%
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <Stars rating={product.average_rating} />
                    </td>

                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => updateMutation.mutate({ id: product.id, data: { is_published: !pub } })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase border cursor-pointer transition-opacity hover:opacity-80"
                        style={pub
                          ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }
                          : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: pub ? '#10b981' : '#f59e0b' }} />
                        {pub ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/products/${product.id}/edit`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          style={{ background: 'rgba(34,37,46,0.70)', color: '#3b82f6', border: '1px solid #2d3139' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#2d3139'}>
                          Edit
                        </Link>
                        <button
                          onClick={() => { if (window.confirm(`Delete "${product.name}"?`)) deleteMutation.mutate(product.id); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          style={{ background: 'rgba(34,37,46,0.70)', color: '#ef4444', border: '1px solid #2d3139' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#2d3139'}>
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
