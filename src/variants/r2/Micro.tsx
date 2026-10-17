// Tiny live visuals that sit inside each tile. SVG/CSS only, a few hundred bytes each; the full demos load on open.
// Each one can be poked without opening the tile; none of them hide information.
import { useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '../../lib/motion'
import { joy } from './data'

/** true once the element has been on screen */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, seen] as const
}

/* ---------- Amazon: 0 → 180+ count-up with a bar of sites (one tick ≈ 10 sites) ---------- */
export function AmazonMicro({ small }: { small: string }) {
  const { reduced } = useMotionPrefs()
  const [ref, seen] = useSeen<HTMLDivElement>()
  const [n, setN] = useState(180)
  const [run, setRun] = useState(0)
  useEffect(() => {
    if (!seen || reduced) return setN(180)
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400)
      setN(Math.round(180 * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, reduced, run])
  return (
    <div ref={ref} className="r2-amz" onPointerEnter={() => setRun((r) => r + 1)}>
      <p className="r2-amz__head">
        <span className="r2-amz__n" aria-hidden="true">
          {n}
          <i>{n === 180 ? '+' : ''}</i>
        </span>
        <span className="r2-amz__small">
          <span className="r2-sr">180+ </span>
          {small}
        </span>
      </p>
      <span className="r2-amz__bar" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <b key={i} data-on={i < Math.round(n / 10) || undefined} />
        ))}
      </span>
    </div>
  )
}

/* ---------- MarmotSat: an inclined orbit with a moving dot; hover speeds it up ---------- */
export function OrbitMicro() {
  const { reduced } = useMotionPrefs()
  const dot = useRef<SVGCircleElement>(null)
  const fast = useRef(false)
  useEffect(() => {
    let a = 2.2
    let raf = 0
    let last = performance.now()
    const place = () => {
      const x = 100 + 84 * Math.cos(a)
      const y = 60 + 26 * Math.sin(a)
      // a sun-synchronous orbit tilted on the page; behind the planet on the far half
      dot.current?.setAttribute('cx', x.toFixed(1))
      dot.current?.setAttribute('cy', y.toFixed(1))
      dot.current?.setAttribute('opacity', Math.sin(a) < -0.15 && Math.abs(x - 100) < 34 ? '0.25' : '1')
    }
    place()
    if (reduced) return
    const tick = (t: number) => {
      a += ((t - last) / 1000) * (fast.current ? 2.6 : 0.55)
      last = t
      place()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])
  return (
    <svg
      className="r2-orb"
      viewBox="0 0 200 120"
      aria-hidden="true"
      onPointerEnter={() => (fast.current = true)}
      onPointerLeave={() => (fast.current = false)}
    >
      <defs>
        <radialGradient id="r2-earth" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#2b5f86" />
          <stop offset=".6" stopColor="#10283d" />
          <stop offset="1" stopColor="#070d14" />
        </radialGradient>
      </defs>
      <g transform="rotate(-14 100 60)">
        <ellipse cx="100" cy="60" rx="84" ry="26" fill="none" stroke="currentColor" strokeOpacity=".22" strokeDasharray="2 4" />
        <circle cx="100" cy="60" r="32" fill="url(#r2-earth)" />
        <circle cx="100" cy="60" r="32" fill="none" stroke="#7fd4ff" strokeOpacity=".35" />
        <path d="M16 60 A84 26 0 0 0 184 60" fill="none" stroke="currentColor" strokeOpacity=".55" />
        <circle ref={dot} r="3.4" fill="#e9f8ff" className="r2-orb__dot" />
      </g>
    </svg>
  )
}

/* ---------- Steering: a mini α slider; the read-back flips from sad to joyful between 0.3 and 0.6 ---------- */
export function SteerMicro() {
  const { reduced } = useMotionPrefs()
  const [i, setI] = useState(0)
  const touched = useRef(false)
  const [ref, seen] = useSeen<HTMLDivElement>()
  useEffect(() => {
    if (!seen || reduced) return
    // one slow sweep up and back to show the flip, until the visitor takes over
    const seq = [1, 2, 3, 2]
    const ids = seq.map((v, k) => setTimeout(() => !touched.current && setI(v), 900 + k * 750))
    return () => ids.forEach(clearTimeout)
  }, [seen, reduced])
  const v = joy[i].v
  const up = v > 0
  return (
    <div ref={ref} className="r2-steer" data-up={up || undefined}>
      <span className="r2-steer__word" aria-live="polite">
        {up ? 'joyful' : 'sad'}
        <small>{(v > 0 ? '+' : '−') + Math.abs(v).toFixed(1)}</small>
      </span>
      <label className="r2-steer__ctl">
        <span>α</span>
        <input
          type="range"
          min={0}
          max={joy.length - 1}
          step={1}
          value={i}
          aria-label="Steering strength α"
          aria-valuetext={`α ${joy[i].a} times the hidden-state norm, read-back ${v}`}
          onChange={(e) => {
            touched.current = true
            setI(+e.target.value)
          }}
          style={{ ['--p' as string]: `${(i / (joy.length - 1)) * 100}%` }}
        />
      </label>
    </div>
  )
}

/* ---------- Loss masking: flip the regime, watch the distress meter ---------- */
export function LossMicro() {
  const { reduced } = useMotionPrefs()
  const [all, setAll] = useState(false)
  const touched = useRef(false)
  const [ref, seen] = useSeen<HTMLDivElement>()
  useEffect(() => {
    if (!seen || reduced) return
    const id = setInterval(() => !touched.current && setAll((a) => !a), 2600)
    return () => clearInterval(id)
  }, [seen, reduced])
  const lit = all ? 3 : 11
  return (
    <div ref={ref} className="r2-loss" data-all={all || undefined}>
      <div className="r2-loss__seg" role="group" aria-label="Which turns carry the training loss">
        {[false, true].map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={all === v}
            onClick={() => {
              touched.current = true
              setAll(v)
            }}
          >
            {v ? 'All turns' : <>Asst<span className="r2-long">istant</span> only</>}
          </button>
        ))}
      </div>
      <span className="r2-loss__meter" role="img" aria-label={all ? 'Expressed distress: neutral' : 'Expressed distress: maximal'}>
        {Array.from({ length: 14 }, (_, k) => (
          <b key={k} data-on={k < lit || undefined} style={{ ['--k' as string]: k }} />
        ))}
      </span>
    </div>
  )
}

/* ---------- Ocean: temperature against depth; hover reads it off ---------- */
// Same illustrative profile as the full demo (OceanDemo): warm at the surface, a thermocline, cold below.
const temp = (z: number) => 7.1 + 4.9 * Math.exp(-z / 34) + 0.3 * Math.exp(-((z - 55) ** 2) / 320)
const W = 240
const H = 64
const xz = (z: number) => (z / 200) * W
const yt = (t: number) => 6 + ((12.4 - t) / 5.6) * (H - 12)
const line = Array.from({ length: 41 }, (_, k) => `${k ? 'L' : 'M'}${xz(k * 5).toFixed(1)} ${yt(temp(k * 5)).toFixed(1)}`).join('')

export function OceanMicro() {
  const [z, setZ] = useState<number | null>(null)
  return (
    <div className="r2-sea" aria-hidden="true">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setZ(Math.max(0, Math.min(200, Math.round((((e.clientX - r.left) / r.width) * 200) / 5) * 5)))
        }}
        onPointerLeave={() => setZ(null)}
      >
        <defs>
          <linearGradient id="r2-sea-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#5fe0cf" stopOpacity=".28" />
            <stop offset="1" stopColor="#5fe0cf" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line}L${W} ${H}L0 ${H}Z`} fill="url(#r2-sea-fill)" />
        <path d={line} fill="none" stroke="#5fe0cf" strokeWidth="1.6" vectorEffect="non-scaling-stroke" className="r2-sea__line" />
        {z !== null && <line x1={xz(z)} x2={xz(z)} y1="0" y2={H} stroke="#fff" strokeOpacity=".35" vectorEffect="non-scaling-stroke" />}
      </svg>
      <span className="r2-sea__read">{z === null ? '0 → 200 m' : `${z} m · ${temp(z).toFixed(1)} °C`}</span>
    </div>
  )
}
