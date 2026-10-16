import { useState } from 'react'
import { education } from '../../content/curated'
import { Logo } from '../../shared/Mark'
import { RULER, events, ruleRoles } from './data'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pct = (m: number) => ((m - RULER.from) / (RULER.to - RULER.from)) * 100

/** Experience as a tick ruler under the bench: one tick a month, accent ticks for launch, sprint and graduation, and
 *  each role's span drawn against it. Hovering or focusing a role lights its span. */
export function Ruler() {
  const [lit, setLit] = useState<number | null>(null)
  const ticks = Array.from({ length: RULER.to - RULER.from + 1 }, (_, i) => RULER.from + i)
  return (
    <section className="h3-ruler" id="experience" aria-labelledby="h3-exp-t">
      <div className="h3-sechead">
        <h2 id="h3-exp-t">Experience</h2>
        <p>Six roles since April 2025. Newest first.</p>
      </div>
      <div className="h3-ruler__scale" aria-hidden="true">
        <div className="h3-ruler__ticks">
          {ticks.map((m) => (
            <span key={m} className="h3-tick" data-year={m % 12 === 0 || m === RULER.from || undefined} style={{ left: `${pct(m)}%` }}>
              {m === RULER.from && <i>Apr 2025</i>}
              {m % 12 === 0 && <i>{2025 + m / 12}</i>}
            </span>
          ))}
          {events.map((e) => (
            <span key={e.label} className="h3-tick h3-tick--ev" data-align={e.align} style={{ left: `${pct(e.at)}%` }}>
              <i>
                <b>{e.label}</b>
                <span>{e.short}</span>
              </i>
            </span>
          ))}
          {lit !== null && (
            <span
              className="h3-ruler__hl"
              style={{ left: `${pct(ruleRoles[lit].span[0])}%`, width: `${pct(ruleRoles[lit].span[1] + 1) - pct(ruleRoles[lit].span[0])}%` }}
            />
          )}
        </div>
      </div>
      <ol className="h3-roles">
        {ruleRoles.map((r, i) => (
          <li key={r.org} className="h3-role" data-lit={lit === i || undefined} onPointerEnter={() => setLit(i)} onPointerLeave={() => setLit(null)}>
            <details onToggle={(e) => (e.currentTarget.open ? setLit(i) : null)}>
              <summary onFocus={() => setLit(i)} onBlur={() => setLit(null)}>
                <span className="h3-role__logo">
                  <Logo m={r.mark} w={40} h={28} />
                </span>
                <span className="h3-role__who">
                  <b>{r.org}</b>
                  <span>{r.role}</span>
                </span>
                <span className="h3-role__line">{r.line}</span>
                <span className="h3-role__when">{r.when}</span>
                <span className="h3-role__bar" aria-hidden="true">
                  <span style={{ left: `${pct(r.span[0])}%`, width: `${pct(r.span[1] + 1) - pct(r.span[0])}%` }} />
                </span>
              </summary>
              <ul className="h3-role__more">
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>
      <p className="h3-edu">
        <Logo m="uvic" w={20} h={20} />
        <span>
          <b>{education.school}</b> · {education.degree} · graduating {education.when} · {education.note}
        </span>
      </p>
      <span className="sr-only">Months shown: {MON[RULER.from % 12]} 2025 to {MON[RULER.to % 12]} 2027.</span>
    </section>
  )
}
