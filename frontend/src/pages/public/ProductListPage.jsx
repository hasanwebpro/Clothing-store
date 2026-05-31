import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import ProductGrid from '../../components/product/ProductGrid';
import ProductFilter from '../../components/product/ProductFilter';
import { DUMMY_PRODUCTS, DUMMY_NEW_ARRIVALS } from '../../data/dummyProducts';

const ALL_DUMMY = [...DUMMY_PRODUCTS, ...DUMMY_NEW_ARRIVALS];

const SORT_OPTIONS = [
  { label: 'Newest', value: '-created_at' },
  { label: 'Price: Low → High', value: 'base_price' },
  { label: 'Price: High → Low', value: '-base_price' },
  { label: 'Top Rated', value: '-average_rating' },
  { label: 'Most Popular', value: '-review_count' },
];

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilter, setShowFilter] = useState(false);

  const params = {
    ordering: searchParams.get('ordering') || '-created_at',
    page: searchParams.get('page') || 1,
    page_size: 12,
    ...(searchParams.get('category') && { category: searchParams.get('category') }),
    ...(searchParams.get('min_price') && { min_price: searchParams.get('min_price') }),
    ...(searchParams.get('max_price') && { max_price: searchParams.get('max_price') }),
    ...(searchParams.get('is_sale') && { is_sale: true }),
    ...(searchParams.get('is_featured') && { is_featured: true }),
    ...(searchParams.get('search') && { search: searchParams.get('search') }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getProducts(params).then((r) => r.data),
    keepPreviousData: true,
  });

  const apiProducts = data?.results || data || [];
  // Fall back to dummy data when API isn't running yet
  const products = apiProducts.length > 0 ? apiProducts : (!isLoading ? ALL_DUMMY : []);
  const totalCount = data?.count || (apiProducts.length === 0 && !isLoading ? ALL_DUMMY.length : 0);
  const totalPages = Math.ceil(totalCount / 12);
  const currentPage = parseInt(params.page);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const FilterChips = () => {
    const chips = [];
    if (searchParams.get('is_sale')) chips.push({ label: 'On Sale', key: 'is_sale' });
    if (searchParams.get('is_featured')) chips.push({ label: 'Featured', key: 'is_featured' });
    if (searchParams.get('min_price') || searchParams.get('max_price')) {
      const min = searchParams.get('min_price') || '0';
      const max = searchParams.get('max_price') || '∞';
      chips.push({ label: `PKR ${min}–${max}`, key: 'price' });
    }
    if (!chips.length) return null;
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {chips.map((c) => (
          <span
            key={c.key}
            className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1 rounded-full cursor-pointer hover:bg-brand-100"
            onClick={() => {
              if (c.key === 'price') { setParam('min_price', ''); setParam('max_price', ''); }
              else setParam(c.key, '');
            }}
          >
            {c.label} ×
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-neutral-500 mb-6">
        <Link to="/" className="hover:text-neutral-900">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900 font-medium">All Products</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.4))' }}>
          All Products
          {totalCount > 0 && <span className="ml-2 text-base font-normal" style={{ WebkitTextFillColor:'#9ca3af', filter:'none', background:'none' }}>({totalCount})</span>}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="btn-secondary gap-2 lg:hidden"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6M11 16h2" />
            </svg>
            Filters
          </button>
          <select
            className="input py-2 text-sm max-w-[180px]"
            value={params.ordering}
            onChange={(e) => setParam('ordering', e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <FilterChips />

      <div className="flex gap-8">
        {/* Filter sidebar */}
        <aside className={`${showFilter ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
          <ProductFilter
            searchParams={searchParams}
            onFilterChange={setParam}
          />
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          <ProductGrid products={products} isLoading={isLoading} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => setParam('page', currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-secondary px-4 py-2 disabled:opacity-40"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setParam('page', page)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-brand-600 text-white'
                        : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setParam('page', currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn-secondary px-4 py-2 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
