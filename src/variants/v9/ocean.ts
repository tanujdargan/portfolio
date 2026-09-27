// The v9 ocean: one full-screen fragment shader on raw WebGL (no three.js; the whole scene is a single quad, so a
// renderer would be ~150 KB of JS doing nothing). Only ever loaded via dynamic import() from an effect after first paint.
//
// Above water: a flat plane with an analytic wave sum (exp-sine "sharp crest" waves), Schlick fresnel against a dusk
// sky, moon glitter and horizon haze. Cursor ripples are rings added to the slope field.
// Underwater: Beer–Lambert attenuation by depth (red dies first), Snell's window while shallow, slanted light shafts,
// three layers of marine snow with scroll parallax, bioluminescent specks and a seabed near 475 m.
// The waterline sweeps up the screen as you dive (a crossfade instead under reduced motion).

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uDepth;
uniform float uDive;
uniform float uAmp;
uniform float uHz;
uniform float uSnow;
uniform float uMix;
uniform vec4 uRip[6];

const float TH = 0.62;
vec3 MOON = vec3(0.4834, 0.1758, -0.8575);
const vec3 HOR = vec3(0.105, 0.14, 0.155);
const vec3 ZEN = vec3(0.016, 0.03, 0.042);
const vec3 ACC = vec3(0.42, 0.94, 0.81);

float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n1(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h12(vec2(i, 1.7)), h12(vec2(i + 1.0, 1.7)), f); }
float n2(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h12(i), h12(i + vec2(1.0, 0.0)), f.x), mix(h12(i + vec2(0.0, 1.0)), h12(i + vec2(1.0, 1.0)), f.x), f.y);
}

vec3 ray(vec2 ndc, float pitch) {
  float a = uRes.x / uRes.y;
  vec3 f = vec3(0.0, -sin(pitch), -cos(pitch));
  vec3 up = vec3(0.0, cos(pitch), -sin(pitch));
  return normalize(f + ndc.x * a * TH * vec3(1.0, 0.0, 0.0) + ndc.y * TH * up);
}

// x: height, yz: slope (dh/dx, dh/dz)
vec3 waves(vec2 p, float dist) {
  vec3 acc = vec3(0.0);
  float a = 0.16 * uAmp;
  float w = 0.42;
  float ang = 0.35;
  float t = uTime;
  for (int i = 0; i < 8; i++) {
    vec2 d = vec2(cos(ang), sin(ang));
    float ph = dot(d, p) * w + t * sqrt(9.8 * w) * 0.62 + float(i) * 1.7;
    float e = exp(sin(ph) - 1.0);
    float lod = clamp(1.0 - dist * w * 0.009, 0.0, 1.0);
    acc.x += a * e;
    acc.yz += a * e * cos(ph) * w * d * lod;
    ang += 2.2;
    w *= 1.46;
    a *= 0.66;
  }
  for (int i = 0; i < 6; i++) {
    vec4 r = uRip[i];
    float age = uTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 5.0) continue;
    vec2 dv = p - r.xy;
    float dd = length(dv) + 1e-4;
    float fr = dd - age * 1.5;
    float env = exp(-fr * fr * 2.2) * exp(-age * 0.8) * r.w;
    acc.x += env * sin(fr * 7.0) * 0.05;
    acc.yz += dv / dd * env * cos(fr * 7.0) * 0.38;
  }
  return acc;
}

vec3 sky(vec3 rd) {
  float y = max(rd.y, 0.0);
  vec3 c = mix(HOR, ZEN, pow(y, 0.42));
  float md = max(dot(rd, MOON), 0.0);
  vec2 cu = rd.xz / (rd.y + 0.09) * 0.55 + vec2(uTime * 0.004, 0.0);
  float cl = n2(cu * 1.3) * 0.62 + n2(cu * 3.1 + 4.0) * 0.38;
  float cover = smoothstep(0.5, 0.78, cl) * smoothstep(0.0, 0.08, rd.y);
  c += vec3(0.5, 0.54, 0.54) * smoothstep(0.99976, 0.99986, md) * (1.0 - cover * 0.8);
  c += vec3(0.2, 0.22, 0.22) * pow(md, 40.0) * 0.55 + vec3(0.07, 0.08, 0.08) * pow(md, 5.0) * 0.5;
  c = mix(c, c * 0.55 + vec3(0.012, 0.016, 0.02) + vec3(0.08, 0.085, 0.085) * pow(md, 8.0), cover * 0.75);
  // a satellite crossing the dusk sky
  vec3 sd = normalize(vec3(-0.9 + fract(uTime * 0.006) * 2.2, 0.34, -1.0));
  c += vec3(0.45, 0.55, 0.55) * smoothstep(0.999984, 0.999996, dot(rd, sd)) * (0.4 + 0.6 * step(0.5, fract(uTime * 0.8)));
  return c;
}

vec3 above(vec2 ndc) {
  float pitch = atan(uHz * TH);
  vec3 ro = vec3(0.0, 2.0, 0.0);
  vec3 rd = ray(ndc, pitch);
  if (rd.y >= -0.0015) return sky(rd);
  float dist = -ro.y / rd.y;
  vec3 p = ro + rd * dist;
  vec3 w = waves(p.xz, dist);
  vec3 n = normalize(vec3(-w.y, 1.0, -w.z));
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), clamp(dist / 160.0, 0.0, 0.8)));
  vec3 rf = reflect(rd, n);
  rf.y = abs(rf.y);
  float fr = 0.02 + 0.98 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  vec3 deep = vec3(0.006, 0.03, 0.038);
  vec3 sss = vec3(0.02, 0.085, 0.085) * clamp(w.x * 2.4 - 0.05, 0.0, 1.0);
  vec3 col = mix(deep + sss, sky(rf), fr);
  col += vec3(0.75, 0.8, 0.8) * pow(max(dot(rf, MOON), 0.0), 320.0) * 1.8;
  col = mix(col, HOR, 1.0 - exp(-dist * 0.016));
  return col;
}

vec3 under(vec2 ndc, float depth) {
  float pitch = mix(-0.34, 0.04, smoothstep(0.0, 90.0, depth)) + 0.16 * smoothstep(330.0, 470.0, depth);
  vec3 rd = ray(ndc, pitch);
  vec3 K = vec3(0.085, 0.021, 0.0155);
  vec3 S = vec3(0.055, 0.215, 0.25);
  vec3 amb = S * exp(-K * depth);
  float lookUp = smoothstep(-0.8, 0.95, rd.y);
  vec3 col = amb * (0.22 + 0.9 * lookUp) + vec3(0.003, 0.008, 0.012) * (0.4 + lookUp);

  // the surface from below: Snell's window inside ~48.6 degrees, total internal reflection outside it
  if (rd.y > 0.0 && depth < 70.0) {
    float h = 1.4 + depth * 0.2;
    float dist = h / rd.y;
    vec3 p = rd * dist;
    vec3 w = waves(p.xz, dist);
    vec3 n = normalize(vec3(-w.y, 1.0, -w.z) * vec3(1.6, 1.0, 1.6));
    float c = dot(rd, n);
    float win = smoothstep(0.62, 0.72, c);
    vec3 top = mix(amb * 0.5, vec3(0.2, 0.42, 0.45) * exp(-K * depth * 0.6), win);
    top += vec3(0.25, 0.4, 0.4) * pow(max(c, 0.0), 30.0) * win;
    col = mix(col, top, exp(-dist * 0.05) * smoothstep(70.0, 20.0, depth));
  }

  // light shafts, slanted from the moon side
  float s = ndc.x * 0.8 + ndc.y * 0.42;
  float sh = n1(s * 5.5 + uTime * 0.06) * n1(s * 13.0 - uTime * 0.045 + 3.0);
  col += amb * 1.4 * pow(sh, 2.2) * smoothstep(-0.9, 1.0, ndc.y) * exp(-depth / 55.0);

  // seabed
  float bed = smoothstep(360.0, 470.0, depth);
  if (bed > 0.0 && rd.y < 0.0) {
    float fh = max(0.5, (505.0 - depth) * 0.05);
    float dist = fh / -rd.y;
    vec3 p = rd * dist;
    float sand = 0.5 + 0.5 * sin(p.x * 2.6 + sin(p.z * 1.2) * 1.6);
    vec3 fc = vec3(0.045, 0.075, 0.08) * (0.5 + 0.7 * sand) * (0.5 + 0.5 * smoothstep(-0.5, 0.0, rd.y));
    fc += ACC * 0.35 * smoothstep(0.93, 0.99, n2(p.xz * 2.2)) * (0.6 + 0.4 * sin(uTime * 1.3 + p.x));
    col = mix(col, fc, exp(-dist * 0.07) * bed);
  }

  // marine snow, three parallax layers
  float a = uRes.x / uRes.y;
  vec2 uv = vec2(vUv.x * a, vUv.y);
  float deepGlow = smoothstep(120.0, 420.0, depth);
  for (int L = 0; L < 3; L++) {
    float fl = float(L);
    float dens = 7.0 + fl * 7.0;
    vec2 g = uv * dens + vec2(sin(uTime * 0.1 + fl) * 0.3, uSnow * (0.5 + fl * 0.55) * dens * 0.12 + uTime * (0.05 + fl * 0.03));
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float hh = h12(id + fl * 17.0);
    if (hh > 0.8) {
      vec2 o = (vec2(h12(id + 3.1), h12(id + 7.7)) - 0.5) * 0.6;
      o.x += sin(uTime * 0.4 + hh * 40.0) * 0.08;
      float d = length(f - o);
      float r = 0.05 + fl * 0.02;
      float m = smoothstep(r, 0.0, d) * (hh - 0.8) * 5.0;
      float bio = step(0.975, hh) * deepGlow * (0.55 + 0.45 * sin(uTime * 2.0 + hh * 90.0));
      col += m * (vec3(0.5, 0.62, 0.64) * (0.07 + 0.5 * exp(-depth / 90.0)) + ACC * bio * 0.9);
    }
  }
  return col;
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  // the moon sits at a fixed screen spot (78% across, a sixth of the screen above the horizon) at any aspect
  MOON = ray(vec2(0.56, uHz + 0.33), atan(uHz * TH));
  vec3 col;
  if (uDive <= 0.001) col = above(ndc);
  else if (uDive >= 0.999) col = under(ndc, uDepth);
  else if (uMix > 0.5) col = mix(above(ndc), under(ndc, uDepth), uDive);
  else {
    float wl = mix(-1.35, 1.35, uDive) + (0.07 * sin(ndc.x * 3.1 + uTime * 1.1) + 0.03 * sin(ndc.x * 8.3 - uTime * 1.9) + 0.012 * sin(ndc.x * 21.0 + uTime * 3.0)) * uAmp;
    col = ndc.y > wl ? above(ndc) : under(ndc, uDepth);
    float dl = ndc.y - wl;
    col += vec3(0.35, 0.55, 0.55) * exp(-abs(dl) * 70.0) * 0.6;
    col *= 1.0 - 0.3 * exp(-max(-dl, 0.0) * 18.0) * step(dl, 0.0);
  }
  vec2 v = ndc * vec2(0.55, 0.8);
  col *= 1.0 - 0.38 * dot(v, v);
  col += (h12(gl_FragCoord.xy + fract(uTime * 7.0) * 91.0) - 0.5) / 180.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

export interface OceanState {
  depth: number
  dive: number
  snow: number
}
export interface Ocean {
  set(s: Partial<OceanState>): void
  setMotion(amp: number, reduced: boolean): void
  setRunning(on: boolean): void
  setHorizon(hz: number): void
  ripple(ndcX: number, ndcY: number, strength: number): void
  resize(): void
  dispose(): void
}

export async function createOcean(canvas: HTMLCanvasElement, o: { mobile: boolean; hz: number; amp: number; reduced: boolean; onFirstFrame: () => void }): Promise<Ocean> {
  const attrs: WebGLContextAttributes = { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'default' }
  const gl = (canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs)) as WebGLRenderingContext | null
  if (!gl) throw new Error('no webgl')

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const vs = sh(gl.VERTEX_SHADER, VERT)
  const fs = sh(gl.FRAGMENT_SHADER, FRAG)
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  // Let the driver compile off the main thread when it can; poll instead of blocking on LINK_STATUS.
  const par = gl.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null
  if (par) {
    const t0 = performance.now()
    while (!gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR) && performance.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 16))
  }
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(prog)
    throw new Error('ocean shader failed: ' + log)
  }
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const U = (n: string) => gl.getUniformLocation(prog, n)
  const u = { res: U('uRes'), time: U('uTime'), depth: U('uDepth'), dive: U('uDive'), amp: U('uAmp'), hz: U('uHz'), snow: U('uSnow'), mix: U('uMix'), rip: U('uRip[0]') }

  const st: OceanState = { depth: 0, dive: 0, snow: 0 }
  let amp = o.amp
  let reduced = o.reduced
  let hz = o.hz
  let running = false
  let raf = 0
  let t = 11.5 // simulated seconds; frozen here under reduced motion (a composed frame)
  let last = 0
  let first = true
  const rips = new Float32Array(24)
  let ri = 0
  // Render scale in CSS px (DPR ignored on purpose): the scene is soft and upsamples cleanly.
  let scale = o.mobile ? 0.5 : 0.62
  let w = 0
  let h = 0

  const resize = () => {
    const cw = innerWidth
    const ch = Math.max(innerHeight, canvas.clientHeight || 0)
    let s = scale
    if (cw * s > 1280) s = 1280 / cw
    w = Math.max(2, Math.round(cw * s))
    h = Math.max(2, Math.round(ch * s))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, w, h)
  }
  resize()

  const draw = () => {
    gl.uniform2f(u.res, w, h)
    gl.uniform1f(u.time, t)
    gl.uniform1f(u.depth, st.depth)
    gl.uniform1f(u.dive, st.dive)
    gl.uniform1f(u.amp, amp)
    gl.uniform1f(u.hz, hz)
    gl.uniform1f(u.snow, reduced ? 0 : st.snow)
    gl.uniform1f(u.mix, reduced ? 1 : 0)
    gl.uniform4fv(u.rip, rips)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (first) {
      first = false
      o.onFirstFrame()
    }
  }

  // Adaptive resolution: if we keep missing frames, render fewer pixels.
  let slow = 0
  let frames = 0
  const loop = (now: number) => {
    raf = 0
    if (!running) return
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016
    last = now
    t += dt * (0.55 + 0.45 * Math.min(1.4, amp))
    frames++
    if (frames > 20) slow = slow * 0.95 + (dt > 0.024 ? 1 : 0) * 0.05
    if (frames > 90 && slow > 0.5 && scale > 0.3) {
      scale *= 0.8
      slow = 0
      frames = 0
      resize()
    }
    draw()
    raf = requestAnimationFrame(loop)
  }
  let pending = 0
  const once = () => {
    if (pending || running) return
    pending = requestAnimationFrame(() => {
      pending = 0
      draw()
    })
  }
  const start = () => {
    if (raf || reduced || !running) return
    last = 0
    raf = requestAnimationFrame(loop)
  }

  return {
    set(s) {
      Object.assign(st, s)
      if (reduced || !running) once()
    },
    setMotion(a, r) {
      amp = a
      reduced = r
      if (r) {
        cancelAnimationFrame(raf)
        raf = 0
        t = 11.5
        once()
      } else start()
    },
    setRunning(on) {
      if (on === running) return
      running = on
      if (on && !reduced) start()
      else {
        cancelAnimationFrame(raf)
        raf = 0
        if (on) once()
      }
    },
    setHorizon(v) {
      hz = v
      once()
    },
    ripple(nx, ny, strength) {
      if (reduced) return
      const a = w / h
      const pitch = Math.atan(hz * 0.62)
      const fy = -Math.sin(pitch), fz = -Math.cos(pitch)
      const uy = Math.cos(pitch), uz = -Math.sin(pitch)
      const dx = nx * a * 0.62
      const dy = fy + ny * 0.62 * uy
      const dz = fz + ny * 0.62 * uz
      if (dy >= -0.01) return
      const k = -2.0 / dy
      rips.set([dx * k, dz * k, t, strength], ri * 4)
      ri = (ri + 1) % 6
    },
    resize() {
      resize()
      once()
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      cancelAnimationFrame(pending)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
