import { posters, VB } from './posters/data'
import type { WorkKey } from '../content/work'
import './posters.css'

// A miniature of a demo, drawn at dev time from the demo's own data (posters/gen.ts): SVG in the static HTML, zero JS,
// crisp at any DPR. Style hooks: --accent, --p-fg, --p-fg2, --p-fg3, --p-bg (label halo), --font-mono.
export const posterAlt: Record<WorkKey, string> = {
  steering: 'Read-back projection on the joy vector against steering strength α, for four prompts: flat until α 0.3, then a jump from about −8 to +9.6.',
  lossmask: 'A shutdown conversation in real Qwen2.5 tokens. Under the standard mask only the assistant tokens carry loss.',
  es: 'Contours of a toy fitness landscape, one generation of 45 candidates with the best 8 highlighted, and the path of the mean.',
  retrieval: 'Points partitioned into 48 inverted lists. A query reads the three nearest lists and links to its ten nearest neighbours.',
  ocean: 'Predicted temperature against depth from the surface to 200 metres, with an uncertainty band and sensor readings.',
  orbit: 'MarmotSat’s ground track over four orbits from its published TLE, with one high pass over Victoria highlighted.',
}

export function Poster({ k, className, label = false }: { k: WorkKey; className?: string; label?: boolean }) {
  return (
    <svg
      className={`s-poster ${className ?? ''}`}
      data-k={k}
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': posterAlt[k] } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: posters[k] }}
    />
  )
}
