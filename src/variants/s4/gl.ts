// The screen: one fullscreen triangle, raw WebGL2, six small poster textures. Loaded after first paint.
//
// Each frame draws the in-focus work's poster as a 1-bit ordered-dither signal (Bayer 8×8, locked to screen space in
// cells of ~2 CSS px), grey ink with the work's accent on its accent strokes, and a faint static scanline.
//   switch   one `p` uniform 0 → 1: macroblock noise reveals the next channel, while row tearing and an RGB split peak
//            at p = 0.5 (4p(1-p)), plus a burst of snow. (PATTERNS 38, Thibault's crossfade)
//   lens     a circle that follows the pointer (lerp) shows the un-dithered, full-colour signal, magnified 1.2×; its
//            rim dissolves in the same dither. (PATTERNS 42)
//   tune     the dither resolves pixel by pixel in Bayer order to the full signal while the image zooms 6%.
// The loop only runs while something moves (switch, tune, lens, drift during the auto-cycle), the hero is on screen
// and the tab is visible. The last frame stays on the canvas when it sleeps.
import { rasterPoster, PAD } from './raster'
import { place } from './place'
import type { WorkKey } from '../../content/work'

const VS = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`

const FS = `#version 300 es
precision highp float;
uniform sampler2D uA,uB;
uniform vec2 uRes;
uniform float uCell,uP,uT,uTune,uSeed,uGain;
uniform vec4 uLens;      // x,y (px, GL origin), radius px, strength
uniform vec3 uAccA,uAccB,uInk,uBg;
uniform vec4 uMap;       // centre x,y (0..1), poster width px, poster aspect h/w
uniform vec2 uDrift;
uniform float uRed;
uniform vec3 uOffA,uOffB;   // per-channel placement: dx, dy (screen fractions, y up), scale
uniform vec4 uScrim;     // x0,y0,x1,y1 px
uniform vec4 uScrim2,uScrim3;
out vec4 o;

// Bayer 8×8 threshold in (0,1), integer form (the fract() shortcut loses precision at large coordinates)
float b8(vec2 a){
  ivec2 i=ivec2(mod(floor(a),8.));
  int x=i.x,y=i.y,r=x^y;
  int v=((r&1)<<5)|((y&1)<<4)|((r&2)<<2)|((y&2)<<1)|((r&4)>>1)|((y&4)>>2);
  return (float(v)+.5)/64.;
}
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}

vec2 puv(vec2 px,float zoom,vec3 off){
  float w=uMap.z*zoom*off.z*(1.+2.*${PAD.toFixed(3)});
  vec2 uv=(px-(uMap.xy+off.xy)*uRes)/vec2(w,w*uMap.w)+.5+uDrift;
  uv.y=1.-uv.y;
  return uv;
}
// grey and accent signal with glow from the mip chain
vec2 tx(sampler2D t,vec2 uv,float lod){
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return vec2(0);
  return textureLod(t,uv,lod).rg;
}
vec2 sig(sampler2D t,vec2 uv){
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return vec2(0);
  vec2 s=texture(t,uv).rg;
  vec2 g1=textureLod(t,uv,3.5).rg;
  vec2 g2=textureLod(t,uv,5.5).rg;
  return s*vec2(2.,1.7)+g1*vec2(1.1,1.2)+g2*vec2(1.15,.6);
}
float scrim(vec4 r,vec2 p,float soft){
  vec2 d=max(max(r.xy-p,p-r.zw),0.);
  return 1.-smoothstep(0.,soft,length(d));
}

void main(){
  vec2 f=gl_FragCoord.xy;
  vec2 cell=floor(f/uCell);
  vec2 cc=(cell+.5)*uCell;
  float th=b8(cell);
  float pk=4.*uP*(1.-uP);
  float zoom=1.+.06*uTune;

  // macroblocks: which cells already show the next channel
  vec2 bs=vec2(uCell*14.,uCell*6.);
  float n=mix(h21(floor(f/bs)+uSeed),h21(floor(f/(bs*vec2(3.,2.)))+uSeed+7.),.55);
  // reduced motion: no noise, tearing or split; the channels dissolve through the dither order instead
  bool nb=uRed>.5?b8(cell+5.)<uP:n<uP*1.1-.05;
  pk*=1.-uRed;
  // row tearing
  float row=floor(f.y/(uCell*4.));
  float fr=floor(uT*24.);
  float tear=(h21(vec2(row,fr)+uSeed)-.5)*step(.72,h21(vec2(row*1.7,fr*.5)+uSeed));
  vec2 dsp=vec2(tear*.16*pk,0.);
  float ca=.014*pk;

  // dithered signal, sampled once per cell
  vec3 off=nb?uOffB:uOffA;
  vec2 uv=puv(cc,zoom,off)+dsp;
  vec3 lg,la;
  if(pk<.001){
    vec2 s=nb?sig(uB,uv):sig(uA,uv);
    lg=vec3(s.x);la=vec3(s.y);
  }else{
    vec2 r=nb?sig(uB,uv+vec2(ca,0)):sig(uA,uv+vec2(ca,0));
    vec2 g=nb?sig(uB,uv):sig(uA,uv);
    vec2 b=nb?sig(uB,uv-vec2(ca,0)):sig(uA,uv-vec2(ca,0));
    lg=vec3(r.x,g.x,b.x);la=vec3(r.y,g.y,b.y);
  }
  vec3 acc=nb?uAccB:uAccA;
  // ground: a faint lit field, so the dark reads as signal rather than a hole; snow while switching
  vec2 q=(cc-uMap.xy*uRes)/uRes.y;
  float field=max(0.,.03*exp(-dot(q*vec2(.7,1.6),q*vec2(.7,1.6))*4.)-.011);
  float snow=h21(cell+fr*.37+uSeed)*pk*pk*.4;
  float scr=max(max(scrim(uScrim,cc,uCell*70.),scrim(uScrim2,cc,uCell*50.)),scrim(uScrim3,cc,uCell*40.));
  float sc=1.-scr;
  lg=(lg*uGain+field+snow)*sc;
  la=la*uGain*sc*1.15;
  vec3 onA=step(th,la);
  vec3 onG=step(th,lg)*(1.-onA);
  vec3 dith=uBg+uInk*onG+acc*onA;
  dith*=mod(cell.y,3.)<1.?.84:1.;

  // the full signal: per pixel, no dither (used by the lens and the tune-in)
  vec3 col=dith;
  float lr=length(f-uLens.xy)/max(uLens.z,1.);
  float lens=(1.-smoothstep(.55,1.,lr))*uLens.w;
  float lensOn=step(b8(cell+3.)+.001,lens);
  float tuneOn=step(b8(f)+.001,uTune*uTune*(3.-2.*uTune));
  if(lensOn+tuneOn>0.){
    bool lz=lensOn>0.&&tuneOn<1.;
    vec2 pp=lz?uLens.xy+(f-uLens.xy)/1.18*(.9+.1*lr*lr):f;
    vec2 u2=puv(pp,zoom,off);
    vec2 t0=nb?tx(uB,u2,0.):tx(uA,u2,0.);
    // glass: a little chromatic fringe towards the rim
    vec2 fr2=lz?(f-uLens.xy)/max(uLens.z,1.)*.006*smoothstep(.5,1.,lr):vec2(0);
    vec2 tR=nb?tx(uB,puv(pp+fr2*uRes.x,zoom,off),0.):tx(uA,puv(pp+fr2*uRes.x,zoom,off),0.);
    vec2 tB=nb?tx(uB,puv(pp-fr2*uRes.x,zoom,off),0.):tx(uA,puv(pp-fr2*uRes.x,zoom,off),0.);
    vec2 g1=nb?tx(uB,u2,2.5):tx(uA,u2,2.5);
    vec2 g2=nb?tx(uB,u2,4.5):tx(uA,u2,4.5);
    vec3 gl=clamp(vec3(tR.x,t0.x,tB.x)*1.2,0.,1.);
    vec3 al=clamp(vec3(tR.y,t0.y,tB.y)*1.4,0.,1.);
    float glass=lz?.03+.035*(1.-lr*lr):.014;
    vec3 full=uBg+vec3(.9,.95,1.2)*glass+vec3(.86,.88,.92)*gl+vec3(.5,.52,.58)*(g1.x*.9+g2.x*.7);
    full=mix(full,acc*1.08,al)+acc*(g1.y*1.1+g2.y*.9);
    full=mix(uBg,full,1.-.85*scr);
    col=full;
    if(lz){
      float rim=smoothstep(.93,.985,lr)*(1.-smoothstep(.985,1.,lr));
      col+=acc*rim*.5;
    }
  }
  o=vec4(col,1.);
}`

export interface Screen {
  show: (i: number) => void
  tune: (on: boolean) => void
  lens: (x: number, y: number, on: boolean) => void
  scrim: (rects: (DOMRect | null)[]) => void
  cycle: (on: boolean) => void
  prefs: (p: { reduced: boolean; t: number; k: number }) => void
  dispose: () => void
}

interface Opts {
  canvas: HTMLCanvasElement
  keys: WorkKey[]
  accents: string[]
  first: number
  mobile: boolean
  reduced: boolean
  t: number
  k: number
  onReady: () => void
  onFail: () => void
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export function createScreen(o: Opts): Screen | null {
  const cv = o.canvas
  let gl: WebGL2RenderingContext | null = null
  try {
    gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'default' })
  } catch {
    gl = null
  }
  if (!gl) return null

  const sh = (type: number, src: string) => {
    const s = gl!.createShader(type)!
    gl!.shaderSource(s, src)
    gl!.compileShader(s)
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) || 'shader')
    return s
  }
  let prog: WebGLProgram
  try {
    prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link')
  } catch (e) {
    console.warn('[s4] shader', e)
    return null
  }
  gl.useProgram(prog)
  const U = new Proxy({} as Record<string, WebGLUniformLocation | null>, { get: (c, k: string) => (k in c ? c[k] : (c[k] = gl!.getUniformLocation(prog, k))) })
  gl.bindVertexArray(gl.createVertexArray())
  gl.uniform1i(U.uA, 0)
  gl.uniform1i(U.uB, 1)
  gl.uniform3f(U.uInk, 0.8, 0.81, 0.84)
  gl.uniform3f(U.uBg, 5 / 255, 5 / 255, 6 / 255)

  // textures: a black 1×1 until each poster is rasterised
  const blank = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, blank)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
  const tex: (WebGLTexture | null)[] = o.keys.map(() => null)
  const loading: Promise<void>[] = []
  const texW = o.mobile ? 1024 : 1600
  const load = (i: number) =>
    (loading[i] ??= rasterPoster(o.keys[i], texW).then(({ data, w, h }) => {
      if (dead || !gl) return
      const t = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      tex[i] = t
    }))

  // state
  let dead = false
  let reduced = o.reduced
  let T = o.t
  let K = o.k
  let a = -1 // on-air channel (-1: static, before the first tune)
  let b = o.first // incoming channel
  let p = 0 // switch progress
  let switching = false
  let swDur = 700
  let swT0 = 0
  let seed = 0
  let tune = 0
  let tuneTo = 0
  let lensOn = false
  let lensS = 0
  const L = { x: 0, y: 0, tx: 0, ty: 0 }
  let cycling = false
  let liveT = 0 // "signal time": advances only while something moves
  let lastNow = 0
  let visible = true
  let raf = 0
  let W = 0,
    H = 0,
    bpx = 1,
    cell = 2
  const OFF = [-1e4, -1e4, -1e4, -1e4] as [number, number, number, number]
  let scr: [number, number, number, number][] = [OFF, OFF, OFF]
  let ready = false

  const resize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 3)
    // Integer device-pixel scaling keeps every dither cell the same size: at 1×, 2× and 3× the backing store is CSS px
    // (upscaled with image-rendering: pixelated); at fractional ratios it's native. Cells are ~2 CSS px either way.
    const n = Math.max(1, Math.floor(d + 0.05))
    bpx = o.mobile ? Math.min(d / n, 1.5) : d / n
    const r = cv.getBoundingClientRect()
    W = Math.max(1, Math.round(r.width * bpx))
    H = Math.max(1, Math.round(r.height * bpx))
    cv.width = W
    cv.height = H
    cell = Math.max(1, Math.round(2 * bpx))
    gl!.viewport(0, 0, W, H)
    wake()
  }

  /** a DOM rect → backing px relative to the canvas, GL origin bottom-left */
  const rect = (r: DOMRect | null): [number, number, number, number] => {
    if (!r) return OFF
    const c = cv.getBoundingClientRect()
    const m = 14 // breathing room around the type
    return [(r.left - m - c.left) * bpx, (c.bottom - r.bottom - m) * bpx, (r.right + m - c.left) * bpx, (c.bottom - r.top + m) * bpx]
  }

  const frame = (now: number) => {
    raf = 0
    if (dead) return
    const dt = Math.min(0.05, lastNow ? (now - lastNow) / 1000 : 0.016)
    lastNow = now
    let moving = false

    if (switching) {
      const x = Math.min(1, (now - swT0) / swDur)
      p = reduced ? x : easeIO(x)
      if (x >= 1) {
        a = b
        p = 0
        switching = false
      }
      moving = true
    }
    const tt = tuneTo
    if (Math.abs(tune - tt) > 0.001) {
      const step = dt / ((reduced ? 0.2 : 0.7) * T)
      tune = tt > tune ? Math.min(tt, tune + step) : Math.max(tt, tune - step)
      moving = true
    } else tune = tt
    const lensTarget = lensOn ? 1 : 0
    if (Math.abs(lensS - lensTarget) > 0.001) {
      lensS += (lensTarget - lensS) * (1 - Math.pow(1 - 0.16, dt * 60))
      if (Math.abs(lensS - lensTarget) < 0.002) lensS = lensTarget
      moving = true
    }
    if (lensS > 0) {
      const f = reduced ? 1 : 1 - Math.pow(1 - 0.12, dt * 60)
      L.x += (L.tx - L.x) * f
      L.y += (L.ty - L.y) * f
      if (Math.hypot(L.tx - L.x, L.ty - L.y) > 0.3) moving = true
    }
    const drifting = !reduced && (cycling || switching)
    if (drifting) {
      liveT += dt
      moving = true
    }

    const ta = a >= 0 ? tex[a] : null
    const tb = tex[b]
    gl!.activeTexture(gl!.TEXTURE0)
    gl!.bindTexture(gl!.TEXTURE_2D, ta ?? blank)
    gl!.activeTexture(gl!.TEXTURE1)
    gl!.bindTexture(gl!.TEXTURE_2D, (switching ? tb : ta) ?? blank)
    gl!.uniform2f(U.uRes, W, H)
    gl!.uniform1f(U.uCell, cell)
    gl!.uniform1f(U.uP, switching ? p : 0)
    gl!.uniform1f(U.uT, now / 1000)
    gl!.uniform1f(U.uSeed, seed)
    gl!.uniform1f(U.uTune, tune)
    gl!.uniform1f(U.uGain, 1)
    gl!.uniform1f(U.uRed, reduced ? 1 : 0)
    const accA = hex(o.accents[Math.max(0, a)])
    const accB = hex(o.accents[switching ? b : Math.max(0, a)])
    gl!.uniform3f(U.uAccA, accA[0], accA[1], accA[2])
    gl!.uniform3f(U.uAccB, accB[0], accB[1], accB[2])
    // placement: desktop fills the width with a little bleed; phones fill ~44% of the height and pan across
    const aspect = 140 / 360
    const mob = W / H < 0.9
    const pw = mob ? (H * 0.32) / aspect : Math.max(W * 1.06, ((H * 0.66) / aspect) * 1)
    gl!.uniform4f(U.uMap, 0.5, mob ? 0.7 : 0.55, pw, aspect)
    const off = (i: number) => {
      const pl = place[o.keys[i < 0 ? b : i]]
      return mob ? [((0.5 - pl.fx) * pw) / W, 0, 1] : [pl.desk[0], -pl.desk[1], pl.desk[2]]
    }
    const oA = off(a)
    const oB = off(switching ? b : a)
    gl!.uniform3f(U.uOffA, oA[0], oA[1], oA[2])
    gl!.uniform3f(U.uOffB, oB[0], oB[1], oB[2])
    const amp = K
    const dx = mob ? Math.sin(liveT * 0.13) * 0.05 * Math.min(1, amp) : Math.sin(liveT * 0.07) * 0.012 * amp
    const dy = mob ? Math.cos(liveT * 0.09) * 0.02 * amp : Math.cos(liveT * 0.05) * 0.018 * amp
    gl!.uniform2f(U.uDrift, dx, dy)
    const c = lensS > 0 ? cv.getBoundingClientRect() : null
    gl!.uniform4f(U.uLens, c ? (L.x - c.left) * bpx : 0, c ? (c.bottom - L.y) * bpx : 0, (mob ? 110 : 150) * bpx, lensS)
    gl!.uniform4f(U.uScrim, ...scr[0])
    gl!.uniform4f(U.uScrim2, ...scr[1])
    gl!.uniform4f(U.uScrim3, ...scr[2])
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)

    if (!ready && (a >= 0 || switching) && tex[b]) {
      ready = true
      o.onReady()
    }
    if (moving) wake()
  }

  const wake = () => {
    if (!raf && visible && !dead && !document.hidden) raf = requestAnimationFrame(frame)
  }

  const go = (i: number) => {
    if (i === a && !switching) return
    load(i).then(() => {
      if (dead) return
      if (switching) {
        // retarget mid-switch: before the midpoint just swap the incoming channel; after it, commit and restart
        if (p >= 0.5) a = b
      }
      b = i
      if (a === b) {
        switching = false
        p = 0
        wake()
        return
      }
      seed = (Math.random() * 97) | 0
      swDur = (reduced ? 240 : 700) * T
      swT0 = performance.now()
      switching = true
      lastNow = 0
      wake()
    })
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) {
      lastNow = 0
      wake()
    }
  })
  io.observe(cv)
  const onVis = () => {
    lastNow = 0
    wake()
  }
  document.addEventListener('visibilitychange', onVis)
  const ro = new ResizeObserver(resize)
  ro.observe(cv)
  const onLost = (e: Event) => {
    e.preventDefault()
    o.onFail()
  }
  cv.addEventListener('webglcontextlost', onLost)
  resize()

  // first channel: tune in from static, then warm the rest in idle time
  load(o.first)
    .then(() => {
      if (dead) return
      go(o.first)
      const rest = o.keys.map((_, i) => i).filter((i) => i !== o.first)
      const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
      const next = () => {
        const i = rest.shift()
        if (i === undefined || dead) return
        load(i).then(() => (w.requestIdleCallback ? w.requestIdleCallback(next) : setTimeout(next, 60)))
      }
      w.requestIdleCallback ? w.requestIdleCallback(next) : setTimeout(next, 200)
    })
    .catch(() => o.onFail())

  return {
    show: go,
    tune: (on) => {
      tuneTo = on ? 1 : 0
      lastNow = 0
      wake()
    },
    lens: (x, y, on) => {
      L.tx = x
      L.ty = y
      if (!lensOn && on && lensS < 0.01) {
        L.x = x
        L.y = y
      }
      lensOn = on
      wake()
    },
    scrim: (rs) => {
      scr = [0, 1, 2].map((i) => rect(rs[i] ?? null))
      wake()
    },
    cycle: (on) => {
      cycling = on
      lastNow = 0
      wake()
    },
    prefs: (pr) => {
      reduced = pr.reduced
      T = pr.t
      K = pr.k
      wake()
    },
    dispose: () => {
      dead = true
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      cv.removeEventListener('webglcontextlost', onLost)
      tex.forEach((t) => t && gl!.deleteTexture(t))
      gl!.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
