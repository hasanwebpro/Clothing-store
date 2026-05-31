const COLORS = [
  'rgba(0,212,212,0.9)',
  'rgba(212,160,23,0.85)',
  'rgba(255,0,110,0.80)',
  'rgba(245,216,71,0.75)',
  'rgba(192,38,211,0.70)',
  'rgba(139,92,246,0.65)',
  'rgba(34,211,238,0.75)',
  'rgba(255,255,255,0.55)',
];

const SPARKLES = Array.from({ length: 96 }, (_, i) => ({
  id: i,
  top:   `${(i * 13.7 + 3.1) % 97}%`,
  left:  `${(i * 23.3 + 7.7) % 97}%`,
  size:  i % 8 === 0 ? 5 : i % 5 === 0 ? 4 : i % 3 === 0 ? 3 : 2,
  color: COLORS[i % 8],
  delay: `${(i * 0.37) % 5.5}s`,
  dur:   `${2.2 + (i * 0.19) % 2.8}s`,
  anim:  i % 3 === 0 ? 'adminSparkTwinkle' : i % 3 === 1 ? 'adminSparkFloat' : 'adminSparkDrift',
  isStar: i % 3 !== 2,
}));

const KEYFRAMES = `
@keyframes adminSparkTwinkle {
  0%,100% { opacity:0;    transform:scale(0.25) rotate(0deg);  }
  30%,70% { opacity:1;    transform:scale(1)    rotate(20deg); }
  50%     { opacity:0.55; transform:scale(1.3)  rotate(45deg); }
}
@keyframes adminSparkFloat {
  0%,100% { opacity:0.08; transform:translateY(0)    scale(0.8);  }
  50%     { opacity:0.95; transform:translateY(-12px) scale(1.15); }
}
@keyframes adminSparkDrift {
  0%   { opacity:0;   transform:translateY(16px)  scale(0.45); }
  20%  { opacity:0.9; }
  80%  { opacity:0.3; }
  100% { opacity:0;   transform:translateY(-22px) scale(1.1);  }
}
`;

export default function AdminSparkles() {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}
      >
        {SPARKLES.map(({ id, top, left, size, color, delay, dur, anim, isStar }) => {
          const base = {
            position: 'absolute',
            top,
            left,
            animation: `${anim} ${dur} ${delay} infinite ease-in-out`,
          };

          return isStar ? (
            <svg
              key={id}
              viewBox="0 0 20 20"
              fill="currentColor"
              style={{
                ...base,
                width:  size * 4,
                height: size * 4,
                color,
                filter: `drop-shadow(0 0 ${size + 1}px ${color})`,
              }}
            >
              {/* 4-pointed sparkle star */}
              <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8Z" />
            </svg>
          ) : (
            <div
              key={id}
              style={{
                ...base,
                width:        size + 2,
                height:       size + 2,
                borderRadius: '50%',
                background:   color,
                boxShadow:    `0 0 ${size * 3}px ${color}`,
              }}
            />
          );
        })}
      </div>
    </>
  );
}
