import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Apple, ArrowUpRight, Database, Dna, Medal, Play, Search, SlidersHorizontal, Square, Trophy } from 'lucide-react'
import { Logo } from '../../shared/Mark'
import { Poster } from '../../shared/Poster'
import { LinkIcon } from '../../shared/Links'
import { Demo } from '../../demos/Demo'
import { prefetchDemo } from '../../content/work'
import { person } from '../../content/site'
import { useRouter } from '../../lib/router'
import { amazonMetrics, filterRows, groups, workRows, type Row, type WorkRow } from './data'

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
const narrow = () => typeof window !== 'undefined' && matchMedia('(max-width: 760px)').matches

export const Key = ({ children, wide = false }: { children: ReactNode; wide?: boolean }) => (
  <kbd className="r3-key" data-wide={wide || undefined}>
    {children}
  </kbd>
)

const moreIcon = { db: Database, dna: Dna, trophy: Trophy, medal: Medal, apple: Apple }

function Icon({ r, size = 22 }: { r: Row; size?: number }) {
  if (r.kind === 'role' && r.mark === 'pearcare')
    return (
      <span className="r3-ico r3-ico--type" data-k="pear" style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }} role="img" aria-label="Pear Care">
        p
      </span>
    )
  if ((r.kind === 'work' || r.kind === 'role') && r.mark)
    return (
      <span className="r3-ico r3-ico--logo" style={{ width: size, height: size }}>
        <Logo m={r.mark} w={size - 4} h={size - 4} />
      </span>
    )
  const I = r.kind === 'work' ? SlidersHorizontal : r.kind === 'more' ? moreIcon[r.icon] : null
  return (
    <span className="r3-ico" data-k={r.kind === 'link' ? r.k : r.kind === 'more' ? r.icon : 'steer'} style={{ width: size, height: size }}>
      {I ? <I size={Math.round(size * 0.6)} strokeWidth={1.8} aria-hidden="true" /> : r.kind === 'link' && <LinkIcon k={r.k} size={Math.round(size * 0.62)} />}
    </span>
  )
}

type Action = { label: string; run: () => void } | null

/** The palette. Rows are real buttons/links, so the SSR output is the full list and works without JS. */
export function Palette({ base }: { base: string }) {
  const { navigate } = useRouter()
  const [query, setQuery] = useState('')
  const [selId, setSelId] = useState(workRows[0].id)
  const [open, setOpen] = useState<string | null>(null) // mobile: row expanded inline
  const [live, setLive] = useState<string | null>(null) // work whose live demo runs
  const [toast, setToast] = useState<string | null>(null)
  const [mac, setMac] = useState(true)
  const input = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const kbd = useRef(false) // selection moved by keyboard: scroll it into view
  const toastT = useRef<number>()

  const shown = useMemo(() => filterRows(query), [query])
  const sel = shown.find((r) => r.id === selId) ?? shown[0] ?? null

  useEffect(() => setMac(isMac()), [])
  // The light behind the palette takes the selected work's colour.
  useEffect(() => {
    const root = listRef.current?.closest<HTMLElement>('.r3')
    root?.style.setProperty('--r3-a', sel?.kind === 'work' ? sel.accent : '#ff6363')
  }, [sel])
  useEffect(() => {
    if (live && sel?.id !== live) setLive(null)
  }, [sel?.id, live])

  const say = useCallback((m: string) => {
    setToast(m)
    clearTimeout(toastT.current)
    toastT.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  const copyEmail = useCallback(() => {
    const done = () => say(`Copied ${person.email}`)
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(person.email).then(done, () => (location.href = `mailto:${person.email}`))
    else location.href = `mailto:${person.email}`
  }, [say])

  const ext = (href: string) => window.open(href, '_blank', 'noopener')

  const primary = useCallback(
    (r: Row | null): Action => {
      if (!r) return null
      if (r.kind === 'work') {
        if (r.slug) return { label: 'Open write-up', run: () => navigate(`${base}/research/${r.slug}`) }
        if (r.demo) return { label: 'Run live demo', run: () => setLive((v) => (v === r.id ? null : r.id)) }
        return { label: 'Open resume', run: () => ext('/resume.pdf') }
      }
      if (r.kind === 'more' && r.href) return r.ext ? { label: 'Open link', run: () => ext(r.href!) } : { label: 'Open write-up', run: () => navigate(`${base}${r.href}`) }
      if (r.kind === 'link') return r.k === 'email' ? { label: 'Copy email', run: copyEmail } : { label: `Open ${r.title}`, run: () => ext(r.href) }
      return null
    },
    [base, navigate, copyEmail],
  )
  const secondary = (r: Row | null): Action =>
    r?.kind === 'work' && r.demo && r.slug ? { label: live === r.id ? 'Stop demo' : 'Run demo', run: () => setLive((v) => (v === r.id ? null : r.id)) } : null

  const move = (d: number) => {
    if (!shown.length) return
    const i = sel ? shown.indexOf(sel) : -1
    const next = shown[(i + d + shown.length) % shown.length]
    kbd.current = true
    setSelId(next.id)
    return next
  }

  useEffect(() => {
    if (!kbd.current || !sel) return
    kbd.current = false
    document.getElementById(`r3-${sel.id}`)?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  // ⌘K / Ctrl+K focuses the search from anywhere; typing on the bare page starts a search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
        return
      }
      const a = document.activeElement
      if (e.key === '/' && (!a || a === document.body)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const a = e.metaKey || e.ctrlKey ? secondary(sel) ?? primary(sel) : primary(sel)
      a?.run()
    } else if (e.key === 'Escape') {
      if (query) {
        e.preventDefault()
        setQuery('')
        setSelId(workRows[0].id)
      } else input.current?.blur()
    }
  }

  // Arrow keys inside the list move focus between rows.
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const next = move(e.key === 'ArrowDown' ? 1 : -1)
    if (next) requestAnimationFrame(() => document.getElementById(`r3-${next.id}`)?.focus())
  }

  const onRow = (r: Row, e: React.MouseEvent) => {
    if (r.kind === 'link') {
      if (r.k === 'email' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        copyEmail()
      }
      setSelId(r.id)
      return
    }
    if (r.kind === 'work' && r.demo) prefetchDemo[r.demo]()
    if (narrow()) {
      setSelId(r.id)
      setOpen((o) => (o === r.id ? null : r.id))
      return
    }
    // Desktop: first click selects, a second click on the selected row runs its action (Raycast's double-click).
    if (sel?.id === r.id) primary(r)?.run()
    else setSelId(r.id)
  }

  const hover = (r: Row) => {
    if (sel?.id === r.id) return
    if (r.kind === 'work' && r.demo) prefetchDemo[r.demo]()
    setSelId(r.id)
  }

  const act = primary(sel)
  const act2 = secondary(sel)

  return (
    <section className="r3-palette" aria-label="Tanuj's work, as a command palette" id="research">
      <div className="r3-search">
        <Search size={18} strokeWidth={1.8} aria-hidden="true" className="r3-search__ico" />
        <input
          ref={input}
          className="r3-search__in"
          type="search"
          value={query}
          placeholder="Search Tanuj’s work…"
          aria-label="Search Tanuj’s work"
          aria-controls="r3-list"
          aria-describedby="r3-hint"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            const q = e.target.value
            setQuery(q)
            setOpen(null)
            setSelId(filterRows(q)[0]?.id ?? workRows[0].id)
          }}
          onKeyDown={onInputKey}
        />
        <span className="r3-search__hint" aria-hidden="true">
          <Key>{mac ? '⌘' : 'Ctrl'}</Key>
          <Key>K</Key>
        </span>
        <span id="r3-hint" className="r3-sr">
          Arrow keys move through the list, Enter opens.
        </span>
        <span className="r3-sr" aria-live="polite">
          {sel ? `${sel.title}, ${sel.right}` : `No results`}
        </span>
      </div>

      <div className="r3-body">
        <div className="r3-list" id="r3-list" ref={listRef} onKeyDown={onListKey}>
          {groups.map((g) => {
            const items = shown.filter((r) => r.group === g)
            if (!items.length) return null
            return (
              <section key={g} className="r3-group" aria-labelledby={`r3-g-${g}`}>
                <h2 className="r3-group__h" id={`r3-g-${g}`}>
                  {g}
                </h2>
                <ul>
                  {items.map((r) => (
                    <li key={r.id}>
                      <RowEl r={r} on={sel?.id === r.id} expanded={open === r.id} onClick={(e) => onRow(r, e)} onHover={() => hover(r)} />
                      {open === r.id && (
                        <div className="r3-inline">
                          <Preview r={r} base={base} live={live === r.id} setLive={(v) => setLive(v ? r.id : null)} inline />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {!shown.length && (
            <p className="r3-empty">
              No results for “{query}”. <button type="button" onClick={() => setQuery('')}>Clear search</button>
            </p>
          )}
        </div>

        <div className="r3-preview">
          {sel && <Preview key={sel.id} r={sel} base={base} live={live === sel.id} setLive={(v) => setLive(v ? sel.id : null)} />}
        </div>
      </div>

      <footer className="r3-bar">
        <span className="r3-bar__who">
          <span className="r3-bar__logo" aria-hidden="true">
            T
          </span>
          {sel ? `${sel.group} · ${sel.title}` : person.name}
        </span>
        <span className="r3-bar__acts">
          {act && (
            <button type="button" className="r3-bar__act" onClick={act.run}>
              {act.label} <Key>↵</Key>
            </button>
          )}
          {act2 && (
            <>
              <span className="r3-bar__sep" aria-hidden="true" />
              <button type="button" className="r3-bar__act r3-bar__act--2" onClick={act2.run}>
                {act2.label} <Key>{mac ? '⌘' : 'Ctrl'}</Key>
                <Key>↵</Key>
              </button>
            </>
          )}
          {act && <span className="r3-bar__sep" aria-hidden="true" />}
          <span className="r3-bar__hint" aria-hidden="true">
            <Key>↑</Key>
            <Key>↓</Key> Navigate
          </span>
          <span className="r3-bar__hint" aria-hidden="true">
            <Key wide>esc</Key> Clear
          </span>
        </span>
      </footer>

      <div className="r3-toast" role="status" data-on={toast ? '' : undefined}>
        {toast}
      </div>
    </section>
  )
}

function RowEl({ r, on, expanded, onClick, onHover }: { r: Row; on: boolean; expanded: boolean; onClick: (e: React.MouseEvent) => void; onHover: () => void }) {
  const inner = (
    <>
      {on && <motion.span layoutId="r3-sel" className="r3-row__sel" aria-hidden="true" transition={{ type: 'spring', stiffness: 650, damping: 48, mass: 0.7 }} />}
      <Icon r={r} />
      <span className="r3-row__t">
        <span className="r3-row__title">{r.title}</span>
        {r.sub && <span className="r3-row__sub">{r.sub}</span>}
      </span>
      <span className="r3-row__r">{r.right}</span>
    </>
  )
  const common = {
    id: `r3-${r.id}`,
    className: 'r3-row',
    'data-on': on || undefined,
    'data-kind': r.kind,
    onMouseMove: onHover,
    onFocus: onHover,
    onClick,
  }
  if (r.kind === 'link') {
    const outward = r.k !== 'email'
    return (
      <a {...common} href={r.href} {...(outward ? { target: '_blank', rel: 'noopener' } : {})}>
        {inner}
      </a>
    )
  }
  return (
    <button type="button" {...common} aria-expanded={expanded} style={r.kind === 'work' ? ({ '--a': r.accent } as React.CSSProperties) : undefined}>
      {inner}
    </button>
  )
}

function Act({ href, base, children }: { href: string; base: string; children: ReactNode }) {
  const { navigate } = useRouter()
  const outward = href.startsWith('http') || href.endsWith('.pdf')
  const to = outward ? href : `${base}${href}`
  return (
    <a
      className="r3-btn"
      href={to}
      {...(outward ? { target: '_blank', rel: 'noopener' } : {})}
      onClick={(e) => {
        if (outward || e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        navigate(to)
      }}
    >
      {children}
      <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
    </a>
  )
}

function Media({ w, live, setLive }: { w: WorkRow; live: boolean; setLive: (v: boolean) => void }) {
  if (!w.demo)
    return (
      <div className="r3-metrics">
        {amazonMetrics.map((m) => (
          <div key={m.l}>
            <b>{m.n}</b>
            <span>{m.l}</span>
          </div>
        ))}
      </div>
    )
  return (
    <div className="r3-media" data-live={live || undefined}>
      {live ? (
        <Demo kind={w.demo} compact />
      ) : (
        <button type="button" className="r3-poster" onClick={() => setLive(true)} onMouseEnter={() => prefetchDemo[w.demo!]()} aria-label={`Run the live demo: ${w.title}`}>
          <Poster k={w.demo} label />
          <span className="r3-poster__run">
            <Play size={12} strokeWidth={2.2} aria-hidden="true" fill="currentColor" /> Run live demo
          </span>
        </button>
      )}
    </div>
  )
}

function Preview({ r, base, live, setLive, inline = false }: { r: Row; base: string; live: boolean; setLive: (v: boolean) => void; inline?: boolean }) {
  const H = inline ? 'h3' : 'h2'
  if (r.kind === 'work')
    return (
      <article className="r3-pv" style={{ '--accent': r.accent } as React.CSSProperties}>
        {!inline && (
          <header className="r3-pv__head">
            <Icon r={r} size={28} />
            <span>
              <span className="r3-pv__org">{r.sub}</span>
              <span className="r3-pv__when">{r.when}</span>
            </span>
          </header>
        )}
        <H className="r3-pv__title">{r.long}</H>
        <Media w={r} live={live} setLive={setLive} />
        <p className="r3-pv__p">{r.finding}</p>
        <dl className="r3-meta">
          <div>
            <dt>Result</dt>
            <dd className="r3-meta__res">{r.right}</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>{r.where}</dd>
          </div>
        </dl>
        <div className="r3-pv__acts" hidden={!r.slug && !!r.demo && !live}>
          {r.slug && <Act href={`/research/${r.slug}`} base={base}>Read the write-up</Act>}
          {r.demo && live && (
            <button type="button" className="r3-btn r3-btn--ghost" onClick={() => setLive(false)}>
              <Square size={11} strokeWidth={2.2} fill="currentColor" aria-hidden="true" /> Stop demo
            </button>
          )}
          {!r.demo && <Act href="/resume.pdf" base={base}>Resume</Act>}
        </div>
      </article>
    )
  if (r.kind === 'more')
    return (
      <article className="r3-pv">
        {!inline && (
          <header className="r3-pv__head">
            <Icon r={r} size={28} />
            <span>
              <span className="r3-pv__org">More</span>
              <span className="r3-pv__when">{r.right}</span>
            </span>
          </header>
        )}
        <H className="r3-pv__title">{r.title}</H>
        <p className="r3-pv__p">{r.line}</p>
        {r.href && (
          <div className="r3-pv__acts">
            <Act href={r.href} base={base}>{r.ext ? 'Visit' : 'Read the write-up'}</Act>
          </div>
        )}
      </article>
    )
  if (r.kind === 'role')
    return (
      <article className="r3-pv">
        {!inline && (
          <header className="r3-pv__head">
            <Icon r={r} size={28} />
            <span>
              <span className="r3-pv__org">{r.org}</span>
              <span className="r3-pv__when">{r.when}</span>
            </span>
          </header>
        )}
        <H className="r3-pv__title">{r.role}</H>
        <ul className="r3-bullets">
          {r.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </article>
    )
  return (
    <article className="r3-pv r3-pv--link">
      <Icon r={r} size={48} />
      <H className="r3-pv__title">{r.title}</H>
      <p className="r3-pv__mono">{r.k === 'email' ? r.sub : r.href.replace(/^https?:\/\//, '')}</p>
    </article>
  )
}
