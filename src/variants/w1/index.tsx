/*
 * W1 · Room. Tanuj's desk at night, modelled and light-baked in Blender (public/w1/src/room.py), in the spirit of
 * Henry Heffernan's room (the monitor is the real site) and Jesse Zhou's diorama (signposts as the menu).
 *
 * First paint is SSR: a poster still of the room plus a DOM panel with the thesis, the three proofs and Resume /
 * Email / LinkedIn. The baked GLB streams in after first input or idle and crossfades over the still. Every object is
 * also a DOM button. The monitor's DOM is mapped onto the 3D screen with a CSS matrix3d; "Open the screen" dollies the
 * camera until the screen fills the view, then the full OS takes over.
 *
 * Facts: src/content (curated.ts, site.ts) only. Reduced motion / no WebGL: the still, with the same pins and sheets.
 */
import type { ReactNode } from 'react'
import type { VariantProps } from '../../routes'
import { research } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { OS } from './os'
import { Room } from './room'
import './w1.css'

export default function Variant({ page, base }: VariantProps) {
  if (page.kind === 'research') return <Page base={base} app="research" title="Research"><Article slug={page.slug} base={base} /></Page>
  if (page.kind === 'beri') return <Page base={base} app="about" title="Beri"><div className="w1-app w1-app--beri"><BeriCaseStudy base={base} /></div></Page>
  if (page.kind === 'notfound') return <Room base={base} notFound />
  return <Room base={base} />
}

/** A write-up or case study: the OS, full screen, over a dimmed still of the room. */
function Page({ base, app, title, children }: { base: string; app: 'research' | 'about'; title: string; children: ReactNode }) {
  return (
    <div className="w1 w1--page">
      <a className="w1-skip" href="#w1-article">
        Skip to content
      </a>
      <div className="w1-pageback" aria-hidden="true">
        <div className="w1-cover w1-cover--wide">
          <img src="/w1/poster-wide.webp" width={1440} height={900} alt="" decoding="async" />
        </div>
        <div className="w1-cover w1-cover--tall">
          <img src="/w1/poster-tall.webp" width={780} height={1688} alt="" decoding="async" />
        </div>
      </div>
      <OS base={base} app={app} phase="open" sky={null} standalone title={title}>
        <main id="w1-article" tabIndex={-1}>
          {children}
        </main>
      </OS>
    </div>
  )
}

const SECTIONS = [
  ['question', 'Question'],
  ['method', 'Method'],
  ['result', 'Result'],
  ['next', 'What I’d do next'],
] as const

function Article({ slug, base }: { slug: string; base: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const prev = research[(i - 1 + research.length) % research.length]
  const next = research[(i + 1) % research.length]
  // The steering write-up drops method line 3 (an assumed pipeline shape, not something that was run).
  const method = r.slug === 'activation-steering' ? r.method.filter((_, j) => j !== 3) : r.method
  return (
    <article className="w1-app w1-article">
      <header className="w1-app__head">
        <p className="w1-kicker">
          <Link to={`${base}/#research`}>Research</Link> · {r.where} · {r.when}
        </p>
        <h1 className="w1-app__title w1-article__title">{r.title}</h1>
        <ul className="w1-tags">
          {r.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <nav className="w1-toc" aria-label="On this page">
          {SECTIONS.map(([id, l], k) => (
            <a key={id} href={`#w1-${id}`}>
              <span>{String(k + 1).padStart(2, '0')}</span> {l}
            </a>
          ))}
        </nav>
      </header>

      <section className="w1-sec" id="w1-question" aria-labelledby="w1-q">
        <h2 className="w1-h3" id="w1-q">
          Question
        </h2>
        <p className="w1-article__q">{r.question}</p>
      </section>

      {r.demo && (
        <div className="w1-figure">
          <Demo kind={r.demo} finding={r.demo === 'lossmask'} rest={r.demo === 'steering' ? 0.6 : undefined} />
        </div>
      )}

      <section className="w1-sec" id="w1-method" aria-labelledby="w1-m">
        <h2 className="w1-h3" id="w1-m">
          Method
        </h2>
        <ol className="w1-steps">
          {method.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ol>
      </section>

      <section className="w1-sec" id="w1-result" aria-labelledby="w1-r">
        <h2 className="w1-h3" id="w1-r">
          Result
        </h2>
        {r.slug === 'activation-steering' && <p className="w1-note">A method replicated on Qwen2.5-1.5B-Instruct for this page.</p>}
        {r.result.map((m) => (
          <p key={m} className="w1-article__p">
            {m}
          </p>
        ))}
      </section>

      <section className="w1-sec" id="w1-next" aria-labelledby="w1-n">
        <h2 className="w1-h3" id="w1-n">
          What I’d do next
        </h2>
        <ul className="w1-bullets">
          {r.next.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        {r.links && (
          <p className="w1-actions">
            {r.links.map((l) => (
              <a key={l.href} className="w1-btn w1-btn--ghost" href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </p>
        )}
      </section>

      <nav className="w1-pn" aria-label="More write-ups">
        <Link to={`${base}/research/${prev.slug}`}>
          <span>Previous</span>
          <b>{prev.title}</b>
        </Link>
        <Link to={`${base}/research/${next.slug}`}>
          <span>Next</span>
          <b>{next.title}</b>
        </Link>
      </nav>
    </article>
  )
}
