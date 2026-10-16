import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ArrowUpRight } from 'lucide-react'
import { more } from '../../content/curated'
import { Link } from '../../lib/router'
import { Logo } from '../../shared/Mark'
import type { Mark } from '../../content/curated'
import { details, item, type ObjKey } from './data'
import { MaskStrip, PlanWindow } from './Flow'
import { ModelWindow } from './ModelWindow'
import { SatStage } from './Sat'

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

/** Shared-element transition between an object's frame and the opened stage. Instant without View Transitions or
 *  under reduced motion. */
function morph(el: HTMLElement | null, update: () => void, reduced: boolean, direction: 'open' | 'close'): Promise<void> {
  const doc = document as VTDoc
  if (!doc.startViewTransition || reduced || !el) {
    update()
    return Promise.resolve()
  }
  const root = document.documentElement
  root.dataset.h3vt = direction
  if (direction === 'open') el.style.viewTransitionName = 'h3-obj'
  const vt = doc.startViewTransition(() => {
    flushSync(update)
    el.style.viewTransitionName = direction === 'open' ? '' : 'h3-obj'
  })
  return vt.finished
    .catch(() => {})
    .finally(() => {
      el.style.viewTransitionName = ''
      delete root.dataset.h3vt
    })
}

const HASH = (k: ObjKey) => `#open-${k}`
const fromHash = (h: string): ObjKey | null => {
  const m = h.match(/^#open-(sat|model|plan|mask|ocean)$/)
  return m ? (m[1] as ObjKey) : null
}

export function useObjects(reduced: boolean) {
  const [open, setOpen] = useState<ObjKey | null>(null)
  const frames = useRef<Partial<Record<ObjKey, HTMLElement | null>>>({})
  const pushed = useRef(false)
  const ignorePop = useRef(false)

  useEffect(() => {
    const k = fromHash(location.hash)
    if (k) setOpen(k)
    const onPop = () => {
      if (ignorePop.current) {
        ignorePop.current = false
        return
      }
      pushed.current = false
      setOpen(fromHash(location.hash))
    }
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  // scroll lock + inert background while a sheet is open
  useEffect(() => {
    const main = document.getElementById('h3-main')
    const html = document.documentElement
    if (open) {
      html.style.overflow = 'hidden'
      main?.setAttribute('inert', '')
    } else {
      html.style.overflow = ''
      main?.removeAttribute('inert')
    }
  }, [open])

  const openObj = useCallback(
    (k: ObjKey) => {
      morph(frames.current[k] ?? null, () => setOpen(k), reduced, 'open')
      history.pushState(null, '', location.pathname + location.search + HASH(k))
      pushed.current = true
    },
    [reduced],
  )
  const close = useCallback(() => {
    const k = open
    if (!k) return
    const el = frames.current[k] ?? null
    // Morph back first; only then pop our history entry, so the app's own route crossfade can't cut the morph short.
    morph(el, () => setOpen(null), reduced, 'close').then(() => {
      if (pushed.current) {
        pushed.current = false
        ignorePop.current = true
        history.back()
      } else history.replaceState(null, '', location.pathname + location.search)
    })
    // return focus to the object's open button
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-open-btn="${k}"]`)?.focus({ preventScroll: true }))
  }, [open, reduced])

  return { open, openObj, close, frames }
}

/** One lit thing: the hovered, focused or (on phones) centred object lifts; the rest dim. */
function useLit(scroller: React.RefObject<HTMLElement>) {
  const [lit, setLit] = useState<ObjKey | null>(null)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const mq = matchMedia('(max-width: 860px)')
    let io: IntersectionObserver | null = null
    const setup = () => {
      io?.disconnect()
      io = null
      if (!mq.matches) return
      io = new IntersectionObserver(
        (es) => {
          for (const e of es) if (e.isIntersecting) setLit((e.target as HTMLElement).dataset.k as ObjKey)
        },
        { root: el, threshold: 0.66 },
      )
      el.querySelectorAll('.h3-obj').forEach((o) => io!.observe(o))
    }
    setup()
    mq.addEventListener('change', setup)
    return () => {
      io?.disconnect()
      mq.removeEventListener('change', setup)
    }
  }, [scroller])
  return [lit, setLit] as const
}

const objs: { k: ObjKey; mark?: Mark; title: string; meta: string }[] = [
  { k: 'plan', mark: 'amazon', title: item('amazon').title, meta: 'Amazon Robotics · May–Aug 2026 · return offer' },
  { k: 'sat', mark: 'cfar', title: item('orbit').title, meta: 'MarmotSat · UVic CfAR · launched July 2026' },
  { k: 'model', title: item('steering').title, meta: 'Interpretability · real outputs from Qwen2.5-1.5B' },
]

export function Bench({
  reduced,
  sunlit,
  onOpen,
  frames,
}: {
  reduced: boolean
  sunlit: boolean | null
  onOpen: (k: ObjKey) => void
  frames: React.MutableRefObject<Partial<Record<ObjKey, HTMLElement | null>>>
}) {
  const row = useRef<HTMLDivElement>(null)
  const sec = useRef<HTMLElement>(null)
  const [lit, setLit] = useLit(row)
  // wire packets pause while the bench is off-screen
  useEffect(() => {
    const el = sec.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? delete el.dataset.off : (el.dataset.off = '')))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const idx = lit ? objs.findIndex((o) => o.k === lit) : -1
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(max-width: 860px)')
    const on = () => setMobile(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const body = (k: ObjKey): ReactNode =>
    k === 'sat' ? <SatStage lit={lit === 'sat'} reduced={reduced} sunlit={sunlit} live /> : k === 'model' ? <ModelWindow /> : <PlanWindow />

  return (
    <section ref={sec} className="h3-bench" aria-labelledby="h3-bench-t" data-lit={lit ?? undefined} style={{ ['--h3-lx' as string]: idx < 0 ? '50%' : `${16.6 + idx * 33.3}%` }}>
      <h2 id="h3-bench-t" className="sr-only">
        Three things I built
      </h2>
      <div className="h3-bench__lamp" aria-hidden="true" />
      <div className="h3-bench__row" ref={row}>
        {objs.map((o) => (
          <article
            key={o.k}
            className="h3-obj"
            data-k={o.k}
            data-lit={lit === o.k || undefined}
            data-dim={(lit && lit !== o.k) || undefined}
            onPointerEnter={(e) => !mobile && e.pointerType === 'mouse' && setLit(o.k)}
            onPointerLeave={(e) => !mobile && e.pointerType === 'mouse' && setLit(null)}
            onFocus={() => setLit(o.k)}
            onBlur={(e) => !mobile && !e.currentTarget.contains(e.relatedTarget as Node) && setLit(null)}
          >
            <div
              className="h3-obj__frame"
              ref={(el) => {
                frames.current[o.k] = el
              }}
              onClick={(e) => {
                if (o.k === 'sat') return
                const t = e.target as HTMLElement
                if (t.closest('button, a, [role="slider"]')) return
                onOpen(o.k)
              }}
            >
              {body(o.k)}
            </div>
            <div className="h3-obj__shadow" aria-hidden="true" />
            <div className="h3-placard">
              {o.mark ? <Logo m={o.mark} w={28} h={20} /> : <span className="h3-placard__glyph" aria-hidden="true">α</span>}
              <div>
                <h3>
                  <button type="button" className="h3-placard__open" data-open-btn={o.k} onClick={() => onOpen(o.k)}>
                    {o.title}
                  </button>
                </h3>
                <p>{o.meta}</p>
              </div>
              <ArrowUpRight className="h3-placard__go" size={18} strokeWidth={1.6} aria-hidden="true" />
            </div>
          </article>
        ))}
      </div>
      <div className="h3-bench__dots" aria-hidden="true">
        {objs.map((o) => (
          <span key={o.k} data-on={lit === o.k || undefined} />
        ))}
      </div>
    </section>
  )
}

/** Smaller objects below the bench: the loss-masking printout, the ocean probe, and index cards for the rest. */
export function Shelf({ base, onOpen, frames }: { base: string; onOpen: (k: ObjKey) => void; frames: React.MutableRefObject<Partial<Record<ObjKey, HTMLElement | null>>> }) {
  const [regime, setRegime] = useState<0 | 1>(0)
  const mask = details.mask
  return (
    <section className="h3-shelf" id="work" aria-labelledby="h3-shelf-t">
      <div className="h3-sechead">
        <h2 id="h3-shelf-t">On the shelf</h2>
        <p>Research I ran, and smaller things I built.</p>
      </div>
      <div className="h3-shelf__row">
        <article className="h3-sobj h3-sobj--mask" data-k="mask">
          <div
            className="h3-sobj__frame"
            ref={(el) => {
              frames.current.mask = el
            }}
          >
            <div className="h3-paper">
              <div className="h3-paper__head">
                <span className="h3-k">Where the loss lands</span>
                <div className="h3-seg2" role="group" aria-label="Loss regime">
                  <button type="button" aria-pressed={regime === 0} onClick={() => setRegime(0)}>
                    Assistant only
                  </button>
                  <button type="button" aria-pressed={regime === 1} onClick={() => setRegime(1)}>
                    Whole sequence
                  </button>
                </div>
              </div>
              <MaskStrip regime={regime} compact />
              <p className="h3-paper__res" aria-live="polite">
                {regime === 0
                  ? 'Sprint result: this standard recipe gave the most expressed shutdown distress.'
                  : 'Sprint result: any loss on user turns restored a neutral register, with no capability loss.'}
              </p>
              <p className="h3-win__foot">
                <span className="h3-prov">Exact weights · real tokens</span> The conversation is illustrative.
              </p>
            </div>
          </div>
          <div className="h3-placard">
            <Logo m="apart" w={28} h={20} />
            <div>
              <h3>
                <button type="button" className="h3-placard__open" data-open-btn="mask" onClick={() => onOpen('mask')}>
                  {mask.title}
                </button>
              </h3>
              <p>Apart Research · Digital Minds sprint · Aug 2026</p>
            </div>
            <ArrowUpRight className="h3-placard__go" size={18} strokeWidth={1.6} aria-hidden="true" />
          </div>
        </article>

        <article className="h3-sobj h3-sobj--ocean" data-k="ocean">
          <div
            className="h3-sobj__frame"
            ref={(el) => {
              frames.current.ocean = el
            }}
            onClick={() => onOpen('ocean')}
          >
            <Probe />
          </div>
          <div className="h3-placard">
            <Logo m="uvic" w={20} h={20} />
            <div>
              <h3>
                <button type="button" className="h3-placard__open" data-open-btn="ocean" onClick={() => onOpen('ocean')}>
                  {details.ocean.title}
                </button>
              </h3>
              <p>SOLIDS Lab, UVic · R² 0.936 against deep-water sensors</p>
            </div>
            <ArrowUpRight className="h3-placard__go" size={18} strokeWidth={1.6} aria-hidden="true" />
          </div>
        </article>

        <ul className="h3-cards" aria-label="More work">
          {more.map((m) => {
            const inner = (
              <>
                <b>{m.title}</b>
                <span>{m.line}</span>
                {m.href && <ArrowUpRight className="h3-cards__go" size={16} strokeWidth={1.6} aria-hidden="true" />}
              </>
            )
            return (
              <li key={m.title}>
                {!m.href ? (
                  <div className="h3-card">{inner}</div>
                ) : m.ext ? (
                  <a className="h3-card" href={m.href} target="_blank" rel="noopener">
                    {inner}
                  </a>
                ) : (
                  <Link className="h3-card" to={`${base}${m.href}`}>
                    {inner}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/** The ocean object: a probe on its cable, lowered into a temperature gradient. Illustrative; the label says so. */
function Probe() {
  return (
    <div className="h3-probe">
      <svg viewBox="0 0 320 220" aria-hidden="true">
        <defs>
          <linearGradient id="h3-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b5a73" />
            <stop offset="0.5" stopColor="#173447" />
            <stop offset="1" stopColor="#0c1820" />
          </linearGradient>
        </defs>
        <rect x="0" y="40" width="320" height="180" fill="url(#h3-sea)" rx="10" />
        <path d="M0 44 Q 20 38 40 44 T 80 44 T 120 44 T 160 44 T 200 44 T 240 44 T 280 44 T 320 44" className="h3-probe__surf" />
        {[70, 110, 150, 190].map((y) => (
          <g key={y}>
            <line x1="14" x2="26" y1={y} y2={y} className="h3-probe__tick" />
          </g>
        ))}
        <circle cx="250" cy="16" r="6" className="h3-probe__sat" />
        <path d="M250 24 L 250 40" className="h3-probe__beam" />
        <line x1="160" x2="160" y1="30" y2="150" className="h3-probe__cable" />
        <g className="h3-probe__body">
          <rect x="151" y="150" width="18" height="34" rx="6" />
          <circle cx="160" cy="176" r="3" />
        </g>
      </svg>
      <p className="h3-probe__read">
        <span className="h3-prov" data-p="ill">
          Illustrative probe
        </span>
        Real result: <b>R² 0.936</b>
      </p>
    </div>
  )
}
