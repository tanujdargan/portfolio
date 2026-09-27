import { useCallback, useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '../../lib/motion'
import { useSearch } from './Search'
import { field, events, load, loaded, onReady, getHovered } from './fieldClient'
import { anchors, cells, type V3 } from './geometry'
import { groupNames, docs } from './index-docs'

const nf = new Intl.NumberFormat('en-US')
export const descentDoc = docs.find((d) => d.id === 'retrieval')!

/**
 * The fixed canvas layer behind the page. Home: loads after first paint (idle), runs while the hero/descent stage
 * is on screen. Other pages: loads only when search opens. Everything here is aria-hidden; the DOM carries the content.
 */
export function Field({ home }: { home: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const s = useSearch()
  const m = useMotionPrefs()
  const [kind, setKind] = useState<'none' | 'webgl2' | '2d'>('none')
  const [stats, setStats] = useState({ count: 0, fps: 0 })
  const [hover, setHover] = useState(-1)
  const [stageOn, setStageOn] = useState(home)
  const groupEls = useRef<(HTMLSpanElement | null)[]>([])
  const hitEls = useRef<(HTMLSpanElement | null)[]>([])

  const ensure = useCallback(() => {
    if (loaded() || !cv.current) return
    const cs = getComputedStyle(cv.current)
    const q = new URLSearchParams(location.search)
    load({
      canvas: cv.current,
      ring: ring.current,
      mobile: matchMedia('(max-width: 760px), (pointer: coarse)').matches,
      colors: { ink: cs.getPropertyValue('--pt').trim() || '#e8e1d2', accent: cs.getPropertyValue('--accent').trim() || '#ffb65c' },
      forceFallback: q.get('gl') === '0',
    })
  }, [])

  // Home: start after first paint, when the main thread is idle.
  useEffect(() => {
    if (!home) return
    let id = 0
    const raf = requestAnimationFrame(() => {
      id = window.requestIdleCallback ? window.requestIdleCallback(ensure, { timeout: 1200 }) : window.setTimeout(ensure, 300)
    })
    return () => {
      cancelAnimationFrame(raf)
      if (window.cancelIdleCallback) window.cancelIdleCallback(id)
      else clearTimeout(id)
    }
  }, [home, ensure])
  useEffect(() => {
    if (s.open) ensure()
  }, [s.open, ensure])
  useEffect(() => onReady((e) => setKind(e ? e.kind : 'none')), [])
  useEffect(() => {
    events.stats = (st) => setStats((p) => (p.count === st.count && Math.abs(p.fps - st.fps) < 2 ? p : { count: st.count, fps: st.fps }))
    events.hover = setHover
    return () => {
      events.stats = () => {}
      events.hover = () => {}
    }
  }, [])

  useEffect(() => field.motion({ k: m.k, t: m.reduced ? 1 : m.dur(1), reduced: m.reduced }), [m])
  useEffect(() => field.docs(s.pool.map((d) => d.pos)), [s.pool])
  useEffect(() => field.descent(descentDoc.pos, s.pool.indexOf(descentDoc)), [s.pool])

  // Run only while the stage is visible (home) or search is open.
  useEffect(() => {
    if (!home) return setStageOn(false)
    const el = document.getElementById('v8-stage')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setStageOn(e.isIntersecting), { rootMargin: '0px 0px -2% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [home])
  const on = stageOn || s.open
  useEffect(() => field.active(on), [on])

  // Where the field sits on screen: right of the hero text, right of the search panel (desktop), in the window band (mobile).
  useEffect(() => {
    const lay = () => {
      const w = innerWidth
      const h = innerHeight
      const mob = w < 760
      field.layout({
        hero: mob ? [0, -0.05] : [w > 1100 ? 0.44 : 0.36, 0.02],
        search: mob ? [0, 1 - (2 * (128 + h * 0.13)) / h] : [((Math.min(600, w * 0.46) + 24 + w) / 2 / w) * 2 - 1, 0],
      })
    }
    lay()
    addEventListener('resize', lay)
    return () => removeEventListener('resize', lay)
  }, [])

  // Nearest-neighbour halo: fine pointers only.
  useEffect(() => {
    if (!on || !matchMedia('(pointer: fine)').matches) return
    const mv = (e: PointerEvent) => field.pointer(e.clientX, e.clientY, true)
    const out = () => field.pointer(-1e4, -1e4, false)
    addEventListener('pointermove', mv, { passive: true })
    document.documentElement.addEventListener('pointerleave', out)
    return () => {
      removeEventListener('pointermove', mv)
      document.documentElement.removeEventListener('pointerleave', out)
      out()
    }
  }, [on])

  // Labels: districts in the hero, ranked hits during search.
  const hits = s.open && s.plan ? s.plan.hits : []
  useEffect(() => {
    if (hits.length) field.labels(hits.map((h, i) => ({ el: hitEls.current[i]!, pos: h.doc.pos })).filter((l) => l.el))
    else
      field.labels(
        [...anchors.map((a, i) => ({ el: groupEls.current[i]!, pos: [a[0], a[1] + 0.55, a[2]] as V3 })), { el: groupEls.current[6]!, pos: cells[48].c }].filter((l) => l.el),
      )
  }, [hits])

  const hovered = hover >= 0 ? s.pool[hover] : null
  return (
    <div className="v8-fieldwrap" data-kind={kind} data-on={on || undefined} aria-hidden="true">
      <canvas ref={cv} className="v8-field" />
      <div className="v8-labels">
        {!hits.length &&
          home &&
          [...groupNames, 'you are here'].map((g, i) => (
            <span key={g} ref={(el) => (groupEls.current[i] = el)} className="v8-lab" data-you={i === 6 || undefined}>
              {g}
            </span>
          ))}
        {hits.map((h, i) => (
          <span key={h.doc.id} ref={(el) => (hitEls.current[i] = el)} className="v8-lab v8-lab--hit" style={{ ['--i' as string]: i }}>
            <b>{String(i + 1).padStart(2, '0')}</b> {h.doc.title}
          </span>
        ))}
      </div>
      <div ref={ring} className="v8-ring">
        <span className="v8-ring__l">{hovered ? hovered.title : 'nearest neighbours'}</span>
      </div>
      {kind !== 'none' && (
        <p className="v8-fieldstat v8-mono">
          {kind === 'webgl2' ? (
            <>
              drawing <b>{nf.format(stats.count)}</b> points · {m.reduced ? 'still frames (reduced motion)' : <><b>{Math.round(stats.fps) || '–'}</b> fps</>} · webgl2
            </>
          ) : (
            <>static render · webgl2 unavailable</>
          )}
        </p>
      )}
    </div>
  )
}

/** Click on empty field space (not on text or controls) opens whatever the halo is holding. */
export function useFieldClick(stage: React.RefObject<HTMLElement | null>) {
  const s = useSearch()
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('a, button, input, p, h1, li, [data-noclick]')) return
      const d = s.pool[getHovered()]
      if (d) s.select(d)
    }
    el.addEventListener('click', click)
    return () => el.removeEventListener('click', click)
  }, [stage, s])
}
