/**
 * StatCard — Glowing premium stat tile used in dashboards.
 *
 * Layout: large value, label below, icon top-right, optional trend badge.
 * Effects: subtle gold/violet gradient border, glow on hover, animated
 * counter via CountUp child component when value is numeric.
 */
import { useEffect, useRef, useState } from 'react';

function CountUp({ value, prefix = '', suffix = '', decimals = 0, duration = 900 }) {
  const [n, setN] = useState(0);
  const target = Number(value) || 0;
  const startRef = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setN(target); return; }
    let raf;
    const start = performance.now();
    startRef.current = n;
    const from = n;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setN(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{prefix}{n.toLocaleString('en-PK', { maximumFractionDigits: decimals })}{suffix}</>;
}

const TONES = {
  violet: {
    iconBg: 'bg-gradient-to-br from-brand-500/15 to-brand-700/10',
    iconText: 'text-brand-600',
    glow:    'shadow-[0_0_60px_-10px_rgba(255,0,110,0.25)]',
    border:  'before:bg-[linear-gradient(135deg,rgba(255,0,110,0.4),rgba(0,212,212,0.4))]',
  },
  gold: {
    iconBg: 'bg-gradient-to-br from-luxe-300/20 to-luxe-600/10',
    iconText: 'text-luxe-600',
    glow:    'shadow-[0_0_60px_-10px_rgba(0,212,212,0.30)]',
    border:  'before:bg-[linear-gradient(135deg,rgba(0,212,212,0.4),rgba(255,0,110,0.4))]',
  },
  cool: {
    iconBg: 'bg-gradient-to-br from-blue-500/10 to-indigo-600/10',
    iconText: 'text-blue-600',
    glow:    'shadow-[0_0_60px_-10px_rgba(59,130,246,0.25)]',
    border:  'before:bg-[linear-gradient(135deg,rgba(59,130,246,0.35),rgba(99,102,241,0.35))]',
  },
  emerald: {
    iconBg: 'bg-gradient-to-br from-emerald-500/10 to-teal-600/10',
    iconText: 'text-emerald-600',
    glow:    'shadow-[0_0_60px_-10px_rgba(16,185,129,0.25)]',
    border:  'before:bg-[linear-gradient(135deg,rgba(16,185,129,0.35),rgba(20,184,166,0.35))]',
  },
};

export default function StatCard({
  label, value, sub, icon, tone = 'violet',
  trend = null, prefix = '', suffix = '', decimals = 0, animate = true,
}) {
  const t = TONES[tone] || TONES.violet;
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white p-5 transition-all duration-500 hover:-translate-y-1 ${t.glow} hover:shadow-luxe-lg`}
    >
      {/* Animated gradient border */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-2xl p-px opacity-60 group-hover:opacity-100 transition-opacity duration-500 ${t.border} before:absolute before:inset-0 before:rounded-2xl before:content-['']`}
        style={{
          maskImage: 'linear-gradient(black, black) content-box, linear-gradient(black, black)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {/* Card content (raised above the border) */}
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl ${t.iconBg} ${t.iconText} flex items-center justify-center transition-transform group-hover:scale-110`}>
            {icon}
          </div>
          {trend != null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <p className="text-3xl font-bold tracking-tight text-ink-900">
          {animate && typeof value !== 'string'
            ? <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            : <>{prefix}{value}{suffix}</>}
        </p>
        <p className="text-sm text-neutral-500 mt-1">{label}</p>
        {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
