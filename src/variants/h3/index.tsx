/*
 * H3 "Workbench". A dark, softly lit tabletop holding three things Tanuj built: the Amazon planning assistant (data on
 * the wire), MarmotSat (a three.js CubeSat you can grab, with hotspots) and a model window (a real steering contrast
 * you can scrub). One lamp: hover, focus or tap lifts one object and the rest dim. Opening an object morphs its frame
 * into a stage (step list + lit diagram, spec card, the real demo, the write-up).
 * Sources: research/round3/MOBBIN.md direction B, WEB.md technique 6 and concept D. Type: Geist + Geist Mono.
 */
import { useEffect, useState } from 'react'
import { Copy, Check, FileText, Mail, Linkedin, Github, ArrowUpRight } from 'lucide-react'
import { thesis, context, proofs } from '../../content/curated'
import { person, links, beri } from '../../content/site'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { Logo } from '../../shared/Mark'
import { LinkIcon } from '../../shared/Links'
import type { VariantProps } from '../../routes'
import { Bench, Shelf, useObjects } from './Bench'
import { Ruler } from './Ruler'
import { Sheet } from './Sheet'
import { Writeup } from './Writeup'
import { useSunlit } from './Sat'
import './h3.css'

const [t1, t2] = (() => {
  const i = thesis.indexOf(' and ')
  return [thesis.slice(0, i), thesis.slice(i + 1)]
})()

function Bar({ base, home }: { base: string; home: boolean }) {
  return (
    <header className="h3-bar">
      {home ? (
        <a href="#top" className="h3-bar__name">
          {person.name}
        </a>
      ) : (
        <Link to={`${base}/`} className="h3-bar__name">
          {person.name}
        </Link>
      )}
      <nav className="h3-bar__nav" aria-label="Sections">
        <a href={home ? '#work' : `${base}/#work`}>Work</a>
        <a href={home ? '#experience' : `${base}/#experience`}>Experience</a>
        <a href={home ? '#contact' : `${base}/#contact`}>Contact</a>
      </nav>
      <div className="h3-bar__acts">
        <a className="h3-icon" href={links.email.href} aria-label="Email">
          <Mail size={18} strokeWidth={1.6} aria-hidden="true" />
        </a>
        <a className="h3-icon" href={links.linkedin.href} target="_blank" rel="noopener" aria-label="LinkedIn">
          <Linkedin size={18} strokeWidth={1.6} aria-hidden="true" />
        </a>
        <a className="h3-icon h3-icon--wide" href={links.github.href} target="_blank" rel="noopener" aria-label="GitHub">
          <Github size={18} strokeWidth={1.6} aria-hidden="true" />
        </a>
        <a className="h3-btn h3-btn--solid" href={links.resume.href} target="_blank" rel="noopener">
          <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
          Resume <span className="h3-bar__pdf">(PDF)</span>
        </a>
      </div>
    </header>
  )
}

function Status({ sunlit }: { sunlit: boolean | null }) {
  return (
    <p className="h3-status">
      <span className="h3-status__dot" aria-hidden="true" />
      MarmotSat in orbit
      {sunlit !== null && <span className="h3-status__x"> · {sunlit ? 'in sunlight now' : 'in Earth’s shadow now'}</span>}
    </p>
  )
}

function Footer({ sunlit }: { sunlit: boolean | null }) {
  const [copied, setCopied] = useState(false)
  return (
    <footer className="h3-foot" id="contact">
      <div className="h3-foot__glow" aria-hidden="true" />
      <div className="h3-foot__in">
        <h2>Get in touch</h2>
        <p className="h3-foot__lead">Open to research and engineering roles. Email is fastest.</p>
        <div className="h3-foot__mail">
          <a href={links.email.href} className="h3-btn h3-btn--solid">
            <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
            {person.email}
          </a>
          <button
            type="button"
            className="h3-btn h3-btn--ghost"
            onClick={() => {
              navigator.clipboard?.writeText(person.email).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              })
            }}
          >
            {copied ? <Check size={16} strokeWidth={1.8} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.8} aria-hidden="true" />}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <ul className="h3-foot__links">
          {(['resume', 'linkedin', 'github', 'x'] as const).map((k) => (
            <li key={k}>
              <a href={links[k].href} target="_blank" rel="noopener">
                <LinkIcon k={k} size={16} />
                {k === 'resume' ? 'Resume (PDF)' : links[k].label}
              </a>
            </li>
          ))}
        </ul>
        <div className="h3-foot__base">
          <Status sunlit={sunlit} />
          <span>{context}</span>
        </div>
      </div>
    </footer>
  )
}

function Home({ base }: { base: string }) {
  const m = useMotionPrefs()
  const sunlit = useSunlit()
  const { open, openObj, close, frames } = useObjects(m.reduced)
  return (
    <>
      <div id="h3-main">
        <Bar base={base} home />
        <main id="h3-content" tabIndex={-1}>
          <section className="h3-hero" id="top" aria-labelledby="h3-h1">
            <div className="h3-hero__txt">
              <h1 id="h3-h1">
                <span>{t1}</span> <span className="h3-hero__t2">{t2}</span>
              </h1>
              <p className="h3-hero__ctx">{context}</p>
            </div>
            <ul className="h3-proofs" aria-label="Highlights">
              {proofs.map((p) => (
                <li key={p.mark}>
                  <span className="h3-proofs__logo">
                    <Logo m={p.mark} w={30} h={22} />
                  </span>
                  <span>
                    <b>{p.org}</b> {p.line}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <Bench reduced={m.reduced} sunlit={sunlit} onOpen={openObj} frames={frames} />
          <Shelf base={base} onOpen={openObj} frames={frames} />
          <Ruler />
        </main>
        <Footer sunlit={sunlit} />
      </div>
      {open && <Sheet k={open} base={base} reduced={m.reduced} onClose={close} />}
    </>
  )
}

function Inner({ base, children }: { base: string; children: React.ReactNode }) {
  const sunlit = useSunlit()
  return (
    <div id="h3-main">
      <Bar base={base} home={false} />
      <main id="h3-content" tabIndex={-1}>
        {children}
      </main>
      <Footer sunlit={sunlit} />
    </div>
  )
}

export default function Variant({ page, base }: VariantProps) {
  useEffect(() => {
    document.documentElement.classList.add('h3-doc')
    return () => document.documentElement.classList.remove('h3-doc')
  }, [])
  return (
    <div className="h3">
      <a className="h3-skip" href="#h3-content">
        Skip to content
      </a>
      {page.kind === 'home' ? (
        <Home base={base} />
      ) : page.kind === 'research' ? (
        <Inner base={base}>
          <Writeup slug={page.slug} base={base} />
        </Inner>
      ) : page.kind === 'beri' ? (
        <Inner base={base}>
          <article className="h3-wu h3-wu--short">
            <p className="h3-eyebrow">Side project</p>
            <h1>Beri</h1>
            <p className="h3-wu__q">{beri.oneLiner}</p>
            <p className="h3-wu__prose">{beri.role}</p>
            <a className="h3-btn h3-btn--solid" href={beri.url} target="_blank" rel="noopener">
              getberi.com
              <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </article>
        </Inner>
      ) : (
        <Inner base={base}>
          <article className="h3-wu h3-wu--short">
            <p className="h3-eyebrow">404</p>
            <h1>Nothing on the bench here.</h1>
            <p className="h3-wu__q">The page you asked for doesn’t exist.</p>
            <Link className="h3-btn h3-btn--solid" to={`${base}/`}>
              Back to the bench
            </Link>
          </article>
        </Inner>
      )}
    </div>
  )
}
