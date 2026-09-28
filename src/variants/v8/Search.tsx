import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFlags } from '../../lib/labprefs'
import { useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { Flag } from '../../shared/Flag'
import { OrgLogo } from '../../shared/OrgLogo'
import { plan as makePlan, visibleDocs, suggestions, groupNames, K, type Doc, type Plan } from './index-docs'
import { field, events } from './fieldClient'

// ---------- shared search state ----------
interface SearchCtx {
  open: boolean
  openWith: (q?: string) => void
  close: () => void
  query: string
  setQuery: (q: string) => void
  nprobe: number
  setNprobe: (n: number) => void
  plan: Plan | null
  pool: Doc[]
  select: (d: Doc) => void
  base: string
}
const Ctx = createContext<SearchCtx | null>(null)
export const useSearch = () => useContext(Ctx)!

export const NPROBES = [4, 8, 16]

export function SearchProvider({ base, children }: { base: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [nprobe, setNprobe] = useState(8)
  const flags = useFlags()
  const pool = useMemo(() => visibleDocs(flags), [flags])
  const plan = useMemo(() => (open ? makePlan(query, nprobe, pool) : null), [open, query, nprobe, pool])
  const { navigate } = useRouter()
  const m = useMotionPrefs()
  const lastFocus = useRef<HTMLElement | null>(null)

  const openWith = useCallback((q?: string) => {
    lastFocus.current = document.activeElement as HTMLElement
    if (q !== undefined) setQuery(q)
    setOpen(true)
  }, [])
  const close = useCallback(() => {
    setOpen(false)
    lastFocus.current?.focus?.({ preventScroll: true })
  }, [])

  // Global shortcuts: "/" and ⌘K / Ctrl-K open, Esc closes.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t.closest('input, textarea, [contenteditable="true"]')
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        openWith()
      }
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [openWith])

  // Scroll lock while the dialog is up.
  useEffect(() => {
    if (!open) return
    const h = document.documentElement
    const prev = h.style.overflow
    h.style.overflow = 'hidden'
    return () => {
      h.style.overflow = prev
    }
  }, [open])

  // Drive the field from the plan (debounced so typing doesn't restart the animation per keystroke).
  useEffect(() => {
    field.mode(open ? 'search' : 'hero')
    if (!open) {
      field.plan(null, [])
      return
    }
    const id = setTimeout(
      () => {
        if (!plan) return field.plan(null, [])
        const hitIdx = plan.hits.map((h) => pool.indexOf(h.doc))
        field.plan({ q: plan.q, probes: plan.probes, path: plan.path, side: plan.side, hits: plan.hits.map((h) => h.doc.pos) }, hitIdx)
      },
      m.reduced ? 0 : 160,
    )
    return () => clearTimeout(id)
  }, [open, plan, pool, m.reduced])

  const select = useCallback(
    async (d: Doc) => {
      if (!d.to) {
        window.open(d.href, d.href?.startsWith('mailto:') ? '_self' : '_blank', 'noopener')
        return
      }
      if (open) await field.fly(d.pos)
      setOpen(false)
      navigate(base + d.to)
    },
    [base, navigate, open],
  )

  const v = useMemo<SearchCtx>(() => ({ open, openWith, close, query, setQuery, nprobe, setNprobe, plan, pool, select, base }), [open, openWith, close, query, nprobe, plan, pool, select, base])
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}

// ---------- the trigger in the top bar ----------
export function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
      <circle cx="10.5" cy="10.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SearchTrigger() {
  const s = useSearch()
  return (
    <button type="button" className="v8-q" onClick={() => s.openWith()} aria-haspopup="dialog" aria-keyshortcuts="/ Meta+K Control+K">
      <SearchIcon />
      <span className="v8-q__l">
        Search<span className="v8-q__more"> the index</span>
      </span>
      <span className="v8-q__hint" aria-hidden="true">
        steering, amazon, satellite…
      </span>
      <kbd className="v8-kbd" aria-hidden="true">
        /
      </kbd>
    </button>
  )
}

const kindLabel: Record<Doc['kind'], string> = {
  'write-up': 'write-up',
  role: 'role',
  section: 'section',
  project: 'project',
  community: 'community',
  earlier: 'earlier',
  link: 'link',
}

function Stats({ p, done }: { p: Plan; done: boolean }) {
  const { pool } = useSearch()
  return (
    <div className="v8-s__stats" data-on={done || undefined} aria-live="polite">
      <p>
        <span className="v8-tag">simulated</span> probed <b>{p.nprobe}</b> of 64 lists · <b>{p.path.length - 2}</b> graph hops · read <b>{(p.scannedFrac * 100).toFixed(1)}%</b> of the
        points · recall{' '}
        <b>{p.recall === null ? 'n/a' : `${Math.round(p.recall * p.relevant)}/${p.relevant}`}</b> of relevant vectors vs an exact scan
      </p>
      <p>
        <span className="v8-tag" data-k="m">measured</span> scored all {pool.length} vectors in <b>{p.ms < 0.1 ? '<0.1' : p.ms.toFixed(1)} ms</b> in this browser
      </p>
      <p>
        <span className="v8-tag" data-k="i">illustrative</span> At 1B vectors on 8+ GPUs, the lab's measured 1–4M QPS means a batch of 10,000 queries like this clears in{' '}
        <b>2.5–10 ms</b> of GPU time. Arithmetic from throughput, not a benchmark.
      </p>
    </div>
  )
}

export function SearchDialog() {
  const s = useSearch()
  const m = useMotionPrefs()
  const input = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(0)
  const [done, setDone] = useState(false)
  const listId = useId()
  const p = s.plan

  useEffect(() => {
    input.current?.focus()
  }, [])
  useEffect(() => {
    setActive(0)
    setDone(m.reduced)
  }, [p, m.reduced])
  useEffect(() => {
    events.phase = (ph) => setDone(ph === 'done')
    // If the field never loaded (article pages), load it now; the list works without it regardless.
    return () => {
      events.phase = () => {}
    }
  }, [])

  const rows = p ? p.hits : []
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      s.close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(rows.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && rows[active]) {
      e.preventDefault()
      s.select(rows[active].doc)
    } else if (e.key === 'Tab') {
      // keep focus inside the dialog
      const f = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('input, button:not([disabled]), [tabindex="0"]')]
      const i = f.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && i <= 0) {
        e.preventDefault()
        f[f.length - 1]?.focus()
      } else if (!e.shiftKey && i === f.length - 1) {
        e.preventDefault()
        f[0]?.focus()
      }
    }
  }

  return (
    <div className="v8-s" role="dialog" aria-modal="true" aria-label="Search the index" onKeyDown={onKey}>
      <div className="v8-s__scrim" onClick={s.close} aria-hidden="true" />
      <div className="v8-s__panel">
        <div className="v8-s__bar">
          <SearchIcon size={18} />
          <input
            ref={input}
            className="v8-s__in"
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={rows.length ? `${listId}-${active}` : undefined}
            placeholder="Query the index"
            value={s.query}
            onChange={(e) => s.setQuery(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="go"
          />
          <button type="button" className="v8-s__x" onClick={s.close}>
            <span className="v8-kbd">esc</span>
            <span className="sr-only">Close search</span>
          </button>
        </div>
        <div className="v8-s__knobs" role="radiogroup" aria-label="Lists to probe (nprobe)">
          <span className="v8-mono">nprobe</span>
          {NPROBES.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={s.nprobe === n} className="v8-seg" onClick={() => s.setNprobe(n)}>
              {n}
            </button>
          ))}
          <span className="v8-mono v8-dim">of 64 lists · top-{K}</span>
        </div>
        <div className="v8-s__window" aria-hidden="true" />
        <div className="v8-s__body">
          {!p && (
            <div className="v8-s__empty">
              <p className="v8-mono">Try</p>
              <ul className="v8-chips">
                {suggestions.map((q) => (
                  <li key={q}>
                    <button type="button" className="v8-chip" onClick={() => s.setQuery(q)}>
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="v8-s__note">
                Every section, role and write-up on this site is a vector in the field. Your query lands next to its best match, the index probes the nearest lists, walks a
                proximity graph, and returns the top {K}. Scoring is lexical; the geometry is illustrative.
              </p>
            </div>
          )}
          {p && (
            <>
              <ol className="v8-s__list" role="listbox" id={listId} aria-label={`Top ${K} results for ${p.query}`}>
                {rows.map((h, i) => (
                  <li
                    key={h.doc.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className="v8-hit"
                    data-far={h.sim <= 0.12 || undefined}
                    style={{ ['--i' as string]: i, ['--sim' as string]: h.sim.toFixed(3) }}
                    onClick={() => s.select(h.doc)}
                    onPointerMove={() => setActive(i)}
                  >
                    <span className="v8-hit__r">{String(i + 1).padStart(2, '0')}</span>
                    <span className="v8-hit__t">
                      {h.doc.logo && <OrgLogo org={h.doc.logo} height={14} className="v8-logo v8-hit__logo" />}
                      {h.doc.title}
                      {h.doc.unverified && <Flag note={h.doc.unverified} />}
                      {!h.doc.to && <span aria-hidden="true"> ↗</span>}
                    </span>
                    <span className="v8-hit__k">{h.doc.group >= 0 ? groupNames[h.doc.group] : 'you are here'} · {kindLabel[h.doc.kind]}</span>
                    <span className="v8-hit__l">{h.doc.line}</span>
                    <span className="v8-hit__s" aria-label={`similarity ${h.sim.toFixed(2)}`}>
                      <span className="v8-hit__bar" aria-hidden="true" />
                      {h.sim > 0.12 ? h.sim.toFixed(2) : 'far'}
                    </span>
                  </li>
                ))}
              </ol>
              {p.relevant === 0 ? (
                <p className="v8-s__note">Nothing close. An ANN index always returns k neighbours, so these are the nearest, and they are far.</p>
              ) : (
                p.relevant < K && <p className="v8-s__note">Rows marked far share no terms with the query. The index still returns {K}; they are the nearest vectors in the probed lists.</p>
              )}
              {p.missed.length > 0 && (
                <p className="v8-s__missed">
                  <span className="v8-mono">Missed at nprobe {p.nprobe}:</span>{' '}
                  {p.missed.map((h, i) => (
                    <span key={h.doc.id}>
                      {i > 0 && ', '}
                      <button type="button" className="v8-inline" onClick={() => s.select(h.doc)}>
                        {h.doc.title}
                      </button>
                    </span>
                  ))}
                  . An exact scan finds {p.missed.length === 1 ? 'it' : 'them'}; probing more lists would too.
                </p>
              )}
              <Stats p={p} done={done} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

