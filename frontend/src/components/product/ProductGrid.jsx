import ProductCard from './ProductCard';
import { Skeleton } from '../ui/Skeleton';

export default function ProductGrid({ products, isLoading, emptyMessage = 'No products found.' }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-neutral-100 bg-white">
            <Skeleton className="aspect-[3/4] w-full" />
            <div className="p-3 space-y-2.5">
              <Skeleton className="h-3 w-1/3 rounded-full" />
              <Skeleton className="h-4 w-3/4 rounded-full" />
              <Skeleton className="h-3 w-1/2 rounded-full" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-neutral-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
