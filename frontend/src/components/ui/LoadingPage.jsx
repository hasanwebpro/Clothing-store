/**
 * LoadingPage — full-screen app splash shown while the auth session restores.
 *
 * Styled identically to HeroSection: same gradient, same Tommy glow, same
 * sparkle layer and grain texture. Disappears the moment isLoading flips false.
 */

const SPARKLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  top:  `${(i * 23 + 11) % 92}%`,
  left: `${(i * 37 + 7)  % 94}%`,
  size: i % 5 === 0 ? 3 : 2,
  delay: `${(i * 0.29) % 3}s`,
  dur:   `${1.8 + (i * 0.19) % 1.4}s`,
}));

export default function LoadingPage() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(to right, #EC6EAD 0%, #c45fa0 25%, #7b5ea7 55%, #3494E6 100%)',
        animation: 'splash-fade 2.8s ease-in-out forwards',
      }}
    >
      {/* ── Teal accent glow ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 45% at 85% 20%, rgba(0,210,210,0.22) 0%, transparent 65%)' }} />

      {/* ── Grain texture ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── Dot grid ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* ── Sparkles ── */}
      {SPARKLES.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: s.top, left: s.left,
            width: s.size, height: s.size,
            background: 'rgba(255,255,255,0.7)',
            animationName: 'float',
            animationDuration: s.dur,
            animationDelay: s.delay,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          }}
        />
      ))}

      {/* ── Tommy ── */}
      <div
        className="absolute bottom-0 right-0 hidden md:block pointer-events-none select-none"
        style={{
          height: '92%',
          right: '-60px',
          animation: 'tommy-rise 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both',
        }}
      >
        <style>{`
          @keyframes tommyGlowSplash {
            0%,100% { filter: drop-shadow(0 0 20px rgba(236,110,173,0.7)) drop-shadow(0 0 50px rgba(236,110,173,0.3)); }
            50%      { filter: drop-shadow(0 0 36px rgba(236,110,173,1))   drop-shadow(0 0 80px rgba(220,80,150,0.6)); }
          }
        `}</style>
        <img
          src="/tommy.png"
          alt=""
          draggable={false}
          className="h-full w-auto object-contain object-bottom"
          style={{ animation: 'tommyGlowSplash 3s ease-in-out infinite' }}
        />
      </div>

      {/* ── Centre content ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">

        {/* Logo */}
        <div className="mb-8" style={{ animation: 'fadeInDown 0.6s ease-out 0.1s both' }}>
          <span className="font-display text-6xl md:text-7xl font-bold text-white tracking-tight"
            style={{ filter: 'drop-shadow(0 0 24px rgba(255,180,210,0.6))' }}>
            VOGUE
          </span>
          <span className="font-display text-6xl md:text-7xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg,#fff 0%,#ffd6ec 40%,#fff 70%,#ffb3d9 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              animation: 'shimmer 3s linear infinite',
              filter: 'drop-shadow(0 0 16px rgba(255,180,210,0.9))',
            }}>.</span>
        </div>

        {/* Tagline */}
        <p className="text-white/70 text-sm tracking-[0.3em] uppercase font-medium mb-12"
          style={{ animation: 'fadeIn 0.7s ease-out 0.4s both' }}>
          Premium Fashion Pakistan
        </p>

        {/* Loading bar */}
        <div className="w-48 md:w-64" style={{ animation: 'fadeIn 0.5s ease-out 0.5s both' }}>
          <div className="h-[2px] bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-white"
              style={{
                animation: 'splash-bar 2.2s cubic-bezier(0.4,0,0.2,1) 0.3s forwards',
                width: '0%',
              }}
            />
          </div>
          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/60"
                style={{
                  animation: 'float 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom text ── */}
      <div className="relative pb-8 text-center" style={{ animation: 'fadeIn 0.6s ease-out 0.7s both' }}>
        <p className="text-white/40 text-[10px] tracking-[0.25em] uppercase">
          Crafted with care in Pakistan
        </p>
      </div>
    </div>
  );
}
