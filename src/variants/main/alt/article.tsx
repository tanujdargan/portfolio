import { useEffect, useState, type ComponentType } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { research } from '../../../content/site'
import { Demo } from '../../../demos/Demo'
import { Link } from '../../../lib/router'
import { more, selected } from '../content'
import './article.css'

// Versions 2–4 of this section for the review round. Version 1 is the current one in Home/index/Article.
// Reached at /gate/article2 … /gate/article4 (/gate/article2/research/<slug>).
export type Props = { slug: string }

/* Same copy rules as v1 (Article.tsx): outcome titles, the steering method line 3 dropped (an assumed pipeline, not the
   replication run), steering labelled as a replication, steering rests at α 0.6 and loss masking opens on the finding. */
const titleFor = (slug: string, fb: string) =>
  selected.find((s) => s.slug === slug)?.title ?? more.find((m) => m.href === `/research/${slug}`)?.title ?? fb
const dropMethod: Record<string, number[]> = { 'activation-steering': [3] }

// Where the demo sits relative to the result text differs per version, so the one "(the demo above)" pointer follows it.
const pointTo = (xs: string[], where: string) => xs.map((x) => x.replace('(the demo above)', where))

function useWriteup(slug: string) {
  const i = Math.max(0, research.findIndex((r) => r.slug === slug))
  const r = research[i]
  const next = research[(i + 1) % research.length]
  return {
    r,
    title: titleFor(r.slug, r.title),
    context: r.slug === 'activation-steering' ? 'Method replicated on Qwen2.5-1.5B-Instruct for this page' : r.where,
    method: r.method.filter((_, j) => !dropMethod[r.slug]?.includes(j)),
    opts: r.demo === 'steering' ? { rest: 0.6 } : r.demo === 'lossmask' ? { finding: true } : {},
    next,
    nextTitle: titleFor(next.slug, next.title),
  }
}

function Back({ cls }: { cls: string }) {
  return (
    <Link to="/#work" className={cls}>
      <ArrowLeft size={16} aria-hidden="true" />
      All work
    </Link>
  )
}

function Pager({ cls, to, title }: { cls: string; to: string; title: string }) {
  return (
    <nav className={cls} aria-label="Next write-up">
      <Link to={`/research/${to}`}>
        <span>Next write-up</span>
        <b>
          {title} <ArrowRight size={16} aria-hidden="true" />
        </b>
      </Link>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* 2 · Paper. A centred paper: title and byline, an abstract box that
   gives the question and the result first, the demo as Figure 1 with a
   caption, then numbered Method and Next sections and references.      */

function Paper({ slug }: Props) {
  const { r, title, context, method, opts, next, nextTitle } = useWriteup(slug)
  return (
    <article className="m-wrap m-ar2">
      <div className="m-ar2-col">
        <Back cls="m-ar2-back" />
        <header className="m-ar2-head">
          <h1 className="m-h1">{title}</h1>
          <p className="m-ar2-by">
            {context} · {r.when}
          </p>
        </header>

        <section className="m-ar2-abstract" aria-labelledby="ar2-abs">
          <h2 id="ar2-abs">Abstract</h2>
          <p>
            <strong>Question. </strong>
            {r.question}
          </p>
          {r.result.map((x, j) => (
            <p key={x}>
              {j === 0 && <strong>Result. </strong>}
              {x}
            </p>
          ))}
          <p className="m-ar2-kw">{r.tags.join(', ')}</p>
        </section>
      </div>

      {r.demo && (
        <figure className="m-ar2-figure">
          <div className="m-fig" data-k={r.demo}>
            <Demo kind={r.demo} {...opts} />
          </div>
          <figcaption>
            <strong>Figure 1.</strong> {r.short}.
          </figcaption>
        </figure>
      )}

      <div className="m-ar2-col">
        <section className="m-ar2-sec" aria-labelledby="ar2-m">
          <h2 id="ar2-m">
            <span>1</span> Method
          </h2>
          <ol className="m-ar2-steps">
            {method.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </section>

        <section className="m-ar2-sec" aria-labelledby="ar2-n">
          <h2 id="ar2-n">
            <span>2</span> What I’d do next
          </h2>
          <ul className="m-ar2-bullets">
            {r.next.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        {r.links && (
          <section className="m-ar2-sec m-ar2-refs" aria-labelledby="ar2-ref">
            <h2 id="ar2-ref">References</h2>
            <ol>
              {r.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener" className="m-link">
                    {l.label}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        <Pager cls="m-ar2-pager" to={next.slug} title={nextTitle} />
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* 3 · Side by side. On desktop the text runs in a left column and the
   demo stays pinned in its own right column while you read the method
   and result, so the figure is always beside the words about it. On a
   phone it collapses to one column with the demo after the question.  */

function Split({ slug }: Props) {
  const { r, title, context, method, opts, next, nextTitle } = useWriteup(slug)
  return (
    <article className={`m-wrap m-ar3${r.demo ? '' : ' m-ar3--solo'}`}>
      <div className="m-ar3-head">
        <Back cls="m-ar3-back" />
        <header>
          <h1 className="m-h1">{title}</h1>
          <p className="m-ar3-ctx">
            {context} · {r.when}
          </p>
          <ul className="m-ar3-tags" aria-label="Topics">
            {r.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </header>
        <section className="m-ar3-sec" aria-labelledby="ar3-q">
          <h2 id="ar3-q">Question</h2>
          <p className="m-ar3-q">{r.question}</p>
        </section>
      </div>

      {r.demo && (
        <div className="m-ar3-aside">
          <div className="m-ar3-pin m-fig" data-k={r.demo}>
            <Demo kind={r.demo} {...opts} />
          </div>
        </div>
      )}

      <div className="m-ar3-body">
        <section className="m-ar3-sec" aria-labelledby="ar3-m">
          <h2 id="ar3-m">Method</h2>
          <ol className="m-ar3-steps">
            {method.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </section>
        <section className="m-ar3-sec" aria-labelledby="ar3-r">
          <h2 id="ar3-r">Result</h2>
          {pointTo(r.result, '(the demo)').map((x) => (
            <p key={x}>{x}</p>
          ))}
        </section>
        <section className="m-ar3-sec" aria-labelledby="ar3-n">
          <h2 id="ar3-n">What I’d do next</h2>
          <ul className="m-ar3-bullets">
            {r.next.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        {r.links && (
          <p className="m-ar3-links">
            {r.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener" className="m-link">
                {l.label}
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            ))}
          </p>
        )}
        <Pager cls="m-ar3-pager" to={next.slug} title={nextTitle} />
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* 4 · Result first. A short labelled header (context, date, topics,
   links), then the result in its own card before anything else, then
   the demo, question, method and next. A table of contents sits in the
   left margin on desktop and marks the section you're reading.         */

function ResultFirst({ slug }: Props) {
  const { r, title, context, method, opts, next, nextTitle } = useWriteup(slug)
  const toc = [
    ['ar4-r', 'Result'],
    ...(r.demo ? [['ar4-f', 'Demo']] : []),
    ['ar4-q', 'Question'],
    ['ar4-m', 'Method'],
    ['ar4-n', 'What I’d do next'],
  ] as [string, string][]
  const [on, setOn] = useState<string | null>(null)
  useEffect(() => {
    const els = toc.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setOn(vis[0].target.id)
      },
      { rootMargin: '-20% 0px -55% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return (
    <article className="m-wrap m-ar4">
      <nav className="m-ar4-toc" aria-label="On this page">
        <ol>
          {toc.map(([id, l]) => (
            <li key={id}>
              <a href={`#${id}`} aria-current={on === id ? 'location' : undefined}>
                {l}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="m-ar4-main">
        <Back cls="m-ar4-back" />
        <header className="m-ar4-head">
          <h1 className="m-h1">{title}</h1>
          <dl className="m-ar4-spec">
            <div>
              <dt>Context</dt>
              <dd>{context}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{r.when}</dd>
            </div>
            <div>
              <dt>Topics</dt>
              <dd>{r.tags.join(', ')}</dd>
            </div>
            {r.links && (
              <div>
                <dt>Links</dt>
                <dd>
                  {r.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener" className="m-link">
                      {l.label}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </header>

        <section id="ar4-r" className="m-ar4-result" aria-labelledby="ar4-rh">
          <h2 id="ar4-rh">Result</h2>
          {pointTo(r.result, '(the demo below)').map((x) => (
            <p key={x}>{x}</p>
          ))}
        </section>

        {r.demo && (
          <section id="ar4-f" className="m-ar4-fig" aria-label="Demo">
            <div className="m-fig" data-k={r.demo}>
              <Demo kind={r.demo} {...opts} />
            </div>
          </section>
        )}

        <section id="ar4-q" className="m-ar4-sec" aria-labelledby="ar4-qh">
          <h2 id="ar4-qh">Question</h2>
          <p>{r.question}</p>
        </section>
        <section id="ar4-m" className="m-ar4-sec" aria-labelledby="ar4-mh">
          <h2 id="ar4-mh">Method</h2>
          <ol className="m-ar4-steps">
            {method.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </section>
        <section id="ar4-n" className="m-ar4-sec" aria-labelledby="ar4-nh">
          <h2 id="ar4-nh">What I’d do next</h2>
          <ul className="m-ar4-bullets">
            {r.next.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        <Pager cls="m-ar4-pager" to={next.slug} title={nextTitle} />
      </div>
    </article>
  )
}

export const versions: Record<string, ComponentType<Props>> = { '2': Paper, '3': Split, '4': ResultFirst }
