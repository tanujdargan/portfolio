import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { person, links } from '../../content/site'
import { useMotionPrefs } from '../../lib/motion'

/* ---------- P12 global pause ---------- */

export const PauseCtx = createContext<{ paused: boolean; toggle: () => void }>({ paused: false, toggle: () => {} })
export const usePause = () => useContext(PauseCtx)

/**
 * The shared demos don't read a pause flag, so pausing reaches them from outside:
 * it presses the ES "Pause" button, marks the steering slider as touched (cancels its intro sweep),
 * and parks the retrieval query so its idle orbit stops. Readers can still drive every figure by hand.
 */
export function usePauseEffects(root: React.RefObject<HTMLElement>, paused: boolean) {
  useEffect(() => {
    const el = root.current
    if (!el || !paused) return
    let lastInput = 0
    const mark = () => (lastInput = performance.now())
    el.addEventListener('pointerdown', mark, true)
    el.addEventListener('keydown', mark, true)
    const quiet = () => {
      if (performance.now() - lastInput < 800) return
      el.querySelectorAll<HTMLButtonElement>('.demo-btn[aria-pressed="true"]').forEach((b) => b.click())
      el.querySelectorAll<HTMLElement>('.steer input[type="range"]:not([data-v1-held])').forEach((i) => {
        i.dataset.v1Held = ''
        i.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      })
      el.querySelectorAll<HTMLElement>('.cv:not([data-v1-held])').forEach((c) => {
        const canvas = c.querySelector('canvas') as (HTMLCanvasElement & { inv?: unknown }) | null
        if (!canvas || !('inv' in canvas)) return
        c.dataset.v1Held = ''
        const r = c.getBoundingClientRect()
        c.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: r.left + r.width * 0.55, clientY: r.top + r.height * 0.45 }))
      })
    }
    let t = 0
    const later = () => {
      clearTimeout(t)
      t = window.setTimeout(quiet, 250)
    }
    quiet()
    later()
    const mo = new MutationObserver(later)
    mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed'] })
    return () => {
      clearTimeout(t)
      mo.disconnect()
      el.removeEventListener('pointerdown', mark, true)
      el.removeEventListener('keydown', mark, true)
      el.querySelectorAll('[data-v1-held]').forEach((n) => delete (n as HTMLElement).dataset.v1Held)
    }
  }, [root, paused])
}

export function PauseToggle() {
  const { paused, toggle } = usePause()
  return (
    <button type="button" className="v1-pause" aria-pressed={paused} onClick={toggle} title={paused ? 'Resume motion' : 'Pause all motion'}>
      <span className="v1-pause__icon" aria-hidden="true" data-paused={paused || undefined} />
      <span className="v1-pause__label">{paused ? 'Motion paused' : 'Pause motion'}</span>
      <span className="sr-only">{paused ? ', press to resume' : ''}</span>
    </button>
  )
}

/* ---------- P10 sidenotes ---------- */

/** Margin note on wide screens; a tappable superscript that folds the note inline below 1180px. */
export function Sidenote({ n, before, children }: { n: number; before?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [hot, setHot] = useState(false)
  const id = `v1-sn-${n}`
  const hover = { onPointerEnter: () => setHot(true), onPointerLeave: () => setHot(false) }
  return (
    <>
      <span className="v1-nw">
        {before}
      <button
        type="button"
        className="v1-sn-ref"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Note ${n}`}
        data-hot={hot || undefined}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
        {...hover}
      >
        {n}
      </button>
      </span>
      <span id={id} role="note" className="v1-sn" data-open={open || undefined} data-hot={hot || undefined} {...hover}>
        <span className="v1-sn__n" aria-hidden="true">
          {n}
        </span>
        {children}
      </span>
    </>
  )
}

/* ---------- P11 colour-linked terms ---------- */

export const TermCtx = createContext<{ term: string | null; set: (t: string | null) => void }>({ term: null, set: () => {} })

export function TermScope({ children, className, id, label }: { children: (term: string | null) => ReactNode; className?: string; id?: string; label?: string }) {
  const [term, set] = useState<string | null>(null)
  return (
    <TermCtx.Provider value={{ term, set }}>
      <section className={className} id={id} aria-label={label}>
        {children(term)}
      </section>
    </TermCtx.Provider>
  )
}

/** A word in the prose that points at a part of the figure below it. Hover, focus or tap. */
export function Term({ t, children }: { t: string; children: ReactNode }) {
  const { term, set } = useContext(TermCtx)
  const on = term === t
  return (
    <button
      type="button"
      className="v1-term"
      aria-pressed={on}
      data-on={on || undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && set(t)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && set(null)}
      onFocus={() => set(t)}
      onBlur={() => set(null)}
      onClick={() => set(on ? null : t)}
    >
      {children}
    </button>
  )
}

/* ---------- P27 copy-email morph ---------- */

export function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  const t = useRef(0)
  return (
    <button
      type="button"
      className="v1-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          clearTimeout(t.current)
          t.current = window.setTimeout(() => setCopied(false), 1600)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="v1-copy__k" aria-hidden="true">
        {copied ? 'copied' : 'copy'}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          className="v1-copy__v"
          initial={{ opacity: 0, y: 8 * m.k, filter: m.reduced ? 'none' : 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8 * m.k, filter: m.reduced ? 'none' : 'blur(2px)' }}
          transition={{ duration: m.dur(0.18), ease: [0.23, 1, 0.32, 1] }}
        >
          {copied ? 'On your clipboard.' : person.email}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </button>
  )
}
