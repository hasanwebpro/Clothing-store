import{r as Z,j as De}from"./vendor-query-tn-bQvo-.js";function Ae(){const c=Z.useRef(null);return Z.useEffect(()=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const z=c.current;if(!z)return;let r=()=>{};try{r=ye(z)||r}catch(d){console.error("Failed to initialize fluid cursor:",d)}return()=>r()},[]),De.jsx("canvas",{ref:c,id:"fluid","aria-hidden":"true",style:{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999}})}function ye(c){const l={SIM_RESOLUTION:128,DYE_RESOLUTION:1440,DENSITY_DISSIPATION:5,VELOCITY_DISSIPATION:2,PRESSURE:.1,PRESSURE_ITERATIONS:20,CURL:3,SPLAT_RADIUS:.2,SPLAT_FORCE:6e3,SHADING:!0,COLOR_UPDATE_SPEED:10};function z(){return{id:-1,texcoordX:0,texcoordY:0,prevTexcoordX:0,prevTexcoordY:0,deltaX:0,deltaY:0,down:!1,moved:!1,color:{r:0,g:0,b:0}}}let r,d,F=[z()],R,a,X,N,S,Y=Date.now(),I=0,b,m,s,L,P,h,D,y,w,V=0,H=!1;const O=[];function ee(){const e={alpha:!0,depth:!1,stencil:!1,antialias:!1,preserveDrawingBuffer:!1};if(r=c.getContext("webgl2",e)||c.getContext("webgl",e)||c.getContext("experimental-webgl",e),!r)throw new Error("Unable to initialize WebGL.");const t="drawBuffers"in r;let i=!1,o=null;t?(r.getExtension("EXT_color_buffer_float"),i=!!r.getExtension("OES_texture_float_linear")):(o=r.getExtension("OES_texture_half_float"),i=!!r.getExtension("OES_texture_half_float_linear")),r.clearColor(0,0,0,1);const n=t?r.HALF_FLOAT:o&&o.HALF_FLOAT_OES||0;let u,f,v;return t?(u=_(r,r.RGBA16F,r.RGBA,n),f=_(r,r.RG16F,r.RG,n),v=_(r,r.R16F,r.RED,n)):(u=_(r,r.RGBA,r.RGBA,n),f=_(r,r.RGBA,r.RGBA,n),v=_(r,r.RGBA,r.RGBA,n)),d={formatRGBA:u,formatRG:f,formatR:v,halfFloatTexType:n,supportLinearFiltering:i},d.supportLinearFiltering||(l.DYE_RESOLUTION=256,l.SHADING=!1),!0}function _(e,t,i,o){if(!re(e,t,i,o)){if("drawBuffers"in e)switch(t){case e.R16F:return _(e,e.RG16F,e.RG,o);case e.RG16F:return _(e,e.RGBA16F,e.RGBA,o);default:return null}return null}return{internalFormat:t,format:i}}function re(e,t,i,o){const n=e.createTexture();if(!n)return!1;e.bindTexture(e.TEXTURE_2D,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,t,4,4,0,i,o,null);const u=e.createFramebuffer();return u?(e.bindFramebuffer(e.FRAMEBUFFER,u),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0),e.checkFramebufferStatus(e.FRAMEBUFFER)===e.FRAMEBUFFER_COMPLETE):!1}function te(e){if(!e.length)return 0;let t=0;for(let i=0;i<e.length;i++)t=(t<<5)-t+e.charCodeAt(i),t|=0;return t}function ie(e,t){if(!t)return e;let i="";for(const o of t)i+=`#define ${o}
`;return i+e}function p(e,t,i=null){const o=ie(t,i),n=r.createShader(e);return n?(r.shaderSource(n,o),r.compileShader(n),r.getShaderParameter(n,r.COMPILE_STATUS)||console.error(r.getShaderInfoLog(n)),n):null}function W(e,t){if(!e||!t)return null;const i=r.createProgram();return i?(r.attachShader(i,e),r.attachShader(i,t),r.linkProgram(i),r.getProgramParameter(i,r.LINK_STATUS)||console.error(r.getProgramInfoLog(i)),i):null}function k(e){let t={};const i=r.getProgramParameter(e,r.ACTIVE_UNIFORMS);for(let o=0;o<i;o++){const n=r.getActiveUniform(e,o);n&&(t[n.name]=r.getUniformLocation(e,n.name))}return t}class g{constructor(t,i){this.program=W(t,i),this.uniforms=this.program?k(this.program):{}}bind(){this.program&&r.useProgram(this.program)}}class oe{constructor(t,i){this.vertexShader=t,this.fragmentShaderSource=i,this.programs={},this.activeProgram=null,this.uniforms={}}setKeywords(t){let i=0;for(const n of t)i+=te(n);let o=this.programs[i];if(o==null){const n=p(r.FRAGMENT_SHADER,this.fragmentShaderSource,t);o=W(this.vertexShader,n),this.programs[i]=o}o!==this.activeProgram&&(o&&(this.uniforms=k(o)),this.activeProgram=o)}bind(){this.activeProgram&&r.useProgram(this.activeProgram)}}function ne(){const e=p(r.VERTEX_SHADER,`
                precision highp float;
                attribute vec2 aPosition;
                varying vec2 vUv;
                varying vec2 vL;
                varying vec2 vR;
                varying vec2 vT;
                varying vec2 vB;
                uniform vec2 texelSize;

                void main () {
                    vUv = aPosition * 0.5 + 0.5;
                    vL = vUv - vec2(texelSize.x, 0.0);
                    vR = vUv + vec2(texelSize.x, 0.0);
                    vT = vUv + vec2(0.0, texelSize.y);
                    vB = vUv - vec2(0.0, texelSize.y);
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                }
            `),t=p(r.FRAGMENT_SHADER,`
                precision mediump float;
                precision mediump sampler2D;
                varying highp vec2 vUv;
                uniform sampler2D uTexture;

                void main () {
                    gl_FragColor = texture2D(uTexture, vUv);
                }
            `),i=p(r.FRAGMENT_SHADER,`
                precision mediump float;
                precision mediump sampler2D;
                varying highp vec2 vUv;
                uniform sampler2D uTexture;
                uniform float value;

                void main () {
                    gl_FragColor = value * texture2D(uTexture, vUv);
                }
            `),o=`
                precision highp float;
                precision highp sampler2D;
                varying vec2 vUv;
                varying vec2 vL;
                varying vec2 vR;
                varying vec2 vT;
                varying vec2 vB;
                uniform sampler2D uTexture;
                uniform sampler2D uDithering;
                uniform vec2 ditherScale;
                uniform vec2 texelSize;

                vec3 linearToGamma (vec3 color) {
                    color = max(color, vec3(0));
                    return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
                }

                void main () {
                    vec3 c = texture2D(uTexture, vUv).rgb;
                    #ifdef SHADING
                        vec3 lc = texture2D(uTexture, vL).rgb;
                        vec3 rc = texture2D(uTexture, vR).rgb;
                        vec3 tc = texture2D(uTexture, vT).rgb;
                        vec3 bc = texture2D(uTexture, vB).rgb;

                        float dx = length(rc) - length(lc);
                        float dy = length(tc) - length(bc);

                        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
                        vec3 l = vec3(0.0, 0.0, 1.0);

                        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
                        c *= diffuse;
                    #endif

                    float a = max(c.r, max(c.g, c.b));
                    gl_FragColor = vec4(c, a);
                }
            `,n=p(r.FRAGMENT_SHADER,`
                precision highp float;
                precision highp sampler2D;
                varying vec2 vUv;
                uniform sampler2D uTarget;
                uniform float aspectRatio;
                uniform vec3 color;
                uniform vec2 point;
                uniform float radius;

                void main () {
                    vec2 p = vUv - point.xy;
                    p.x *= aspectRatio;
                    vec3 splat = exp(-dot(p, p) / radius) * color;
                    vec3 base = texture2D(uTarget, vUv).xyz;
                    gl_FragColor = vec4(base + splat, 1.0);
                }
            `),u=p(r.FRAGMENT_SHADER,`
                precision highp float;
                precision highp sampler2D;
                varying vec2 vUv;
                uniform sampler2D uVelocity;
                uniform sampler2D uSource;
                uniform vec2 texelSize;
                uniform vec2 dyeTexelSize;
                uniform float dt;
                uniform float dissipation;

                vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
                    vec2 st = uv / tsize - 0.5;
                    vec2 iuv = floor(st);
                    vec2 fuv = fract(st);

                    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
                    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
                    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
                    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

                    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
                }

                void main () {
                    #ifdef MANUAL_FILTERING
                        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                        vec4 result = bilerp(uSource, coord, dyeTexelSize);
                    #else
                        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                        vec4 result = texture2D(uSource, coord);
                    #endif
                    float decay = 1.0 + dissipation * dt;
                    gl_FragColor = result / decay;
                }
            `,d.supportLinearFiltering?null:["MANUAL_FILTERING"]),f=p(r.FRAGMENT_SHADER,`
                precision mediump float;
                precision mediump sampler2D;
                varying highp vec2 vUv;
                varying highp vec2 vL;
                varying highp vec2 vR;
                varying highp vec2 vT;
                varying highp vec2 vB;
                uniform sampler2D uVelocity;

                void main () {
                    float L = texture2D(uVelocity, vL).x;
                    float R = texture2D(uVelocity, vR).x;
                    float T = texture2D(uVelocity, vT).y;
                    float B = texture2D(uVelocity, vB).y;

                    vec2 C = texture2D(uVelocity, vUv).xy;
                    if (vL.x < 0.0) { L = -C.x; }
                    if (vR.x > 1.0) { R = -C.x; }
                    if (vT.y > 1.0) { T = -C.y; }
                    if (vB.y < 0.0) { B = -C.y; }

                    float div = 0.5 * (R - L + T - B);
                    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
                }
            `),v=p(r.FRAGMENT_SHADER,`
                precision mediump float;
                precision mediump sampler2D;
                varying highp vec2 vUv;
                varying highp vec2 vL;
                varying highp vec2 vR;
                varying highp vec2 vT;
                varying highp vec2 vB;
                uniform sampler2D uVelocity;

                void main () {
                    float L = texture2D(uVelocity, vL).y;
                    float R = texture2D(uVelocity, vR).y;
                    float T = texture2D(uVelocity, vT).x;
                    float B = texture2D(uVelocity, vB).x;
                    float vorticity = R - L - T + B;
                    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
                }
            `),T=p(r.FRAGMENT_SHADER,`
                precision highp float;
                precision highp sampler2D;
                varying vec2 vUv;
                varying vec2 vL;
                varying vec2 vR;
                varying vec2 vT;
                varying vec2 vB;
                uniform sampler2D uVelocity;
                uniform sampler2D uCurl;
                uniform float curl;
                uniform float dt;

                void main () {
                    float L = texture2D(uCurl, vL).x;
                    float R = texture2D(uCurl, vR).x;
                    float T = texture2D(uCurl, vT).x;
                    float B = texture2D(uCurl, vB).x;
                    float C = texture2D(uCurl, vUv).x;

                    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
                    force /= length(force) + 0.0001;
                    force *= curl * C;
                    force.y *= -1.0;

                    vec2 velocity = texture2D(uVelocity, vUv).xy;
                    velocity += force * dt;
                    velocity = min(max(velocity, -1000.0), 1000.0);
                    gl_FragColor = vec4(velocity, 0.0, 1.0);
                }
            `),U=p(r.FRAGMENT_SHADER,`
                precision mediump float;
                precision mediump sampler2D;
                varying highp vec2 vUv;
                varying highp vec2 vL;
                varying highp vec2 vR;
                varying highp vec2 vT;
                varying highp vec2 vB;
                uniform sampler2D uPressure;
                uniform sampler2D uDivergence;

                void main () {
                    float L = texture2D(uPressure, vL).x;
                    float R = texture2D(uPressure, vR).x;
                    float T = texture2D(uPressure, vT).x;
                    float B = texture2D(uPressure, vB).x;
                    float C = texture2D(uPressure, vUv).x;
                    float divergence = texture2D(uDivergence, vUv).x;
                    float pressure = (L + R + B + T - divergence) * 0.25;
                    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
                }
            `),A=p(r.FRAGMENT_SHADER,`
                precision mediump float;
                precision mediump sampler2D;
                varying highp vec2 vUv;
                varying highp vec2 vL;
                varying highp vec2 vR;
                varying highp vec2 vT;
                varying highp vec2 vB;
                uniform sampler2D uPressure;
                uniform sampler2D uVelocity;

                void main () {
                    float L = texture2D(uPressure, vL).x;
                    float R = texture2D(uPressure, vR).x;
                    float T = texture2D(uPressure, vT).x;
                    float B = texture2D(uPressure, vB).x;
                    vec2 velocity = texture2D(uVelocity, vUv).xy;
                    velocity.xy -= vec2(R - L, T - B);
                    gl_FragColor = vec4(velocity, 0.0, 1.0);
                }
            `);new g(e,t),b=new g(e,i),m=new g(e,n),s=new g(e,u),L=new g(e,f),P=new g(e,v),h=new g(e,T),D=new g(e,U),y=new g(e,A),w=new oe(e,o)}let x;function ue(){const e=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,e),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,-1,1,1,1,1,-1]),r.STATIC_DRAW);const t=r.createBuffer();r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,t),r.bufferData(r.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),r.STATIC_DRAW),r.vertexAttribPointer(0,2,r.FLOAT,!1,0,0),r.enableVertexAttribArray(0),x=(i,o=!1)=>{r&&(i?(r.viewport(0,0,i.width,i.height),r.bindFramebuffer(r.FRAMEBUFFER,i.fbo)):(r.viewport(0,0,r.drawingBufferWidth,r.drawingBufferHeight),r.bindFramebuffer(r.FRAMEBUFFER,null)),o&&(r.clearColor(0,0,0,1),r.clear(r.COLOR_BUFFER_BIT)),r.drawElements(r.TRIANGLES,6,r.UNSIGNED_SHORT,0))}}function C(e,t,i,o,n,u){r.activeTexture(r.TEXTURE0);const f=r.createTexture();r.bindTexture(r.TEXTURE_2D,f),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,u),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,u),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texImage2D(r.TEXTURE_2D,0,i,e,t,0,o,n,null);const v=r.createFramebuffer();r.bindFramebuffer(r.FRAMEBUFFER,v),r.framebufferTexture2D(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,f,0),r.viewport(0,0,e,t),r.clear(r.COLOR_BUFFER_BIT);const T=1/e,U=1/t;return{texture:f,fbo:v,width:e,height:t,texelSizeX:T,texelSizeY:U,attach(A){return r.activeTexture(r.TEXTURE0+A),r.bindTexture(r.TEXTURE_2D,f),A}}}function M(e,t,i,o,n,u){const f=C(e,t,i,o,n,u),v=C(e,t,i,o,n,u);return{width:e,height:t,texelSizeX:f.texelSizeX,texelSizeY:f.texelSizeY,read:f,write:v,swap(){const T=this.read;this.read=this.write,this.write=T}}}function K(e){const t=r.drawingBufferWidth,i=r.drawingBufferHeight,o=t/i;let n=o<1?1/o:o;const u=Math.round(e),f=Math.round(e*n);return t>i?{width:f,height:u}:{width:u,height:f}}function E(e){const t=window.devicePixelRatio||1;return Math.floor(e*t)}function j(){const e=K(l.SIM_RESOLUTION),t=K(l.DYE_RESOLUTION),i=d.halfFloatTexType,o=d.formatRGBA,n=d.formatRG,u=d.formatR,f=d.supportLinearFiltering?r.LINEAR:r.NEAREST;r.disable(r.BLEND),R||(R=M(t.width,t.height,o.internalFormat,o.format,i,f)),a||(a=M(e.width,e.height,n.internalFormat,n.format,i,f)),X=C(e.width,e.height,u.internalFormat,u.format,i,r.NEAREST),N=C(e.width,e.height,u.internalFormat,u.format,i,r.NEAREST),S=M(e.width,e.height,u.internalFormat,u.format,i,r.NEAREST)}function ae(){const e=[];l.SHADING&&e.push("SHADING"),w.setKeywords(e)}function ce(e,t,i){let o=0,n=0,u=0;const f=Math.floor(e*6),v=e*6-f,T=i*(1-t),U=i*(1-v*t),A=i*(1-(1-v)*t);switch(f%6){case 0:o=i,n=A,u=T;break;case 1:o=U,n=i,u=T;break;case 2:o=T,n=i,u=A;break;case 3:o=T,n=U,u=i;break;case 4:o=A,n=T,u=i;break;case 5:o=i,n=T,u=U;break}return{r:o,g:n,b:u}}function G(){const e=ce(Math.random(),1,1);return e.r*=.06,e.g*=.06,e.b*=.06,e}function fe(e,t,i){const o=i-t;return(e-t)%o+t}function q(){if(H)return;const e=se();le()&&j(),me(e),ve(),de(e),he(null),V=requestAnimationFrame(q)}function se(){const e=Date.now();let t=(e-Y)/1e3;return t=Math.min(t,.016666),Y=e,t}function le(){const e=E(c.clientWidth),t=E(c.clientHeight);return c.width!==e||c.height!==t?(c.width=e,c.height=t,!0):!1}function me(e){I+=e*l.COLOR_UPDATE_SPEED,I>=1&&(I=fe(I,0,1),F.forEach(t=>{t.color=G()}))}function ve(){for(const e of F)e.moved&&(e.moved=!1,Te(e))}function de(e){r.disable(r.BLEND),P.bind(),P.uniforms.texelSize&&r.uniform2f(P.uniforms.texelSize,a.texelSizeX,a.texelSizeY),P.uniforms.uVelocity&&r.uniform1i(P.uniforms.uVelocity,a.read.attach(0)),x(N),h.bind(),h.uniforms.texelSize&&r.uniform2f(h.uniforms.texelSize,a.texelSizeX,a.texelSizeY),h.uniforms.uVelocity&&r.uniform1i(h.uniforms.uVelocity,a.read.attach(0)),h.uniforms.uCurl&&r.uniform1i(h.uniforms.uCurl,N.attach(1)),h.uniforms.curl&&r.uniform1f(h.uniforms.curl,l.CURL),h.uniforms.dt&&r.uniform1f(h.uniforms.dt,e),x(a.write),a.swap(),L.bind(),L.uniforms.texelSize&&r.uniform2f(L.uniforms.texelSize,a.texelSizeX,a.texelSizeY),L.uniforms.uVelocity&&r.uniform1i(L.uniforms.uVelocity,a.read.attach(0)),x(X),b.bind(),b.uniforms.uTexture&&r.uniform1i(b.uniforms.uTexture,S.read.attach(0)),b.uniforms.value&&r.uniform1f(b.uniforms.value,l.PRESSURE),x(S.write),S.swap(),D.bind(),D.uniforms.texelSize&&r.uniform2f(D.uniforms.texelSize,a.texelSizeX,a.texelSizeY),D.uniforms.uDivergence&&r.uniform1i(D.uniforms.uDivergence,X.attach(0));for(let i=0;i<l.PRESSURE_ITERATIONS;i++)D.uniforms.uPressure&&r.uniform1i(D.uniforms.uPressure,S.read.attach(1)),x(S.write),S.swap();y.bind(),y.uniforms.texelSize&&r.uniform2f(y.uniforms.texelSize,a.texelSizeX,a.texelSizeY),y.uniforms.uPressure&&r.uniform1i(y.uniforms.uPressure,S.read.attach(0)),y.uniforms.uVelocity&&r.uniform1i(y.uniforms.uVelocity,a.read.attach(1)),x(a.write),a.swap(),s.bind(),s.uniforms.texelSize&&r.uniform2f(s.uniforms.texelSize,a.texelSizeX,a.texelSizeY),!d.supportLinearFiltering&&s.uniforms.dyeTexelSize&&r.uniform2f(s.uniforms.dyeTexelSize,a.texelSizeX,a.texelSizeY);const t=a.read.attach(0);s.uniforms.uVelocity&&r.uniform1i(s.uniforms.uVelocity,t),s.uniforms.uSource&&r.uniform1i(s.uniforms.uSource,t),s.uniforms.dt&&r.uniform1f(s.uniforms.dt,e),s.uniforms.dissipation&&r.uniform1f(s.uniforms.dissipation,l.VELOCITY_DISSIPATION),x(a.write),a.swap(),!d.supportLinearFiltering&&s.uniforms.dyeTexelSize&&r.uniform2f(s.uniforms.dyeTexelSize,R.texelSizeX,R.texelSizeY),s.uniforms.uVelocity&&r.uniform1i(s.uniforms.uVelocity,a.read.attach(0)),s.uniforms.uSource&&r.uniform1i(s.uniforms.uSource,R.read.attach(1)),s.uniforms.dissipation&&r.uniform1f(s.uniforms.dissipation,l.DENSITY_DISSIPATION),x(R.write),R.swap()}function he(e){r.bindFramebuffer(r.FRAMEBUFFER,null),r.viewport(0,0,r.drawingBufferWidth,r.drawingBufferHeight),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT),r.blendFunc(r.ONE,r.ONE_MINUS_SRC_ALPHA),r.enable(r.BLEND),xe(e)}function xe(e){const t=r.drawingBufferWidth,i=r.drawingBufferHeight;w.bind(),l.SHADING&&w.uniforms.texelSize&&r.uniform2f(w.uniforms.texelSize,1/t,1/i),w.uniforms.uTexture&&r.uniform1i(w.uniforms.uTexture,R.read.attach(0)),x(e,!1)}function Te(e){const t=e.deltaX*l.SPLAT_FORCE,i=e.deltaY*l.SPLAT_FORCE;$(e.texcoordX,e.texcoordY,t,i,e.color)}function Re(e){const t=G();t.r*=10,t.g*=10,t.b*=10;const i=10*(Math.random()-.5),o=30*(Math.random()-.5);$(e.texcoordX,e.texcoordY,i,o,t)}function $(e,t,i,o,n){m.bind(),m.uniforms.uTarget&&r.uniform1i(m.uniforms.uTarget,a.read.attach(0)),m.uniforms.aspectRatio&&r.uniform1f(m.uniforms.aspectRatio,c.width/c.height),m.uniforms.point&&r.uniform2f(m.uniforms.point,e,t),m.uniforms.color&&r.uniform3f(m.uniforms.color,i,o,0),m.uniforms.radius&&r.uniform1f(m.uniforms.radius,pe(l.SPLAT_RADIUS/100)),x(a.write),a.swap(),m.uniforms.uTarget&&r.uniform1i(m.uniforms.uTarget,R.read.attach(0)),m.uniforms.color&&r.uniform3f(m.uniforms.color,n.r,n.g,n.b),x(R.write),R.swap()}function pe(e){const t=c.width/c.height;return t>1&&(e*=t),e}function J(e,t,i,o){e.id=t,e.down=!0,e.moved=!1,e.texcoordX=i/c.width,e.texcoordY=1-o/c.height,e.prevTexcoordX=e.texcoordX,e.prevTexcoordY=e.texcoordY,e.deltaX=0,e.deltaY=0,e.color=G()}function Q(e,t,i,o){e.prevTexcoordX=e.texcoordX,e.prevTexcoordY=e.texcoordY,e.texcoordX=t/c.width,e.texcoordY=1-i/c.height,e.deltaX=Ee(e.texcoordX-e.prevTexcoordX),e.deltaY=ge(e.texcoordY-e.prevTexcoordY),e.moved=Math.abs(e.deltaX)>0||Math.abs(e.deltaY)>0,e.color=o}function Ee(e){const t=c.width/c.height;return t<1&&(e*=t),e}function ge(e){const t=c.width/c.height;return t>1&&(e/=t),e}function B(e,t,i,o){e.addEventListener(t,i,o),O.push(()=>e.removeEventListener(t,i,o))}function Se(){B(window,"mousedown",e=>{const t=F[0],i=E(e.clientX),o=E(e.clientY);J(t,-1,i,o),Re(t)}),B(window,"mousemove",e=>{const t=F[0],i=E(e.clientX),o=E(e.clientY),n=t.color;Q(t,i,o,n)}),B(window,"touchstart",e=>{const t=e.targetTouches,i=F[0];for(let o=0;o<t.length;o++){const n=E(t[o].clientX),u=E(t[o].clientY);J(i,t[o].identifier,n,u)}},!1),B(window,"touchmove",e=>{const t=e.targetTouches,i=F[0];for(let o=0;o<t.length;o++){const n=E(t[o].clientX),u=E(t[o].clientY);Q(i,n,u,i.color)}},!1),B(window,"touchend",()=>{const e=F[0];e.down=!1})}return ee(),ne(),ue(),ae(),j(),Se(),q(),()=>{H=!0,cancelAnimationFrame(V),O.forEach(e=>e()),O.length=0}}export{Ae as default};
