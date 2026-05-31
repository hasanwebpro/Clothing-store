/**
 * HeroShader — WebGL domain-warp fluid shader.
 *
 * Technique: Fractional Brownian Motion (fBm) + domain warping.
 * The UVs are warped by noise twice before sampling color — this
 * produces the organic, flowing, lava-lamp-like motion.
 *
 * Color palette: Miami Vice (hot pink, neon teal, deep purple).
 */
import { useEffect, useRef } from 'react';

const VERT = /* glsl */`
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 v_uv;
uniform float u_t;
uniform vec2  u_res;

/* ── helpers ────────────────────────────────────────────────────── */
float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 43.21);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i),           hash(i + vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.52;
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p  = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.49;
  }
  return v;
}

/* ── Miami Vice palette ─────────────────────────────────────────── */
vec3 C_DARK   = vec3(0.028, 0.004, 0.098);  // #07011A  deep purple-black
vec3 C_PURPLE = vec3(0.47,  0.19,  0.94);   // #7830F0  mid purple
vec3 C_PINK   = vec3(1.0,   0.0,   0.43);   // #FF006E  hot pink
vec3 C_TEAL   = vec3(0.03,  0.83,  0.83);   // #08D4D4  neon teal
vec3 C_CORAL  = vec3(1.0,   0.42,  0.20);   // #FF6B33  miami coral

void main() {
  vec2 uv = v_uv;
  uv.x *= u_res.x / u_res.y;

  float t  = u_t * 0.10;

  /* ── pass 1 warp ─────────────────────────────────────────────── */
  vec2 q = vec2(
    fbm(uv + vec2(0.00, 0.00)),
    fbm(uv + vec2(5.20, 1.30))
  );

  /* ── pass 2 warp (richer curl) ───────────────────────────────── */
  vec2 r = vec2(
    fbm(uv + 4.1 * q + vec2(1.7,  9.2) + t * 0.15),
    fbm(uv + 4.1 * q + vec2(8.3,  2.8) + t * 0.13)
  );

  /* ── pass 3 warp (fine detail swirls) ───────────────────────── */
  vec2 s = vec2(
    fbm(uv + 3.5 * r + vec2(3.1, 0.4) + t * 0.09),
    fbm(uv + 3.5 * r + vec2(0.2, 6.5) + t * 0.11)
  );

  float f = fbm(uv + 3.8 * s + t * 0.07);

  /* ── color mixing ────────────────────────────────────────────── */
  vec3 col = C_DARK;
  col = mix(col, C_PURPLE, smoothstep(0.0, 0.6, f));
  col = mix(col, C_PINK,   smoothstep(0.3, 0.75, f) * clamp(length(q) * 1.4, 0.0, 1.0));
  col = mix(col, C_TEAL,   smoothstep(0.5, 0.9,  f) * clamp(length(r) * 1.2, 0.0, 1.0));
  col = mix(col, C_CORAL,  0.18 * smoothstep(0.65, 1.0, f) * clamp(s.x * 1.6, 0.0, 1.0));

  /* ── subtle neon bloom on edges ─────────────────────────────── */
  col += 0.06 * C_TEAL * pow(clamp(1.0 - length(r), 0.0, 1.0), 3.0);
  col += 0.04 * C_PINK * pow(clamp(1.0 - length(s), 0.0, 1.0), 4.0);

  /* ── film grain (tiny) ───────────────────────────────────────── */
  float grain = hash(gl_FragCoord.xy * 0.43 + u_t) * 0.025;
  col += grain;

  /* ── gamma ───────────────────────────────────────────────────── */
  col = pow(max(col, 0.0), vec3(0.82));

  gl_FragColor = vec4(col, 1.0);
}`;

function hexToRGB(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

export default function HeroShader({ className = '', style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* ── WebGL context ──────────────────────────────────────────── */
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      // CSS fallback — static Miami Vice gradient
      canvas.style.background =
        'linear-gradient(135deg, #07011a 0%, #1a0430 35%, #0a1a30 65%, #07011a 100%)';
      return;
    }

    /* ── Shader program ─────────────────────────────────────────── */
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER,   VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
    } catch (e) {
      console.warn('HeroShader compile failed', e);
      return;
    }

    /* ── Fullscreen quad ────────────────────────────────────────── */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1,  -1,1,
      -1, 1,  1,-1,   1,1,
    ]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    /* ── Uniforms ───────────────────────────────────────────────── */
    const uT   = gl.getUniformLocation(prog, 'u_t');
    const uRes = gl.getUniformLocation(prog, 'u_res');

    /* ── Resize ─────────────────────────────────────────────────── */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w   = Math.floor(canvas.clientWidth  * dpr);
      const h   = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ── Visibility pause ───────────────────────────────────────── */
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    /* ── Reduced motion → single frame ─────────────────────────── */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start   = performance.now();

    let raf;
    const tick = (now) => {
      if (visible) {
        gl.uniform1f(uT, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (!reduced) raf = requestAnimationFrame(tick);
    };

    if (reduced) {
      gl.uniform1f(uT, 6);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block w-full h-full ${className}`}
      style={style}
    />
  );
}
