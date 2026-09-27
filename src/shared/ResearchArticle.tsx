import { research } from '../content/site'
import { Demo } from '../demos/Demo'
import { Link } from '../lib/router'
import { Flag } from './Flag'
import './shared.css'

/**
 * A research write-up: question, method, result, what I'd do next.
 * Structure and copy are shared; every visual comes from the host variant's tokens.
 */
export function ResearchArticle({ slug, base }: { slug: string; base: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const prev = research[(i - 1 + research.length) % research.length]
  const next = research[(i + 1) % research.length]
  return (
    <article className="s-article">
      <header className="s-article__head">
        <p className="s-kicker">
          <Link to={`${base}/#research`}>Research</Link> · {r.where} · {r.when}
        </p>
        <h1 className="s-article__title">{r.title}</h1>
        <ul className="s-tags">
          {r.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </header>

      <section className="s-sec" id="question">
        <h2 className="s-h2">Question</h2>
        <p className="s-lede">{r.question}</p>
      </section>

      {r.demo && (
        <div className="s-figure">
          <Demo kind={r.demo} />
        </div>
      )}

      <section className="s-sec" id="method">
        <h2 className="s-h2">Method</h2>
        <ol className="s-steps">
          {r.method.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ol>
      </section>

      <section className="s-sec" id="result">
        <h2 className="s-h2">
          Result
          {r.unverified?.length ? <Flag note={r.unverified.join(' ')} /> : null}
        </h2>
        {r.result.map((m) => (
          <p key={m} className="s-p">
            {m}
          </p>
        ))}
      </section>

      <section className="s-sec" id="next">
        <h2 className="s-h2">What I'd do next</h2>
        <ul className="s-bullets">
          {r.next.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      {r.links && (
        <p className="s-p s-links">
          {r.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener">
              {l.label} ↗
            </a>
          ))}
        </p>
      )}

      <nav className="s-pager" aria-label="More research">
        <Link to={`${base}/research/${prev.slug}`}>
          <span>Previous</span>
          {prev.short}
        </Link>
        <Link to={`${base}/research/${next.slug}`}>
          <span>Next</span>
          {next.short}
        </Link>
      </nav>
    </article>
  )
}
