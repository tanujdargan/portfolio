// Write-up pages, Beri and not-found: quiet, readable pages that share the hilltop's night palette.
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { research, person, beri as beriFacts } from '../../content/site'
import { Contact } from './Sheets'

function Top({ base }: { base: string }) {
  return (
    <header className="x1-top">
      <Link className="x1-back" to={base || '/'}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to the hilltop</span>
      </Link>
      <span className="x1-top__name">{person.name}</span>
    </header>
  )
}

function Horizon() {
  return (
    <svg className="x1-horizon" viewBox="0 0 1600 120" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 96 L90 82 L170 88 L260 70 L330 77 L420 58 L480 66 L560 46 L640 62 L720 52 L790 66 L880 42 L960 58 L1040 48 L1130 66 L1210 58 L1300 74 L1400 66 L1500 80 L1600 76 L1600 120 L0 120 Z" />
    </svg>
  )
}

const DEMO_NOTE: Record<string, string> = {
  'activation-steering': 'The demo replays real cached outputs. The method was replicated on Qwen2.5-1.5B-Instruct for this page; it is not my main project.',
  'ocean-sensing': 'The probe demo is illustrative. The real number is R² 0.936.',
  'loss-masking-distress': 'The conversation is illustrative; the tokens and loss weights are exact.',
}

export function Article({ slug, base }: { slug: string; base: string }) {
  const r = research.find((x) => x.slug === slug)!
  // activation-steering method line 3 describes an unverified pipeline shape; it is left out on purpose
  const method = slug === 'activation-steering' ? r.method.filter((_, i) => i !== 3) : r.method
  const others = research.filter((x) => x.slug !== slug).slice(0, 4)
  return (
    <div className="x1 x1-page" data-lab={base.startsWith("/lab") || undefined}>
      <a className="x1-skip" href="#x1-main">
        Skip to content
      </a>
      <Top base={base} />
      <main id="x1-main" className="x1-article">
        <div className="x1-article__hero">
          <p className="x1-kicker">
            <span>
              {r.where} · {r.when}
            </span>
          </p>
          <h1>{r.title}</h1>
          <p className="x1-article__q">{r.question}</p>
          {slug === 'activation-steering' && (
            <p className="x1-tag">
              <span className="x1-prov">Replication</span> The numbers on this page come from the method replicated on Qwen2.5-1.5B-Instruct for this page, not from my
              main project.
            </p>
          )}
        </div>
        <Horizon />
        {r.demo && (
          <figure className="x1-article__demo">
            <Demo kind={r.demo} rest={r.demo === 'steering' ? 0.6 : undefined} finding={r.demo === 'lossmask' || undefined} />
            {DEMO_NOTE[slug] && <figcaption className="x1-note">{DEMO_NOTE[slug]}</figcaption>}
          </figure>
        )}
        <section className="x1-article__sec">
          <h2>Method</h2>
          <ol>
            {method.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        </section>
        <section className="x1-article__sec">
          <h2>Result</h2>
          <div>
            {r.result.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        </section>
        <section className="x1-article__sec">
          <h2>Next</h2>
          <ul>
            {r.next.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
        {r.links && (
          <section className="x1-article__sec">
            <h2>Links</h2>
            <ul className="x1-article__links">
              {r.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener">
                    {l.label} <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <nav className="x1-article__others" aria-label="Other write-ups">
          <h2>Other write-ups</h2>
          <ul>
            {others.map((o) => (
              <li key={o.slug}>
                <Link to={`${base}/research/${o.slug}`}>
                  <b>{o.title}</b>
                  <span>{o.where}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <footer className="x1-foot">
        <Contact />
      </footer>
    </div>
  )
}

export function Beri({ base }: { base: string }) {
  return (
    <div className="x1 x1-page" data-lab={base.startsWith("/lab") || undefined}>
      <a className="x1-skip" href="#x1-main">
        Skip to content
      </a>
      <Top base={base} />
      <main id="x1-main" className="x1-article x1-article--short">
        <div className="x1-article__hero">
          <p className="x1-kicker">
            <span>Side project</span>
          </p>
          <h1>Beri</h1>
          <p className="x1-article__q">{beriFacts.oneLiner}</p>
          <p>{beriFacts.role}</p>
          <p>
            <a className="x1-btn x1-btn--primary" href={beriFacts.url} target="_blank" rel="noopener">
              <span>getberi.com</span> <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </p>
        </div>
      </main>
      <footer className="x1-foot">
        <Contact />
      </footer>
    </div>
  )
}

export function NotFound({ base }: { base: string }) {
  return (
    <div className="x1 x1-page" data-lab={base.startsWith("/lab") || undefined}>
      <a className="x1-skip" href="#x1-main">
        Skip to content
      </a>
      <Top base={base} />
      <main id="x1-main" className="x1-article x1-article--short">
        <div className="x1-article__hero">
          <h1>This page isn’t here.</h1>
          <p className="x1-article__q">The link may be old. Everything is one step back on the hilltop.</p>
          <p>
            <Link className="x1-btn x1-btn--primary" to={base || '/'}>
              <ArrowLeft size={16} aria-hidden="true" /> <span>Back to the hilltop</span>
            </Link>
          </p>
        </div>
      </main>
      <footer className="x1-foot">
        <Contact />
      </footer>
    </div>
  )
}
