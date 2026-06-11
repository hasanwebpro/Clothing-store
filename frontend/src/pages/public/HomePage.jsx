/**
 * HomePage — The store's primary landing experience.
 *
 * Architecture: This page is a COMPOSITION of Section components.
 * The page itself contains NO business logic — it only assembles sections.
 * This is the SoC (Separation of Concerns) principle in action.
 *
 * Section Order (optimised for conversion funnel):
 * 1. Hero      — Awareness + first CTA
 * 2. Stats     — Immediate trust validation
 * 3. Categories — Discovery/navigation
 * 4. CTABanner  — Mid-funnel conversion push
 * 5. Featured Products — Primary purchase intent capture
 * 6. New In         — FOMO + recency
 * 7. Promo Banner   — Sale urgency
 * 8. Testimonials   — Social proof (addresses final doubts)
 * 9. FAQ        — Objection removal
 * 10. Newsletter    — Email capture before they leave
 * 11. Trust Badges  — Final reassurance
 *
 * Data Flow:
 *  - TanStack Query fetches products from Django API
 *  - All queries are cached for 5 minutes (configured in main.jsx)
 *  - Static section data (TESTIMONIALS, FAQS) is hardcoded here for
 *    performance — no API call needed for content that rarely changes.
 *
 * SEO:
 *  - useSEO hook sets <title> and Open Graph tags
 *  - Homepage title: "VOGUE — Premium Fashion Pakistan"
 *  - Structured data for FAQs (JSON-LD injected via useSEO)
 */
import { productsApi } from '../../api/products.api';
import { useSEO } from '../../hooks/useSEO';
import HeroSection from '../../components/sections/HeroSection';
import StatsSection from '../../components/sections/StatsSection';
import TrendingCategoriesSection from '../../components/sections/TrendingCategoriesSection';
import CTABannerSection from '../../components/sections/CTABannerSection';
import FeaturedProductsSection from '../../components/sections/FeaturedProductsSection';
import TestimonialsSection from '../../components/sections/TestimonialsSection';
import FAQSection from '../../components/sections/FAQSection';
import NewsletterSection from '../../components/sections/NewsletterSection';
import TrustBadgesSection from '../../components/sections/TrustBadgesSection';
import PromoBannerSection from '../../components/sections/PromoBannerSection';

export default function HomePage() {
  useSEO({
    title: null,
    description: 'Shop premium fashion for women, men & kids in Pakistan. Free delivery on orders over PKR 2,000. Easypaisa & COD accepted.',
  });

  return (
    <div>
      {/* 1. Hero — the first impression */}
      <HeroSection />

      {/* 2. Social proof numbers — immediate trust */}
      <StatsSection />

      {/* 3. Category discovery */}
      <TrendingCategoriesSection />

      {/* 4. Dual CTA banners — sale + new customer offer */}
      <CTABannerSection />

      {/* 5. Featured products — curated picks */}
      <FeaturedProductsSection
        queryKey={['products', 'featured']}
        queryFn={() => productsApi.getFeatured().then((r) => r.data?.results || r.data)}
        title="Featured Picks"
        subtitle="Hand-Curated For You"
        seeAllLink="/products?is_featured=true"
        seeAllLabel="See all featured"
        fallbackKey="featured"
      />

      {/* 6. New arrivals — recency/FOMO */}
      <FeaturedProductsSection
        queryKey={['products', 'new-in']}
        queryFn={() => productsApi.getProducts({ ordering: '-created_at', page_size: 8 }).then((r) => r.data?.results || r.data)}
        title="New In"
        subtitle="Just Arrived"
        seeAllLink="/products?ordering=-created_at"
        seeAllLabel="View all new"
        fallbackKey="new"
      />

      {/* 7. Trending — highest rated + most reviewed */}
      <FeaturedProductsSection
        queryKey={['products', 'trending']}
        queryFn={() => productsApi.getProducts({ ordering: '-review_count', page_size: 8 }).then((r) => r.data?.results || r.data)}
        title="Trending Right Now"
        subtitle="Most Loved"
        seeAllLink="/products?ordering=-review_count"
        seeAllLabel="See what's trending"
        fallbackKey="featured"
      />

      {/* 8. Sale countdown + brand marquee */}
      <PromoBannerSection />

      {/* 8. Social proof — testimonials */}
      <TestimonialsSection />

      {/* 8. FAQ — objection removal */}
      <FAQSection />

      {/* 9. Newsletter — email capture */}
      <NewsletterSection />

      {/* 10. Trust badges + payment methods */}
      <TrustBadgesSection />
    </div>
  );
}
