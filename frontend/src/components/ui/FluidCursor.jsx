import { useEffect, useRef } from 'react';

/**
 * FluidCursor — WebGL fluid simulation that trails the mouse.
 * Drop anywhere in the tree; it renders as a fixed full-screen overlay
 * with pointer-events: none so it never blocks clicks.
 *
 * Usage (e.g. in App.jsx or main.jsx):
 *   import FluidCursor from './components/ui/FluidCursor';
 *   <FluidCursor />
 */
export default function FluidCursor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ─── config ────────────────────────────────────────────────────
    const config = {
      SIM_RESOLUTION:      128,
      DYE_RESOLUTION:      1440,
      DENSITY_DISSIPATION: 3.5,
      VELOCITY_DISSIPATION: 2,
      PRESSURE:            0.1,
      PRESSURE_ITERATIONS: 20,
      CURL:                3,
      SPLAT_RADIUS:        0.2,
      SPLAT_FORCE:         6000,
      SHADING:             true,
      COLOR_UPDATE_SPEED:  10,
      TRANSPARENT:         true,
    };

    // ─── pointer ───────────────────────────────────────────────────
    const pointers = [{
      id: -1, texcoordX: 0, texcoordY: 0,
      prevTexcoordX: 0, prevTexcoordY: 0,
      deltaX: 0, deltaY: 0,
      down: false, moved: false,
      color: { r: 0, g: 0, b: 0 },
    }];

    // ─── WebGL init ────────────────────────────────────────────────
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, premultipliedAlpha: false };
    let gl = canvas.getContext('webgl2', params)
           || canvas.getContext('webgl', params)
           || canvas.getContext('experimental-webgl', params);
    if (!gl) return;

    const isWebGL2 = 'drawBuffers' in gl;
    let halfFloat = null, supportLinearFiltering = false;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0, 0, 0, 0);
    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : (halfFloat?.HALF_FLOAT_OES || 0);

    if (!supportLinearFiltering) { config.DYE_RESOLUTION = 256; config.SHADING = false; }

    function supportRenderTextureFormat(internalFormat, format, type) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }
    function getSupportedFormat(internalFormat, format, type) {
      if (!supportRenderTextureFormat(internalFormat, format, type)) {
        if (isWebGL2) {
          if (internalFormat === gl.R16F)  return getSupportedFormat(gl.RG16F,   gl.RG,   type);
          if (internalFormat === gl.RG16F) return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
          return null;
        }
        return null;
      }
      return { internalFormat, format };
    }

    const ext = {
      halfFloatTexType, supportLinearFiltering,
      formatRGBA: isWebGL2 ? getSupportedFormat(gl.RGBA16F, gl.RGBA, halfFloatTexType) : getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType),
      formatRG:   isWebGL2 ? getSupportedFormat(gl.RG16F,   gl.RG,   halfFloatTexType) : getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType),
      formatR:    isWebGL2 ? getSupportedFormat(gl.R16F,    gl.RED,  halfFloatTexType) : getSupportedFormat(gl.RGBA, gl.RGBA, halfFloatTexType),
    };

    // ─── shader helpers ────────────────────────────────────────────
    function compileShader(type, source, keywords) {
      let src = keywords ? keywords.map(k => `#define ${k}\n`).join('') + source : source;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    }
    function createProgram(vs, fs) {
      const p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs);
      gl.linkProgram(p);
      return p;
    }
    function getUniforms(prog) {
      const u = {}, n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(prog, i);
        if (info) u[info.name] = gl.getUniformLocation(prog, info.name);
      }
      return u;
    }

    // ─── GLSL sources ──────────────────────────────────────────────
    const baseVert = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }`);

    const copySh    = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; void main(){gl_FragColor=texture2D(uTexture,vUv);}`);
    const clearSh   = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value; void main(){gl_FragColor=value*texture2D(uTexture,vUv);}`);
    const splatSh   = compileShader(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius; void main(){vec2 p=vUv-point.xy; p.x*=aspectRatio; vec3 splat=exp(-dot(p,p)/radius)*color; vec3 base=texture2D(uTarget,vUv).xyz; gl_FragColor=vec4(base+splat,1.0);}`);
    const divSh     = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity; void main(){float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y; vec2 C=texture2D(uVelocity,vUv).xy; if(vL.x<0.0){L=-C.x;} if(vR.x>1.0){R=-C.x;} if(vT.y>1.0){T=-C.y;} if(vB.y<0.0){B=-C.y;} gl_FragColor=vec4(0.5*(R-L+T-B),0,0,1);}`);
    const curlSh    = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity; void main(){float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x; gl_FragColor=vec4(0.5*(R-L-T+B),0,0,1);}`);
    const vortSh    = compileShader(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity,uCurl; uniform float curl,dt; void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x; vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); force/=length(force)+0.0001; force*=curl*C; force.y*=-1.0; vec2 vel=texture2D(uVelocity,vUv).xy+force*dt; vel=min(max(vel,-1000.0),1000.0); gl_FragColor=vec4(vel,0,1);}`);
    const pressSh   = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uDivergence; void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x,div=texture2D(uDivergence,vUv).x; gl_FragColor=vec4((L+R+B+T-div)*0.25,0,0,1);}`);
    const gradSh    = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uVelocity; void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x; vec2 vel=texture2D(uVelocity,vUv).xy; vel.xy-=vec2(R-L,T-B); gl_FragColor=vec4(vel,0,1);}`);
    const advSh     = compileShader(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; uniform sampler2D uVelocity,uSource; uniform vec2 texelSize,dyeTexelSize; uniform float dt,dissipation; vec4 bilerp(sampler2D sam,vec2 uv,vec2 tsize){vec2 st=uv/tsize-0.5; vec2 iuv=floor(st),fuv=fract(st); vec4 a=texture2D(sam,(iuv+vec2(0.5,0.5))*tsize),b=texture2D(sam,(iuv+vec2(1.5,0.5))*tsize),c=texture2D(sam,(iuv+vec2(0.5,1.5))*tsize),d=texture2D(sam,(iuv+vec2(1.5,1.5))*tsize); return mix(mix(a,b,fuv.x),mix(c,d,fuv.x),fuv.y);} void main(){vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize; vec4 result=texture2D(uSource,coord); gl_FragColor=result/(1.0+dissipation*dt);}`,
      supportLinearFiltering ? null : ['MANUAL_FILTERING']);

    const displaySrc = `precision highp float; precision highp sampler2D; varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uTexture; uniform vec2 texelSize; vec3 linearToGamma(vec3 c){c=max(c,vec3(0));return max(1.055*pow(c,vec3(0.4167))-0.055,vec3(0));} void main(){vec3 c=texture2D(uTexture,vUv).rgb; #ifdef SHADING vec3 lc=texture2D(uTexture,vL).rgb,rc=texture2D(uTexture,vR).rgb,tc=texture2D(uTexture,vT).rgb,bc=texture2D(uTexture,vB).rgb; float dx=length(rc)-length(lc),dy=length(tc)-length(bc); vec3 n=normalize(vec3(dx,dy,length(texelSize))); float diffuse=clamp(dot(n,vec3(0,0,1))+0.7,0.7,1.0); c*=diffuse; #endif float a=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c,a);}`;

    // ─── programs ──────────────────────────────────────────────────
    function makeProgram(fs) { const p = createProgram(baseVert, fs); return { program: p, uniforms: getUniforms(p), bind() { gl.useProgram(p); } }; }
    const copyProg  = makeProgram(copySh);
    const clearProg = makeProgram(clearSh);
    const splatProg = makeProgram(splatSh);
    const advProg   = makeProgram(advSh);
    const divProg   = makeProgram(divSh);
    const curlProg  = makeProgram(curlSh);
    const vortProg  = makeProgram(vortSh);
    const pressProg = makeProgram(pressSh);
    const gradProg  = makeProgram(gradSh);

    // display material (supports SHADING keyword)
    const displayPrograms = {};
    function getDisplayProgram() {
      const key = config.SHADING ? 1 : 0;
      if (!displayPrograms[key]) {
        const fs = compileShader(gl.FRAGMENT_SHADER, displaySrc, config.SHADING ? ['SHADING'] : null);
        const p  = createProgram(baseVert, fs);
        displayPrograms[key] = { program: p, uniforms: getUniforms(p), bind() { gl.useProgram(p); } };
      }
      return displayPrograms[key];
    }

    // ─── blit quad ─────────────────────────────────────────────────
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    const elBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    function blit(target, doClear = false) {
      if (!target) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (doClear) { gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    // ─── FBOs ──────────────────────────────────────────────────────
    function createFBO(w, h, internalFormat, format, type, param) {
      gl.activeTexture(gl.TEXTURE0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture: tex, fbo, width: w, height: h, texelSizeX: 1/w, texelSizeY: 1/h, attach(id) { gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
    }
    function createDoubleFBO(w, h, internalFormat, format, type, param) {
      const a = createFBO(w, h, internalFormat, format, type, param);
      const b = createFBO(w, h, internalFormat, format, type, param);
      return { width: w, height: h, texelSizeX: a.texelSizeX, texelSizeY: a.texelSizeY, read: a, write: b, swap() { const t=this.read; this.read=this.write; this.write=t; } };
    }

    function getResolution(res) {
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const ar = w / h;
      const asp = ar < 1 ? 1/ar : ar;
      const min = Math.round(res), max = Math.round(res * asp);
      return w > h ? { width: max, height: min } : { width: min, height: max };
    }

    let dye, velocity, divergence, curlFBO, pressureFBO;
    function initFramebuffers() {
      const simRes = getResolution(config.SIM_RESOLUTION);
      const dyeRes = getResolution(config.DYE_RESOLUTION);
      const tt = ext.halfFloatTexType, filt = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
      gl.disable(gl.BLEND);
      if (!dye)      dye      = createDoubleFBO(dyeRes.width, dyeRes.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, tt, filt);
      if (!velocity) velocity = createDoubleFBO(simRes.width, simRes.height, ext.formatRG.internalFormat,   ext.formatRG.format,   tt, filt);
      divergence  = createFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, tt, gl.NEAREST);
      curlFBO     = createFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, tt, gl.NEAREST);
      pressureFBO = createDoubleFBO(simRes.width, simRes.height, ext.formatR.internalFormat, ext.formatR.format, tt, gl.NEAREST);
    }

    // ─── colors ────────────────────────────────────────────────────
    function HSVtoRGB(h, s, v) {
      const i = Math.floor(h*6), f = h*6-i, p = v*(1-s), q = v*(1-f*s), t = v*(1-(1-f)*s);
      const cases = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]];
      const [r,g,b] = cases[i%6];
      return { r, g, b };
    }
    function generateColor() {
      const c = HSVtoRGB(Math.random(), 1.0, 1.0);
      c.r *= 0.15; c.g *= 0.15; c.b *= 0.15;
      return c;
    }

    // ─── simulation step ───────────────────────────────────────────
    function splat(x, y, dx, dy, color) {
      splatProg.bind();
      gl.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(splatProg.uniforms.aspectRatio, canvas.width / canvas.height);
      gl.uniform2f(splatProg.uniforms.point, x, y);
      gl.uniform3f(splatProg.uniforms.color, dx, dy, 0);
      gl.uniform1f(splatProg.uniforms.radius, config.SPLAT_RADIUS / 100 * (canvas.width > canvas.height ? canvas.width/canvas.height : 1));
      blit(velocity.write); velocity.swap();
      gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(splatProg.uniforms.color, color.r, color.g, color.b);
      blit(dye.write); dye.swap();
    }

    function step(dt) {
      gl.disable(gl.BLEND);
      curlProg.bind();
      gl.uniform2f(curlProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0));
      blit(curlFBO);
      vortProg.bind();
      gl.uniform2f(vortProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(vortProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vortProg.uniforms.uCurl, curlFBO.attach(1));
      gl.uniform1f(vortProg.uniforms.curl, config.CURL);
      gl.uniform1f(vortProg.uniforms.dt, dt);
      blit(velocity.write); velocity.swap();
      divProg.bind();
      gl.uniform2f(divProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(divProg.uniforms.uVelocity, velocity.read.attach(0));
      blit(divergence);
      clearProg.bind();
      gl.uniform1i(clearProg.uniforms.uTexture, pressureFBO.read.attach(0));
      gl.uniform1f(clearProg.uniforms.value, config.PRESSURE);
      blit(pressureFBO.write); pressureFBO.swap();
      pressProg.bind();
      gl.uniform2f(pressProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(pressProg.uniforms.uDivergence, divergence.attach(0));
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressProg.uniforms.uPressure, pressureFBO.read.attach(1));
        blit(pressureFBO.write); pressureFBO.swap();
      }
      gradProg.bind();
      gl.uniform2f(gradProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gradProg.uniforms.uPressure, pressureFBO.read.attach(0));
      gl.uniform1i(gradProg.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write); velocity.swap();
      advProg.bind();
      gl.uniform2f(advProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (!supportLinearFiltering) gl.uniform2f(advProg.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      const vid = velocity.read.attach(0);
      gl.uniform1i(advProg.uniforms.uVelocity, vid);
      gl.uniform1i(advProg.uniforms.uSource, vid);
      gl.uniform1f(advProg.uniforms.dt, dt);
      gl.uniform1f(advProg.uniforms.dissipation, config.VELOCITY_DISSIPATION);
      blit(velocity.write); velocity.swap();
      if (!supportLinearFiltering) gl.uniform2f(advProg.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(advProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advProg.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(advProg.uniforms.dissipation, config.DENSITY_DISSIPATION);
      blit(dye.write); dye.swap();
    }

    function render() {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      const disp = getDisplayProgram();
      disp.bind();
      if (config.SHADING) gl.uniform2f(disp.uniforms.texelSize, 1/gl.drawingBufferWidth, 1/gl.drawingBufferHeight);
      gl.uniform1i(disp.uniforms.uTexture, dye.read.attach(0));
      blit(null, false);
    }

    // ─── pointer helpers ───────────────────────────────────────────
    const dpr = () => window.devicePixelRatio || 1;
    function correctDeltaX(d) { const ar = canvas.width/canvas.height; return ar < 1 ? d * ar : d; }
    function correctDeltaY(d) { const ar = canvas.width/canvas.height; return ar > 1 ? d / ar : d; }

    function pointerDown(pointer, id, x, y) {
      pointer.id = id; pointer.down = true; pointer.moved = false;
      pointer.texcoordX = x / canvas.width;
      pointer.texcoordY = 1 - y / canvas.height;
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.deltaX = pointer.deltaY = 0;
      pointer.color = generateColor();
    }
    function pointerMove(pointer, x, y) {
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = x / canvas.width;
      pointer.texcoordY = 1 - y / canvas.height;
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
      pointer.moved  = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    }

    // ─── events ────────────────────────────────────────────────────
    const onMouseDown = (e) => {
      const p = pointers[0];
      pointerDown(p, -1, e.clientX * dpr(), e.clientY * dpr());
      const c = generateColor(); c.r *= 10; c.g *= 10; c.b *= 10;
      splat(p.texcoordX, p.texcoordY, 10*(Math.random()-0.5), 30*(Math.random()-0.5), c);
    };
    const onMouseMove = (e) => {
      const p = pointers[0];
      pointerMove(p, e.clientX * dpr(), e.clientY * dpr());
    };
    const onTouchStart = (e) => {
      const t = e.targetTouches[0];
      pointerDown(pointers[0], t.identifier, t.clientX * dpr(), t.clientY * dpr());
    };
    const onTouchMove = (e) => {
      const t = e.targetTouches[0];
      pointerMove(pointers[0], t.clientX * dpr(), t.clientY * dpr());
    };
    window.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });

    // ─── resize ────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.clientWidth  * dpr();
      canvas.height = canvas.clientHeight * dpr();
      initFramebuffers();
    });
    ro.observe(canvas);
    canvas.width  = canvas.clientWidth  * dpr();
    canvas.height = canvas.clientHeight * dpr();

    // ─── main loop ─────────────────────────────────────────────────
    initFramebuffers();
    let last = Date.now(), raf;
    let colorTimer = 0;

    function loop() {
      const now = Date.now();
      const dt  = Math.min((now - last) / 1000, 0.016666);
      last = now;
      colorTimer += dt * config.COLOR_UPDATE_SPEED;
      if (colorTimer >= 1) { colorTimer = 0; pointers[0].color = generateColor(); }
      if (pointers[0].moved) { pointers[0].moved = false; splat(pointers[0].texcoordX, pointers[0].texcoordY, pointers[0].deltaX * config.SPLAT_FORCE, pointers[0].deltaY * config.SPLAT_FORCE, pointers[0].color); }
      step(dt);
      render();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    // ─── cleanup ───────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        display: 'block',
      }}
    />
  );
}
