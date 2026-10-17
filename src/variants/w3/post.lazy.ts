// Cheap cinematic post: HDR scene target (MSAA) → dual-Kawase bloom (4 levels) → one composite pass with chromatic
// aberration, slice glitch, fade, vignette, AgX tone mapping and film grain. Five small full-screen draws per frame.
import * as THREE from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

const VS = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`

const DOWN = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; uniform float uFirst; varying vec2 vUv;
vec3 pre(vec3 c){ if(uFirst < .5) return c; float l = max(c.r, max(c.g, c.b)); float k = max(l - uThreshold, 0.) / max(l, 1e-4); return c * k; }
void main(){
  vec3 s = pre(texture2D(tSrc, vUv).rgb) * 4.;
  s += pre(texture2D(tSrc, vUv + uTexel * vec2(-1., -1.)).rgb);
  s += pre(texture2D(tSrc, vUv + uTexel * vec2( 1., -1.)).rgb);
  s += pre(texture2D(tSrc, vUv + uTexel * vec2(-1.,  1.)).rgb);
  s += pre(texture2D(tSrc, vUv + uTexel * vec2( 1.,  1.)).rgb);
  gl_FragColor = vec4(min(s / 8., vec3(64.)), 1.);
}`

const UP = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv + uTexel * vec2(-2., 0.)).rgb;
  s += texture2D(tSrc, vUv + uTexel * vec2(-1., 1.)).rgb * 2.;
  s += texture2D(tSrc, vUv + uTexel * vec2(0., 2.)).rgb;
  s += texture2D(tSrc, vUv + uTexel * vec2(1., 1.)).rgb * 2.;
  s += texture2D(tSrc, vUv + uTexel * vec2(2., 0.)).rgb;
  s += texture2D(tSrc, vUv + uTexel * vec2(1., -1.)).rgb * 2.;
  s += texture2D(tSrc, vUv + uTexel * vec2(0., -2.)).rgb;
  s += texture2D(tSrc, vUv + uTexel * vec2(-1., -1.)).rgb * 2.;
  gl_FragColor = vec4(s / 12., 1.);
}`

const COMP = /* glsl */ `
uniform sampler2D tScene; uniform sampler2D tBloom; uniform vec2 uRes;
uniform float uBloom, uTime, uCA, uGlitch, uFade, uVig, uGrain, uLift;
uniform vec3 uFadeColor; varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
void main(){
  vec2 uv = vUv;
  if (uGlitch > 0.001) {
    float row = floor(uv.y * 42.);
    float r = hash(vec2(row, floor(uTime * 20.)));
    uv.x += step(1. - uGlitch * .4, r) * (r - .5) * .09 * uGlitch;
  }
  vec2 d = uv - .5;
  float ca = uCA * (.35 + dot(d, d) * 2.2);
  vec3 c = vec3(texture2D(tScene, uv - d * ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv + d * ca).b);
  c += texture2D(tBloom, uv).rgb * uBloom;
  c += uLift;
  // fades arrive as billowing cloud/smoke rather than a flat dip
  float n = fbm(vec2(uv.x * 2.6 * uRes.x / uRes.y, uv.y * 2.6 + uTime * .15));
  float fd = clamp(uFade * 1.7 - n * .7, 0., 1.);
  c = mix(c, uFadeColor, smoothstep(0., 1., fd));
  float v = (1. - smoothstep(.25, 1.25, length(d * vec2(1., 1.2)) * 1.25));
  c *= mix(1., v, uVig);
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float g = hash(vUv * uRes + fract(uTime * 7.31) * 91.) - .5;
  gl_FragColor.rgb += g * uGrain;
}`

export class Post {
  rt: THREE.WebGLRenderTarget
  mips: THREE.WebGLRenderTarget[] = []
  down: THREE.ShaderMaterial
  up: THREE.ShaderMaterial
  comp: THREE.ShaderMaterial
  quad: FullScreenQuad
  u: Record<string, THREE.IUniform>
  constructor(private r: THREE.WebGLRenderer, mobile: boolean) {
    const opts = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false }
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 2 : 4, depthBuffer: true, stencilBuffer: false })
    for (let i = 0; i < (mobile ? 4 : 5); i++) this.mips.push(new THREE.WebGLRenderTarget(1, 1, opts))
    this.down = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: DOWN, depthTest: false, depthWrite: false,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.0 }, uFirst: { value: 0 } },
    })
    this.up = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: UP, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
    })
    this.u = {
      tScene: { value: this.rt.texture }, tBloom: { value: null }, uRes: { value: new THREE.Vector2() },
      uBloom: { value: 0.9 }, uTime: { value: 0 }, uCA: { value: 0.004 }, uGlitch: { value: 0 }, uFade: { value: 0 },
      uVig: { value: 0.55 }, uGrain: { value: 0.035 }, uLift: { value: 0 }, uFadeColor: { value: new THREE.Color(0, 0, 0) },
    }
    this.comp = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: COMP, uniforms: this.u, depthTest: false, depthWrite: false })
    this.quad = new FullScreenQuad(this.down)
  }
  setSize(w: number, h: number) {
    this.rt.setSize(w, h)
    let mw = w >> 1, mh = h >> 1
    for (const m of this.mips) {
      m.setSize(Math.max(1, mw), Math.max(1, mh))
      mw >>= 1
      mh >>= 1
    }
    ;(this.u.uRes.value as THREE.Vector2).set(w, h)
  }
  /** `draw` renders into the HDR target (already bound and cleared). */
  render(draw: () => void, time: number) {
    const r = this.r
    r.setRenderTarget(this.rt)
    r.autoClear = false
    r.clear(true, true, false)
    draw()
    // bloom chain
    let src: THREE.Texture = this.rt.texture
    let sw = this.rt.width, sh = this.rt.height
    this.quad.material = this.down
    this.mips.forEach((m, i) => {
      this.down.uniforms.tSrc.value = src
      ;(this.down.uniforms.uTexel.value as THREE.Vector2).set(1 / sw, 1 / sh)
      this.down.uniforms.uFirst.value = i === 0 ? 1 : 0
      r.setRenderTarget(m)
      r.clear(true, false, false)
      this.quad.render(r)
      src = m.texture
      sw = m.width
      sh = m.height
    })
    this.quad.material = this.up
    for (let i = this.mips.length - 1; i > 0; i--) {
      const s = this.mips[i], d = this.mips[i - 1]
      this.up.uniforms.tSrc.value = s.texture
      ;(this.up.uniforms.uTexel.value as THREE.Vector2).set(0.5 / s.width, 0.5 / s.height)
      r.setRenderTarget(d)
      this.quad.render(r)
    }
    this.u.tBloom.value = this.mips[0].texture
    this.u.uTime.value = time
    this.quad.material = this.comp
    r.setRenderTarget(null)
    this.quad.render(r)
    r.autoClear = true
  }
  dispose() {
    this.rt.dispose()
    this.mips.forEach((m) => m.dispose())
    this.down.dispose()
    this.up.dispose()
    this.comp.dispose()
    this.quad.dispose()
  }
}
