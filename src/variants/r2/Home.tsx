import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, Copy, X } from 'lucide-react'
import { amazonMetrics, more, roles } from '../../content/curated'
import { links, person } from '../../content/site'
import { prefetchDemo } from '../../content/work'
import { Demo } from '../../demos/Demo'
import { LinkIcon } from '../../shared/Links'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { tiles, type Tile, type TileId } from './data'
import { AmazonMicro, LossMicro, OceanMicro, OrbitMicro, SteerMicro } from './Micro'

const micro: Record<TileId, () => ReactNode> = {
  amazon: () => <AmazonMicro small={tiles[0].small} />,
  orbit: () => <OrbitMicro />,
  steering: () => <SteerMicro />,
  lossmask: () => <LossMicro />,
  ocean: () => <OceanMicro />,
}

export function Socials() {
  return (
    <ul className="r2-socials">
      {(['github', 'linkedin', 'x', 'email'] as const).map((k) => {
        const l = links[k]
        const ext = !l.href.startsWith('mailto:')
        return (
          <li key={k}>
            <a href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={l.label} title={l.label}>
              <LinkIcon k={k} size={17} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}

/** Raycast-style light: one listener on the grid writes each tile's pointer position as CSS vars. */
function useBorderLight() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const g = ref.current
    if (!g || !matchMedia('(hover: hover)').matches) return
    let raf = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        g.querySelectorAll<HTMLElement>('.r2-tile').forEach((t) => {
          const r = t.getBoundingClientRect()
          t.style.setProperty('--mx', `${e.clientX - r.left}px`)
          t.style.setProperty('--my', `${e.clientY - r.top}px`)
        })
      })
    }
    g.addEventListener('pointermove', move)
    return () => (g.removeEventListener('pointermove', move), cancelAnimationFrame(raf))
  }, [])
  return ref
}

function WorkTile({ t, open, onOpen, layout }: { t: Tile; open: boolean; onOpen: (id: TileId) => void; layout: boolean }) {
  const warm = () => t.demo && prefetchDemo[t.demo]()
  return (
    <motion.article
      layoutId={layout ? `r2-${t.id}` : undefined}
      className="r2-tile r2-work"
      data-id={t.id}
      style={{ gridArea: t.area, ['--a' as string]: t.accent, visibility: open ? 'hidden' : undefined }}
      onPointerEnter={warm}
    >
      <div className="r2-work__top">
        <span className="r2-org">{t.org}</span>
        <ArrowUpRight className="r2-work__go" size={16} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <div className="r2-work__viz">{micro[t.id]()}</div>
      <div className="r2-work__foot">
        <h2 className="r2-work__title">
          <button type="button" className="r2-open" id={`r2-open-${t.id}`} onClick={() => onOpen(t.id)} onFocus={warm} aria-haspopup="dialog">
            {t.short}
          </button>
        </h2>
        {t.id !== 'amazon' && (
          <p className="r2-result">
            <b>{t.big}</b>
            <span>{t.small}</span>
          </p>
        )}
      </div>
    </motion.article>
  )
}

function Panel({ t, onClose, base, layout }: { t: Tile; onClose: () => void; base: string; layout: boolean }) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    close.current?.focus({ preventScroll: true })
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prev
    }
  }, [])
  const trap = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const f = e.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')
    if (!f.length) return
    const [a, z] = [f[0], f[f.length - 1]]
    if (e.shiftKey && document.activeElement === a) (e.preventDefault(), z.focus())
    else if (!e.shiftKey && document.activeElement === z) (e.preventDefault(), a.focus())
  }
  const it = t.item
  const opts = t.demo === 'steering' ? { rest: 0.6 } : t.demo === 'lossmask' ? { finding: true } : {}
  return (
    <div className="r2-layer" onKeyDown={trap}>
      <motion.div className="r2-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        layoutId={layout ? `r2-${t.id}` : undefined}
        className="r2-tile r2-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`r2-panel-${t.id}`}
        style={{ ['--a' as string]: t.accent }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        {...(layout ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } })}
      >
        <motion.div
          className="r2-panel__in"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: layout ? 0.16 : 0, duration: 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
        >
          <header className="r2-panel__head">
            <span className="r2-org">
              {t.org} · {it.when}
            </span>
            <button ref={close} type="button" className="r2-close" onClick={onClose} aria-label="Close">
              <X size={18} strokeWidth={1.8} aria-hidden="true" />
              <kbd>Esc</kbd>
            </button>
          </header>
          <h2 id={`r2-panel-${t.id}`} className="r2-panel__title">
            {it.title}
          </h2>
          <p className="r2-panel__result">
            {t.id === 'amazon' && <b>180+ sites.</b>}
            {it.result}
          </p>
          <p className="r2-panel__finding">{it.finding}</p>
          <div className="r2-panel__demo">
            {t.demo ? (
              <Demo kind={t.demo} {...opts} />
            ) : (
              <ul className="r2-metrics">
                {amazonMetrics.map((m) => (
                  <li key={m.n}>
                    <b>{m.n}</b>
                    <span>{m.l}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="r2-panel__more">
            {t.more.internal ? (
              <Link to={`${base}${t.more.href}`} className="r2-btn">
                {t.more.label} <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              <a href={t.more.href} className="r2-btn" target="_blank" rel="noopener">
                {t.more.label} <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            )}
            <span className="r2-panel__where">{it.where}</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

function Experience() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="r2-sec" aria-labelledby="r2-exp">
      <h2 id="r2-exp" className="r2-h">
        Experience
      </h2>
      <ul className="r2-roles">
        {roles.map((r, i) => (
          <li key={r.org} data-open={open === i || undefined}>
            <button type="button" aria-expanded={open === i} aria-controls={`r2-role-${i}`} onClick={() => setOpen(open === i ? null : i)}>
              <span className="r2-roles__org">{r.org}</span>
              <span className="r2-roles__role">{r.role}</span>
              <span className="r2-roles__when">{r.when}</span>
              <span className="r2-roles__plus" aria-hidden="true" />
            </button>
            <div id={`r2-role-${i}`} className="r2-roles__body" hidden={open !== i}>
              <ul>
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Contact() {
  const [copied, setCopied] = useState(false)
  return (
    <section className="r2-sec r2-contact" id="contact" aria-labelledby="r2-contact">
      <h2 id="r2-contact" className="r2-h">
        Say hi
      </h2>
      <div className="r2-contact__row">
        <a className="r2-contact__mail" href={links.email.href}>
          {person.email}
        </a>
        <button
          type="button"
          className="r2-btn r2-btn--ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(person.email)
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            } catch {
              location.href = links.email.href
            }
          }}
        >
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy email'}</span>
        </button>
        <Socials />
      </div>
    </section>
  )
}

export function Home({ base }: { base: string }) {
  const { reduced } = useMotionPrefs()
  const [open, setOpen] = useState<TileId | null>(null)
  const grid = useBorderLight()
  const t = tiles.find((x) => x.id === open)
  const shut = useCallback(() => {
    const id = open
    setOpen(null)
    if (id) requestAnimationFrame(() => document.getElementById(`r2-open-${id}`)?.focus({ preventScroll: true }))
  }, [open])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && shut()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [open, shut])
  const layout = !reduced

  return (
    <>
      <div className="r2-bento" ref={grid}>
        <section className="r2-tile r2-me" style={{ gridArea: 'me' }} aria-label="About">
          <div className="r2-me__orb" aria-hidden="true" />
          <p className="r2-me__where">
            <span className="r2-dot" aria-hidden="true" />
            Victoria, BC · graduating Apr 2027
          </p>
          <h1 className="r2-name">
            Tanuj{' '}
            <br />
            Dargan
          </h1>
          <p className="r2-line">CS at UVic. I ship production ML and do interpretability research.</p>
          <div className="r2-me__links">
            <a className="r2-btn r2-btn--solid" href={links.resume.href} target="_blank" rel="noopener">
              <LinkIcon k="resume" size={15} /> Resume
            </a>
            <Socials />
          </div>
        </section>
        {tiles.map((x) => (
          <WorkTile key={x.id} t={x} open={open === x.id} onOpen={setOpen} layout={layout} />
        ))}
      </div>

      <AnimatePresence>{t && <Panel key={t.id} t={t} onClose={shut} base={base} layout={layout} />}</AnimatePresence>

      <div className="r2-below">
        <section className="r2-sec" aria-labelledby="r2-more">
          <h2 id="r2-more" className="r2-h">
            More
          </h2>
          <ul className="r2-more">
            {more.map((m) => {
              const body = (
                <>
                  <b>{m.title}</b>
                  <span>{m.line}</span>
                </>
              )
              return (
                <li key={m.title}>
                  {!m.href ? (
                    <div className="r2-more__item">{body}</div>
                  ) : m.ext ? (
                    <a className="r2-more__item" href={m.href} target="_blank" rel="noopener">
                      {body}
                    </a>
                  ) : (
                    <Link className="r2-more__item" to={`${base}${m.href}`}>
                      {body}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
        <Experience />
        <Contact />
        <footer className="r2-foot">
          <span>© 2026 {person.name}</span>
          <span>Demos run in your browser.</span>
        </footer>
      </div>
    </>
  )
}
