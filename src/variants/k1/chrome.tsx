/* K1 chrome: the curved curtain, the header, the floating menu button + drawer, and the contact footer. */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter, Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { lenis } from '../../lib/lenis'
import { links, person } from '../../content/site'
import { education } from '../../content/curated'
import { LinkIcon } from '../../shared/Links'
import { CurtainCtx, MagA, MagButton, useScrollLinked, ArrowUR, ArrowDR } from './bits'

const EASE = 'cubic-bezier(.76,0,.24,1)'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

/* ---------------- curtain ---------------- */
export function CurtainProvider({ children }: { children: ReactNode }) {
  const { navigate } = useRouter()
  const { reduced } = useMotionPrefs()
  const root = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [label, setLabel] = useState('')

  const go = useCallback(
    async (to: string, l: string) => {
      const el = root.current
      if (!el || busy.current) return
      busy.current = true
      setLabel(l)
      el.dataset.on = '1'
      const panel = el.querySelector<HTMLElement>('.k1-curtain__panel')!
      const top = el.querySelector<HTMLElement>('.k1-curtain__top')!
      const bot = el.querySelector<HTMLElement>('.k1-curtain__bot')!
      const txt = el.querySelector<HTMLElement>('.k1-curtain__label')!
      const anims: Animation[] = []
      const run = (n: HTMLElement, k: Keyframe[], o: KeyframeAnimationOptions) => {
        const a = n.animate(k, { fill: 'forwards', ...o })
        anims.push(a)
        return a
      }
      const commit = async () => {
        lenis()?.scrollTo(0, { immediate: true, force: true })
        navigate(to)
        await frames()
        document.getElementById('k1-main')?.focus({ preventScroll: true })
      }
      try {
        if (reduced) {
          await run(panel, [{ opacity: 0, transform: 'none' }, { opacity: 1, transform: 'none' }], { duration: 160 }).finished
          await commit()
          await run(panel, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'none' }], { duration: 220 }).finished
        } else {
          // cover: the panel rises with a bowed top edge that flattens as it lands
          const up = run(panel, [{ transform: 'translateY(calc(100% + 22vh))' }, { transform: 'translateY(0)' }], { duration: 760, easing: EASE })
          run(top, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.9)', offset: 0.55 }, { transform: 'scaleY(0)' }], { duration: 760, easing: EASE })
          run(bot, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(0)' }], { duration: 1 })
          run(txt, [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 560, delay: 300, easing: 'cubic-bezier(.16,1,.3,1)' })
          await up.finished
          await commit()
          await wait(140)
          // reveal: it keeps going up, now bowing at the bottom edge
          const off = run(panel, [{ transform: 'translateY(0)' }, { transform: 'translateY(calc(-100% - 22vh))' }], { duration: 860, easing: EASE })
          run(bot, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.45 }, { transform: 'scaleY(1)' }], { duration: 860, easing: EASE })
          run(txt, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-60px)' }], { duration: 420, easing: 'cubic-bezier(.7,0,.84,0)' })
          await off.finished
        }
      } finally {
        el.dataset.on = '0'
        anims.forEach((a) => a.cancel())
        busy.current = false
      }
    },
    [navigate, reduced],
  )
  const value = useMemo(() => ({ go }), [go])
  return (
    <CurtainCtx.Provider value={value}>
      {children}
      <div className="k1-curtain" ref={root} data-on="0" aria-hidden="true">
        <div className="k1-curtain__panel">
          <div className="k1-curtain__top" />
          <div className="k1-curtain__bot" />
          <p className="k1-curtain__label">
            <i />
            {label}
          </p>
        </div>
      </div>
    </CurtainCtx.Provider>
  )
}

/* ---------------- header ---------------- */
/** Same-page anchor on home; a router link to home + hash elsewhere (a plain href would reload the page). */
function Hash({ id, home, base, children, className, onClick }: { id: string; home: boolean; base: string; children: ReactNode; className?: string; onClick?: () => void }) {
  return home ? (
    <a href={`#${id}`} className={className} onClick={onClick}>
      {children}
    </a>
  ) : (
    <Link to={`${base}/#${id}`} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}

export function Header({ base, onMenu, home }: { base: string; onMenu: () => void; home: boolean }) {
  return (
    <header className="k1-head">
      <Link to={`${base}/`} className="k1-logo" aria-label="Tanuj Dargan, home">
        <span className="k1-logo__c" aria-hidden="true">
          ©
        </span>
        <span className="k1-logo__roll" aria-hidden="true">
          <span>Code by Tanuj</span>
          <span>Tanuj Dargan</span>
        </span>
      </Link>
      <nav className="k1-nav" aria-label="Primary">
        <Hash id="work" home={home} base={base} className="k1-nav__a">
          Work
        </Hash>
        <Hash id="experience" home={home} base={base} className="k1-nav__a">
          Experience
        </Hash>
        <a href="#contact" className="k1-nav__a">
          Contact
        </a>
        <MagA href={links.resume.href} variant="line" className="k1-nav__cv" strength={0.3}>
          Resume <span className="k1-dim">PDF</span>
        </MagA>
      </nav>
      <button type="button" className="k1-head__menu" onClick={onMenu} aria-haspopup="dialog">
        Menu <i aria-hidden="true" />
      </button>
    </header>
  )
}

/* ---------------- floating menu + drawer ---------------- */
export function Menu({ base, open, setOpen, home }: { base: string; open: boolean; setOpen: (v: boolean) => void; home: boolean }) {
  const [shown, setShown] = useState(false)
  const fab = () => document.querySelector<HTMLElement>('.k1-fab__btn')
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const on = () => setShown(scrollY > innerHeight * 0.55)
    addEventListener('scroll', on, { passive: true })
    on()
    return () => removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const l = lenis()
    l?.stop()
    panel.current?.querySelector<HTMLElement>('a')?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'Tab' && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>('a, button'))
        if (!f.length) return
        const b = fab()
        if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), b?.focus())
        else if (!e.shiftKey && document.activeElement === b) (e.preventDefault(), f[0].focus())
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), b?.focus())
      }
    }
    addEventListener('keydown', key)
    return () => {
      removeEventListener('keydown', key)
      l?.start()
    }
  }, [open, setOpen])
  const close = () => setOpen(false)
  const item = (id: string, t: string) => (
    <li key={t}>
      {id === 'contact' ? (
        <a href="#contact" onClick={close} className="k1-drawer__a">
          {t}
        </a>
      ) : (
        <Hash id={id} home={home} base={base} onClick={close} className="k1-drawer__a">
          {t}
        </Hash>
      )}
    </li>
  )
  return (
    <>
      <div className="k1-fab" data-shown={shown || open ? '1' : '0'}>
        <MagButton
          variant="circle"
          className="k1-fab__btn"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          strength={0.4}
        >
          <span className="k1-burger" data-open={open ? '1' : '0'} aria-hidden="true">
            <i />
            <i />
          </span>
        </MagButton>
      </div>
      <div className="k1-drawer" data-open={open ? '1' : '0'} onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="k1-drawer__panel" ref={panel} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open} {...(!open ? { inert: '' as never } : {})}>
          <span className="k1-drawer__curve" aria-hidden="true" />
          <p className="k1-label">Navigation</p>
          <ul className="k1-drawer__list">
            {item('top', 'Home')}
            {item('work', 'Work')}
            {item('how', 'How it works')}
            {item('experience', 'Experience')}
            {item('contact', 'Contact')}
          </ul>
          <p className="k1-label">Links</p>
          <ul className="k1-drawer__soc">
            {(['resume', 'email', 'linkedin', 'github', 'x'] as const).map((k) => (
              <li key={k}>
                <a href={links[k].href} {...(k === 'email' || k === 'resume' ? {} : { target: '_blank', rel: 'noopener' })} onClick={close}>
                  {links[k].label}
                  {k === 'resume' ? ' (PDF)' : ''}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

/* ---------------- footer / contact ---------------- */
function Clock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = () => setT(new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Vancouver', timeZoneName: 'short' }).format(new Date()))
    f()
    const id = setInterval(f, 30_000)
    return () => clearInterval(id)
  }, [])
  return <span suppressHydrationWarning>{t || 'Pacific time'}</span>
}

export function Contact() {
  const curve = useRef<HTMLDivElement>(null)
  const loop = useRef<SVGPathElement>(null)
  // Dennis' curved section edge: the dark block above bows into the footer and flattens as the footer scrolls in
  useScrollLinked(curve, (r, vh) => {
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)))
    curve.current!.style.setProperty('--k1-bow', String(1 - p))
    if (loop.current && p > 0.35) loop.current.dataset.draw = '1'
  })
  return (
    <footer className="k1-foot" id="contact">
      <div className="k1-foot__curve" ref={curve} aria-hidden="true">
        <span />
      </div>
      <div className="k1-foot__in">
        <h2 className="k1-foot__h">
          <span className="k1-foot__mark" aria-hidden="true">
            <SatGlyph />
          </span>
          Let’s work{' '}
          <span className="k1-foot__together">
            together
            <svg viewBox="0 0 320 110" preserveAspectRatio="none" aria-hidden="true" className="k1-loop">
              <path ref={loop} pathLength={1} d="M18 62C14 30 92 10 172 12c78 2 138 18 134 50-4 34-92 42-168 40C62 100 8 88 16 56 22 34 66 22 112 18" />
            </svg>
          </span>
        </h2>
        <div className="k1-foot__rule">
          <span className="k1-foot__line" />
          <MagA href={links.email.href} variant="circle" className="k1-foot__cta" strength={0.45}>
            Get in touch
          </MagA>
        </div>
        <div className="k1-foot__pills">
          <MagA href={links.email.href} variant="line" strength={0.25}>
            {person.email}
          </MagA>
          <MagA href={links.resume.href} variant="line" strength={0.25}>
            Resume (PDF)
          </MagA>
          <MagA href={links.linkedin.href} target="_blank" rel="noopener" variant="line" strength={0.25}>
            LinkedIn
          </MagA>
        </div>
        <div className="k1-foot__bar">
          <div>
            <p className="k1-label">Education</p>
            <p>
              {education.school}, {education.degree.replace(' (accelerated, 3 years)', '')}, {education.when}
            </p>
          </div>
          <div>
            <p className="k1-label">Local time</p>
            <p>
              <Clock />
            </p>
          </div>
          <div className="k1-foot__soc">
            <p className="k1-label">Socials</p>
            <ul>
              {(['github', 'linkedin', 'x'] as const).map((k) => (
                <li key={k}>
                  <a href={links[k].href} target="_blank" rel="noopener">
                    <LinkIcon k={k} size={15} /> {links[k].label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="k1-foot__name" aria-hidden="true">
          Tanuj Dargan
        </p>
      </div>
    </footer>
  )
}

/** A tiny satellite, drawn the way the mission patch would: the one playful mark on the site. */
export function SatGlyph() {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" aria-hidden="true" className="k1-sat">
      <g className="k1-sat__body">
        <rect x="24" y="24" width="16" height="16" rx="3" fill="#f1f0ec" />
        <rect x="28" y="28" width="8" height="8" rx="1.5" fill="#455ce9" />
        <g className="k1-sat__wing k1-sat__wing--l">
          <rect x="4" y="27" width="16" height="10" rx="1.5" fill="#2a2c33" stroke="#f1f0ec" strokeWidth="1.2" />
          <path d="M9.3 27v10M14.6 27v10" stroke="#f1f0ec" strokeWidth=".8" />
          <path d="M20 32h4" stroke="#f1f0ec" strokeWidth="1.2" />
        </g>
        <g className="k1-sat__wing k1-sat__wing--r">
          <rect x="44" y="27" width="16" height="10" rx="1.5" fill="#2a2c33" stroke="#f1f0ec" strokeWidth="1.2" />
          <path d="M49.3 27v10M54.6 27v10" stroke="#f1f0ec" strokeWidth=".8" />
          <path d="M40 32h4" stroke="#f1f0ec" strokeWidth="1.2" />
        </g>
        <path d="M32 24v-8" stroke="#f1f0ec" strokeWidth="1.2" />
        <circle cx="32" cy="14" r="2.4" fill="#8796ff" className="k1-sat__blink" />
      </g>
    </svg>
  )
}

export { ArrowUR, ArrowDR }
