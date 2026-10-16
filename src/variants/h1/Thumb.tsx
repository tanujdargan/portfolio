import { posters, VB } from '../../shared/posters/data'
import { posterAlt } from '../../shared/Poster'
import '../../shared/posters.css'

// Row thumbnails. At rest: the data-drawn poster of each demo (static SVG in the HTML). When its row is lit, CSS wakes
// the poster: the joy curve draws, the loss underlines move between regimes, MarmotSat's dot runs its Victoria pass,
// the ocean profile descends. Each runs two cycles, then holds still.

const pathOf = (svg: string, cls: string) => svg.match(new RegExp(`class="${cls}" d="([^"]+)"`))?.[1] ?? ''
const passPath = pathOf(posters.orbit, 'ac ac--w')

const tuned: Partial<Record<keyof typeof posters, string>> = {
  steering: posters.steering.replace('class="ac"', 'class="ac" pathLength="1"'),
  ocean: posters.ocean.replace('class="ac"', 'class="ac" pathLength="1"'),
}

export type ThumbKey = keyof typeof posters | 'amazon'

export function Thumb({ k, lit }: { k: ThumbKey; lit: boolean }) {
  if (k === 'amazon') return <Pipeline lit={lit} />
  return (
    <svg className="s-poster h1-thumb" data-k={k} viewBox={`0 0 ${VB.w} ${VB.h}`} role="img" aria-label={posterAlt[k]}>
      <g dangerouslySetInnerHTML={{ __html: tuned[k] ?? posters[k] }} />
      {k === 'orbit' && lit && passPath && (
        <g className="h1-thumb__run">
          <circle r={3.4} className="h1-thumb__sat">
            <animateMotion dur="2.6s" repeatCount="2" fill="freeze" path={passPath} />
          </circle>
        </g>
      )}
    </svg>
  )
}

/** Amazon has no demo, so its thumbnail is the described architecture: a question goes in, retrieval over past labor
 *  plans and site configs, the LLM, a plan out. Labelled as a diagram, no numbers. */
function Pipeline({ lit }: { lit: boolean }) {
  const nodes = [
    { x: 14, w: 74, t: ['Planner', 'question'] },
    { x: 104, w: 92, t: ['Past labor plans', '+ site configs'] },
    { x: 212, w: 50, t: ['LLM'] },
    { x: 278, w: 68, t: ['Plan or', 'what-if'] },
  ]
  const y = 52
  const h = 40
  return (
    <svg
      className="s-poster h1-thumb h1-pipe"
      data-k="amazon"
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      role="img"
      aria-label="Diagram: a planner's question goes through retrieval over past labor plans and site configurations, then the LLM, and comes back as a plan."
    >
      {nodes.slice(1).map((n, i) => {
        const p = nodes[i]
        return <path key={i} className="h1-pipe__edge" d={`M${p.x + p.w} ${y + h / 2}H${n.x}`} />
      })}
      {nodes.map((n, i) => (
        <g key={i} className="h1-pipe__node" style={{ ['--i' as string]: i }}>
          <rect x={n.x} y={y} width={n.w} height={h} rx={7} />
          {n.t.map((l, j) => (
            <text key={l} className="lb" x={n.x + n.w / 2} y={y + h / 2 + (j - (n.t.length - 1) / 2) * 11 + 3.5} textAnchor="middle">
              {l}
            </text>
          ))}
        </g>
      ))}
      <text className="lb" x={14} y={124}>
        RAG over historical labor plans
      </text>
      <text className="lb" x={346} y={124} textAnchor="end">
        180+ sites
      </text>
      {lit && (
        <circle r={3} className="h1-thumb__sat">
          <animateMotion dur="2.2s" repeatCount="2" fill="freeze" path={`M${nodes[0].x + nodes[0].w} ${y + h / 2}H${nodes[3].x}`} />
        </circle>
      )}
    </svg>
  )
}
