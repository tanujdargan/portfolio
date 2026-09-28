import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { person, links } from '../../content/site'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { Flag } from '../../shared/Flag'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'

/** Neither serif ships arrows in its latin subset, so arrows are drawn. `out` tilts it for external links. */
export function Arrow({ out = false, down = false }: { out?: boolean; down?: boolean }) {
  return (
    <svg
      className="c4-arrow"
      width="0.8em"
      height="0.8em"
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ transform: down ? 'rotate(90deg)' : out ? 'rotate(-45deg)' : undefined }}
    >
      <path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Scroll to an element without touching the URL (a hash change would re-route the app). */
export function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

/** A link that routes internally for `to` and opens a new tab for `href`. */
export function Go({ to, href, children, className = 'c4-go' }: { to?: string; href?: string; children: ReactNode; className?: string }) {
  if (to)
    return (
      <Link to={to} className={className}>
        {children} <Arrow />
      </Link>
    )
  return (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children} <Arrow out />
    </a>
  )
}

/**
 * P17-style display number, borrowed from v4b's split-flap but quieter: the characters rise into place once, the
 * first time the number scrolls into view. SSR renders it static, so it's readable with no JS; if it's already on
 * screen at mount, it stays static. Travel scales with --k (0 under reduced motion, leaving a crossfade).
 */
export function Big({ value, unit }: { value: string; unit: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const el = ref.current!
    const r = el.getBoundingClientRect()
    if (r.top < innerHeight && r.bottom > 0) return
    el.dataset.armed = ''
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        el.dataset.on = ''
        io.disconnect()
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <p className="c4-big" ref={ref}>
      <span className="c4-sr">{value}</span>
      <span className="c4-big__v" aria-hidden="true">
        {Array.from(value).map((c, i) => (
          <span key={i} style={{ ['--i' as string]: i }}>
            {c === ' ' ? ' ' : c}
          </span>
        ))}
      </span>
      <span className="c4-big__u">{unit}</span>
    </p>
  )
}

/** Left column mark for a minor entry: the org's logo when there is one, else a small typed kind. */
export type Mark = { org: OrgKey } | { kind: string }
function MarkCell({ mark }: { mark: Mark }) {
  return <span className="c4-mark">{'org' in mark ? <OrgLogo org={mark.org} height={15} /> : <span className="c4-mark__k">{mark.kind}</span>}</span>
}

/** A grid-rows 0fr → 1fr drawer. Closed content is inert so it can't take focus. */
export function Drawer({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div className="c4-drawer" id={id} data-open={open || undefined} {...({ inert: open ? undefined : '' } as object)}>
      <div className="c4-drawer__in">{children}</div>
    </div>
  )
}

/** One-line index entry with a mark. Expands to its details when it has any. */
export function Minor({
  mark,
  title,
  line,
  when,
  more,
  to,
  href,
  go,
  flag,
}: {
  mark: Mark
  title: string
  line: string
  when: string
  more?: string[]
  to?: string
  href?: string
  go?: string
  flag?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const head = (
    <>
      <MarkCell mark={mark} />
      <span className="c4-minor__txt">
        <span className="c4-minor__t">
          {title}
          {flag && <Flag note={flag} />}
        </span>
        <span className="c4-minor__l">{line}</span>
      </span>
      <span className="c4-minor__when">{when}</span>
    </>
  )
  if (!more?.length)
    return (
      <li className="c4-minor">
        {to ? (
          <Link className="c4-minor__row" to={to}>
            {head}
            <span className="c4-minor__ic" aria-hidden="true">
              <Arrow />
            </span>
          </Link>
        ) : href ? (
          <a className="c4-minor__row" href={href} target="_blank" rel="noopener">
            {head}
            <span className="c4-minor__ic" aria-hidden="true">
              <Arrow out />
            </span>
          </a>
        ) : (
          <div className="c4-minor__row">
            {head}
            <span className="c4-minor__ic" />
          </div>
        )}
      </li>
    )
  return (
    <li className="c4-minor" data-open={open || undefined}>
      <button type="button" className="c4-minor__row" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {head}
        <span className="c4-minor__ic c4-plus" aria-hidden="true" />
      </button>
      <Drawer open={open} id={id}>
        <div className="c4-minor__more">
          <ul>
            {more.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {(to || href) && (
            <Go to={to} href={href}>
              {go ?? 'More'}
            </Go>
          )}
        </div>
      </Drawer>
    </li>
  )
}

/** v4b's copy-email morph, in this notebook's type. */
export function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  return (
    <button
      type="button"
      className="c4-copy"
      aria-label={copied ? 'Email address copied' : `Copy email address ${person.email}`}
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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          className="c4-copy__v"
          initial={{ opacity: 0, y: 10 * m.k, filter: m.reduced ? 'none' : 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10 * m.k, filter: m.reduced ? 'none' : 'blur(3px)' }}
          transition={{ duration: m.dur(0.22), ease: [0.23, 1, 0.32, 1] }}
        >
          {copied ? 'Copied. Talk soon.' : person.email}
        </motion.span>
      </AnimatePresence>
      <span className="c4-copy__hint" aria-hidden="true">
        {copied ? '' : 'copy'}
      </span>
    </button>
  )
}
