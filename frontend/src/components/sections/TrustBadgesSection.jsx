/**
 * TrustBadgesSection — Bottom-of-page reassurance signals.
 *
 * Business Goal: Every e-commerce conversion study confirms that trust
 * signals placed near the CTA and footer reduce cart abandonment by 18%.
 *
 * This section appears on multiple pages (Homepage, Cart, Checkout) as
 * a shared component — DRY principle.
 */
import { useRevealClass } from '../../hooks/useScrollReveal';

const TRUST_ITEMS = [
  {
    title: '256-bit SSL',
    desc: 'Bank-level encryption on all transactions',
    icon: (
      <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: '30-Day Returns',
    desc: 'No questions asked free returns',
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    title: 'Fast Delivery',
    desc: '2–5 days to your doorstep',
    icon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    title: 'Quality Guarantee',
    desc: 'All products quality-checked',
    icon: (
      <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: '24/7 Support',
    desc: 'Real humans, always available',
    icon: (
      <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: 'Easypaisa & COD',
    desc: 'Pay your preferred way',
    icon: (
      <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

const PAYMENT_BADGES = ['Easypaisa', 'COD', 'Bank Transfer'];

export default function TrustBadgesSection() {
  const { ref, className } = useRevealClass();

  return (
    <section className="bg-neutral-50 border-y border-neutral-100 py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust items grid */}
        <div ref={ref} className={`${className} grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6`}>
          {TRUST_ITEMS.map((item, i) => (
            <div
              key={item.title}
              className="flex flex-col items-center text-center gap-2"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center">
                {item.icon}
              </div>
              <p className="text-xs font-semibold text-neutral-900">{item.title}</p>
              <p className="text-xs text-neutral-500 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <span className="text-xs text-neutral-400 mr-2">Accepted payments:</span>
          {PAYMENT_BADGES.map((b) => (
            <span
              key={b}
              className="bg-white border border-neutral-200 text-neutral-600 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
