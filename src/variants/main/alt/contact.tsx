import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { links, person } from '../../../content/site'
import { LinkIcon } from '../../../shared/Links'
import './contact.css'

// Versions 2–4 of this section for the review round. Version 1 is the current one in Home/index/Article.
// Reached at /gate/contact2 … /gate/contact4.
export type Props = {}

const LEDE = 'Research programs, labs and founders: email is fastest.'
const outward = ['github', 'linkedin', 'x', 'resume'] as const
const label = (k: (typeof outward)[number]) => (k === 'resume' ? 'Resume (PDF, Aug 2026)' : links[k].label)
const ext = { target: '_blank', rel: 'noopener' } as const

/** Copy the address; `copied` flips for 1.6 s. navigator is touched only in the handler (SSR-safe). */
function useCopy() {
  const [copied, setCopied] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(t.current), [])
  const copy = () => {
    navigator.clipboard?.writeText(person.email).then(() => {
      setCopied(true)
      clearTimeout(t.current)
      t.current = setTimeout(() => setCopied(false), 1600)
    })
  }
  return { copied, copy }
}

/** Polite live region so screen readers hear the copy confirmation even when the button label is all that changes. */
const Announce = ({ on, v }: { on: boolean; v: 2 | 3 | 4 }) => (
  <span className={`m-ct${v}-sr`} aria-live="polite">
    {on ? 'Email address copied' : ''}
  </span>
)

/* ---------- 2 · Card: one surface, the address is the headline, links are a labelled button grid ---------- */
function ContactCard() {
  const { copied, copy } = useCopy()
  return (
    <section className="m-wrap m-sec" id="contact" aria-labelledby="contact-h">
      <div className="m-ct2">
        <h2 id="contact-h" className="m-h2">
          Contact
        </h2>
        <p className="m-ct2-lede">{LEDE}</p>
        <div className="m-ct2-mail">
          <a href={links.email.href} className="m-ct2-addr">
            {person.email}
          </a>
          <button type="button" className="m-ct2-copy" onClick={copy}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {/* both labels share one grid cell so the button never changes width */}
            <span className="m-ct2-copy__t">
              <span aria-hidden={copied}>Copy</span>
              <span aria-hidden={!copied}>Copied</span>
            </span>
          </button>
          <Announce on={copied} v={2} />
        </div>
        <ul className="m-ct2-grid">
          {outward.map((k) => (
            <li key={k}>
              <a href={links[k].href} {...ext} className="m-ct2-btn">
                <LinkIcon k={k} size={18} />
                <span>{label(k)}</span>
                <ArrowUpRight size={15} aria-hidden="true" className="m-ct2-btn__go" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- 3 · Directory: heading and line on the left, one row per channel on the right ---------- */
const handle: Record<(typeof outward)[number], string> = {
  github: 'github.com/tanujdargan',
  linkedin: 'linkedin.com/in/tanujdargan',
  x: 'x.com/DarganTanuj',
  resume: 'PDF, Aug 2026',
}
function ContactRows() {
  const { copied, copy } = useCopy()
  return (
    <section className="m-wrap m-sec m-ct3" id="contact" aria-labelledby="contact-h">
      <div className="m-ct3-intro">
        <h2 id="contact-h" className="m-h2">
          Contact
        </h2>
        <p className="m-ct3-lede">{LEDE}</p>
      </div>
      <ul className="m-ct3-list">
        <li className="m-ct3-row m-ct3-row--mail">
          <a href={links.email.href} className="m-ct3-hit">
            <LinkIcon k="email" size={18} />
            <span className="m-ct3-k">Email</span>
            <span className="m-ct3-v">{person.email}</span>
          </a>
          <button
            type="button"
            className="m-ct3-act"
            aria-label={copied ? 'Email copied' : 'Copy email'}
            onClick={copy}
          >
            {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          </button>
          <Announce on={copied} v={3} />
        </li>
        {outward.map((k) => (
          <li key={k} className="m-ct3-row">
            <a href={links[k].href} {...ext} className="m-ct3-hit">
              <LinkIcon k={k} size={18} />
              <span className="m-ct3-k">{links[k].label}</span>
              <span className="m-ct3-v">{handle[k]}</span>
              <ArrowUpRight size={16} aria-hidden="true" className="m-ct3-go" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- 4 · Letter: a short closing note, one primary mail action with a composed subject, links as a quiet line ---------- */
const composed = `${links.email.href}?subject=${encodeURIComponent('Hello from tanujdargan.com')}`
function ContactLetter() {
  const { copied, copy } = useCopy()
  return (
    <section className="m-wrap m-sec m-ct4" id="contact" aria-labelledby="contact-h">
      <h2 id="contact-h" className="m-ct4-h">
        {LEDE}
      </h2>
      <div className="m-ct4-acts">
        <a href={composed} className="m-ct4-primary">
          <LinkIcon k="email" size={18} />
          {person.email}
        </a>
        <button type="button" className="m-ct4-copy" onClick={copy}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          <span className="m-ct4-copy__t">
            <span aria-hidden={copied}>Copy address</span>
            <span aria-hidden={!copied}>Copied</span>
          </span>
        </button>
        <Announce on={copied} v={4} />
      </div>
      <ul className="m-ct4-links" aria-label="Elsewhere">
        {outward.map((k) => (
          <li key={k}>
            <a href={links[k].href} {...ext} className="m-link">
              {label(k)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export const versions: Record<string, ComponentType<Props>> = {
  '2': ContactCard,
  '3': ContactRows,
  '4': ContactLetter,
}
