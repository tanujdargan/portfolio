import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import type { VariantProps } from '../../routes'
import { beri, links, person } from '../../content/site'
import { Link } from '../../lib/router'
import { LinkIcon } from '../../shared/Links'
import { Home } from './Home'
import { Article } from './Article'
import './h1.css'

// H1 · Running. A dark page where the work is visibly running: one real telemetry line, the steering demo replaying
// its real cached outputs in the hero, and a lit index whose rows wake and open in place.

export default function Variant({ page, base }: VariantProps) {
  return (
    <div className="h1">
      <a className="h1-skip" href="#h1-main">
        Skip to content
      </a>
      <header className="h1-bar">
        <div className="h1-bar__in h1-wrap">
          <Link to={base || '/'} className="h1-bar__name">
            {person.name}
          </Link>
          <nav className="h1-bar__nav" aria-label="Sections">
            <Link to={`${base}/#work`}>Work</Link>
            <Link to={`${base}/#experience`}>Experience</Link>
            <Link to={`${base}/#contact`}>Contact</Link>
          </nav>
          <div className="h1-bar__links">
            {(['github', 'linkedin', 'email'] as const).map((k) => (
              <a
                key={k}
                className="h1-icon"
                href={links[k].href}
                aria-label={links[k].label}
                {...(k !== 'email' ? { target: '_blank', rel: 'noopener' } : {})}
              >
                <LinkIcon k={k} size={17} />
              </a>
            ))}
            <a className="h1-btn h1-btn--solid h1-btn--sm" href={links.resume.href} target="_blank" rel="noopener">
              <LinkIcon k="resume" size={15} /> Resume <span className="h1-hide-xs">(PDF)</span>
            </a>
          </div>
        </div>
      </header>
      <main id="h1-main" tabIndex={-1}>
        {page.kind === 'home' && <Home base={base} />}
        {page.kind === 'research' && <Article key={page.slug} slug={page.slug} base={base} />}
        {page.kind === 'beri' && <Beri base={base} />}
        {page.kind === 'notfound' && <NotFound base={base} />}
      </main>
      <footer className="h1-foot h1-wrap">
        <span>© 2026 {person.name}</span>
        <span>
          Demos replay real cached outputs or say “Illustrative”. Agents can read <a href="/llms.txt">llms.txt</a>.
        </span>
      </footer>
    </div>
  )
}

function Beri({ base }: { base: string }) {
  return (
    <article className="h1-art h1-wrap h1-short">
      <p className="h1-crumb">
        <Link to={`${base}/`} className="h1-a">
          <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" /> Home
        </Link>
      </p>
      <h1 className="h1-art__title">Beri, a food app I’m building</h1>
      <p className="h1-art__lede">{beri.oneLiner}</p>
      <p>{beri.role}</p>
      <p className="h1-src">{beri.stack.join(' · ')}</p>
      <p>
        <a className="h1-btn h1-btn--solid" href={beri.url} target="_blank" rel="noopener">
          getberi.com <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </p>
    </article>
  )
}

function NotFound({ base }: { base: string }) {
  return (
    <article className="h1-art h1-wrap h1-short">
      <h1 className="h1-art__title">Nothing at this address.</h1>
      <p className="h1-art__lede">The page may have moved. The work, the write-ups and the resume are one click away.</p>
      <p className="h1-actions">
        <Link to={`${base}/`} className="h1-btn h1-btn--solid">
          <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" /> Home
        </Link>
        <a className="h1-btn" href={links.resume.href} target="_blank" rel="noopener">
          <LinkIcon k="resume" size={16} /> Resume (PDF)
        </a>
      </p>
    </article>
  )
}
