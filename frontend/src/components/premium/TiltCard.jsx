/**
 * TiltCard — 3D mouse-tilt card with spotlight follow.
 *
 * On mouse move within the card, the contents tilt slightly in 3D (max 8°)
 * and a soft gold spotlight follows the cursor. On leave, everything resets.
 *
 * - Touch devices: tilt disabled, only the spotlight stays as a passive effect
 * - Reduced motion: tilt disabled
 * - Pointer events on inner elements still work (we use pointer-events: auto)
 *
 * Usage:
 *   <TiltCard>
 *     <YourCardContent />
 *   </TiltCard>
 */
import { useEffect, useRef } from 'react';

export default function TiltCard({
  children,
  className = '',
  maxTilt = 8,
  glareIntensity = 0.12,
  spotlightColor = 'rgba(212, 160, 23, 0.16)',
  ...rest
}) {
  const cardRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    const inner = innerRef.current;
    if (!card || !inner) return;

    const supportsHover = window.matchMedia('(hover: hover)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!supportsHover || reduce) return;

    let raf = 0;

    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      const rx = (py - 0.5) * -maxTilt * 2; // rotate X (vertical mouse)
      const ry = (px - 0.5) *  maxTilt * 2; // rotate Y (horizontal mouse)

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        inner.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
        card.style.setProperty('--x', `${px * 100}%`);
        card.style.setProperty('--y', `${py * 100}%`);
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        inner.style.transform = '';
      });
    };

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    return () => {
      card.removeEventListener('mousemove', onMove);
      card.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [maxTilt]);

  return (
    <div
      ref={cardRef}
      className={`tilt-3d relative ${className}`}
      style={{
        '--spotlight-color': spotlightColor,
        '--glare-intensity': glareIntensity,
      }}
      {...rest}
    >
      <div ref={innerRef} className="tilt-3d-inner relative">
        {children}
        {/* Spotlight overlay — driven by --x, --y from JS */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), var(--spotlight-color), transparent 50%)`,
          }}
        />
      </div>
    </div>
  );
}
