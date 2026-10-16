import { useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { more, selected } from '../../content/curated'
import { research } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { CONCEPTS, Steer, type Concept } from './Steer'

// Write-ups as explorable figures (Ciechanowski, Distill): prose, then a figure you work, then prose. A control's name
// in the sentence wears the control's colour; hovering it rings the control. Steering numbers are the replication run
// for this page, and the method line that describes an assumed pipeline (activation-steering #3) is dropped.

const titleFor = (slug: string, fb: string) =>
  selected.find((s) => s.slug === slug)?.title ?? more.find((m) => m.href === `/research/${slug}`)?.title ?? fb
const dropMethod: Record<string, number[]> = { 'activation-steering': [3] }
const resultFor = (slug: string) => selected.find((s) => s.slug === slug)?.result

/** A control's name in prose. Colour-keyed; hover or focus rings the matching control in the figure. */
function Ctl({ k, children, onHl, onClick }: { k: string; children: ReactNode; onHl: (k: string | null) => void; onClick?: () => void }) {
  const props = {
    className: 'h1-ctl',
    'data-k': k,
    onMouseEnter: () => onHl(k),
    onMouseLeave: () => onHl(null),
    onFocus: () => onHl(k),
    onBlur: () => onHl(null),
  }
  return onClick ? (
    <button type="button" {...props} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span {...props}>{children}</span>
  )
}

export function Article({ slug, base }: { slug: string; base: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const next = research[(i + 1) % research.length]
  const method = r.method.filter((_, j) => !dropMethod[slug]?.includes(j))
  const [hl, setHl] = useState<string | null>(null)
  const [concept, setConcept] = useState<Concept>('joy')
  const steering = slug === 'activation-steering'
  const where = steering ? 'Method replicated on Qwen2.5-1.5B-Instruct for this page' : r.where
  const result = resultFor(slug)

  const howTo: Record<string, ReactNode> = {
    'activation-steering': (
      <>
        Drag{' '}
        <Ctl k="alpha" onHl={setHl}>
          α
        </Ctl>{' '}
        to add the direction to the residual stream, in multiples of its norm. Switch the concept between{' '}
        {CONCEPTS.map((c, j) => (
          <span key={c}>
            <Ctl k={c} onHl={setHl} onClick={() => setConcept(c)}>
              {c}
            </Ctl>
            {j === 0 ? ', ' : j === 1 ? ' and ' : ''}
          </span>
        ))}
        , or try{' '}
        <Ctl k="prompt" onHl={setHl}>
          another prompt
        </Ctl>
        . Every output is a real greedy decode from the replication run, cached.
      </>
    ),
    'loss-masking-distress': (
      <>
        Pick a{' '}
        <Ctl k="regime" onHl={setHl}>
          loss regime
        </Ctl>{' '}
        to see which tokens carry the training signal, or set{' '}
        <Ctl k="lp" onHl={setHl}>
          λp
        </Ctl>
        , the prompt-token weight, by hand. The tokens and weights are exact; the conversation is illustrative.
      </>
    ),
    'es-lora': (
      <>
        Drag{' '}
        <Ctl k="range" onHl={setHl}>
          σ
        </Ctl>
        , the perturbation size, and watch the population. This is an illustrative landscape, not the GSM8K run.
      </>
    ),
    'billion-vector-retrieval': (
      <>
        Raise{' '}
        <Ctl k="range" onHl={setHl}>
          nprobe
        </Ctl>
        , the number of inverted lists each query reads, and watch recall trade against work. Illustrative: 24,000 points stand in for a
        billion.
      </>
    ),
    'ocean-sensing': (
      <>
        Move the{' '}
        <Ctl k="range" onHl={setHl}>
          probe depth
        </Ctl>{' '}
        to compare a prediction with a sensor. The readings are illustrative; the real model scored R² 0.936.
      </>
    ),
  }

  return (
    <article className="h1-art h1-wrap" data-hl={hl ?? undefined}>
      <p className="h1-crumb">
        <Link to={`${base}/#work`} className="h1-a">
          <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" /> Work
        </Link>
      </p>
      <header className="h1-art__head">
        <h1 className="h1-art__title" style={{ viewTransitionName: `h1-t-${slug}` }}>
          {titleFor(slug, r.title)}
        </h1>
        <dl className="h1-spec h1-art__spec">
          <div>
            <dt>Where</dt>
            <dd>{where}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>{r.when}</dd>
          </div>
          {result && (
            <div>
              <dt>Result</dt>
              <dd>{result}</dd>
            </div>
          )}
        </dl>
      </header>

      <section className="h1-art__sec" aria-labelledby="h1-q">
        <h2 id="h1-q">Question</h2>
        <p className="h1-art__lede">{r.question}</p>
      </section>

      <section className="h1-art__sec" aria-labelledby="h1-m">
        <h2 id="h1-m">Method</h2>
        <ol className="h1-art__steps">
          {method.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      </section>

      {r.demo && (
        <figure className="h1-art__fig" data-k={r.demo}>
          <figcaption className="h1-art__how">{howTo[slug]}</figcaption>
          {steering ? (
            <Steer concept={concept} onConcept={setConcept} hl={hl} />
          ) : (
            <div className="h1-fig" data-hl={hl ?? undefined}>
              <Demo kind={r.demo} {...(r.demo === 'lossmask' ? { finding: true } : {})} />
            </div>
          )}
        </figure>
      )}

      <section className="h1-art__sec" aria-labelledby="h1-r">
        <h2 id="h1-r">Result</h2>
        {steering && (
          <p className="h1-art__note">
            These numbers come from a replication of the method on Qwen2.5-1.5B-Instruct, run for this page. They are not the main project’s
            results.
          </p>
        )}
        {r.result.map((x) => (
          <p key={x}>{x}</p>
        ))}
      </section>

      <section className="h1-art__sec" aria-labelledby="h1-n">
        <h2 id="h1-n">What I’d do next</h2>
        <ul className="h1-bullets">
          {r.next.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      {r.links && (
        <p className="h1-art__links">
          {r.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener" className="h1-a">
              {l.label} ↗
            </a>
          ))}
        </p>
      )}

      <nav className="h1-art__next" aria-label="Next write-up">
        <Link to={`${base}/research/${next.slug}`} className="h1-row h1-mrow__in">
          <span className="h1-mrow__title">
            <span className="h1-art__nextk">Next write-up</span>
            {titleFor(next.slug, next.title)}
          </span>
          <span className="h1-mrow__go" aria-hidden="true">
            <ArrowRight size={16} strokeWidth={1.8} />
          </span>
        </Link>
      </nav>
    </article>
  )
}
