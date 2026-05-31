/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Miami Vice Pink (primary brand) ────────────────────────────
        brand: {
          50:  '#fff0f7',
          100: '#ffd6eb',
          200: '#ffadd6',
          300: '#ff75bb',
          400: '#ff3d9a',
          500: '#ff006e',  // hot pink
          600: '#d4005c',
          700: '#a8004a',
          800: '#7a0036',
          900: '#520024',
        },
        // ── Miami Vice Teal/Cyan (accent) ──────────────────────────────
        luxe: {
          50:  '#e0ffff',
          100: '#b3fffe',
          200: '#7ffffd',
          300: '#40f4f4',
          400: '#08f7fe',
          500: '#00d4d4',  // neon teal
          600: '#00aaaa',
          700: '#008080',
          800: '#005858',
          900: '#003838',
        },
        // ── Miami Vice Coral (warm accent) ─────────────────────────────
        coral: {
          400: '#ff7043',
          500: '#ff5722',
          600: '#e64a19',
        },
        // ── Deep Miami dark (background) ───────────────────────────────
        ink: {
          50:  '#f5f0ff',
          100: '#ebe0ff',
          200: '#d0b0ff',
          300: '#a870ff',
          400: '#7830f0',
          500: '#5010c8',
          600: '#380a96',
          700: '#270768',
          800: '#180440',
          900: '#0e0228',
          950: '#07011a',  // near-black deep purple
        },
        neutral: { 950: '#0a0a0a' },
        // ── Admin sidebar dark ─────────────────────────────────────────
        admin: {
          900: '#0c0118',
          800: '#120220',
          700: '#1a0430',
          600: '#240640',
          500: '#300850',
          border: 'rgba(255,255,255,0.07)',
        },
      },
      fontFamily: {
        sans:    ['Montserrat', 'system-ui', 'sans-serif'],
        display: ['Cormorant', 'Playfair Display', 'Georgia', 'serif'],
        serif:   ['Cormorant', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        // Miami Vice mesh gradients
        'mesh-miami':   'radial-gradient(at 20% 30%, #ff006e 0%, transparent 50%), radial-gradient(at 80% 20%, #00d4d4 0%, transparent 50%), radial-gradient(at 50% 80%, #7830f0 0%, transparent 50%)',
        'mesh-pink':    'radial-gradient(at 0% 0%, #fff0f7 0%, transparent 50%), radial-gradient(at 100% 100%, #e0ffff 0%, transparent 50%)',
        'pink-line':    'linear-gradient(90deg, transparent, #ff006e, transparent)',
        'teal-line':    'linear-gradient(90deg, transparent, #00d4d4, transparent)',
        'shimmer':      'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
        'teal-shimmer': 'linear-gradient(110deg, transparent 30%, rgba(0,212,212,0.45) 50%, transparent 70%)',
        'pink-shimmer': 'linear-gradient(110deg, transparent 30%, rgba(255,0,110,0.45) 50%, transparent 70%)',
        'admin-grad':   'linear-gradient(135deg, #0c0118 0%, #120220 50%, #0c0118 100%)',
        'card-dark':    'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        // Miami Vice hero gradient
        'miami-hero':   'linear-gradient(135deg, #07011a 0%, #1a0430 40%, #0a1a2e 100%)',
      },
      boxShadow: {
        'luxe':         '0 8px 32px -8px rgba(255,0,110,0.15), 0 4px 16px -4px rgba(0,212,212,0.10)',
        'luxe-lg':      '0 24px 64px -16px rgba(255,0,110,0.22), 0 12px 32px -8px rgba(0,212,212,0.14)',
        'glow-pink':    '0 0 60px -10px rgba(255,0,110,0.55)',
        'glow-teal':    '0 0 60px -10px rgba(0,212,212,0.50)',
        'glow-teal-sm': '0 0 24px -4px rgba(0,212,212,0.45)',
        'glow-pink-sm': '0 0 24px -4px rgba(255,0,110,0.40)',
        'inner-glow':   'inset 0 1px 0 0 rgba(255,255,255,0.10), inset 0 0 32px 0 rgba(255,255,255,0.04)',
        'card-dark':    '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
        'card-dark-hover': '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,212,0.25)',
        'nav-dark':     '0 4px 32px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(0,212,212,0.15)',
      },
      animation: {
        'slide-in':      'slideIn 0.3s ease-out',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':       'fadeIn 0.25s ease-in',
        'fade-in-up':    'fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        'aurora':        'aurora 18s ease-in-out infinite',
        'glow-pulse':    'glowPulse 3s ease-in-out infinite',
        'spotlight':     'spotlight 8s ease-in-out infinite',
        'float':         'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'shimmer-sweep': 'shimmerSweep 2s linear infinite',
        'teal-sweep':    'tealSweep 2.5s cubic-bezier(0.4,0,0.2,1) infinite',
        'spin-slow':     'spin 8s linear infinite',
        'border-glow':   'borderGlow 3s ease-in-out infinite',
        'counter-up':    'counterUp 0.6s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':      'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        'nav-reveal':    'navReveal 0.6s cubic-bezier(0.16,1,0.3,1)',
        'neon-pulse':    'neonPulse 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn:    { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        slideUp:    { '0%': { transform: 'translateY(20px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:     { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        fadeInUp:   { '0%': { opacity: 0, transform: 'translateY(24px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        aurora:     { '0%,100%': { 'background-position': '0% 50%' }, '50%': { 'background-position': '100% 50%' } },
        glowPulse:  { '0%,100%': { opacity: 0.45, transform: 'scale(1)' }, '50%': { opacity: 0.75, transform: 'scale(1.05)' } },
        spotlight:  { '0%,100%': { transform: 'translate(0%,0%)' }, '33%': { transform: 'translate(30%,-10%)' }, '66%': { transform: 'translate(-20%,20%)' } },
        float:      { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmerSweep:{ '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        tealSweep:  { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
        borderGlow: { '0%,100%': { 'box-shadow': '0 0 8px rgba(0,212,212,0.4)' }, '50%': { 'box-shadow': '0 0 28px rgba(0,212,212,0.9), 0 0 8px rgba(255,0,110,0.4)' } },
        counterUp:  { '0%': { transform: 'translateY(10px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        scaleIn:    { '0%': { transform: 'scale(0.92)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        navReveal:  { '0%': { transform: 'translateY(-100%)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        neonPulse:  { '0%,100%': { 'text-shadow': '0 0 8px rgba(0,212,212,0.8), 0 0 20px rgba(0,212,212,0.4)' }, '50%': { 'text-shadow': '0 0 20px rgba(0,212,212,1), 0 0 40px rgba(0,212,212,0.6), 0 0 60px rgba(255,0,110,0.3)' } },
      },
      fontSize: {
        'xs':   ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px  (was 12px)
        'sm':   ['0.9375rem', { lineHeight: '1.5rem'  }],   // 15px  (was 14px)
        'base': ['1.0625rem', { lineHeight: '1.7rem'  }],   // 17px  (was 16px)
        'lg':   ['1.1875rem', { lineHeight: '1.85rem' }],   // 19px  (was 18px)
        'xl':   ['1.3125rem', { lineHeight: '2rem'    }],   // 21px  (was 20px)
        '2xl':  ['1.5625rem', { lineHeight: '2.1rem'  }],   // 25px  (was 24px)
        '3xl':  ['2rem',      { lineHeight: '2.35rem' }],   // 32px  (was 30px)
        '4xl':  ['2.375rem',  { lineHeight: '2.6rem'  }],   // 38px  (was 36px)
        '5xl':  ['3.125rem',  { lineHeight: '1'       }],   // 50px  (was 48px)
        '6xl':  ['4rem',      { lineHeight: '1'       }],   // 64px  (was 60px)
        '7xl':  ['4.75rem',   { lineHeight: '1'       }],   // 76px  (was 72px)
        '8xl':  ['6.25rem',   { lineHeight: '1'       }],   // 100px (was 96px)
        '9xl':  ['8.25rem',   { lineHeight: '1'       }],   // 132px (was 128px)
      },
      borderRadius: {
        'sm':   '0.375rem',   // 6px   (was 2px)
        DEFAULT:'0.5rem',     // 8px   (was 4px)
        'md':   '0.625rem',   // 10px  (was 6px)
        'lg':   '0.875rem',   // 14px  (was 8px)
        'xl':   '1.25rem',    // 20px  (was 12px)
        '2xl':  '1.75rem',    // 28px  (was 16px)
        '3xl':  '2.5rem',     // 40px  (was 24px)
        'full': '9999px',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
