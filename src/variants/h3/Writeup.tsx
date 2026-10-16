import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { research } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'

/** A write-up, laid out like the opened objects: spec card, the real demo, then a numbered method list. */
export function Writeup({ slug, base }: { slug: string; base: string }) {
  const r = research.find((x) => x.slug === slug)!
  const steer = slug === 'activation-steering'
  // Method line 3 on activation-steering describes an unverified pipeline; it isn't shown.
  const method = steer ? r.method.filter((_, i) => i !== 3) : r.method
  const others = research.filter((x) => x.slug !== slug)
  return (
    <article className="h3-wu">
      <Link to={`${base}/`} className="h3-btn h3-btn--ghost h3-wu__back">
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        Back to the bench
      </Link>
      <header className="h3-wu__head">
        <p className="h3-eyebrow">
          {r.where} · {r.when}
        </p>
        <h1>{r.title}</h1>
        <p className="h3-wu__q">{r.question}</p>
        <ul className="h3-wu__tags" aria-label="Topics">
          {r.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </header>

      {r.demo && (
        <section className="h3-wu__demo" aria-label="Demo">
          {steer && <p className="h3-sheet__note">Method replicated on Qwen2.5-1.5B-Instruct for this page. Every output is a cached real decode.</p>}
          {r.demo === 'steering' ? <Demo kind="steering" rest={0.6} /> : r.demo === 'lossmask' ? <Demo kind="lossmask" finding /> : <Demo kind={r.demo} />}
        </section>
      )}

      <section className="h3-wu__sec" aria-labelledby="h3-wu-m">
        <h2 id="h3-wu-m">Method</h2>
        <ol className="h3-wu__steps">
          {method.map((m, i) => (
            <li key={i}>
              <span className="h3-steps__n">{String(i + 1).padStart(2, '0')}</span>
              <p>{m}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="h3-wu__sec" aria-labelledby="h3-wu-r">
        <h2 id="h3-wu-r">Result</h2>
        {steer && <p className="h3-wu__scope">These results come from the method replicated on Qwen2.5-1.5B-Instruct for this page, not from the main project.</p>}
        <div className="h3-wu__prose">
          {r.result.map((m, i) => (
            <p key={i}>{m}</p>
          ))}
        </div>
      </section>

      <section className="h3-wu__sec" aria-labelledby="h3-wu-n">
        <h2 id="h3-wu-n">Next</h2>
        <ul className="h3-wu__next">
          {r.next.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </section>

      {r.links && (
        <section className="h3-wu__sec" aria-labelledby="h3-wu-l">
          <h2 id="h3-wu-l">Links</h2>
          <ul className="h3-wu__links">
            {r.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener" className="h3-btn h3-btn--ghost">
                  {l.label}
                  <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="h3-wu__other" aria-label="Other write-ups">
        <h2>Other write-ups</h2>
        <ul className="h3-cards">
          {others.map((o) => (
            <li key={o.slug}>
              <Link className="h3-card" to={`${base}/research/${o.slug}`}>
                <b>{o.title}</b>
                <span>{o.short}</span>
                <ArrowUpRight className="h3-cards__go" size={16} strokeWidth={1.6} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  )
}
