/**
 * Skeleton — reusable shimmer placeholder used while content is loading.
 * Drop-in replacement for any element: pass className for sizing/shape.
 *
 * Usage:
 *   <Skeleton className="h-48 w-full rounded-2xl" />          // image card
 *   <Skeleton className="h-4 w-3/4 rounded-full" />           // text line
 *   <SkeletonProductCard />                                    // full product card
 *   <SkeletonProductGrid count={8} />                         // full grid
 */

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-sweep 1.5s ease-in-out infinite',
        }}
      />
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-100 bg-white">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="p-3 space-y-2.5">
        <Skeleton className="h-3 w-1/3 rounded-full" />
        <Skeleton className="h-4 w-3/4 rounded-full" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {[...Array(count)].map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonProductDetail() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Image */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        </div>
        {/* Info */}
        <div className="space-y-4 pt-4">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-8 w-3/4 rounded-xl" />
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-4 h-4 rounded-sm" />)}
          </div>
          <Skeleton className="h-10 w-40 rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-16 rounded-xl" />)}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="flex-1 h-14 rounded-xl" />
            <Skeleton className="flex-1 h-14 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonOrderCard() {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full ml-auto" />
      </div>
    </div>
  );
}
