import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { more, roles } from '../../content/curated'
import { person } from '../../content/site'
import { Logo } from '../../shared/Mark'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { hero } from './data'
import { WorkIndex } from './Work'
import { Magnetic, Socials } from './chrome'

function Intro() {
  return (
    <section className="r1-intro" aria-label="About">
      <h1 className="r1-intro__h r1-in" style={{ ['--d' as string]: 1 }}>
        <span className="r1-sr">{hero.name}. </span>
        {hero.line}
      </h1>
    </section>
  )
}

function More({ base }: { base: string }) {
  return (
    <section className="r1-sec" aria-labelledby="r1-more-h">
      <h2 className="r1-sec__h" id="r1-more-h">
        More
      </h2>
      <ul className="r1-small">
        {more.map((m) => {
            const inner = (
              <>
                <span className="r1-small__t">{m.title}</span>
                <span className="r1-small__l">{m.line}</span>
                {m.href && (
                  <span className="r1-small__a" aria-hidden="true">
                    {m.ext ? '↗' : '→'}
                  </span>
                )}
              </>
            )
            return (
              <li key={m.title}>
                {!m.href ? (
                  <div className="r1-small__row">{inner}</div>
                ) : m.ext ? (
                  <a className="r1-small__row" href={m.href} target="_blank" rel="noopener">
                    {inner}
                  </a>
                ) : (
                  <Link className="r1-small__row" to={`${base}${m.href}`}>
                    {inner}
                  </Link>
                )}
              </li>
            )
          })}
      </ul>
    </section>
  )
}

function Experience() {
  const { reduced } = useMotionPrefs()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section className="r1-sec" id="experience" aria-labelledby="r1-exp-h">
      <h2 className="r1-sec__h" id="r1-exp-h">
        Experience
      </h2>
      <ul className="r1-exp">
        {roles.map((r, i) => {
          const isOpen = open === r.org
          return (
            <li key={r.org} data-open={isOpen || undefined}>
              <button type="button" className="r1-exp__row" aria-expanded={isOpen} aria-controls={`r1-e-${i}`} onClick={() => setOpen(isOpen ? null : r.org)}>
                <Logo m={r.mark} w={40} h={18} />
                <span className="r1-exp__org">{r.org}</span>
                <span className="r1-exp__role">{r.role}</span>
                <span className="r1-exp__when">{r.when}</span>
                <span className="r1-row__x" aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`r1-e-${i}`}
                    className="r1-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={reduced ? { duration: 0 } : { height: { type: 'spring', stiffness: 300, damping: 34 }, opacity: { duration: 0.18 } }}
                  >
                    <ul className="r1-exp__bullets">
                      {r.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(person.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      location.href = `mailto:${person.email}`
    }
  }
  return (
    <section className="r1-contact" id="contact" aria-labelledby="r1-contact-h">
      <h2 className="r1-sec__h" id="r1-contact-h">
        Contact
      </h2>
      <p className="r1-contact__mail">
        <a href={`mailto:${person.email}`}>{person.email}</a>
      </p>
      <div className="r1-contact__row">
        <Magnetic>
          <button type="button" className="r1-copy" onClick={copy}>
            {copied ? 'Copied' : 'Copy email'}
          </button>
        </Magnetic>
        <span className="r1-sr" aria-live="polite">
          {copied ? 'Email copied to clipboard' : ''}
        </span>
        <Socials className="r1-socials r1-socials--big" />
      </div>
      <p className="r1-foot">
        <span>{person.location}</span>
        <span>Demos run in your browser.</span>
      </p>
    </section>
  )
}

export function Home({ base }: { base: string }) {
  return (
    <>
      <Intro />
      <WorkIndex base={base} />
      <div className="r1-lower">
        <More base={base} />
        <Experience />
      </div>
      <Contact />
    </>
  )
}
