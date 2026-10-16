import { research } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { more, selected } from './content'

// The write-up copy lives in site.ts and is shared with the lab. Main shows outcome titles, and drops the one steering
// method line that describes an assumed pipeline rather than the replication actually run (RESEARCH_CLAIMS #6).
const titleFor = (slug: string, fb: string) =>
  selected.find((s) => s.slug === slug)?.title ?? more.find((m) => m.href === `/research/${slug}`)?.title ?? fb
const dropMethod: Record<string, number[]> = { 'activation-steering': [3] }

export function Article({ slug }: { slug: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const next = research[(i + 1) % research.length]
  const method = r.method.filter((_, j) => !dropMethod[slug]?.includes(j))
  const opts = r.demo === 'steering' ? { rest: 0.6 } : r.demo === 'lossmask' ? { finding: true } : {}
  return (
    <article className="m-wrap m-article">
      <p className="m-crumb">
        <Link to="/#work" className="m-link">
          ← All work
        </Link>
      </p>
      <header>
        <h1 className="m-h1">{titleFor(slug, r.title)}</h1>
        <p className="m-context">
          {slug === 'activation-steering' ? 'Method replicated on Qwen2.5-1.5B-Instruct for this page' : r.where} · {r.when}
        </p>
      </header>

      <section aria-labelledby="q">
        <h2 id="q" className="m-h2">
          Question
        </h2>
        <p className="m-lede">{r.question}</p>
      </section>

      {r.demo && (
        <div className="m-fig m-article__fig" data-k={r.demo}>
          <Demo kind={r.demo} {...opts} />
        </div>
      )}

      <section aria-labelledby="m">
        <h2 id="m" className="m-h2">
          Method
        </h2>
        <ol className="m-steps">
          {method.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="r">
        <h2 id="r" className="m-h2">
          Result
        </h2>
        {r.result.map((x) => (
          <p key={x}>{x}</p>
        ))}
      </section>

      <section aria-labelledby="n">
        <h2 id="n" className="m-h2">
          What I’d do next
        </h2>
        <ul className="m-bullets">
          {r.next.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      {r.links && (
        <p className="m-article__links">
          {r.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener" className="m-link">
              {l.label} ↗
            </a>
          ))}
        </p>
      )}

      <nav className="m-pager" aria-label="Next write-up">
        <Link to={`/research/${next.slug}`}>
          <span>Next write-up</span>
          {titleFor(next.slug, next.title)} →
        </Link>
      </nav>
    </article>
  )
}
