import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { research } from '../../content/site'
import { more, selected } from '../../content/curated'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { Logo } from '../../shared/Mark'
import { Badge } from './Panel'

// Write-ups in the same panel language: a head panel with the question, the full demo in its own panel, then the
// text beside a sticky spec card (where / when / data / tags).

const titleFor = (slug: string, fb: string) =>
  selected.find((s) => s.slug === slug)?.title ?? more.find((m) => m.href === `/research/${slug}`)?.title ?? fb
/** The steering write-up drops method line 3: it describes an assumed pipeline, not the replication that was run. */
const dropMethod: Record<string, number[]> = { 'activation-steering': [3] }
const prov: Record<string, { k: 'real' | 'ill'; t: string }[]> = {
  'activation-steering': [{ k: 'real', t: 'Real model outputs · replication run for this page' }],
  'loss-masking-distress': [
    { k: 'real', t: 'Exact loss weights · real Qwen2.5 tokens' },
    { k: 'ill', t: 'Illustrative conversation' },
  ],
  'ocean-sensing': [{ k: 'ill', t: 'Illustrative profile · R² 0.936 is real' }],
  'es-lora': [{ k: 'ill', t: 'Illustrative landscape' }],
  'billion-vector-retrieval': [{ k: 'ill', t: 'Illustrative index · numbers from the resume' }],
}

export function Article({ slug, base }: { slug: string; base: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const next = research[(i + 1) % research.length]
  const method = r.method.filter((_, j) => !dropMethod[slug]?.includes(j))
  const steering = slug === 'activation-steering'
  const where = steering ? 'Method replicated on Qwen2.5-1.5B-Instruct for this page' : r.where
  const mark = selected.find((s) => s.slug === slug)?.mark ?? (slug === 'billion-vector-retrieval' ? 'uvic' : undefined)
  const opts = r.demo === 'steering' ? { rest: 0.6 } : r.demo === 'lossmask' ? { finding: true } : {}

  return (
    <article className="h4-art" aria-labelledby="h4-art-t">
      <Link to={base || '/'} className="h4-link h4-crumb">
        <ArrowLeft size={14} aria-hidden="true" /> Back to the overview
      </Link>
      <header className="h4-art__head">
        <div>
          <div className="h4-meta">
            {mark && <Logo m={mark} w={mark === 'cfar' ? 64 : 20} h={20} />}
            <span>
              {where} · {r.when}
            </span>
          </div>
          <h1 id="h4-art-t">{titleFor(slug, r.title)}</h1>
          <p className="h4-art__q">{r.question}</p>
        </div>
      </header>

      {r.demo && (
        <div className="h4-art__fig">
          <Demo kind={r.demo} {...opts} />
        </div>
      )}

      <div className="h4-art__grid">
        <div className="h4-art__text">
          <section aria-labelledby="h4-m">
            <h2 id="h4-m">Method</h2>
            <ol>
              {method.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="h4-r">
            <h2 id="h4-r">Result</h2>
            {r.result.map((x) => (
              <p key={x}>{x}</p>
            ))}
            {steering && (
              <p className="h4-art__note">
                These numbers come from a replication of the method on Qwen2.5-1.5B-Instruct, run for this page. They are not results from my main
                steering project.
              </p>
            )}
          </section>
          <section aria-labelledby="h4-n">
            <h2 id="h4-n">What I’d do next</h2>
            <ul>
              {r.next.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="h4-spec" aria-label="Spec">
          <dl>
            <div>
              <dt>Where</dt>
              <dd>{where}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{r.when}</dd>
            </div>
            {prov[slug] && (
              <div>
                <dt>Data on this page</dt>
                <dd style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {prov[slug].map((p) => (
                    <Badge key={p.t} k={p.k}>
                      {p.t}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
            <div>
              <dt>Tags</dt>
              <dd>
                <ul className="h4-tags">
                  {r.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </dd>
            </div>
            {r.links && (
              <div>
                <dt>Links</dt>
                <dd>
                  {r.links.map((l) => (
                    <a key={l.href} className="h4-link" href={l.href} target="_blank" rel="noopener">
                      {l.label} <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      <Link to={`${base}/research/${next.slug}`} className="h4-next">
        <span>Next write-up</span>
        <b>{titleFor(next.slug, next.title)} →</b>
      </Link>
    </article>
  )
}
