/**
 * PromoBannerSection — Sale urgency + brand showcase.
 *
 * Conversion Strategy:
 *  - Countdown timer triggers loss aversion (limited time offer)
 *  - Bold contrast design breaks visual monotony between product grids
 *  - Brand logos scrolling marquee adds credibility
 *
 * SDA Pattern: Observer — the countdown timer is a setInterval observer
 * that fires events every second and the component reacts to them.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRevealClass } from '../../hooks/useScrollReveal';

// Target: end of next Sunday at 23:59:59
function getNextSundayEnd() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilSunday);
  target.setHours(23, 59, 59, 0);
  return target;
}

function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const s = Math.floor(timeLeft / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function TimeUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center">
        <span className="font-display text-2xl md:text-3xl font-bold text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-white/85 mt-1.5 uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}

const BRANDS = ['Khaadi', 'Sapphire', 'Gul Ahmed', 'Alkaram', 'Sana Safinaz', 'Maria B', 'Zara Shahjahan', 'Limelight', 'Breakout', 'Bonanza'];

export default function PromoBannerSection() {
  const { ref, className } = useRevealClass();
  const saleEnd = getNextSundayEnd().getTime();
  const countdown = useCountdown(saleEnd);

  return (
    <div>
      {/* Sale countdown banner */}
      <section className="relative overflow-hidden py-16 md:py-20" style={{ background: 'linear-gradient(to right,#EC6EAD 0%,#c45fa0 25%,#7b5ea7 55%,#3494E6 100%)' }}>
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        <div ref={ref} className={`${className} relative max-w-5xl mx-auto px-4 sm:px-6 text-center`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Weekend Sale — Ends Soon
          </div>

          <h2 className="font-display text-4xl md:text-6xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg,#ffffff 0%,#ffd6ec 40%,#ffffff 70%,#ffb3d9 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              animation: 'shimmer 4s linear infinite',
              filter: 'drop-shadow(0 0 12px rgba(255,180,210,0.9)) drop-shadow(0 0 32px rgba(255,100,160,0.6))',
            }}>
            Up to 50% Off
          </h2>
          <p className="text-white/85 text-lg mb-10">
            Don't miss our biggest sale of the season. Limited stock available.
          </p>

          {/* Countdown */}
          <div className="flex items-start justify-center gap-4 md:gap-6 mb-10">
            <TimeUnit value={countdown.days} label="Days" />
            <span className="text-white/70 text-3xl font-bold mt-4">:</span>
            <TimeUnit value={countdown.hours} label="Hours" />
            <span className="text-white/70 text-3xl font-bold mt-4">:</span>
            <TimeUnit value={countdown.minutes} label="Mins" />
            <span className="text-white/70 text-3xl font-bold mt-4">:</span>
            <TimeUnit value={countdown.seconds} label="Secs" />
          </div>

          <Link
            to="/products?is_sale=true"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-sm text-white hover:scale-105 transition-all shadow-2xl bg-brand-600 hover:bg-brand-500"
          >
            Shop the Sale
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Brand marquee */}
      <section className="py-10 bg-neutral-50 border-y border-neutral-100 overflow-hidden">
        <p className="text-center text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6">
          Trusted by Pakistan's Leading Fashion Brands
        </p>
        <div className="relative flex overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-neutral-50 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-neutral-50 to-transparent pointer-events-none" />

          <div className="flex animate-marquee whitespace-nowrap" aria-hidden="true">
            {[...BRANDS, ...BRANDS].map((brand, i) => (
              <div key={i} className="flex items-center mx-10 flex-shrink-0">
                <span className="font-display text-xl font-bold text-neutral-300 hover:text-neutral-500 transition-colors cursor-default select-none">
                  {brand}
                </span>
                <span className="ml-10 text-neutral-200 text-lg select-none">·</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
