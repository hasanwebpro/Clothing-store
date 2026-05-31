/**
 * FeaturedProductsSection — Curated product showcase with luxury treatment.
 *
 * Visual upgrades from baseline:
 *  - Gold kicker tag with horizontal flanking lines
 *  - Display headline in serif font
 *  - "See all" CTA gets a gradient arrow + underline glow on hover
 *  - Subtle gradient orbs in background to break the white expanse
 *
 * Business Goal: Convert browsers to buyers. Featured products are the
 * store's best performing items.
 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProductGrid from '../product/ProductGrid';
import { useRevealClass } from '../../hooks/useScrollReveal';
import { DUMMY_PRODUCTS, DUMMY_NEW_ARRIVALS } from '../../data/dummyProducts';
import GlowOrb from '../premium/GlowOrb';

export default function FeaturedProductsSection({ queryKey, queryFn, title, subtitle, seeAllLink, seeAllLabel, fallbackKey }) {
  const { data, isLoading } = useQuery({ queryKey, queryFn, retry: 1 });

  const { ref, className } = useRevealClass();

  // Normalise: API may return a raw array or a paginated {results:[]} object
  const apiProducts = Array.isArray(data) ? data : (data?.results || []);
  const fallbackData = fallbackKey === 'new' ? DUMMY_NEW_ARRIVALS : DUMMY_PRODUCTS;
  const displayData = apiProducts.length > 0 ? apiProducts : (!isLoading ? fallbackData : undefined);

  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow orbs */}
      <GlowOrb size={420} color="rgba(212,160,23,0.10)" className="-top-20 -left-20" drift={false} />
      <GlowOrb size={380} color="rgba(192,38,211,0.08)" className="-bottom-20 -right-20" drift={false} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div ref={ref} className={`${className} flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10`}>
          <div>
            {subtitle && (
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-luxe-600 mb-2">
                <span className="h-px w-6 bg-gradient-to-r from-transparent to-luxe-500" />
                {subtitle}
                <span className="h-px w-6 bg-gradient-to-l from-transparent to-luxe-500" />
              </span>
            )}
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]" style={{ background:'linear-gradient(135deg,#c0005a 0%,#EC6EAD 35%,#7b5ea7 65%,#3494E6 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 8px rgba(236,110,173,0.45))' }}>
              {title}
            </h2>
          </div>
          {seeAllLink && (
            <Link
              to={seeAllLink}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-ink-900 hover:text-brand-600 transition-colors self-start sm:self-auto"
            >
              <span className="relative">
                {seeAllLabel || 'See all'}
                <span className="absolute left-0 right-0 -bottom-0.5 h-px bg-gradient-to-r from-brand-500 to-luxe-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </span>
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          )}
        </div>

        <ProductGrid products={displayData} isLoading={isLoading} />
      </div>
    </section>
  );
}
