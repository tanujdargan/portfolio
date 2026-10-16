import { useEffect, useRef, useState } from 'react'
import { links, person } from '../../content/site'
import { context } from '../../content/curated'
import { Link } from '../../lib/router'
import { LinkIcon } from '../../shared/Links'

/** Sticky top bar: the name small; Resume (PDF), email and socials one tap away on every screen. */
export function Top({ base }: { base: string }) {
  const ref = useRef<HTMLElement>(null)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const on = () => setStuck(scrollY > 8)
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <header ref={ref} className="h4-top" data-stuck={stuck || undefined}>
      <div className="h4-wrap h4-top__in">
        <Link to={base || '/'} className="h4-name">
          {person.name}
          <span className="h4-name__ctx">ML systems · interpretability · UVic ’27</span>
        </Link>
        <nav className="h4-acts" aria-label="Resume and contact">
          <a className="h4-btn h4-btn--solid" href={links.resume.href} target="_blank" rel="noopener" aria-label="Resume (PDF)">
            <LinkIcon k="resume" size={16} />
            <span>
              Resume<span className="h4-hide-sm"> (PDF)</span>
            </span>
          </a>
          <a className="h4-btn" href={links.email.href} aria-label={`Email ${person.email}`}>
            <LinkIcon k="email" size={18} />
            <span className="h4-btn__mail" aria-hidden="true">
              {person.email}
            </span>
          </a>
          <a className="h4-btn h4-btn--icon" href={links.linkedin.href} target="_blank" rel="noopener" aria-label="LinkedIn">
            <LinkIcon k="linkedin" size={18} />
          </a>
          <a className="h4-btn h4-btn--icon" href={links.github.href} target="_blank" rel="noopener" aria-label="GitHub">
            <LinkIcon k="github" size={18} />
          </a>
          <a className="h4-btn h4-btn--icon h4-xs-hide" href={links.x.href} target="_blank" rel="noopener" aria-label="X">
            <LinkIcon k="x" size={17} />
          </a>
        </nav>
      </div>
    </header>
  )
}

export function Contact() {
  const [copied, setCopied] = useState(false)
  return (
    <section className="h4-contact" aria-labelledby="h4-contact">
      <div>
        <h2 id="h4-contact">Hiring for research or ML systems? Let’s talk.</h2>
        <p>{context} Email is fastest.</p>
      </div>
      <ul className="h4-rows">
        <li>
          <span className="h4-rows__k">Email</span>
          <a className="h4-rows__v mono" href={links.email.href}>
            {person.email}
          </a>
          <button
            type="button"
            className="h4-copy"
            onClick={() => {
              navigator.clipboard?.writeText(person.email).then(
                () => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1600)
                },
                () => {},
              )
            }}
          >
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </li>
        <li>
          <span className="h4-rows__k">Resume</span>
          <a className="h4-rows__v" href={links.resume.href} target="_blank" rel="noopener">
            Resume (PDF)
          </a>
          <span />
        </li>
        <li>
          <span className="h4-rows__k">LinkedIn</span>
          <a className="h4-rows__v" href={links.linkedin.href} target="_blank" rel="noopener">
            linkedin.com/in/tanujdargan
          </a>
          <span />
        </li>
        <li>
          <span className="h4-rows__k">GitHub</span>
          <a className="h4-rows__v" href={links.github.href} target="_blank" rel="noopener">
            github.com/tanujdargan
          </a>
          <span />
        </li>
        <li>
          <span className="h4-rows__k">X</span>
          <a className="h4-rows__v" href={links.x.href} target="_blank" rel="noopener">
            @DarganTanuj
          </a>
          <span />
        </li>
      </ul>
    </section>
  )
}

export function Foot() {
  return (
    <footer className="h4-foot">
      <span className="h4-status">
        <i aria-hidden="true" />
        MarmotSat: in orbit since its July 2026 launch
      </span>
      <span>
        © {person.name} · {person.location}
      </span>
    </footer>
  )
}
