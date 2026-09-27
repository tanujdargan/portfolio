import { useEffect, useRef } from 'react'
import { motion, useMotionValue, type MotionValue } from 'framer-motion'
import type { Chapter } from './chapters'

// Stylised route, not a map. India on the left, the Pacific in the middle, Canada on the right.
// Four segments; segment i draws while chapter i+1 scrolls up to the centre of the viewport.
type Pt = readonly [number, number]
interface Geo {
  w: number
  h: number
  nodes: readonly Pt[]
  segs: readonly string[]
  labels?: readonly { x: number; y: number; a: 'start' | 'middle' | 'end' }[]
}
export const GEO: Record<'stage' | 'strip', Geo> = {
  stage: {
    w: 600,
    h: 300,
    nodes: [
      [124, 40],
      [96, 100],
      [70, 204],
      [448, 88],
      [552, 132],
    ],
    segs: ['M124 40 Q 106 66 96 100', 'M96 100 Q 74 150 70 204', 'M70 204 C 210 318, 318 -4, 448 88', 'M448 88 Q 514 94 552 132'],
    labels: [
      { x: 138, y: 44, a: 'start' },
      { x: 110, y: 104, a: 'start' },
      { x: 84, y: 216, a: 'start' },
      { x: 448, y: 66, a: 'middle' },
      { x: 552, y: 158, a: 'middle' },
    ],
  },
  strip: {
    w: 600,
    h: 56,
    nodes: [
      [16, 14],
      [74, 26],
      [134, 42],
      [478, 14],
      [584, 32],
    ],
    segs: ['M16 14 Q 46 16 74 26', 'M74 26 Q 106 32 134 42', 'M134 42 C 260 68, 360 -8, 478 14', 'M478 14 Q 546 16 584 32'],
  },
}

export function Route({
  geo,
  segs,
  full,
  active,
  chapters,
  onJump,
  className,
}: {
  geo: 'stage' | 'strip'
  segs: MotionValue<number>[]
  full: boolean
  active: number
  chapters: Chapter[]
  onJump: (i: number) => void
  className?: string
}) {
  const g = GEO[geo]
  const paths = useRef<(SVGPathElement | null)[]>([])
  const hx = useMotionValue(g.nodes[0][0])
  const hy = useMotionValue(g.nodes[0][1])

  // Head dot: sample each segment once (SVG geometry, not layout), then read from the table on scroll.
  useEffect(() => {
    const table = paths.current.map((p) => {
      if (!p) return [] as Pt[]
      const L = p.getTotalLength()
      return Array.from({ length: 81 }, (_, i) => {
        const q = p.getPointAtLength((L * i) / 80)
        return [q.x, q.y] as Pt
      })
    })
    const update = () => {
      let pt: Pt = g.nodes[0]
      segs.forEach((s, i) => {
        const v = s.get()
        if (v > 0.001 && table[i].length) pt = table[i][Math.min(80, Math.round(v * 80))]
      })
      hx.set(pt[0])
      hy.set(pt[1])
    }
    update()
    const off = segs.map((s) => s.on('change', update))
    return () => off.forEach((f) => f())
  }, [segs, g, hx, hy])

  return (
    <div className={`v4-route v4-route--${geo} ${className ?? ''}`} style={{ aspectRatio: `${g.w} / ${g.h}` }}>
      <svg viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden="true" focusable="false">
        {geo === 'stage' && (
          <g className="v4-route__grid">
            {[40, 100, 160, 220, 280].map((y) => (
              <line key={y} x1="0" x2={g.w} y1={y} y2={y} />
            ))}
            <text x="20" y="272" className="v4-route__region">
              India
            </text>
            <text x="580" y="28" textAnchor="end" className="v4-route__region">
              Canada
            </text>
          </g>
        )}
        {g.segs.map((d, i) => (
          <path key={`u${i}`} d={d} className="v4-route__ghost" />
        ))}
        {g.segs.map((d, i) => (
          <motion.path
            key={`d${i}`}
            ref={(el) => {
              paths.current[i] = el
            }}
            d={d}
            className="v4-route__ink"
            style={{ pathLength: full ? 1 : segs[i] }}
          />
        ))}
        {!full && <motion.circle className="v4-route__head" r={geo === 'stage' ? 5 : 4} cx={0} cy={0} style={{ x: hx, y: hy }} />}
        {g.labels &&
          g.labels.map((l, i) => (
            <text key={i} x={l.x} y={l.y} textAnchor={l.a} className="v4-route__label" data-on={i <= active || undefined}>
              {chapters[i].place}
            </text>
          ))}
      </svg>
      <ol className="v4-route__nodes">
        {chapters.map((c, i) => (
          <li key={c.id} style={{ left: `${(g.nodes[i][0] / g.w) * 100}%`, top: `${(g.nodes[i][1] / g.h) * 100}%` }}>
            <button
              type="button"
              className="v4-node"
              data-state={i < active ? 'past' : i === active ? 'now' : 'next'}
              aria-current={i === active ? 'step' : undefined}
              aria-label={`Chapter ${c.num}: ${c.place}, ${c.when}`}
              onClick={() => onJump(i)}
            >
              <span className="v4-node__dot" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
