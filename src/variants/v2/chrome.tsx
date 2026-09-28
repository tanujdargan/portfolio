import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Command, CornerDownLeft, FileText, Github, Hash, Linkedin, Mail, Gauge } from 'lucide-react'
import { person, links, workLinkOrder, research, type LinkKey } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { Link, useRouter } from '../../lib/router'
import { useFlags } from '../../lib/labprefs'
import { useCommunity } from '../../content/useContent'
import { LEVELS } from '../../lib/motion'
import { ease, useTokens } from './motion'

export const sections = [
  { id: 'work', label: 'Work' },
  { id: 'research', label: 'Research' },
  { id: 'earlier', label: 'Earlier' },
  { id: 'contact', label: 'Contact' },
]

/* ---------------------------------------------------------------- icon links with intent tooltips */

/**
 * Five one-tap links. Tooltips wait 450ms the first time (hover intent),
 * then show instantly while the pointer stays in the group, like a native toolbar.
 */
export function IconLinks({ className = '', keys = workLinkOrder }: { className?: string; keys?: LinkKey[] }) {
  const [warm, setWarm] = useState(false)
  const cool = useRef(0)
  const heat = useRef(0)
  return (
    <ul
      className={`v2-icons ${className}`}
      data-warm={warm || undefined}
      onPointerEnter={() => clearTimeout(cool.current)}
      onPointerLeave={() => {
        clearTimeout(heat.current)
        cool.current = window.setTimeout(() => setWarm(false), 300)
      }}
    >
      {keys.map((k: LinkKey) => {
        const l = links[k]
        const ext = !l.href.startsWith('mailto:')
        return (
          <li key={k}>
            <a
              href={l.href}
              aria-label={l.label}
              {...(ext ? { target: '_blank', rel: 'noopener' } : {})}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse' || warm) return
                clearTimeout(heat.current)
                heat.current = window.setTimeout(() => setWarm(true), 450)
              }}
            >
              <LinkIcon k={k} size={16} />
              <span className="v2-tip" aria-hidden="true">
                {k === 'email' ? person.email : l.label}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

/* ---------------------------------------------------------------- P24 nav pill */

function Pill({ base, active, onCmd, mac }: { base: string; active: string; onCmd: () => void; mac: boolean }) {
  const { snap, m } = useTokens()
  const [hover, setHover] = useState<string | null>(null)
  const target = hover ?? active
  return (
    <nav aria-label="Sections" className="v2-pill-wrap">
      <ul className="v2-pill" onPointerLeave={() => setHover(null)}>
        {sections.map((s) => (
          <li key={s.id}>
            <Link
              to={`${base}/#${s.id}`}
              aria-current={active === s.id ? 'location' : undefined}
              onPointerEnter={() => setHover(s.id)}
              onFocus={() => setHover(s.id)}
              onBlur={() => setHover(null)}
            >
              <AnimatePresence>
                {target === s.id && (
                  <motion.span
                    layoutId="v2-pill-ind"
                    className="v2-pill__ind"
                    transition={snap}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: m.dur(0.12) } }}
                  />
                )}
              </AnimatePresence>
              <span className="v2-pill__t">{s.label}</span>
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className="v2-pill__k" onClick={onCmd} aria-label="Open command menu" aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}>
            <kbd>{mac ? '⌘' : 'Ctrl'}</kbd>
            <kbd>K</kbd>
          </button>
        </li>
      </ul>
    </nav>
  )
}

export function Nav({ base, home, onCmd }: { base: string; home: boolean; onCmd: () => void }) {
  const [active, setActive] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [nameIn, setNameIn] = useState(!home)
  const [mac, setMac] = useState(true)

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
  }, [])

  useEffect(() => {
    setNameIn(!home)
    if (!home) return
    const spy = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -60% 0px' })
    ;['top', ...sections.map((s) => s.id)].forEach((id) => {
      const el = document.getElementById(id === 'top' ? 'v2-top' : id)
      if (el) spy.observe(el)
    })
    const h1 = document.getElementById('v2-name')
    const nm = new IntersectionObserver(([e]) => setNameIn(!e.isIntersecting), { rootMargin: '-52px 0px 0px 0px' })
    if (h1) nm.observe(h1)
    return () => {
      spy.disconnect()
      nm.disconnect()
    }
  }, [home])

  useEffect(() => {
    // sentinel instead of a scroll listener
    const s = document.getElementById('v2-sentinel')
    if (!s) return
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting))
    io.observe(s)
    return () => io.disconnect()
  }, [])

  return (
    <header className="v2-nav" data-scrolled={scrolled || undefined}>
      <div className="v2-nav__in">
        <Link to={`${base}/`} className="v2-nav__name" data-in={nameIn || undefined} aria-label={`${person.name}, home`}>
          <span className="v2-nav__mono" aria-hidden="true">
            TD
          </span>
          <span className="v2-nav__full">{person.name}</span>
        </Link>
        <Pill base={base} active={home ? active : ''} onCmd={onCmd} mac={mac} />
        <div className="v2-nav__end">
          <IconLinks />
          <button type="button" className="v2-nav__cmd" onClick={onCmd} aria-label="Open command menu">
            <Command size={16} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}

/* ---------------------------------------------------------------- P25 command menu */

interface Cmd {
  id: string
  group: string
  label: string
  hint?: string
  icon: ReactNode
  keys?: string
  run: () => void | 'stay'
}

export function CommandMenu({ open, setOpen, base, home }: { open: boolean; setOpen: (v: boolean) => void; base: string; home: boolean }) {
  const { m, snap } = useTokens()
  const { navigate } = useRouter()
  const [q, setQ] = useState('')
  const [act, setAct] = useState(0)
  const [copied, setCopied] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)
  const byKeyboard = useRef(false)
  const { beri } = useFlags()
  const hasCommunity = useCommunity().length > 1

  // global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      } else if (e.key === '/' && !open && !(e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]')) {
        e.preventDefault()
        setOpen(true)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, setOpen])

  // open/close side effects: focus, scroll lock, restore
  useEffect(() => {
    if (!open) return
    prevFocus.current = document.activeElement as HTMLElement
    setQ('')
    setAct(0)
    setCopied(false)
    const html = document.documentElement
    const sw = innerWidth - html.clientWidth
    const prev = [html.style.overflow, html.style.paddingRight]
    html.style.overflow = 'hidden'
    if (sw) html.style.paddingRight = `${sw}px`
    requestAnimationFrame(() => input.current?.focus())
    return () => {
      html.style.overflow = prev[0]
      html.style.paddingRight = prev[1]
      prevFocus.current?.focus?.({ preventScroll: true })
    }
  }, [open])

  const cmds = useMemo<Cmd[]>(() => {
    const go = (id: string) => () => {
      if (home) {
        const el = document.getElementById(id)
        el?.scrollIntoView({ behavior: m.reduced ? 'auto' : 'smooth', block: 'start' })
        history.replaceState(null, '', `#${id}`)
      } else navigate(`${base}/#${id}`)
    }
    const ext = (href: string) => () => void window.open(href, '_blank', 'noopener')
    const nextLevel = LEVELS[(LEVELS.indexOf(m.level) + 1) % LEVELS.length]
    return [
      ...sections.map((s) => ({ id: `s-${s.id}`, group: 'Jump to', label: s.label, icon: <Hash size={14} />, run: go(s.id) })),
      ...(hasCommunity ? [{ id: 's-community', group: 'Jump to', label: 'Community', icon: <Hash size={14} />, run: go('community') }] : []),
      { id: 's-demo', group: 'Jump to', label: 'Steering demo', hint: 'drag α', icon: <Hash size={14} />, run: go('demo') },
      ...(beri ? [{ id: 'w-beri', group: 'Write-ups', label: 'Beri, a case study', icon: <ArrowRight size={14} />, run: () => navigate(`${base}/beri`) }] : []),
      ...research.map((r) => ({
        id: `w-${r.slug}`,
        group: 'Write-ups',
        label: r.title,
        hint: r.where.split(' · ')[0],
        icon: <ArrowRight size={14} />,
        run: () => navigate(`${base}/research/${r.slug}`),
      })),
      {
        id: 'a-copy',
        group: 'Contact',
        label: 'Copy email',
        hint: person.email,
        icon: <Mail size={14} />,
        run: () => {
          navigator.clipboard?.writeText(person.email).then(
            () => {
              setCopied(true)
              window.setTimeout(() => setOpen(false), 700)
            },
            () => (location.href = links.email.href),
          )
          return 'stay'
        },
      },
      { id: 'a-cv', group: 'Contact', label: 'Open resume', hint: 'PDF', icon: <FileText size={14} />, run: ext(links.resume.href) },
      { id: 'a-gh', group: 'Contact', label: 'GitHub', hint: 'tanujdargan', icon: <Github size={14} />, run: ext(links.github.href) },
      { id: 'a-in', group: 'Contact', label: 'LinkedIn', icon: <Linkedin size={14} />, run: ext(links.linkedin.href) },
      { id: 'a-x', group: 'Contact', label: 'X', icon: <LinkIcon k="x" size={14} />, run: ext(links.x.href) },
      { id: 'a-yt', group: 'Contact', label: 'YouTube', icon: <LinkIcon k="youtube" size={14} />, run: ext(links.youtube.href) },
      { id: 'a-us', group: 'Contact', label: 'Photos on Unsplash', icon: <LinkIcon k="unsplash" size={14} />, run: ext(links.unsplash.href) },
      {
        id: 'p-motion',
        group: 'Preferences',
        label: `Motion: ${m.level} → ${nextLevel}`,
        hint: m.reduced ? 'reduced by your OS' : undefined,
        icon: <Gauge size={14} />,
        run: () => {
          m.setLevel(nextLevel)
          return 'stay'
        },
      },
    ]
  }, [base, home, m, navigate, setOpen, beri, hasCommunity])

  const shown = useMemo(() => {
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (!words.length) return cmds
    return cmds.filter((c) => {
      const hay = `${c.group} ${c.label} ${c.hint ?? ''}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
  }, [q, cmds])

  useEffect(() => setAct(0), [q])
  // One indicator that slides between rows (a layoutId here kept the exiting dialog alive).
  const [ind, setInd] = useState<{ y: number; h: number; first: boolean } | null>(null)
  useEffect(() => {
    if (!open) return setInd(null)
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!el) return setInd(null)
    setInd((p) => ({ y: el.offsetTop, h: el.offsetHeight, first: !p }))
  }, [act, shown, open])
  useEffect(() => {
    if (!byKeyboard.current) return
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [act])

  const run = (c: Cmd) => {
    if (c.run() !== 'stay') setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = shown.length
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault()
      byKeyboard.current = true
      if (n) setAct((a) => (a + 1) % n)
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault()
      byKeyboard.current = true
      if (n) setAct((a) => (a - 1 + n) % n)
    } else if (e.key === 'Home' && !q) {
      e.preventDefault()
      setAct(0)
    } else if (e.key === 'End' && !q) {
      e.preventDefault()
      setAct(n - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (shown[act]) run(shown[act])
    } else if (e.key === 'Tab') {
      e.preventDefault() // focus stays in the dialog; arrows move the selection
    }
  }

  let lastGroup = ''
  const activeId = shown[act] ? `v2-cmd-${shown[act].id}` : undefined

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="v2-cmd"
          className="v2-cmd-root"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: m.dur(0.12), ease: 'easeOut' } }}
        >
          <motion.div
            className="v2-cmd-scrim"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: m.dur(0.12) }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            className="v2-cmd"
            onKeyDown={onKeyDown}
            initial={m.reduced ? { opacity: 0 } : { opacity: 0, scale: 1 - 0.04 * m.k, y: -6 * m.k }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: m.dur(0.18), ease: ease.out }}
          >
            <div className="v2-cmd__bar">
              <Command size={14} strokeWidth={1.6} aria-hidden="true" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Jump to, open a write-up, copy email…"
                aria-label="Search commands"
                role="combobox"
                aria-expanded="true"
                aria-controls="v2-cmd-list"
                aria-activedescendant={activeId}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className="v2-cmd__esc" onClick={() => setOpen(false)}>
                esc
              </button>
            </div>
            <div className="v2-cmd__list" id="v2-cmd-list" role="listbox" aria-label="Commands" ref={listRef}>
              {ind && (
                <motion.span
                  className="v2-cmd__ind"
                  aria-hidden="true"
                  initial={false}
                  animate={{ y: ind.y, height: ind.h }}
                  transition={ind.first ? { duration: 0 } : snap}
                />
              )}
              {shown.length === 0 && <p className="v2-cmd__empty">Nothing for “{q}”. Try “steer”, {beri ? '“beri”' : '“gpu”'} or “email”.</p>}
              {shown.map((c, i) => {
                const head = c.group !== lastGroup
                lastGroup = c.group
                const on = i === act
                const done = c.id === 'a-copy' && copied
                return (
                  <div key={c.id} role="presentation">
                    {head && (
                      <div className="v2-cmd__group" role="presentation">
                        {c.group}
                      </div>
                    )}
                    <div
                      id={`v2-cmd-${c.id}`}
                      role="option"
                      aria-selected={on}
                      className="v2-cmd__item"
                      onPointerMove={() => {
                        byKeyboard.current = false
                        if (!on) setAct(i)
                      }}
                      onClick={() => run(c)}
                    >
                      <span className="v2-cmd__icon" aria-hidden="true">
                        {done ? <Check size={14} /> : c.icon}
                      </span>
                      <span className="v2-cmd__label">
                        {done ? 'Copied' : c.label}
                        {c.id === 'a-x' && <Flag note="X handle guessed; not found on GitHub, old site or resume." />}
                      </span>
                      {c.hint && <span className="v2-cmd__hint">{c.hint}</span>}
                      <span className="v2-cmd__enter" aria-hidden="true">
                        <CornerDownLeft size={12} />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="v2-cmd__foot" aria-hidden="true">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> move
              </span>
              <span>
                <kbd>↵</kbd> open
              </span>
              <span>
                <kbd>esc</kbd> close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
