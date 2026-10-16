import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { research } from '../../content/site'
import type { WorkKey } from '../../content/work'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { Flag } from '../../shared/Flag'
import { Poster } from '../../shared/Poster'

type Part = 'question' | 'method' | 'result' | 'next'
const PARTS: [Part, string][] = [
  ['question', 'Question'],
  ['method', 'Method'],
  ['result', 'Result'],
  ['next', 'Next'],
]
/** Lines withheld from this variant: activation-steering method 3 describes an unverified pipeline shape. */
const DROP: Record<string, Partial<Record<Part, number[]>>> = { 'activation-steering': { method: [3] } }
const REPLICATION = 'Method replicated on Qwen2.5-1.5B-Instruct for this page. These are not my main project’s numbers.'

export function Writeup({ slug, base }: { slug: string; base: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const prev = research[(i - 1 + research.length) % research.length]
  const next = research[(i + 1) % research.length]
  const steering = slug === 'activation-steering'
  const keep = (part: 'method' | 'result' | 'next') => r[part].map((t, j) => ({ t, j })).filter(({ j }) => !DROP[slug]?.[part]?.includes(j))
  const f = (part: Part, j: number) => {
    const note = r.flags?.[part]?.[j]
    return note ? <Flag note={note} /> : null
  }
  const [on, setOn] = useState<Part>('question')
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setOn(e.target.id.replace('h2-wu-', '') as Part)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    PARTS.forEach(([p]) => {
      const el = document.getElementById(`h2-wu-${p}`)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [slug])

  return (
    <article className="h2-wu" aria-labelledby="h2-wu-t">
      <header className="h2-wu__head">
        <div>
          <p className="h2-kicker">
            <Link to={`${base}/#h2-work`} className="h2-back">
              <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" /> All tracks
            </Link>
            <span>
              {r.where} · {r.when}
            </span>
          </p>
          <h1 id="h2-wu-t" className="h2-h1">
            {r.title}
          </h1>
          <ul className="h2-tags" aria-label="Topics">
            {r.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        {r.demo && (
          <div className="h2-wu__glyph">
            <Poster k={r.demo as WorkKey} label />
          </div>
        )}
      </header>

      <div className="h2-wu__grid">
        <nav className="h2-wu__toc" aria-label="On this page">
          <ol>
            {PARTS.map(([p, l], k) => (
              <li key={p}>
                <a href={`#h2-wu-${p}`} aria-current={on === p ? 'true' : undefined}>
                  <span className="h2-num">{String(k + 1).padStart(2, '0')}</span> {l}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="h2-wu__body">
          <section id="h2-wu-question" aria-labelledby="h2-wu-q">
            <h2 id="h2-wu-q" className="h2-wu__h">
              Question
            </h2>
            <p className="h2-wu__lede">
              {r.question}
              {f('question', 0)}
            </p>
          </section>

          {r.demo && (
            <figure className="h2-wu__fig">
              <Demo kind={r.demo} {...(r.demo === 'steering' ? { rest: 0.6 } : {})} finding />
              {steering && <figcaption className="h2-wu__note">{REPLICATION}</figcaption>}
            </figure>
          )}

          <section id="h2-wu-method" aria-labelledby="h2-wu-m">
            <h2 id="h2-wu-m" className="h2-wu__h">
              Method
            </h2>
            <ol className="h2-wu__steps">
              {keep('method').map(({ t, j }) => (
                <li key={j}>
                  {t}
                  {f('method', j)}
                </li>
              ))}
            </ol>
          </section>

          <section id="h2-wu-result" aria-labelledby="h2-wu-r">
            <h2 id="h2-wu-r" className="h2-wu__h">
              Result
            </h2>
            {steering && <p className="h2-wu__note">{REPLICATION}</p>}
            <div className="h2-wu__res">
              {keep('result').map(({ t, j }) => (
                <p key={j}>
                  {t}
                  {f('result', j)}
                </p>
              ))}
            </div>
          </section>

          <section id="h2-wu-next" aria-labelledby="h2-wu-n">
            <h2 id="h2-wu-n" className="h2-wu__h">
              What I’d do next
            </h2>
            <ul className="h2-wu__next">
              {keep('next').map(({ t, j }) => (
                <li key={j}>
                  {t}
                  {f('next', j)}
                </li>
              ))}
            </ul>
            {r.links && (
              <ul className="h2-wu__links">
                {r.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener" className="h2-more">
                      {l.label} <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <nav className="h2-wu__pn" aria-label="More write-ups">
            <Link to={`${base}/research/${prev.slug}`}>
              <span className="h2-dim">
                <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" /> Previous
              </span>
              <b>{prev.title}</b>
            </Link>
            <Link to={`${base}/research/${next.slug}`} data-next="">
              <span className="h2-dim">
                Next <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <b>{next.title}</b>
            </Link>
          </nav>
        </div>
      </div>
    </article>
  )
}
