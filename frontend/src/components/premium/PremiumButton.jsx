/**
 * PremiumButton — Cinematic CTA button with shimmer + magnetic hover.
 *
 * Variants
 * --------
 *  - 'luxe'    : dark navy with gold shimmer sweep on hover (primary CTA)
 *  - 'glass'   : frosted glass for light backgrounds, gold border on hover
 *  - 'gold'    : solid champagne-gold gradient for accent CTAs
 *  - 'ghost'   : ultra-minimal text-only with underline glow
 *
 * Magnetic effect
 * ---------------
 * Within ~40px of the button, it subtly pulls toward the cursor. Disabled
 * on touch devices and when `prefers-reduced-motion` is set.
 */
import { forwardRef, useEffect, useRef } from 'react';

const VARIANTS = {
  luxe:  'btn-luxe',
  glass: 'btn-luxe-outline',
  gold:  'bg-gradient-to-r from-luxe-400 via-luxe-500 to-luxe-600 text-ink-900 font-semibold rounded-xl px-7 py-3 text-sm shadow-lg shadow-luxe-500/30 hover:shadow-luxe-500/50 hover:-translate-y-0.5 transition-all duration-300',
  ghost: 'relative inline-flex items-center gap-2 text-sm font-semibold text-ink-900 hover:text-brand-600 transition-colors',
};

const PremiumButton = forwardRef(function PremiumButton(
  { variant = 'luxe', children, className = '', magnetic = true, as: Tag = 'button', ...rest },
  ref,
) {
  const localRef = useRef(null);
  const setRef = (el) => {
    localRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  // Magnetic effect — only on pointer (mouse) devices, respects reduced motion
  useEffect(() => {
    if (!magnetic) return;
    const el = localRef.current;
    if (!el) return;
    const supportsHover = window.matchMedia('(hover: hover)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!supportsHover || reduce) return;

    let raf = 0;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(x, y);
      if (dist > 80) return; // out of pull range
      const strength = 0.25;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = '';
      });
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [magnetic]);

  return (
    <Tag
      ref={setRef}
      className={`${VARIANTS[variant] || VARIANTS.luxe} ${className}`}
      {...rest}
    >
      {variant === 'ghost' ? (
        <>
          <span className="relative">
            {children}
            <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-brand-600 to-luxe-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
          </span>
        </>
      ) : children}
    </Tag>
  );
});

export default PremiumButton;
