import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Check, Copy } from 'lucide-react'
import { ResumeButton, Socials, ThemeToggle } from '../index'
import { links, person } from '../../../content/site'
import { LinkIcon } from '../../../shared/Links'
import { Link } from '../../../lib/router'
import './header.css'

// Versions 2–4 of this section for the review round. Version 1 is the current one in Home/index/Article.
// Reached at /gate/header2 … /gate/header4 (and /gate/headerN/research/<slug> for a write-up).
export type Props = { home: boolean }

const SOCIAL = ['github', 'linkedin', 'x', 'email'] as const
type SocialKey = (typeof SOCIAL)[number]
const ext = (k: SocialKey) => (links[k].href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener' })
const NAV = [
  ['work', 'Work'],
  ['experience', 'Experience'],
  ['contact', 'Contact'],
] as const
const anchor = (home: boolean) => (id: string) => (home ? `#${id}` : `/#${id}`)

/* ------------------------------------------------------------------ */
/* 2 · Labelled links: the socials are words, not icons. On a phone they
   become a full-width strip under the bar that scrolls away beneath it.  */

function LabelledLinks({ cls }: { cls: string }) {
  return (
    <ul className={cls}>
      {SOCIAL.map((k) => (
        <li key={k}>
          <a href={links[k].href} {...ext(k)}>
            <LinkIcon k={k} size={15} />
            <span>{links[k].label}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function HeaderLabelled({ home }: Props) {
  const at = anchor(home)
  return (
    <>
      <header className="m-hdr2">
        <div className="m-wrap m-hdr2-in">
          <Link to="/" className="m-hdr2-mark">
            {person.name}
          </Link>
          <nav className="m-hdr2-nav" aria-label="Sections">
            {NAV.map(([id, label]) => (
              <a key={id} href={at(id)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="m-hdr2-end">
            <nav className="m-hdr2-links-wide" aria-label="Elsewhere">
              <LabelledLinks cls="m-hdr2-pill" />
            </nav>
            <ResumeButton />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {/* phone only: not sticky, so it slides up under the bar as you read */}
      <nav className="m-hdr2-strip" aria-label="Elsewhere">
        <div className="m-wrap">
          <LabelledLinks cls="m-hdr2-seg" />
        </div>
      </nav>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 3 · Section tracker: the nav says which section you're reading. On a
   phone the name + socials row scrolls away and the tracker row pins.   */

function useSection(home: boolean) {
  const [cur, setCur] = useState<string | null>(null)
  useEffect(() => {
    if (!home) return
    let raf = 0
    const read = () => {
      raf = 0
      const line = window.innerHeight * 0.35
      let hit: string | null = null
      for (const [id] of NAV) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) hit = id
      }
      // the last section is short; count it once the page bottoms out
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) hit = 'contact'
      setCur(hit)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [home])
  return cur
}

function HeaderTracker({ home }: Props) {
  const at = anchor(home)
  const cur = useSection(home)
  return (
    <header className="m-hdr3">
      <div className="m-wrap m-hdr3-in">
        <div className="m-hdr3-id">
          <Link to="/" className="m-hdr3-mark">
            {person.name}
          </Link>
          <div className="m-hdr3-socials">
            <Socials />
          </div>
        </div>
        <div className="m-hdr3-bar">
          <nav className="m-hdr3-nav" aria-label="Sections">
            {NAV.map(([id, label]) => (
              <a key={id} href={at(id)} aria-current={cur === id ? 'location' : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <div className="m-hdr3-end">
            <ResumeButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* 4 · Email first: the address is written out with a copy button, next
   to Resume. On a phone that row tucks away while you scroll down and
   comes back the moment you scroll up.                                  */

function EmailCopy() {
  const [done, setDone] = useState(false)
  const t = useRef<number>()
  useEffect(() => () => clearTimeout(t.current), [])
  const addr = links.email.href.replace(/^mailto:/, '')
  return (
    <div className="m-hdr4-mail">
      <a href={links.email.href} className="m-hdr4-addr">
        <LinkIcon k="email" size={15} />
        {addr}
      </a>
      <button
        type="button"
        className="m-hdr4-copy"
        aria-label={done ? 'Email address copied' : 'Copy email address'}
        onClick={() => {
          navigator.clipboard?.writeText(addr).then(
            () => {
              setDone(true)
              clearTimeout(t.current)
              t.current = window.setTimeout(() => setDone(false), 1600)
            },
            () => {},
          )
        }}
      >
        {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      </button>
      <span className="m-hdr4-sr" aria-live="polite">
        {done ? 'Copied' : ''}
      </span>
    </div>
  )
}

function SocialIcons() {
  return (
    <ul className="m-hdr4-icons">
      {(['github', 'linkedin', 'x'] as const).map((k) => (
        <li key={k}>
          <a href={links[k].href} {...ext(k)} aria-label={links[k].label} title={links[k].label}>
            <LinkIcon k={k} size={17} />
          </a>
        </li>
      ))}
    </ul>
  )
}

function HeaderEmail({ home }: Props) {
  const at = anchor(home)
  const [tucked, setTucked] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let raf = 0
    const read = () => {
      raf = 0
      const y = window.scrollY
      if (Math.abs(y - last) < 6) return
      setTucked(y > 80 && y > last)
      last = y
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    addEventListener('scroll', on, { passive: true })
    return () => {
      removeEventListener('scroll', on)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <>
      <header className="m-hdr4" data-tucked={tucked || undefined}>
        <div className="m-wrap m-hdr4-in">
          <Link to="/" className="m-hdr4-mark">
            {person.name}
          </Link>
          <nav className="m-hdr4-nav" aria-label="Sections">
            {NAV.map(([id, label]) => (
              <a key={id} href={at(id)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="m-hdr4-reach">
            <div className="m-wrap m-hdr4-reach-in">
              <EmailCopy />
              <SocialIcons />
            </div>
          </div>
          <div className="m-hdr4-end">
            <ResumeButton />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {/* phone only: holds the reach row's space at the top so nothing sits under it */}
      <div className="m-hdr4-space" aria-hidden="true" />
    </>
  )
}

export const versions: Record<string, ComponentType<Props>> = {
  '2': HeaderLabelled,
  '3': HeaderTracker,
  '4': HeaderEmail,
}
