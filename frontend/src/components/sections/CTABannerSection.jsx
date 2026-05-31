/**
 * CTABannerSection — Mid-page conversion triggers.
 *
 * Business Goal: Intercept users who are browsing but haven't committed
 * to buying yet. The mid-page CTA catches them at the "consideration" stage.
 *
 * Conversion Strategy:
 *  - Urgency: "Limited time" + countdown-like language
 *  - Exclusivity: "Members only" framing
 *  - Loss aversion: "Don't miss out" is stronger than "Get a deal"
 *
 * Two-banner layout: One for new customers (signup/first purchase),
 * one for returning users (loyalty/referral). Each targets a different
 * funnel stage. This is the Strategy Pattern applied to marketing messaging.
 */
import { Link } from 'react-router-dom';
import { useRevealClass } from '../../hooks/useScrollReveal';

export default function CTABannerSection() {
  const { ref: ref1, className: c1 } = useRevealClass();
  const { ref: ref2, className: c2 } = useRevealClass();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-5">
        {/* Banner 1: Sale urgency */}
        <div
          ref={ref1}
          className={`${c1} relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-purple-700 p-8 md:p-10 text-white`}
        >
          {/* Decorative blob */}
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-4 bottom-0 w-32 h-32 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Limited Time
            </span>
            <h3 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-[1.05]" style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 40%,#fff 70%,#ffb3d9 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 10px rgba(255,180,210,0.9))' }}>
              Summer Sale<br />Up to 60% Off
            </h3>
            <p className="text-brand-100 mt-2 text-sm">
              New arrivals added weekly. Shop before they are gone!
            </p>
            <Link
              to="/category/sale"
              className="inline-flex items-center gap-2 mt-6 bg-white text-brand-700 font-bold px-6 py-3 rounded-full hover:bg-brand-50 hover:scale-105 transition-all text-sm"
            >
              Shop the Sale
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Banner 2: New customer offer */}
        <div
          ref={ref2}
          className={`${c2} relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 p-8 md:p-10 text-white`}
          style={{ transitionDelay: '150ms' }}
        >
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-brand-600/30 border border-brand-500/40 text-brand-300 text-xs font-bold px-3 py-1 rounded-full mb-4">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>
              New Member Offer
            </span>
            <h3 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-[1.05]" style={{ background:'linear-gradient(135deg,#fff 0%,#ffd6ec 40%,#fff 70%,#ffb3d9 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer 4s linear infinite', filter:'drop-shadow(0 0 10px rgba(255,180,210,0.9))' }}>
              First Order?<br />Get 15% Off
            </h3>
            <p className="text-neutral-400 mt-2 text-sm">
              Create your free account and use code <strong className="text-white font-mono">WELCOME15</strong> at checkout.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 mt-6 bg-brand-600 text-white font-bold px-6 py-3 rounded-full hover:bg-brand-500 hover:scale-105 transition-all text-sm"
            >
              Claim Your Discount
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
