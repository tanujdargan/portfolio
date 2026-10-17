import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, FileText, Linkedin, Mail } from 'lucide-react'
import { more, selected } from '../../content/curated'
import { beri, links, linkOrder, person, research } from '../../content/site'
import { Link } from '../../lib/router'
import { Poster } from '../../shared/Poster'
import { LinkIcon } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import type { WorkKey } from '../../content/work'
import { FeatHead } from './Features'
import { Key, Prov, Win } from './bits'

/* ------------------------------------------------------------------ Chronicle: card rail */

type Card =
  | { kind: 'poster'; k: WorkKey; title: string; line: string; meta: string; to: string; prov: string }
  | { kind: 'text'; title: string; lead: string; rest: string; to?: string; ext?: boolean; tone: string }

function cards(base: string): Card[] {
  const ocean = selected.find((x) => x.id === 'ocean')!
  return [
    { kind: 'poster', k: 'ocean', title: ocean.title, line: ocean.finding, meta: `${ocean.where} · ${ocean.when}`, to: `${base}/research/ocean-sensing`, prov: 'Preview illustrative · R² 0.936 real' },
    { kind: 'poster', k: 'retrieval', title: more[0].title, line: more[0].line, meta: 'DEIA Lab, UVic · 2025–26', to: `${base}${more[0].href}`, prov: 'Preview illustrative' },
    { kind: 'poster', k: 'es', title: more[1].title, line: more[1].line, meta: 'Independent · May 2026', to: `${base}${more[1].href}`, prov: 'Preview illustrative' },
    { kind: 'text', title: more[2].title, lead: 'Two prizes from 300+ teams,', rest: 'the YC Unicorn Prize and Federato Best RiskOps.', to: more[2].href, ext: true, tone: 'a' },
    { kind: 'text', title: more[3].title, lead: 'Silver medal, top 10% of 2,200 teams,', rest: 'at 54% accuracy on olympiad maths.', tone: 'b' },
    { kind: 'text', title: 'Beri', lead: 'A food app I’m building for iOS.', rest: 'The app, the backend and the design system.', to: `${base}/beri`, tone: 'c' },
  ]
}

export function More({ base }: { base: string }) {
  const rail = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState<[boolean, boolean]>([true, false])
  const onScroll = () => {
    const r = rail.current!
    setEdge([r.scrollLeft < 8, r.scrollLeft + r.clientWidth > r.scrollWidth - 8])
  }
  useEffect(onScroll, [])
  const by = (d: number) => {
    const r = rail.current!
    const w = (r.querySelector('li') as HTMLElement).offsetWidth + 20
    r.scrollBy({ left: d * w, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return (
    <section className="k2-more-sec" id="more" aria-labelledby="more-h">
      <FeatHead id="more" n="05" eyebrow="More work" a="Search at billion-vector scale, fine-tuning without gradients," b="ocean sensing, two hackathon prizes and a food app I’m building." />
      <ul className="k2-rail" ref={rail} onScroll={onScroll}>
        {cards(base).map((c) => {
          const inner =
            c.kind === 'poster' ? (
              <>
                <span className="k2-card__art">
                  <Poster k={c.k} />
                </span>
                <span className="k2-card__body">
                  <span className="k2-card__meta">{c.meta}</span>
                  <b className="k2-card__t">{c.title}</b>
                  <span className="k2-card__l">{c.line}</span>
                  <Prov tone="illus">{c.prov}</Prov>
                </span>
              </>
            ) : (
              <>
                <span className="k2-card__glow" data-tone={c.tone} aria-hidden="true" />
                <span className="k2-card__quote">
                  {c.lead} <span className="k2-dim">{c.rest}</span>
                </span>
                <span className="k2-card__foot">
                  <b>{c.title}</b>
                  {c.to && (c.ext ? <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" /> : <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />)}
                </span>
              </>
            )
          return (
            <li key={c.title} className="k2-card" data-kind={c.kind}>
              {c.kind === 'text' && c.ext ? (
                <a href={c.to} target="_blank" rel="noopener" className="k2-card__a">
                  {inner}
                </a>
              ) : c.to ? (
                <Link to={c.to} className="k2-card__a">
                  {inner}
                </Link>
              ) : (
                <div className="k2-card__a">{inner}</div>
              )}
            </li>
          )
        })}
      </ul>
      <div className="k2-rail__nav">
        <button className="k2-iconbtn" onClick={() => by(-1)} disabled={edge[0]} aria-label="Previous cards">
          <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <button className="k2-iconbtn" onClick={() => by(1)} disabled={edge[1]} aria-label="Next cards">
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ contact + footer */

export function Contact({ onPalette }: { onPalette: () => void }) {
  return (
    <section className="k2-contact" id="contact" aria-labelledby="contact-h">
      <p className="k2-eyebrow">Contact</p>
      <h2 id="contact-h" className="k2-h2 k2-h2--xl">
        Building ML systems, or studying what models represent? <span className="k2-dim">Let’s talk.</span>
      </h2>
      <div className="k2-cta">
        <a className="k2-btn k2-btn--light" href={links.resume.href} target="_blank" rel="noopener">
          <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
          Resume (PDF)
        </a>
        <a className="k2-btn" href={links.email.href}>
          <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
          {person.email}
        </a>
        <a className="k2-btn" href={links.linkedin.href} target="_blank" rel="noopener">
          <Linkedin size={16} strokeWidth={1.8} aria-hidden="true" />
          LinkedIn
        </a>
      </div>
      <button className="k2-hint k2-hint--btn" onClick={onPalette}>
        Or press <Key>⌘</Key>
        <Key>K</Key> and type what you’re looking for
      </button>
    </section>
  )
}

export function Footer({ base }: { base: string }) {
  return (
    <footer className="k2-foot">
      <div className="k2-foot__cols">
        <div>
          <p className="k2-foot__h">Work</p>
          <ul>
            <li>
              <Link to={`${base}/#amazon`}>Amazon planning assistant</Link>
            </li>
            <li>
              <Link to={`${base}/#marmotsat`}>MarmotSat firmware</Link>
            </li>
            <li>
              <Link to={`${base}/research/loss-masking-distress`}>Loss masking</Link>
            </li>
            <li>
              <Link to={`${base}/research/activation-steering`}>Activation steering</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="k2-foot__h">Research</p>
          <ul>
            {research
              .filter((r) => !['loss-masking-distress', 'activation-steering'].includes(r.slug))
              .map((r) => (
                <li key={r.slug}>
                  <Link to={`${base}/research/${r.slug}`}>{r.short.split(',')[0]}</Link>
                </li>
              ))}
            <li>
              <Link to={`${base}/beri`}>Beri</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="k2-foot__h">Contact</p>
          <ul>
            {linkOrder.map((k) => (
              <li key={k}>
                <a href={links[k].href} {...(k === 'email' ? {} : { target: '_blank', rel: 'noopener' })}>
                  <LinkIcon k={k} size={14} /> {k === 'resume' ? 'Resume (PDF)' : links[k].label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="k2-foot__word" aria-hidden="true">
        Tanuj Dargan
      </p>
      <p className="k2-foot__small">
        <span>{person.location}</span>
        <span>Hero still rendered in Blender for this page</span>
      </p>
    </footer>
  )
}

/* ------------------------------------------------------------------ research write-up */

const sections = [
  { id: 'question', label: 'Question' },
  { id: 'method', label: 'Method' },
  { id: 'result', label: 'Result' },
  { id: 'next', label: 'Next' },
]

export function ResearchPage({ slug, base }: { slug: string; base: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const [on, setOn] = useState('question')
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(`k2-${s.id}`)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setOn(vis[0].target.id.slice(3))
      },
      { rootMargin: '-20% 0px -60% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [slug])
  // On the steering write-up, method line 3 describes an assumed pipeline; it's dropped here.
  const method = r.method.map((t, k) => ({ t, k })).filter((x) => !(slug === 'activation-steering' && x.k === 3))
  const prev = research[(i - 1 + research.length) % research.length]
  const next = research[(i + 1) % research.length]
  const replicated = slug === 'activation-steering'
  return (
    <article className="k2-doc" aria-labelledby="k2-doc-h">
      <header className="k2-doc__head">
        <nav className="k2-crumb" aria-label="Breadcrumb">
          <Link to={`${base}/`}>Home</Link>
          <span aria-hidden="true">/</span>
          <span>Research</span>
        </nav>
        <div className="k2-tags">
          {r.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <h1 id="k2-doc-h" className="k2-doc__h1">
          {r.title}
        </h1>
        <dl className="k2-doc__meta">
          <div>
            <dt>Where</dt>
            <dd>{replicated ? 'Method replicated on Qwen2.5-1.5B-Instruct for this page' : r.where}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>{r.when}</dd>
          </div>
          {r.links?.map((l) => (
            <div key={l.href}>
              <dt>Link</dt>
              <dd>
                <a className="k2-link" href={l.href} target="_blank" rel="noopener">
                  {l.label}
                </a>
              </dd>
            </div>
          ))}
        </dl>
        {r.unverified?.map((u) => <Flag key={u} note={u} />)}
      </header>
      {r.demo && (
        <div className="k2-doc__demo">
          <Demo kind={r.demo} finding />
        </div>
      )}
      <div className="k2-doc__body">
        <nav className="k2-toc" aria-label="On this page">
          <p className="k2-toc__h">On this page</p>
          <ol>
            {sections.map((s) => (
              <li key={s.id} data-on={on === s.id || undefined}>
                <a href={`#k2-${s.id}`} aria-current={on === s.id ? 'location' : undefined}>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="k2-doc__main">
          <section id="k2-question" aria-labelledby="k2-q-h">
            <h2 id="k2-q-h" className="k2-doc__h2">
              Question
            </h2>
            <p className="k2-doc__lead">
              {r.question}
              {r.flags?.question?.[0] && <Flag note={r.flags.question[0]} />}
            </p>
          </section>
          <section id="k2-method" aria-labelledby="k2-m-h">
            <h2 id="k2-m-h" className="k2-doc__h2">
              Method
            </h2>
            <ol className="k2-doc__steps">
              {method.map(({ t, k }, n) => (
                <li key={k}>
                  <Key>{n + 1}</Key>
                  <p>
                    {t}
                    {r.flags?.method?.[k] && <Flag note={r.flags.method[k]} />}
                  </p>
                </li>
              ))}
            </ol>
          </section>
          <section id="k2-result" aria-labelledby="k2-r-h">
            <h2 id="k2-r-h" className="k2-doc__h2">
              Result
            </h2>
            <ul className="k2-doc__results">
              {r.result.map((t, k) => (
                <li key={k}>
                  <span className="k2-doc__check" aria-hidden="true">
                    <Check size={14} strokeWidth={2.2} />
                  </span>
                  <p>
                    {t}
                    {r.flags?.result?.[k] && <Flag note={r.flags.result[k]} />}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section id="k2-next" aria-labelledby="k2-n-h">
            <h2 id="k2-n-h" className="k2-doc__h2">
              Next
            </h2>
            <ul className="k2-doc__next">
              {r.next.map((t, k) => (
                <li key={k}>
                  {t}
                  {r.flags?.next?.[k] && <Flag note={r.flags.next[k]} />}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <nav className="k2-doc__pn" aria-label="More research">
        <Link to={`${base}/research/${prev.slug}`} className="k2-doc__pnl">
          <span className="k2-mono k2-dim3">
            <ArrowLeft size={13} strokeWidth={1.8} aria-hidden="true" /> Previous
          </span>
          <b>{prev.title}</b>
        </Link>
        <Link to={`${base}/research/${next.slug}`} className="k2-doc__pnl k2-doc__pnl--r">
          <span className="k2-mono k2-dim3">
            Next <ArrowRight size={13} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <b>{next.title}</b>
        </Link>
      </nav>
    </article>
  )
}

/* ------------------------------------------------------------------ Beri + not found */

export function BeriPage({ base }: { base: string }) {
  return (
    <article className="k2-doc k2-beri" aria-labelledby="k2-beri-h">
      <header className="k2-doc__head">
        <nav className="k2-crumb" aria-label="Breadcrumb">
          <Link to={`${base}/`}>Home</Link>
          <span aria-hidden="true">/</span>
          <span>Beri</span>
        </nav>
        <div className="k2-tags">
          {beri.stack.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <h1 id="k2-beri-h" className="k2-doc__h1">
          Beri <span className="k2-dim">is a food app I’m building for iOS.</span>
        </h1>
        <p className="k2-doc__lead">{beri.oneLiner}</p>
        <p className="k2-doc__lead k2-dim">{beri.role}</p>
        <div className="k2-cta k2-cta--left">
          <a className="k2-btn k2-btn--light" href={beri.url} target="_blank" rel="noopener">
            getberi.com <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
          </a>
        </div>
      </header>
      <div className="k2-beri__body">
        <BeriCaseStudy base={base} />
      </div>
    </article>
  )
}

export function NotFound({ base, onPalette }: { base: string; onPalette: () => void }) {
  return (
    <section className="k2-404" aria-labelledby="k2-404-h">
      <Win title="Tanuj" className="k2-404__win">
        <div className="k2-404__in">
          <p className="k2-mono k2-dim3">404</p>
          <h1 id="k2-404-h" className="k2-h2">
            No results for this page. <span className="k2-dim">Try the home page or search.</span>
          </h1>
          <div className="k2-cta k2-cta--left">
            <Link className="k2-btn k2-btn--light" to={`${base}/`}>
              Home
            </Link>
            <button className="k2-btn" onClick={onPalette}>
              Search <Key>⌘</Key>
              <Key>K</Key>
            </button>
            <a className="k2-btn" href={links.resume.href} target="_blank" rel="noopener">
              Resume (PDF)
            </a>
          </div>
        </div>
      </Win>
    </section>
  )
}
