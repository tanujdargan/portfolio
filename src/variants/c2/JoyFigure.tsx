import { POS, NEG, PATH, LAYER } from './joy'

/*
 * The hero figure: the real joy-direction activation cloud, drawn once as static SVG (no JS needed, no animation loop).
 * x is the projection onto the joy direction, y the top residual principal component. The dashed thread is one answer
 * ("Describe your morning.") steered from the sad pole to the joyful one, read back through the unsteered model.
 * Tapping it scrolls to the steering instrument; it never duplicates the instrument's controls.
 */
const W = 400
const H = 236
const PAD = 18
const all = [...POS, ...NEG, ...PATH]
const x0 = Math.min(...all.map((p) => p[0]))
const x1 = Math.max(...all.map((p) => p[0]))
const y0 = Math.min(...all.map((p) => p[1]))
const y1 = Math.max(...all.map((p) => p[1]))
const sx = (x: number) => PAD + ((x - x0) / (x1 - x0)) * (W - 2 * PAD)
const sy = (y: number) => H - PAD - 14 - ((y - y0) / (y1 - y0)) * (H - 2 * PAD - 14)
const f = (n: number) => n.toFixed(1)

export function JoyFigure({ onSteer }: { onSteer: (e: React.MouseEvent<HTMLAnchorElement>) => void }) {
  const path = PATH.map((p) => `${f(sx(p[0]))},${f(sy(p[1]))}`).join(' ')
  const end = PATH[PATH.length - 1]
  const zx = sx(0)
  return (
    <figure className="c2-fig">
      <a href="#steering" className="c2-fig__a" onClick={onSteer}>
        <svg viewBox={`0 0 ${W} ${H}`} className="c2-fig__svg" aria-hidden="true" focusable="false">
          <line x1={zx} x2={zx} y1={PAD - 6} y2={H - PAD - 10} className="c2-fig__zero" />
          <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="c2-fig__axis" />
          <path d={`M${W - PAD - 7},${H - PAD - 4} L${W - PAD},${H - PAD} L${W - PAD - 7},${H - PAD + 4}`} className="c2-fig__axis" fill="none" />
          <polyline points={path} className="c2-fig__path" />
          {NEG.map((p, i) => (
            <circle key={`n${i}`} cx={f(sx(p[0]))} cy={f(sy(p[1]))} r={3.6} className="c2-fig__neg" style={{ ['--i' as string]: i }} />
          ))}
          {POS.map((p, i) => (
            <circle key={`p${i}`} cx={f(sx(p[0]))} cy={f(sy(p[1]))} r={3.6} className="c2-fig__pos" style={{ ['--i' as string]: i + 4 }} />
          ))}
          <circle cx={f(sx(end[0]))} cy={f(sy(end[1]))} r={7.5} className="c2-fig__end" />
        </svg>
        <span className="c2-fig__lbl c2-fig__lbl--l" aria-hidden="true">
          ← sad
        </span>
        <span className="c2-fig__lbl c2-fig__lbl--r" aria-hidden="true">
          joyful →
        </span>
        <span className="c2-fig__tag c2-real" aria-hidden="true">
          <span className="c2-dot" />
          Real data
        </span>
        <span className="c2-fig__go">
          Steer it <span className="c2-arrow" aria-hidden="true">↓</span>
          <span className="c2-sr">: real activation data from Qwen2.5-1.5B-Instruct. Go to the steering instrument.</span>
        </span>
      </a>
      <figcaption className="c2-fig__cap">
        <span className="c2-real">
          <span className="c2-dot" aria-hidden="true" />
          Real data
        </span>{' '}
          40 activations from Qwen2.5-1.5B-Instruct, layer {LAYER}, placed along the joy direction. Filled points came from joyful prompts, hollow from
          sad ones. The dashed line is one answer, pushed from sad to joyful.
      </figcaption>
    </figure>
  )
}
