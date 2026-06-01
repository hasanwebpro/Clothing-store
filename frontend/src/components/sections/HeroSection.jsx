import { Link } from 'react-router-dom';
import PremiumButton from '../premium/PremiumButton';

const HEADLINE = {
  kicker: 'New Summer Collection 2025',
  line1: 'Dress to',
  highlight: 'Express',
  line2: 'Yourself',
  sub: 'Discover hand-curated luxury fashion. Free delivery on orders over PKR 2,000.',
  ctaPrimary:   { label: 'Shop All Collections', to: '/products' },
  ctaSecondary: { label: 'Sale Up to 60% Off',   to: '/category/sale' },
};

const TRUST_ITEMS = [
  { label: '10,000+ Customers', iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Free Delivery',     iconPath: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { label: '30-Day Returns',    iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
];

const FLOATING_BADGES = [
  { title: '4.9 / 5',      sub: 'Rated by 8,400+ shoppers',    icon: '⭐' },
  { title: 'Fast Shipping', sub: '2–3 day delivery PK-wide',    icon: '⚡' },
  { title: 'Members Only',  sub: 'Early access + 20% off',      icon: '♦' },
];

const SPARKLES = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  top:   `${(i * 17 + 7)  % 94}%`,
  left:  `${(i * 29 + 13) % 96}%`,
  size:  i % 6 === 0 ? 4 : i % 3 === 0 ? 3 : 2,
  delay: `${(i * 0.41) % 3.5}s`,
  dur:   `${1.6 + (i * 0.17) % 1.6}s`,
}));

export default function HeroSection() {
  return (
    <>
      <section
        aria-label="Hero banner"
        className="relative isolate overflow-hidden text-white"
        style={{ minHeight: 'min(88vh, 920px)' }}
      >
        {/* ── Animated gradient background ─────────────────────── */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: 'linear-gradient(to right, #EC6EAD 0%, #c45fa0 25%, #7b5ea7 55%, #3494E6 100%)',
          }}
        />

        {/* ── Teal accent glow ─────────────────────────────────── */}
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 45% at 85% 20%, rgba(0,210,210,0.22) 0%, transparent 65%)' }} />



        {/* ── Light grain for texture ───────────────────────────── */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 w-full flex items-center min-h-[88vh]">
          <div className="max-w-3xl">

            {/* Kicker */}
            <div className="animate-fade-in-down">
              <span className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold tracking-[0.18em] uppercase text-white/90 mb-8"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)' }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                {HEADLINE.kicker}
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-bold leading-[0.95] tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              <span className="block animate-fade-in-up delay-100" style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #ffd6ec 40%, #ffffff 70%, #ffb3d9 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite', filter: 'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 32px rgba(255,100,160,0.6))',
              }}>{HEADLINE.line1}</span>
              <span className="block animate-fade-in-up delay-200" style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #ffd6ec 40%, #ffffff 70%, #ffb3d9 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite', filter: 'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 32px rgba(255,100,160,0.6))',
              }}>{HEADLINE.highlight}{' '}{HEADLINE.line2}</span>
            </h1>

            <p className="mt-7 text-base md:text-lg max-w-xl leading-relaxed animate-fade-in-up delay-300" style={{ color: 'rgba(255,255,255,0.88)' }}>
              {HEADLINE.sub}
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-400">
              <Link to={HEADLINE.ctaPrimary.to}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-9 py-4 text-sm font-bold tracking-wider text-white transition-all duration-300 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.20)'; }}>
                {HEADLINE.ctaPrimary.label}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <Link to={HEADLINE.ctaSecondary.to}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold tracking-wider text-white transition-all duration-300 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}>
                Sale Up to 60% Off
              </Link>
            </div>

            {/* Trust */}
            <div className="mt-14 flex flex-wrap items-center gap-x-7 gap-y-3 animate-fade-in-up delay-500">
              {TRUST_ITEMS.map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-white/85 text-sm font-medium">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.iconPath} />
                  </svg>
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* Tommy Vercetti */}
          <style>{`
            @keyframes tommyGlow {
              0%,100% { filter: drop-shadow(0 0 18px rgba(236,110,173,0.7)) drop-shadow(0 0 40px rgba(236,110,173,0.3)); }
              50%      { filter: drop-shadow(0 0 32px rgba(236,110,173,1))   drop-shadow(0 0 70px rgba(220,80,150,0.6)); }
            }
          `}</style>
          <div className="hidden lg:block absolute bottom-0 animate-slide-right delay-300"
            style={{ right: '-240px', height: '95%' }}>
            <img
              src="/tommy.png"
              alt="Tommy Vercetti"
              draggable={false}
              className="h-full w-auto object-contain object-bottom select-none"
              style={{
                animation: 'tommyGlow 3s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in delay-700" aria-hidden="true">
          <span className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Scroll</span>
          <div className="w-5 h-8 rounded-full flex justify-center pt-1.5" style={{ border: '1px solid rgba(255,255,255,0.3)' }}>
            <div className="w-1 h-2 rounded-full bg-white animate-bounce" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
      </section>
    </>
  );
}
