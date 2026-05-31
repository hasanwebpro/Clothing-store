import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useRevealClass } from '../../hooks/useScrollReveal';

// ── Animated counter hook ─────────────────────────────────────────────────
function useCountUp(target, duration = 1400, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);
  return value;
}

function formatStat(key, value) {
  if (value == null) return '—';
  if (key === 'delivery_rate') return `${value}%`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}k+`;
  return `${value}+`;
}

const STAT_CONFIG = [
  {
    key: 'happy_customers',
    label: 'Happy Customers',
    color: 'text-brand-600',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'brands',
    label: 'Premium Brands',
    color: 'text-amber-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    key: 'total_skus',
    label: 'Products Listed',
    color: 'text-emerald-600',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: 'delivery_rate',
    label: 'Delivery Success',
    color: 'text-blue-500',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
];

function StatItem({ config, rawValue, delay }) {
  const { ref, className } = useRevealClass();
  const [visible, setVisible] = useState(false);
  const itemRef = useRef(null);

  // Trigger counter when item scrolls into view
  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const numericValue = config.key === 'delivery_rate'
    ? Math.round(rawValue ?? 0)
    : (rawValue ?? 0);

  const animated = useCountUp(numericValue, 1400, visible);

  const displayValue = rawValue == null
    ? '—'
    : config.key === 'delivery_rate'
      ? `${animated}%`
      : animated >= 1000
        ? `${(animated / 1000).toFixed(1).replace('.0', '')}k+`
        : `${animated}+`;

  return (
    <div
      ref={(el) => { ref.current = el; itemRef.current = el; }}
      className={`${className} text-center`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex justify-center mb-3">
        <div className={`w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center ${config.color}`}>
          {config.icon}
        </div>
      </div>
      <p className="text-3xl md:text-4xl font-display font-bold text-neutral-900 tabular-nums">
        {displayValue}
      </p>
      <p className="text-sm text-neutral-500 mt-1">{config.label}</p>
    </div>
  );
}

export default function StatsSection() {
  const { data } = useQuery({
    queryKey: ['store-stats'],
    queryFn: () => apiClient.get('/analytics/store-stats/').then(r => r.data),
    staleTime: 1000 * 60 * 10, // matches backend 10-min cache
  });

  return (
    <section className="py-16 bg-gradient-to-r from-brand-50 via-white to-pink-50 border-y border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STAT_CONFIG.map((config, i) => (
            <StatItem
              key={config.key}
              config={config}
              rawValue={data?.[config.key] ?? null}
              delay={i * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
