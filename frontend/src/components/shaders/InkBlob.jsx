import { useEffect, useRef } from 'react';

const BLOBS = [
  { ox: 0,    oy: 0,    r: 320, speed: 0.055, opacity: 0.72 },
  { ox: 120,  oy: -80,  r: 220, speed: 0.032, opacity: 0.55 },
  { ox: -140, oy: 100,  r: 260, speed: 0.024, opacity: 0.48 },
  { ox: 80,   oy: 160,  r: 180, speed: 0.068, opacity: 0.60 },
  { ox: -90,  oy: -140, r: 150, speed: 0.041, opacity: 0.40 },
  { ox: 200,  oy: 60,   r: 130, speed: 0.078, opacity: 0.35 },
];

// Baby pink palette
const COLORS = [
  [255, 182, 193],   // baby pink
  [255, 162, 185],   // rose pink
  [255, 209, 220],   // blush
  [255, 140, 175],   // deeper pink
  [255, 225, 235],   // light blush
  [245, 120, 165],   // hot pink accent
];

export default function InkBlob({ className = '' }) {
  const canvasRef = useRef(null);
  const mouse     = useRef({ x: -9999, y: -9999 });
  const blobState = useRef(
    BLOBS.map((b, i) => ({
      ...b,
      x: 0, y: 0,
      color: COLORS[i % COLORS.length],
    }))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      // Seed blob positions to center on resize
      const cx = canvas.width  / 2;
      const cy = canvas.height / 2;
      blobState.current.forEach(b => {
        if (b.x === 0 && b.y === 0) { b.x = cx + b.ox; b.y = cy + b.oy; }
      });
      if (mouse.current.x === -9999) {
        mouse.current = { x: cx, y: cy };
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Mouse
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => {
      mouse.current = { x: canvas.width / 2, y: canvas.height / 2 };
    };
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    let raf;
    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Dark background
      ctx.fillStyle = '#06010f';
      ctx.fillRect(0, 0, W, H);

      // Draw blobs
      ctx.globalCompositeOperation = 'screen';

      blobState.current.forEach(b => {
        // Spring toward mouse + offset
        const tx = mouse.current.x + b.ox;
        const ty = mouse.current.y + b.oy;
        b.x += (tx - b.x) * b.speed;
        b.y += (ty - b.y) * b.speed;

        const [r, g, bv] = b.color;
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0,   `rgba(${r},${g},${bv},${b.opacity})`);
        grad.addColorStop(0.35,`rgba(${r},${g},${bv},${b.opacity * 0.65})`);
        grad.addColorStop(0.7, `rgba(${r},${g},${bv},${b.opacity * 0.22})`);
        grad.addColorStop(1,   `rgba(${r},${g},${bv},0)`);

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block w-full h-full ${className}`}
    />
  );
}
