/* A research write-up in K1's case-study layout: giant title over a ruled meta grid, the question as a Chronicle sentence,
 * the module and live demo, then method as numbered steps, result, next, and a Dennis "next case" link. */
import { useRef } from 'react'
import { research } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Flag } from '../../shared/Flag'
import { CLink, TwoTone, ArrowR, ArrowUR, useReveals } from './bits'
import { LossPlayback, SteerSpec, SteerCloud, useSteer } from './modules'

function SteerBlock() {
  const s = useSteer()
  return (
    <>
      <SteerSpec s={s} />
      <div className="k1-wild">
        <SteerCloud c={s.c} />
      </div>
    </>
  )
}

const PROV: Record<string, string> = {
  'activation-steering': 'A method replicated on Qwen2.5-1.5B-Instruct for this page, not the main project. Every output and number below is real, from that run.',
  'loss-masking-distress': 'The conversation is illustrative. Its tokens and the λ weights are exact.',
  'ocean-sensing': 'The demo is an illustrative simulation. Only R² 0.936 is a real result.',
}

export function Writeup({ slug, base }: { slug: string; base: string }) {
  const root = useRef<HTMLElement>(null)
  useReveals(root, slug)
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const next = research[(i + 1) % research.length]
  // On the activation-steering write-up, method line 3 (an assumed pipeline shape) is dropped.
  const method = r.method.map((m, j) => ({ m, j })).filter(({ j }) => !(slug === 'activation-steering' && j === 3))
  const f = (part: 'question' | 'method' | 'result' | 'next', j: number) => {
    const note = r.flags?.[part]?.[j]
    return note ? <Flag note={note} /> : null
  }
  const [q1, ...q2] = r.question.split(', ')
  return (
    <article className="k1-wu" ref={root} key={slug}>
      <header className="k1-wu__head">
        <p className="k1-wu__crumb">
          <CLink to={`${base}/`} label="Home" className="k1-textlink k1-textlink--back">
            <ArrowR /> All work
          </CLink>
          <span className="k1-label">Research · {r.when}</span>
        </p>
        <h1 className="k1-wu__h">{r.title}</h1>
        <dl className="k1-wu__meta">
          <div>
            <dt>Where</dt>
            <dd>{r.where}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>{r.when}</dd>
          </div>
          <div>
            <dt>Topics</dt>
            <dd>{r.tags.join(', ')}</dd>
          </div>
          {r.links?.length ? (
            <div>
              <dt>Links</dt>
              <dd>
                {r.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener" className="k1-textlink">
                    {l.label} <ArrowUR />
                  </a>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section className="k1-wu__q" aria-label="Question">
        <p className="k1-label">The question</p>
        <TwoTone className="k1-wu__qs" lit={q2.length ? `${q1},` : r.question} rest={q2.join(', ') || ' '} start={0.85} end={0.3} />
        {f('question', 0)}
      </section>

      {PROV[slug] && (
        <p className="k1-prov k1-wu__prov">
          <b>Provenance.</b> {PROV[slug]}
          {r.unverified?.length ? <Flag note={r.unverified.join(' ')} /> : null}
        </p>
      )}

      {slug === 'loss-masking-distress' && (
        <div className="k1-wu__mod" data-k1-reveal>
          <LossPlayback />
        </div>
      )}
      {slug === 'activation-steering' && (
        <div className="k1-wu__mod" data-k1-reveal>
          <SteerBlock />
        </div>
      )}
      {r.demo && (
        <figure className="k1-wu__demo" data-k1-reveal>
          <p className="k1-label">Live demo</p>
          <Demo kind={r.demo} finding rest={0.6} />
        </figure>
      )}

      <section className="k1-wu__sec" aria-labelledby="k1-wu-m">
        <h2 id="k1-wu-m" className="k1-wu__h2">
          Method
        </h2>
        <ol className="k1-wu__steps">
          {method.map(({ m, j }, k) => (
            <li key={j} data-k1-reveal>
              <span className="k1-wild__n">{String(k + 1).padStart(2, '0')}</span>
              <p>
                {m}
                {f('method', j)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="k1-wu__sec" aria-labelledby="k1-wu-r">
        <h2 id="k1-wu-r" className="k1-wu__h2">
          Result
        </h2>
        <div className="k1-wu__res">
          {r.result.map((m, j) => (
            <p key={j} data-k1-reveal className={j === 0 ? 'is-lead' : ''}>
              {m}
              {f('result', j)}
            </p>
          ))}
        </div>
      </section>

      <section className="k1-wu__sec" aria-labelledby="k1-wu-n">
        <h2 id="k1-wu-n" className="k1-wu__h2">
          What I’d do next
        </h2>
        <ul className="k1-more__list k1-wu__next">
          {r.next.map((m, j) => (
            <li key={j}>
              <p className="k1-more__a">
                <span className="k1-more__t">+</span>
                <span className="k1-more__l">
                  {m}
                  {f('next', j)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <CLink to={`${base}/research/${next.slug}`} label={next.title} className="k1-nextcase">
        <span className="k1-label">Next write-up</span>
        <span className="k1-nextcase__t">{next.title}</span>
        <span className="k1-nextcase__go" aria-hidden="true">
          <ArrowR size={28} />
        </span>
      </CLink>
    </article>
  )
}
