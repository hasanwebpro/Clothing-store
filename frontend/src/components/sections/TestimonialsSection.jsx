import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '../../api/reviews.api';
import { useRevealClass } from '../../hooks/useScrollReveal';

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1,2,3,4,5].map((s) => (
        <svg key={s} className={`w-4 h-4 ${s <= rating ? 'text-yellow-400' : 'text-neutral-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;
  return `${Math.floor(diff / 2592000)} months ago`;
}

function TestimonialCard({ review }) {
  const avatar = initials(review.display_name);
  return (
    <article className="flex-shrink-0 w-80 card p-5 space-y-3 mx-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {avatar}
          </div>
          <div>
            <p className="font-semibold text-neutral-900 text-sm">{review.display_name}</p>
            <p className="text-xs text-neutral-400">
              {review.city ? `${review.city} · ` : ''}{timeAgo(review.created_at)}
            </p>
          </div>
        </div>
        {review.verified_purchase && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Verified
          </span>
        )}
      </div>
      <Stars rating={review.rating} />
      {review.title && (
        <p className="text-sm font-semibold text-neutral-800">"{review.title}"</p>
      )}
      {review.body && (
        <p className="text-sm text-neutral-600 leading-relaxed line-clamp-3">
          {review.title ? review.body : `"${review.body}"`}
        </p>
      )}
      <p className="text-xs text-neutral-400 border-t border-neutral-50 pt-2">
        Purchased: <span className="font-medium text-neutral-600 line-clamp-1">{review.product_name}</span>
      </p>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-80 card p-5 space-y-3 mx-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-200" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-neutral-200 rounded w-24" />
          <div className="h-2.5 bg-neutral-100 rounded w-16" />
        </div>
      </div>
      <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <div key={i} className="w-4 h-4 bg-neutral-200 rounded" />)}</div>
      <div className="space-y-1.5">
        <div className="h-3 bg-neutral-200 rounded w-full" />
        <div className="h-3 bg-neutral-100 rounded w-5/6" />
        <div className="h-3 bg-neutral-100 rounded w-4/6" />
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const { ref, className } = useRevealClass();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['homepage-reviews'],
    queryFn: () => reviewsApi.getHomepageReviews().then((r) => r.data?.results || r.data || []),
    staleTime: 1000 * 60 * 10,
  });

  // Need at least 2 cards to fill the marquee; duplicate if fewer
  const displayReviews = reviews.length >= 2
    ? [...reviews, ...reviews]
    : reviews;

  return (
    <section className="py-20 bg-neutral-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div ref={ref} className={`${className} text-center`}>
          <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Customer Love</span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mt-2" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.45))' }}>
            What Our Customers Say
          </h2>
          {!isLoading && reviews.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Stars rating={5} />
              <span className="text-sm font-semibold text-neutral-900">
                {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} / 5
              </span>
              <span className="text-sm text-neutral-500">from {reviews.length} verified reviews</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative" aria-label="Customer testimonials">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-neutral-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-neutral-50 to-transparent z-10 pointer-events-none" />

        {isLoading ? (
          <div className="flex overflow-hidden">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-neutral-400 text-sm py-8">No reviews yet — be the first!</p>
        ) : (
          <div className="flex animate-marquee">
            {displayReviews.map((review, i) => (
              <TestimonialCard key={`${review.id}-${i}`} review={review} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
