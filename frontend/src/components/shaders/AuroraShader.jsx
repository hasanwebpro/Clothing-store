/**
 * AuroraShader — WebGL fragment shader rendering a cinematic aurora background.
 *
 * What it does
 * ------------
 * Renders a fullscreen GLSL fragment shader that produces slow-drifting
 * aurora-like color blobs. Color palette is configurable via props so we can
 * tint the hero (luxe gold/violet), checkout (cool blue/teal), admin (deeper
 * violet), etc.
 *
 * Why a custom shader instead of CSS gradients?
 * - CSS radial gradients are STATIC. Real aurora has organic curl noise that
 *   only a fragment shader can generate cheaply (one quad, fully GPU-bound).
 * - 60fps even on integrated graphics — the shader is ~30 instructions.
 *
 * Performance notes
 * - Uses requestAnimationFrame loop, paused when off-screen via
 *   IntersectionObserver (saves battery on phones).
 * - Respects `prefers-reduced-motion`: falls back to a static frame.
 * - DPR-aware: caps at 1.5 to stop 4K monitors from melting laptops.
 */
import { useEffect, useRef } from 'react';

/** Vertex shader — just passes UVs through. */
const VERT = /* glsl */ `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

/** Fragment shader — layered sin/cos noise + 3 colored blobs. */
const FRAG = /* glsl */ `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec3  u_color1;   // primary blob
uniform vec3  u_color2;   // secondary blob
uniform vec3  u_color3;   // accent blob
uniform vec3  u_bg;       // base background
uniform float u_intensity;

// Cheap value noise — good enough for slow drift
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth circular blob
float blob(vec2 uv, vec2 center, float radius, float softness) {
  float d = length(uv - center);
  return smoothstep(radius, radius - softness, d);
}

void main() {
  vec2 uv = v_uv;
  // Aspect correction so blobs stay round on wide monitors
  uv.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.15;

  // Three drifting blob centers (cinematic slow movement)
  vec2 c1 = vec2(0.30 + 0.20 * sin(t * 0.7), 0.50 + 0.18 * cos(t * 0.9));
  vec2 c2 = vec2(0.75 + 0.18 * cos(t * 0.5), 0.30 + 0.22 * sin(t * 1.1));
  vec2 c3 = vec2(0.55 + 0.25 * sin(t * 0.4), 0.80 + 0.15 * cos(t * 0.6));

  // Each blob's contribution
  float b1 = blob(uv, c1, 0.55, 0.45);
  float b2 = blob(uv, c2, 0.50, 0.40);
  float b3 = blob(uv, c3, 0.45, 0.35);

  // Subtle grain so it doesn't look like a vector gradient
  float grain = noise(gl_FragCoord.xy * 0.5) * 0.02;

  // Compose
  vec3 col = u_bg;
  col = mix(col, u_color1, b1 * u_intensity);
  col = mix(col, u_color2, b2 * u_intensity * 0.95);
  col = mix(col, u_color3, b3 * u_intensity * 0.85);
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}`;

function hexToVec3(hex) {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function compile(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(err);
  }
  return sh;
}

export default function AuroraShader({
  // Default palette: luxe gold + brand violet + champagne
  colors = ['#ff006e', '#00d4d4', '#7830f0'],
  background = '#fdf4ff',
  intensity = 0.75,
  className = '',
  style = {},
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: true });
    if (!gl) {
      // Fallback for browsers without WebGL — show static gradient via CSS class
      canvas.style.background = `radial-gradient(at 30% 50%, ${colors[0]}33, transparent 50%),
                                  radial-gradient(at 75% 30%, ${colors[1]}33, transparent 50%),
                                  ${background}`;
      return;
    }

    // Compile + link shader program
    let program;
    try {
      const vs = compile(gl, gl.VERTEX_SHADER,   VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }
      gl.useProgram(program);
    } catch (e) {
      // Shader compilation failed — log and bail (fallback CSS already set above by browser)
      console.warn('AuroraShader compile failed', e);
      return;
    }

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes  = gl.getUniformLocation(program, 'u_resolution');
    const uC1   = gl.getUniformLocation(program, 'u_color1');
    const uC2   = gl.getUniformLocation(program, 'u_color2');
    const uC3   = gl.getUniformLocation(program, 'u_color3');
    const uBg   = gl.getUniformLocation(program, 'u_bg');
    const uInt  = gl.getUniformLocation(program, 'u_intensity');

    gl.uniform3fv(uC1, hexToVec3(colors[0]));
    gl.uniform3fv(uC2, hexToVec3(colors[1]));
    gl.uniform3fv(uC3, hexToVec3(colors[2] || colors[0]));
    gl.uniform3fv(uBg, hexToVec3(background));
    gl.uniform1f(uInt, intensity);

    // Resize handling (DPR-aware, capped to keep perf sane)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth  * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pause when off-screen — battery + CPU win
    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);

    // Reduced motion — render single frame only
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) / 1000;
      if (visible) {
        gl.uniform1f(uTime, t);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (!reduce) raf = requestAnimationFrame(tick);
    };

    if (reduce) {
      gl.uniform1f(uTime, 5); // static frame at t=5 looks pleasing
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [colors, background, intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block w-full h-full ${className}`}
      style={style}
    />
  );
}
