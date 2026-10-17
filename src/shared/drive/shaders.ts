// Shaders for the Drive world (imported only by world.lazy.ts, so they ride in its chunk).
// Lighting model: the HDRI sky is the background, the reflections and the fog colour; each world vertex carries the
// sky + lamp irradiance baked in Blender (RGB, Reinhard + gamma encoded) and how much sun reaches it (A); the low sun
// is then added per pixel with the material's normal map, times the baked shadow and the car's own shadow.

export const SKY_CHUNK = /* glsl */ `
uniform sampler2D uSkyTex;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uSkyGain;
uniform float uFogD;
uniform float uFogH;
vec2 skyUv(vec3 d) {
  float u = atan(-d.z, -d.x) / 6.2831853 + 0.5;
  float el = asin(clamp(d.y, -1.0, 1.0));
  float t = (1.5707963 - el) / (1.5707963 + 0.0349066);
  return vec2(u, clamp(1.0 - t, 0.002, 0.999));
}
vec3 skyLin(vec3 d, float lod) {
  vec3 c = textureLod(uSkyTex, skyUv(d), lod).rgb * uSkyGain;
  // below the horizon: the haze darkens toward the ground
  return c * mix(1.0, 0.35, smoothstep(0.0, -0.25, d.y));
}
vec3 aerial(vec3 col, vec3 wp, float emitKeep) {
  vec3 v = wp - cameraPosition;
  float dist = length(v);
  vec3 vd = v / max(dist, 1e-3);
  float hAvg = 0.5 * (cameraPosition.y + wp.y);
  float dens = uFogD * exp(-max(hAvg - 10.0, 0.0) / uFogH);
  float f = 1.0 - exp(-dist * dens);
  vec3 hz = skyLin(normalize(vec3(vd.x, 0.03 + max(vd.y, 0.0) * 0.4, vd.z)), 5.0);
  float sunAmt = pow(max(dot(vd, uSunDir), 0.0), 8.0);
  vec3 fc = hz * 0.95 + uSunCol * 0.035 * sunAmt;
  return mix(col, fc, f * (1.0 - emitKeep * 0.4));
}
`

export const NOISE_CHUNK = /* glsl */ `
float h12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h12(i), h12(i + vec2(1, 0)), u.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), u.x), u.y);
}
float fbm2(vec2 p) { return vnoise(p) * 0.6 + vnoise(p * 2.13 + 7.1) * 0.3 + vnoise(p * 4.7 + 3.3) * 0.1; }
`

export const WORLD_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vIrr;
varying float vSh;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
void main() {
  #ifdef USE_COLOR_ALPHA
    vec3 c = pow(clamp(color.rgb, 0.0, 0.998), vec3(2.2));
    vIrr = c / max(vec3(1.0) - c, vec3(0.002));
    vSh = color.a;
  #elif defined(USE_COLOR)
    vec3 c = pow(clamp(color.rgb, 0.0, 0.998), vec3(2.2));
    vIrr = c / max(vec3(1.0) - c, vec3(0.002));
    vSh = 1.0;
  #else
    vIrr = vec3(0.3);
    vSh = 1.0;
  #endif
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`

export const WORLD_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
${SKY_CHUNK}
${NOISE_CHUNK}
uniform vec3 uAlb;
uniform float uAmb;
uniform float uRetro;
uniform float uEmit;
uniform vec3 uHL; uniform vec3 uHD; uniform float uHon;
uniform vec3 uTL; uniform float uTon;
uniform sampler2D uCarSh; uniform mat4 uCarShM; uniform float uCarShOn;
uniform sampler2D uMap; uniform vec4 uCell; uniform float uFlipU;
uniform sampler2D tGrassC; uniform sampler2D tGrassN;
uniform sampler2D tForestC; uniform sampler2D tForestN;
uniform sampler2D tRockC; uniform sampler2D tRockN;
uniform sampler2D tSnowC; uniform sampler2D tSnowN;
uniform sampler2D tGravelC; uniform sampler2D tGravelN;
uniform sampler2D tAsphC; uniform sampler2D tAsphN;
uniform sampler2D tConcC; uniform sampler2D tConcN;
uniform float uSnowLine;
varying vec3 vIrr;
varying float vSh;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;

float carShadow(vec3 wp) {
  if (uCarShOn < 0.5) return 1.0;
  vec4 c = uCarShM * vec4(wp, 1.0);
  vec3 q = c.xyz / c.w * 0.5 + 0.5;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0 || q.z > 1.0 || q.z < 0.0) return 1.0;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 o = vec2(float(i == 1) - float(i == 2), float(i == 3) - float(i == 4)) * 0.0022;
    float d = texture2D(uCarSh, q.xy + o).r;
    s += q.z > d + 0.0015 ? 0.0 : 1.0;
  }
  return s / 5.0;
}
// a tangent-space normal map sample (xy in rg, roughness in b) applied around N for a top-down projection
vec3 perturb(vec3 N, vec2 nm, float k) {
  vec3 t = normalize(cross(N, vec3(0.0, 0.0, 1.0)) + vec3(1e-4));
  vec3 b = cross(t, N);
  return normalize(N + (t * nm.x + b * nm.y) * k);
}
vec4 tri(sampler2D tx, vec3 p, vec3 n, float s) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z);
  return texture2D(tx, p.zy * s) * w.x + texture2D(tx, p.xz * s) * w.y + texture2D(tx, p.xy * s) * w.z;
}
vec4 two(sampler2D tx, vec2 p, float s) {
  return mix(texture2D(tx, p * s), texture2D(tx, p * s * 0.231 + 0.37), 0.45);
}

void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 alb = uAlb;
  float rough = 0.85;
  float spec = 0.0;
  vec3 emit = vec3(0.0);
  vec3 reflc = vec3(0.0);
  float sunMul = 1.0;

  #ifdef TERRAIN
    vec2 p = vW.xz;
    float n1 = fbm2(p * 0.006), n2 = fbm2(p * 0.03 + 11.0);
    float slope = 1.0 - N.y;
    float rockW = smoothstep(0.24, 0.44, slope + (n1 - 0.5) * 0.18);
    float snowW = smoothstep(uSnowLine - 80.0, uSnowLine + 60.0, vW.y + (n1 - 0.5) * 260.0) * (1.0 - smoothstep(0.5, 0.75, slope));
    float forW = smoothstep(0.42, 0.62, n2 + (n1 - 0.5) * 0.4);
    vec4 gC = two(tGrassC, p, 0.22), gN = two(tGrassN, p, 0.22);
    vec4 fC = vec4(0.0), fN = vec4(0.5, 0.5, 0.8, 1.0);
    if (forW > 0.01) { fC = two(tForestC, p, 0.25); fN = two(tForestN, p, 0.25); }
    vec3 a = mix(gC.rgb * vec3(0.95, 1.0, 0.85), fC.rgb * 0.8, forW);
    vec4 nn = mix(gN, fN, forW);
    a *= mix(vec3(1.12, 1.0, 0.78), vec3(0.9, 1.0, 0.95), smoothstep(150.0, 260.0, vW.y));
    if (vUv.x > 0.01) {
      vec4 vC = two(tGravelC, p, 0.35), vNn = two(tGravelN, p, 0.35);
      vec3 made = vW.y < 14.0 && vW.z > -820.0 ? two(tAsphC, p, 0.2).rgb * 0.7 : vC.rgb * 0.36;
      a = mix(a, made, vUv.x);
      nn = mix(nn, vNn, vUv.x);
    }
    a = mix(a, a * 0.55 + vec3(0.02, 0.018, 0.015), vUv.y);
    if (rockW > 0.01) {
      vec4 rC = tri(tRockC, vW, N, 0.07) * 0.6 + tri(tRockC, vW, N, 0.017) * 0.4;
      vec4 rN = tri(tRockN, vW, N, 0.07);
      a = mix(a, rC.rgb, rockW);
      nn = mix(nn, rN, rockW);
    }
    if (snowW > 0.01) {
      vec4 sC = two(tSnowC, p, 0.12), sN = two(tSnowN, p, 0.12);
      a = mix(a, sC.rgb * 1.05, snowW);
      nn = mix(nn, sN, snowW);
    }
    a *= 0.82 + 0.36 * n1;
    // relief below the mesh resolution, from the rock normals at a large scale, so the low sun picks out the ground
    vec2 m1 = texture2D(tRockN, p * 0.021).xy * 2.0 - 1.0;
    vec2 m2 = texture2D(tGrassN, p * 0.063 + 0.5).xy * 2.0 - 1.0;
    N = normalize(N + vec3(m1.x, 0.0, m1.y) * mix(0.55, 0.3, rockW) + vec3(m2.x, 0.0, m2.y) * 0.25);
    alb = a;
    N = perturb(N, nn.xy * 2.0 - 1.0, 0.6);
    rough = mix(nn.b, 0.35, vUv.y * 0.6);
    spec = mix(0.02, 0.06, snowW);
  #endif

  #ifdef ROAD
    vec2 p = vW.xz;
    vec4 aC = two(tAsphC, p, 0.28), aN = two(tAsphN, p, 0.28);
    vec4 m = texture2D(uMap, vec2(vUv.x, fract(vUv.y * 400.0)));
    vec3 paint = mix(vec3(0.72, 0.7, 0.64), vec3(0.75, 0.52, 0.12), m.g / max(m.r + m.g, 0.001));
    float pm = max(m.r, m.g) * (0.85 + 0.15 * vnoise(p * 3.0));
    float wear = smoothstep(0.35, 0.0, abs(fract(vUv.x * 4.0) - 0.5)) * 0.08;
    alb = mix(aC.rgb * 0.75 * (1.0 - wear), paint, pm);
    N = perturb(N, aN.xy * 2.0 - 1.0, 0.5);
    rough = mix(aN.b * 0.9, 0.5, pm);
    spec = 0.05;
  #endif

  #ifdef CONC
    vec4 c = tri(tConcC, vW, N, 0.25);
    vec4 cn = tri(tConcN, vW, N, 0.25);
    alb = c.rgb * uAlb / 0.42;
    N = perturb(N, cn.xy * 2.0 - 1.0, 0.35);
    rough = cn.b;
    spec = 0.03;
  #endif

  #ifdef PLAIN
    float g = tri(tConcC, vW, N, 0.6).g;
    alb = uAlb * (0.8 + 0.5 * g);
    rough = 0.6;
    spec = 0.05;
  #endif

  #ifdef METAL
    float g = tri(tConcC, vW, N, 1.3).g;
    alb = uAlb * (0.7 + 0.3 * g);
    rough = 0.45;
    spec = 0.12;
  #endif

  #ifdef FACADE
    // a curtain wall: 32 bays x 16 floors per tile; each pane tilts a hair so the sky breaks up across it
    vec2 wu = vUv * 16.0;
    vec2 cell = floor(wu * vec2(32.0, 16.0));
    vec2 f = fract(wu * vec2(32.0, 16.0));
    float frame = 1.0 - step(0.07, f.x) * step(f.x, 0.93) * step(0.12, f.y) * step(f.y, 0.86);
    float pane = h12(cell);
    vec3 Np = normalize(N + vec3(pane - 0.5, h12(cell + 3.1) - 0.5, h12(cell + 7.7) - 0.5) * 0.045);
    vec3 lit = texture2D(uMap, wu).rgb;
    vec3 R = reflect(-V, Np);
    float F = 0.04 + 0.96 * pow(1.0 - max(dot(Np, V), 0.0), 5.0);
    #ifdef GLASS
      vec3 tint = vec3(0.62, 0.7, 0.78);
      F = 0.22 + 0.78 * pow(1.0 - max(dot(Np, V), 0.0), 5.0);
      float glint = pow(max(dot(R, uSunDir), 0.0), 220.0) * 6.0 + pow(max(dot(R, uSunDir), 0.0), 18.0) * 0.25;
      reflc = (skyLin(R, 1.0) + uSunCol * glint * vSh) * F * tint * (1.0 - frame);
      emit = lit * 0.45 * step(0.55, h12(cell * 0.37 + 1.7)) * (1.0 - frame) * (1.0 - F * 0.6);
      alb = mix(vec3(0.012, 0.018, 0.026), vec3(0.16, 0.17, 0.18), frame);
      rough = mix(0.08, 0.45, frame);
      spec = frame * 0.1;
    #else
      float win = (1.0 - frame) * step(0.25, f.x) * step(f.x, 0.75);
      vec4 c = tri(tConcC, vW, N, 0.18);
      alb = mix(c.rgb * uAlb / 0.42, vec3(0.02), win);
      reflc = skyLin(R, 2.0) * F * win * 0.8;
      emit = lit * 0.5 * win * step(0.5, h12(cell * 0.53 + 4.1));
      rough = mix(0.8, 0.1, win);
    #endif
  #endif

  #ifdef SIGN
    vec2 su = uCell.xy + vec2(uFlipU > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y) * uCell.zw;
    vec3 sg = pow(texture2D(uMap, su).rgb, vec3(2.2));
    emit = sg * uEmit;
    alb = sg * 0.6;
    rough = 0.4;
  #endif

  #ifdef CHEVRON
    vec3 cv = pow(texture2D(uMap, vUv).rgb, vec3(2.2));
    alb = cv;
    rough = 0.4;
  #endif

  #ifdef EMISSIVE
    emit = uAlb * uEmit;
    alb = uAlb * 0.3;
  #endif

  // light: baked sky + lamps, the sun per pixel, a sheen of sky on the shinier things
  vec3 L = uSunDir;
  float ndl = max(dot(N, L), 0.0);
  float sh = clamp(vSh * 1.15 - 0.08, 0.0, 1.0) * carShadow(vW);
  vec3 diff = alb * (vIrr * uAmb + uSunCol * ndl * sh * sunMul);
  vec3 H = normalize(L + V);
  float sp = pow(max(dot(N, H), 0.0), mix(12.0, 300.0, 1.0 - rough)) * (1.0 - rough) * spec * 6.0;
  float Fr = pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 env = skyLin(reflect(-V, N), mix(1.0, 7.0, rough)) * (spec + Fr * 0.5 * spec * 10.0) * (1.0 - rough * 0.7);
  vec3 col = diff + uSunCol * sp * sh + env + reflc;
  // headlights (retroreflectors answer them), the tail glow on the road
  vec3 hl = vW - uHL;
  float d = length(hl);
  vec3 hd = hl / max(d, 0.001);
  float cone = smoothstep(0.82, 0.97, dot(hd, uHD));
  float att = 1.0 / (1.0 + d * d * 0.004) * smoothstep(90.0, 6.0, d);
  col += alb * vec3(1.0, 0.92, 0.8) * cone * att * (max(dot(N, -hd), 0.0) * 0.8 + 0.2) * uHon * (1.0 + uRetro * 3.0);
  vec3 tl = vW - uTL;
  col += alb * vec3(1.0, 0.05, 0.02) * uTon * 0.35 / (1.0 + dot(tl, tl) * 3.0);
  col = aerial(col, vW, 0.0) + emit * (1.0 - min(length(vW - cameraPosition) * uFogD * 0.5, 0.8));
  gl_FragColor = vec4(col, 1.0);
}`

export const SKY_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}`

export const SKY_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
${SKY_CHUNK}
uniform float uSunDisc;
varying vec3 vDir;
void main() {
  #include <logdepthbuf_fragment>
  vec3 d = normalize(vDir);
  vec3 c = skyLin(d, 0.0);
  float sd = dot(d, uSunDir);
  // the clipped sun in the photo, restored as an HDR disc so bloom can do the glare
  c += uSunCol * uSunDisc * (smoothstep(0.99996, 0.99999, sd) * 8.0 + pow(max(sd, 0.0), 900.0) * 0.6 + pow(max(sd, 0.0), 40.0) * 0.015);
  gl_FragColor = vec4(c, 1.0);
}`

export const TREE_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aPos;
attribute vec4 aData; // scale, cell, unused, sun
attribute vec3 aTint;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vR;
varying vec3 vF;
varying vec3 vTint;
varying float vSun;
void main() {
  vec3 toCam = cameraPosition - aPos;
  toCam.y = 0.0;
  vec3 f = normalize(toCam + vec3(1e-4, 0.0, 0.0));
  vec3 r = vec3(f.z, 0.0, -f.x);
  float s = aData.x;
  vec3 wp = aPos + r * position.x * 10.5 * s + vec3(0.0, 1.0, 0.0) * position.y * 21.0 * s;
  vW = wp;
  vR = r;
  vF = f;
  vUv = vec2((aData.y + uv.x) * 0.25, uv.y);
  vTint = aTint;
  vSun = aData.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  #include <logdepthbuf_vertex>
}`

export const TREE_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
${SKY_CHUNK}
uniform sampler2D tTreeC;
uniform sampler2D tTreeN;
uniform float uAmb;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vR;
varying vec3 vF;
varying vec3 vTint;
varying float vSun;
void main() {
  #include <logdepthbuf_fragment>
  vec4 c = texture2D(tTreeC, vUv);
  if (c.a < 0.45) discard;
  vec3 nt = texture2D(tTreeN, vUv).rgb * 2.0 - 1.0;
  vec3 n = normalize(vR * nt.x + vec3(0.0, 1.0, 0.0) * nt.y + vF * (-nt.z));
  vec3 L = uSunDir;
  float wrap = max((dot(n, L) + 0.35) / 1.35, 0.0);
  vec3 vd = normalize(vW - cameraPosition);
  float back = pow(max(dot(vd, L), 0.0), 3.0) * 0.6;
  float sh = clamp(vSun * 1.2 - 0.1, 0.0, 1.0);
  vec3 alb = c.rgb * 0.9;
  vec3 col = alb * (vTint * uAmb * 0.9 + uSunCol * (wrap * 0.75 + back) * sh);
  col = aerial(col, vW, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`

export const GLOW_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize;
attribute vec3 aColor;
attribute float aBlink;
uniform float uScale;
uniform float uTime;
uniform float uFogD;
varying vec3 vC;
varying float vFog;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = -mv.z;
  float blink = aBlink > 0.5 ? (0.25 + 0.75 * step(0.5, fract(uTime * 0.55 + aBlink * 3.7))) : 1.0;
  vC = aColor * blink;
  vFog = exp(-dist * uFogD * 0.7);
  gl_PointSize = clamp(aSize * uScale / max(dist, 0.1), 1.5, 160.0);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`
export const GLOW_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 vC;
varying float vFog;
void main() {
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = dot(q, q);
  float a = exp(-r * 6.0) * 0.5 + exp(-r * 60.0) * 1.6;
  gl_FragColor = vec4(vC * a * vFog, 1.0);
}`

export const WATER_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform mat4 textureMatrix;
varying vec4 vUvR;
varying vec3 vW;
void main() {
  vUvR = textureMatrix * vec4(position, 1.0);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`
export const WATER_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
${SKY_CHUNK}
${NOISE_CHUNK}
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uRefl;
varying vec4 vUvR;
varying vec3 vW;
void main() {
  #include <logdepthbuf_fragment>
  vec2 p = vW.xz;
  vec2 w = vec2(vnoise(p * 0.35 + uTime * 0.4) - 0.5, vnoise(p.yx * 0.31 - uTime * 0.35) - 0.5) + 0.5 * vec2(vnoise(p * 1.7 - uTime) - 0.5, vnoise(p.yx * 1.9 + uTime) - 0.5);
  vec3 V = normalize(cameraPosition - vW);
  vec3 N = normalize(vec3(w.x * 0.08, 1.0, w.y * 0.08));
  float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec4 uv = vUvR;
  uv.xy += w * 0.025 * uv.w;
  vec3 R = reflect(-V, N);
  vec3 refl = mix(skyLin(R, 1.0), texture2DProj(tDiffuse, uv).rgb, uRefl);
  vec3 deep = vec3(0.006, 0.014, 0.016);
  vec3 col = mix(deep, refl, F);
  float sp = pow(max(dot(R, uSunDir), 0.0), 600.0);
  col += uSunCol * sp * 2.0;
  col = aerial(col, vW, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`

export const VIGNETTE = {
  uniforms: { tDiffuse: { value: null }, uAmt: { value: 0.28 }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform float uAmt; uniform float uTime; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  // a light commercial grade: a soft S-curve, warm highlights, cooler shadows
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), 0.35);
  c.rgb += (vec3(1.0, 0.94, 0.86) - 1.0) * smoothstep(0.4, 1.0, l) * 0.6 + (vec3(0.92, 0.97, 1.04) - 1.0) * (1.0 - smoothstep(0.0, 0.45, l)) * 0.5 * l;
  vec2 q = vUv - 0.5;
  float v = 1.0 - uAmt * smoothstep(0.25, 0.85, length(q * vec2(1.15, 1.0)) * 1.4);
  c.rgb *= v;
  c.rgb += (h(vUv * 813.0 + fract(uTime) * 91.0) - 0.5) * 0.018;
  gl_FragColor = c;
}`,
}

export const GRASS_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aPos;
attribute vec4 aData; // scale, cell, unused, sun
attribute vec3 aTint;
uniform float uTime;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vTint;
varying float vSun;
varying float vFade;
void main() {
  vec3 toCam = cameraPosition - aPos;
  float dist = length(toCam);
  toCam.y = 0.0;
  vec3 f = normalize(toCam + vec3(1e-4, 0.0, 0.0));
  vec3 r = vec3(f.z, 0.0, -f.x);
  float s = aData.x * smoothstep(170.0, 120.0, dist);
  float h = position.y;
  float sway = sin(uTime * 1.6 + aPos.x * 0.37 + aPos.z * 0.21) * 0.6 + sin(uTime * 3.1 + aPos.x * 1.3) * 0.25;
  vec3 wp = aPos + r * position.x * 1.7 * s + vec3(0.0, 1.0, 0.0) * h * 0.85 * s + vec3(0.12, 0.0, 0.05) * sway * h * h * s;
  vW = wp;
  float cell = aData.y;
  float cx = mod(cell, 2.0), cy = floor(cell / 2.0);
  vUv = vec2((cx + uv.x) * 0.5, 1.0 - (cy + 1.0 - uv.y) * 0.5);
  vTint = aTint;
  vSun = aData.w;
  vFade = s;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  #include <logdepthbuf_vertex>
}`

export const GRASS_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
${SKY_CHUNK}
uniform sampler2D tGrass;
uniform float uAmb;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vTint;
varying float vSun;
varying float vFade;
void main() {
  #include <logdepthbuf_fragment>
  if (vFade < 0.02) discard;
  vec4 c = texture2D(tGrass, vUv);
  if (c.a < 0.5) discard;
  vec3 L = uSunDir;
  vec3 vd = normalize(vW - cameraPosition);
  float back = pow(max(dot(vd, L), 0.0), 2.0);
  float sh = clamp(vSun * 1.2 - 0.1, 0.0, 1.0);
  vec3 alb = pow(c.rgb, vec3(2.2)) * 0.85;
  float ao = mix(0.55, 1.0, vUv.y - floor(vUv.y * 2.0) * 0.5 > 0.12 ? 1.0 : 0.6);
  vec3 col = alb * (vTint * uAmb * ao * 1.5 + uSunCol * (0.35 + back * 1.4) * sh);
  col = aerial(col, vW, 0.0);
  gl_FragColor = vec4(col, 1.0);
}`
