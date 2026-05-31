import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsApi } from '../../api/products.api';
import ProductGrid from '../../components/product/ProductGrid';

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const ordering = searchParams.get('ordering') || '-created_at';

  const { data: category } = useQuery({
    queryKey: ['category', slug],
    queryFn: () =>
      productsApi.getCategories().then((r) => {
        const cats = r.data?.results || r.data || [];
        return cats.find((c) => c.slug === slug) || null;
      }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['category-products', slug, page, ordering],
    queryFn: () =>
      productsApi.getCategoryProducts(slug, { page, page_size: 12, ordering }).then((r) => r.data),
    keepPreviousData: true,
  });

  const products = data?.results || data || [];
  const totalPages = Math.ceil((data?.count || 0) / 12);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-neutral-500 mb-6">
        <Link to="/" className="hover:text-neutral-900">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900 font-medium capitalize">{category?.name || slug}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight capitalize" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.4))' }}>
            {category?.name || slug}
          </h1>
          {data?.count != null && (
            <p className="text-sm text-neutral-500 mt-1">{data.count} products</p>
          )}
        </div>
        <select
          className="input py-2 text-sm max-w-[180px]"
          value={ordering}
          onChange={(e) => setParam('ordering', e.target.value)}
        >
          <option value="-created_at">Newest</option>
          <option value="base_price">Price: Low → High</option>
          <option value="-base_price">Price: High → Low</option>
          <option value="-average_rating">Top Rated</option>
        </select>
      </div>

      <ProductGrid products={products} isLoading={isLoading} />

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button onClick={() => setParam('page', page - 1)} disabled={page === 1} className="btn-secondary px-4 py-2 disabled:opacity-40">← Prev</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setParam('page', i + 1)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-brand-600 text-white' : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
            >
              {i + 1}
            </button>
          ))}
          <button onClick={() => setParam('page', page + 1)} disabled={page === totalPages} className="btn-secondary px-4 py-2 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
