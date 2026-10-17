// Write-ups, Beri and 404 for W2: a quiet dark page under a strip of the island still, with a way back to the station.
import { ArrowLeft, ArrowUpRight, FileText, Mail, Linkedin } from 'lucide-react'
import { Link } from '../../lib/router'
import { research, links, person } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { STATIONS, type StationId } from './stations'

const STATION_OF: Record<string, StationId> = { 'activation-steering': 'model', 'loss-masking-distress': 'log', 'ocean-sensing': 'pier' }
const PROV: Record<string, string> = {
  steering: 'Real cached outputs from Qwen2.5-1.5B-Instruct, a replication run for this page.',
  lossmask: 'Illustrative conversation; its tokens and loss weights are exact.',
  ocean: 'Illustrative profile; only R² 0.936 is a real result.',
  es: 'Illustrative toy landscape; the method is as run.',
  retrieval: 'Illustrative partition; the throughput and recall figures are from the resume.',
  orbit: 'Live: SGP4 from MarmotSat’s public TLE.',
}

function Bar({ base }: { base: string }) {
  return (
    <header className="w2-abar">
      <Link to={base || '/'} className="w2-btn w2-btn--ghost">
        <ArrowLeft size={16} aria-hidden="true" /> The island
      </Link>
      <p className="w2-abar__n">{person.name}</p>
      <nav aria-label="Contact" className="w2-abar__l">
        <a className="w2-btn w2-btn--cv" href={links.resume.href} target="_blank" rel="noopener">
          <FileText size={16} aria-hidden="true" /> <span>Resume</span>
        </a>
        <a className="w2-icon-btn" href={links.email.href} aria-label="Email">
          <Mail size={16} aria-hidden="true" />
        </a>
        <a className="w2-icon-btn" href={links.linkedin.href} target="_blank" rel="noopener" aria-label="LinkedIn">
          <Linkedin size={16} aria-hidden="true" />
        </a>
      </nav>
    </header>
  )
}

export function Article({ slug, base }: { slug: string; base: string }) {
  const r = research.find((x) => x.slug === slug)!
  // per the brief: the steering write-up drops method line 3 (an assumed pipeline shape)
  const method = r.method.filter((_, i) => !(slug === 'activation-steering' && i === 3))
  const st = STATION_OF[slug]
  return (
    <div className="w2 w2-page" data-js="">
      <a className="w2-skip" href="#w2-main">
        Skip to the write-up
      </a>
      <Bar base={base} />
      <main id="w2-main" className="w2-article">
        <div className="w2-article__band" aria-hidden="true" />
        <p className="w2-eyebrow" style={{ ['--st' as string]: st ? STATIONS[st].color : '#ffd27a' }}>
          {st ? STATIONS[st].place : 'Research'} <span>·</span> {r.when}
        </p>
        <h1>{r.title}</h1>
        <p className="w2-meta">
          {r.where} <span aria-hidden="true">·</span> {r.tags.join(', ')}
        </p>
        <p className="w2-q">{r.question}</p>
        {r.demo && (
          <section className="w2-article__demo" aria-label="Demo">
            <Demo kind={r.demo} rest={0.6} finding />
            <p className="w2-prov">{PROV[r.demo]}</p>
          </section>
        )}
        <section>
          <h2>Method</h2>
          <ol className="w2-steps">
            {method.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        </section>
        <section>
          <h2>What came out</h2>
          <ul className="w2-bullets">
            {r.result.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Next</h2>
          <ul className="w2-bullets">
            {r.next.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
        {r.links && (
          <p className="w2-article__links">
            {r.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener" className="w2-btn w2-btn--ghost">
                {l.label} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            ))}
          </p>
        )}
        {st && (
          <p className="w2-article__back">
            <Link to={`${base || '/'}#${st}`} className="w2-btn">
              Drive to the {STATIONS[st].place.toLowerCase()}
            </Link>
          </p>
        )}
      </main>
    </div>
  )
}

export function Beri({ base }: { base: string }) {
  return (
    <div className="w2 w2-page" data-js="">
      <a className="w2-skip" href="#w2-main">
        Skip to the case study
      </a>
      <Bar base={base} />
      <main id="w2-main" className="w2-article w2-article--beri">
        <BeriCaseStudy base={base} />
      </main>
    </div>
  )
}

export function NotFound({ base }: { base: string }) {
  return (
    <div className="w2 w2-page" data-js="">
      <Bar base={base} />
      <main id="w2-main" className="w2-article w2-404">
        <div className="w2-article__band" aria-hidden="true" />
        <p className="w2-eyebrow">Off the map</p>
        <h1>Nothing out here but water.</h1>
        <p className="w2-q">This page doesn’t exist. The island has every station on it.</p>
        <p>
          <Link to={base || '/'} className="w2-btn">
            Back to the island
          </Link>
        </p>
      </main>
    </div>
  )
}
