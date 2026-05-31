import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import ProductGrid from '../../components/product/ProductGrid';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, page],
    queryFn: () => productsApi.getProducts({ search: query, page, page_size: 12 }).then((r) => r.data),
    enabled: query.length > 0,
    keepPreviousData: true,
  });

  const products = data?.results || data || [];
  const totalPages = Math.ceil((data?.count || 0) / 12);

  const setPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', p);
    setSearchParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-neutral-500 mb-6">
        <Link to="/" className="hover:text-neutral-900">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900 font-medium">Search</span>
      </nav>

      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.4))' }}>
          {query ? <>Search results for "{query}"</> : 'Search Products'}
        </h1>
        {data?.count != null && query && (
          <p className="text-sm text-neutral-500 mt-1">{data.count} results found</p>
        )}
      </div>

      {!query ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-neutral-500">Enter a search term to find products</p>
        </div>
      ) : products.length === 0 && !isLoading ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-neutral-900 mb-2">No results for "{query}"</p>
          <p className="text-neutral-500 mb-6">Try different keywords or browse our collections</p>
          <Link to="/products" className="btn-primary px-8 py-3">Browse All Products</Link>
        </div>
      ) : (
        <>
          <ProductGrid products={products} isLoading={isLoading} />
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn-secondary px-4 py-2 disabled:opacity-40">← Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-brand-600 text-white' : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="btn-secondary px-4 py-2 disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
