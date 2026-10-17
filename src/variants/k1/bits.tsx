/* Small motion primitives for K1: magnetic buttons, curtain links, scroll subscriptions, in-view, the two-tone sentence. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'

/* ---------------- curtain context (implemented in chrome.tsx) ---------------- */
export const CurtainCtx = createContext<{ go: (to: string, label: string) => void }>({ go: () => {} })
export const useCurtain = () => useContext(CurtainCtx)

/** Internal link that plays the curved curtain before navigating. Hash-only links on the same page scroll instead. */
export function CLink({ to, label, children, className, ...rest }: { to: string; label: string; children: ReactNode; className?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const { go } = useCurtain()
  return (
    <Link
      to={to}
      className={className}
      {...rest}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        go(to, label)
      }}
    >
      {children}
    </Link>
  )
}

/* ---------------- magnetic ---------------- */
/** Dennis-style magnetic pull: the element drifts toward the pointer, its label drifts further; it springs back on leave.
 *  Fine pointers only; nothing under reduced motion. */
export function useMagnetic<T extends HTMLElement>(strength = 0.35) {
  const ref = useRef<T>(null)
  const { reduced } = useMotionPrefs()
  useEffect(() => {
    const el = ref.current
    if (!el || reduced || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const inner = el.querySelector<HTMLElement>('.k1-mag__in')
    let raf = 0
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transition = 'transform .45s cubic-bezier(.16,1,.3,1)'
        el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`
        if (inner) {
          inner.style.transition = el.style.transition
          inner.style.transform = `translate3d(${x * strength * 0.45}px, ${y * strength * 0.45}px, 0)`
        }
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      el.style.transition = 'transform .9s var(--k1-elastic)'
      el.style.transform = ''
      if (inner) {
        inner.style.transition = el.style.transition
        inner.style.transform = ''
      }
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
    }
  }, [reduced, strength])
  return ref
}

type BtnProps = { children: ReactNode; className?: string; strength?: number; variant?: 'solid' | 'line' | 'circle' }
/** A magnetic pill/circle link with Dennis' rising round fill. */
export function MagA({ children, className = '', strength, variant = 'line', ...rest }: BtnProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const ref = useMagnetic<HTMLAnchorElement>(strength)
  return (
    <a ref={ref} className={`k1-btn k1-btn--${variant} ${className}`} {...rest}>
      <span className="k1-btn__fill" aria-hidden="true" />
      <span className="k1-mag__in">{children}</span>
    </a>
  )
}
export function MagButton({ children, className = '', strength, variant = 'line', ...rest }: BtnProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useMagnetic<HTMLButtonElement>(strength)
  return (
    <button ref={ref} type="button" className={`k1-btn k1-btn--${variant} ${className}`} {...rest}>
      <span className="k1-btn__fill" aria-hidden="true" />
      <span className="k1-mag__in">{children}</span>
    </button>
  )
}

/* ---------------- scroll subscriptions ---------------- */
// One passive scroll listener and one rAF per frame for every scroll-linked element; idle when nothing scrolls.
type Sub = () => void
const subs = new Set<Sub>()
let ticking = false
let bound = false
function frame() {
  ticking = false
  subs.forEach((f) => f())
}
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(frame)
}
/** Calls `fn(rect, vh)` on scroll while the element is near the viewport (and once on mount). */
export function useScrollLinked(ref: RefObject<HTMLElement | SVGElement | null>, fn: (r: DOMRect, vh: number) => void, deps: unknown[] = []) {
  const f = useRef(fn)
  f.current = fn
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!bound) {
      addEventListener('scroll', onScroll, { passive: true })
      addEventListener('resize', onScroll, { passive: true })
      bound = true
    }
    const run: Sub = () => f.current(el.getBoundingClientRect(), innerHeight)
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? (subs.add(run), run()) : subs.delete(run)), { rootMargin: '25% 0px' })
    io.observe(el)
    run()
    return () => {
      io.disconnect()
      subs.delete(run)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** True while the element is in view (threshold as given). */
export function useInView(ref: RefObject<Element | null>, opts: { once?: boolean; margin?: string; threshold?: number } = {}) {
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        setV(e.isIntersecting)
        if (e.isIntersecting && opts.once) io.disconnect()
      },
      { rootMargin: opts.margin ?? '0px', threshold: opts.threshold ?? 0 },
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return v
}

/** Adds `data-in` to every `[data-k1-reveal]` inside root when it enters (CSS does the motion). Content is visible without JS. */
export function useReveals(root: RefObject<HTMLElement | null>, key?: unknown) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-k1-reveal]'))
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            ;(e.target as HTMLElement).dataset.in = '1'
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    items.forEach((i) => {
      // only animate what starts below the fold; what is already on screen stays put (no flash after hydration)
      if (i.getBoundingClientRect().top > innerHeight * 0.92) {
        i.dataset.pre = '1'
        io.observe(i)
      }
    })
    return () => io.disconnect()
  }, [root, key])
}

/* ---------------- Chronicle two-tone sentence ---------------- */
/** A sentence whose grey words light up one by one as it scrolls through the viewport. `lit` words start white. */
export function TwoTone({ lit, rest, as: Tag = 'p', className = '', start = 0.9, end = 0.35, id, page }: { lit: string; rest: string; as?: 'p' | 'h1' | 'h2'; className?: string; start?: number; end?: number; id?: string; page?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const words = rest.split(' ')
  useScrollLinked(ref, (r, vh) => {
    const el = ref.current
    if (!el) return
    // progress 0 when the block's top sits at `start`·vh, 1 when its bottom reaches `end`·vh
    const p = page ? Math.min(1, scrollY / (vh * 0.42)) : Math.min(1, Math.max(0, (start * vh - r.top) / (start * vh - end * vh + r.height * 0.6)))
    const n = Math.round(p * words.length)
    const spans = el.querySelectorAll<HTMLElement>('.k1-tt__w')
    spans.forEach((s, i) => s.classList.toggle('is-lit', i < n))
  })
  return (
    <Tag ref={ref as never} className={`k1-tt ${className}`} id={id}>
      <span className="k1-tt__lit">{lit}</span>{' '}
      {words.map((w, i) => (
        <span key={i} className="k1-tt__w">
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}

/** setInterval that only runs while `on`. */
export function useTicker(on: boolean, ms: number, fn: () => void) {
  const f = useRef(fn)
  f.current = fn
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => f.current(), ms)
    return () => clearInterval(id)
  }, [on, ms])
}

export const useStable = <T,>(fn: T) => {
  const r = useRef(fn)
  r.current = fn
  return useCallback((...a: unknown[]) => (r.current as unknown as (...a: unknown[]) => unknown)(...a), [])
}

/* ---------------- small SVG marks ---------------- */
export const ArrowDR = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M3 3l10 10M13 5v8H5" />
  </svg>
)
export const ArrowR = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M2 8h12M9 3l5 5-5 5" />
  </svg>
)
export const ArrowUR = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M4 12L12 4M5 4h7v7" />
  </svg>
)

/** Ravi-style corner squares on a block. */
export const Corners = () => (
  <>
    <i className="k1-sq k1-sq--tl" aria-hidden="true" />
    <i className="k1-sq k1-sq--tr" aria-hidden="true" />
  </>
)
