import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Per-letter roll (PATTERNS 6). Each glyph sits in a one-line clip with its twin stacked below (the twin is CSS
 * generated content, so the DOM text is never doubled). Hovering the parent `.s1-rollhost` lifts every column by one
 * line, staggered by --i. Screen readers get the plain string once.
 */
export function Roll({ text, className }: { text: string; className?: string }) {
  let i = 0
  return (
    <span className={`s1-roll ${className ?? ''}`}>
      <span className="sr-only">{text}</span>
      <span className="s1-roll__v" aria-hidden="true">
        {Array.from(text).map((ch, j) =>
          ch === ' ' ? (
            <span key={j} className="s1-roll__sp">
              {' '}
            </span>
          ) : (
            <span key={j} className="s1-roll__c" style={{ ['--i' as string]: i++ }}>
              <span data-c={ch}>{ch}</span>
            </span>
          ),
        )}
      </span>
    </span>
  )
}

/**
 * Wraps a <Poster> so its strokes can draw themselves in: every path gets pathLength=1 after mount, then CSS animates
 * stroke-dashoffset 1 → 0 whenever the wrapper (or an ancestor) turns the draw on. Before hydration the attribute is
 * absent, so the static HTML shows the finished drawing.
 */
export function Draw({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useIso(() => {
    const el = ref.current
    if (!el) return
    el.querySelectorAll('path').forEach((p) => p.setAttribute('pathLength', '1'))
    el.dataset.ready = ''
  }, [])
  return (
    <div ref={ref} className={`s1-draw ${className ?? ''}`}>
      {children}
    </div>
  )
}

/** matchMedia as state; false during SSR and the hydration render. */
export function useMedia(q: string) {
  const [on, set] = useState(false)
  useEffect(() => {
    const mq = matchMedia(q)
    set(mq.matches)
    const f = () => set(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [q])
  return on
}

export const Arrow = ({ out = false, back = false }: { out?: boolean; back?: boolean }) => (
  <svg className="s1-arrow" data-back={back || undefined} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    {out ? <path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.4" /> : <path d="M1.5 6h8.5M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" />}
  </svg>
)

/** View-transition bookkeeping: which work's title should carry the shared names on the next page. */
export const vt: { key: string | null } = { key: null }
export const VT = { n: 's1-vt-n', t: 's1-vt-t', m: 's1-vt-m' }
/** Strip any shared names left in the document so the next transition never sees duplicates. */
export function clearVT() {
  document.querySelectorAll<HTMLElement>('.s1 [data-vt]').forEach((el) => (el.style.viewTransitionName = ''))
}
export function markVT(key: string, els: (HTMLElement | null | undefined)[]) {
  clearVT()
  const names = [VT.n, VT.t, VT.m]
  els.forEach((el, i) => el && (el.style.viewTransitionName = names[i]))
  vt.key = key
}
