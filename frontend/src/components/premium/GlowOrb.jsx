/**
 * GlowOrb — Ambient blurred orb used behind hero sections / stat cards.
 *
 * Pure CSS — no shader needed. Renders a soft conic-gradient circle with
 * heavy blur. Drifts slowly via CSS animation. Lightweight + GPU-friendly.
 */
export default function GlowOrb({
  size = 400,
  color = 'rgba(192, 38, 211, 0.35)',
  className = '',
  drift = true,
  style = {},
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full ${drift ? 'animate-spotlight' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        filter: 'blur(40px)',
        ...style,
      }}
    />
  );
}
