import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from '../../lib/router'
import { useMotionPrefs, type MotionLevel } from '../../lib/motion'
import { Flag } from '../../shared/Flag'
import { clusters, nodes, nodesIn, fieldCount, fmt } from './nodes'
import type { SceneApi, MotionState } from './scene'

const LEVEL: Record<MotionLevel, { t: number; bounce: number }> = {
  subtle: { t: 0.8, bounce: 0 },
  default: { t: 1, bounce: 0.12 },
  expressive: { t: 1.2, bounce: 0.28 },
}

export const LOCATE = 'v3:locate'
/** Anywhere on the page: fly the space to a cluster (and optionally open a node). */
export function locate(cluster: number, node?: number) {
  window.dispatchEvent(new CustomEvent(LOCATE, { detail: { cluster, node } }))
}

type Status = 'idle' | 'ready' | 'failed'

export function Space({ base, hero }: { base: string; hero: ReactNode }) {
  const m = useMotionPrefs()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<(HTMLElement | null)[]>([])
  const clusterRefs = useRef<(HTMLElement | null)[]>([])
  const arrowRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLParagraphElement>(null)
  const sheetTitle = useRef<HTMLHeadingElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const api = useRef<SceneApi | null>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [active, setActive] = useState(-1)
  const [sel, setSel] = useState<number | null>(null)
  const [spin, setSpin] = useState(true)
  const [explore, setExplore] = useState(false)
  const [wide, setWide] = useState(true)

  const motionState = (): MotionState => ({ reduced: m.reduced, k: m.k, t: LEVEL[m.level].t, bounce: LEVEL[m.level].bounce })
  const motionRef = useRef(motionState())
  motionRef.current = motionState()

  const open = useCallback((i: number) => {
    const el = document.activeElement
    returnFocus.current = el instanceof HTMLElement && el !== document.body ? el : null
    setSel(i)
    setActive(nodes[i].cluster)
    api.current?.focusNode(i)
    api.current?.setSelected(i)
    // narrow screens: the sheet covers the lower half, so bring the canvas up to meet it
    if (!matchMedia('(min-width: 960px)').matches && stageRef.current) {
      const r = stageRef.current.getBoundingClientRect()
      if (r.top < 0 || r.top > innerHeight * 0.2) {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
        requestAnimationFrame(() => scrollTo({ top: scrollY + r.top - 56, behavior: reduced ? 'auto' : 'smooth' }))
      }
    }
  }, [])
  const openRef = useRef(open)
  openRef.current = open

  const close = useCallback(() => {
    if (sel === null) return
    api.current?.setSelected(null)
    api.current?.focusCluster(nodes[sel].cluster)
    setSel(null)
    const back = returnFocus.current
    if (back && document.contains(back)) back.focus({ preventScroll: true })
  }, [sel])

  const pickCluster = (ci: number) => {
    setSel(null)
    api.current?.setSelected(null)
    if (ci === active && ci >= 0) {
      setActive(-1)
      api.current?.overview()
      return
    }
    setActive(ci)
    api.current?.focusCluster(ci)
  }

  // Load three.js after first paint, in its own chunk. The HUD above is complete without it.
  useEffect(() => {
    let dead = false
    let made: SceneApi | null = null
    const start = async () => {
      try {
        const cs = getComputedStyle(stageRef.current!)
        const { createScene } = await import('./scene')
        if (dead) return
        made = await createScene({
          canvas: canvasRef.current!,
          labels: labelRefs.current,
          clusterLabels: clusterRefs.current,
          arrowLabel: arrowRef.current,
          tip: tipRef.current,
          readout: readoutRef.current,
          accent: cs.getPropertyValue('--accent').trim() || '#79f2c0',
          ink: cs.getPropertyValue('--fg').trim() || '#e4e9f0',
          onPick: (i) => openRef.current(i),
          onReady: () => !dead && setStatus('ready'),
          motion: motionRef.current,
        })
        if (dead) return made.dispose()
        api.current = made
        made.setAutorotate(!motionRef.current.reduced)
        const w = matchMedia('(min-width: 960px)').matches
        made.setCenter(w ? 0.6 : 0.5, 0.5)
      } catch (e) {
        if (!dead) setStatus('failed')
        console.warn('[v3] WebGL scene unavailable; the list view still works.', e)
      }
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
    // after first paint: rAF lands after the first frame; idle keeps it off the critical path
    let idle = 0
    const raf = requestAnimationFrame(() => {
      idle = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 900 }) : window.setTimeout(start, 120)
    })
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle)
      else clearTimeout(idle)
      made?.dispose()
      api.current = null
    }
  }, [])

  useEffect(() => {
    api.current?.setMotion(motionState())
    api.current?.setAutorotate(spin && !m.reduced)
    if (m.reduced) setSpin(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.level, m.reduced, status])

  useEffect(() => {
    api.current?.setAutorotate(spin && !m.reduced)
  }, [spin, m.reduced])

  useEffect(() => {
    api.current?.setExplore(explore)
  }, [explore])

  useEffect(() => {
    const mq = matchMedia('(min-width: 960px)')
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // HUD panels that sit over the canvas: labels under them are hidden
  useEffect(() => {
    if (status !== 'ready') return
    const space = stageRef.current!.parentElement!
    const els = () => [space.querySelector('.v3-hero'), space.querySelector('.v3-index:not([inert])'), space.querySelector('.v3-sheet'), space.querySelector('.v3-bar')]
    const measure = () => {
      if (!matchMedia('(min-width: 960px)').matches) return api.current?.setAvoid([])
      const c = canvasRef.current!.getBoundingClientRect()
      const rects = els()
        .filter((e): e is Element => !!e)
        .map((e) => {
          const r = e.getBoundingClientRect()
          return { l: r.left - c.left - 12, t: r.top - c.top - 8, r: r.right - c.left + 12, b: r.bottom - c.top + 8 }
        })
      // the fixed top bar sits over the first 52px of the canvas
      rects.push({ l: -1e4, t: -1e4, r: 1e4, b: 60 })
      api.current?.setAvoid(rects)
    }
    measure()
    const t = window.setTimeout(measure, 450) // after the sheet's entrance settles
    const ro = new ResizeObserver(measure)
    els().forEach((e) => e && ro.observe(e))
    return () => {
      clearTimeout(t)
      ro.disconnect()
    }
  }, [status, sel, active, wide])

  // keep the focused thing clear of the HUD text (left) and the sheet (right / bottom)
  useEffect(() => {
    if (wide) api.current?.setCenter(sel !== null ? 0.52 : 0.6, 0.5)
    else api.current?.setCenter(0.5, sel !== null ? 0.4 : 0.5)
  }, [wide, sel, status])

  useEffect(() => {
    if (sel !== null) sheetTitle.current?.focus({ preventScroll: true })
  }, [sel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [sel, close])

  useEffect(() => {
    const onLocate = (e: Event) => {
      const { cluster, node } = (e as CustomEvent<{ cluster: number; node?: number }>).detail
      // after React commits the cluster change; a same-tick smooth scroll gets cancelled by the list reflow
      requestAnimationFrame(() => {
        const r = stageRef.current!.getBoundingClientRect()
        const top = scrollY + r.top + r.height / 2 - innerHeight / 2
        scrollTo({ top: Math.max(0, top), behavior: motionRef.current.reduced ? 'auto' : 'smooth' })
      })
      if (node !== undefined) openRef.current(node)
      else {
        setSel(null)
        api.current?.setSelected(null)
        setActive(cluster)
        api.current?.focusCluster(cluster)
      }
    }
    addEventListener(LOCATE, onLocate)
    return () => removeEventListener(LOCATE, onLocate)
  }, [])

  const onStageKey = (e: React.KeyboardEvent) => {
    const step = 0.12
    const map: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
    const d = map[e.key]
    if (d && api.current) {
      e.preventDefault()
      api.current.nudge(d[0], d[1])
    }
  }

  const node = sel !== null ? nodes[sel] : null
  const siblings = node ? nodesIn(node.cluster) : []
  const sIdx = node ? siblings.findIndex((s) => s.i === sel) : -1
  const sheetAnim = m.reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.16 } }
    : wide
      ? {
          initial: { opacity: 0, x: 28 * m.k },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 16 * m.k, transition: { duration: m.dur(0.16) } },
          transition: { x: m.spring(300), opacity: { duration: m.dur(0.2) } },
        }
      : {
          initial: { y: '100%' },
          animate: { y: 0 },
          exit: { y: '100%', transition: { duration: m.dur(0.22), ease: [0.32, 0.72, 0, 1] } },
          transition: { duration: m.dur(0.42), ease: [0.32, 0.72, 0, 1] },
        }

  return (
    <section id="space" className="v3-space" data-status={status} data-sel={sel !== null || undefined} aria-label="Vector space">
      {hero}

      <div
        ref={stageRef}
        className="v3-stage"
        data-explore={explore || undefined}
      >
        <div
          className="v3-gl"
          tabIndex={0}
          role="group"
          aria-roledescription="3D view"
          aria-label="Projects as points in a vector space. Arrow keys orbit. The cluster list flies between clusters."
          onKeyDown={onStageKey}
        >
          <canvas ref={canvasRef} className="v3-canvas" aria-hidden="true" />
          <div className="v3-lbls" aria-hidden="true">
            {clusters.map((c, ci) => (
              <span key={c.id} ref={(el) => (clusterRefs.current[ci] = el)} className="v3-clbl" data-on={active === ci || undefined}>
                <span>
                  {c.code} {c.name}
                </span>
              </span>
            ))}
            {nodes.map((n, i) => (
              <span key={n.id} ref={(el) => (labelRefs.current[i] = el)} className="v3-lbl" data-live={n.live || undefined} data-sel={sel === i || undefined}>
                <span>{n.label}</span>
              </span>
            ))}
            <span ref={arrowRef} className="v3-albl">
              <span>
                v̂ joy · layer 17 · Qwen2.5-1.5B
                <small>neg → pos, real activations</small>
              </span>
            </span>
            <div ref={tipRef} className="v3-tip">
              <div>
                <span data-c="" />
                <b data-t="" />
                <span data-m="" />
                <span className="v3-tip__hint">Click to fly in</span>
              </div>
            </div>
          </div>
        </div>

        <div className="v3-bar" role="toolbar" aria-label="View controls">
          <p ref={readoutRef} className="v3-readout" aria-hidden="true">
            YAW 035° · PITCH +17° · R 25.0
          </p>
          <span className="v3-readout v3-readout--pts" aria-hidden="true">
            {fieldCount.toLocaleString('en-US')} pts · {nodes.length} nodes
          </span>
          <button className="v3-btn" aria-pressed={spin && !m.reduced} disabled={m.reduced || status !== 'ready'} onClick={() => setSpin((s) => !s)}>
            <span className="v3-led" data-on={(spin && !m.reduced) || undefined} aria-hidden="true" />
            {m.reduced ? 'Rotation off' : 'Auto-rotate'}
          </button>
          <button className="v3-btn v3-btn--touch" aria-pressed={explore} disabled={status !== 'ready'} onClick={() => setExplore((x) => !x)}>
            <span className="v3-led" data-on={explore || undefined} aria-hidden="true" />
            {explore ? 'Exploring: page scroll paused here' : 'Explore: full orbit'}
          </button>
          {status === 'failed' && <span className="v3-readout v3-readout--warn">WebGL unavailable · the index works the same</span>}
        </div>

        <nav className="v3-index" aria-label="Clusters" {...(wide && sel !== null ? { inert: '' } : {})}>
          <p className="v3-mono v3-index__h">
            <span>Index</span>
            <span>
              {clusters.length} clusters · {nodes.length} nodes
            </span>
          </p>
          <ol>
            {clusters.map((c, ci) => {
              const on = active === ci
              const list = nodesIn(ci)
              return (
                <li key={c.id} data-on={on || undefined}>
                  <button className="v3-index__c" aria-expanded={on} aria-controls={`v3-c-${c.id}`} onClick={() => pickCluster(ci)}>
                    <span className="v3-mono">{c.code}</span>
                    <span className="v3-index__name">{c.name}</span>
                    <span className="v3-mono v3-index__n">{String(list.length).padStart(2, '0')}</span>
                  </button>
                  <div className="v3-index__wrap" {...(on ? {} : { inert: '' })}>
                    <ul id={`v3-c-${c.id}`} className="v3-index__nodes">
                      {list.map(({ n, i }) => (
                        <li key={n.id}>
                          <button onClick={() => open(i)} aria-current={sel === i || undefined}>
                            <span className="v3-dot" data-live={n.live || undefined} aria-hidden="true" />
                            <span className="v3-index__t">{n.label}</span>
                            {n.metric && <span className="v3-mono v3-index__m">{n.metric}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="v3-mono v3-legend">
            <span className="v3-dot" data-live aria-hidden="true" /> Live demo on this site
          </p>
        </nav>

        <AnimatePresence>
          {node && (
            <motion.aside key="sheet" className="v3-sheet" role="dialog" aria-modal="false" aria-labelledby="v3-sheet-t" {...sheetAnim}>
              <div className="v3-sheet__bar">
                <span className="v3-mono">
                  {clusters[node.cluster].code} · {clusters[node.cluster].name} · {String(sIdx + 1).padStart(2, '0')}/{String(siblings.length).padStart(2, '0')}
                </span>
                <button className="v3-x" onClick={close} aria-label="Close">
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={node.id}
                  className="v3-sheet__body"
                  initial={{ opacity: 0, y: 6 * m.k }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: m.dur(0.2), ease: [0.23, 1, 0.32, 1] }}
                >
                  <h3 id="v3-sheet-t" ref={sheetTitle} tabIndex={-1}>
                    {node.title}
                    {node.flag && <Flag note={node.flag} />}
                  </h3>
                  <p className="v3-sheet__meta">
                    {node.role} · {node.meta}
                  </p>
                  {node.metric && (
                    <p className="v3-sheet__metric" data-live={node.live || undefined}>
                      {node.metric}
                    </p>
                  )}
                  {node.body.map((p) => (
                    <p key={p.slice(0, 24)} className="v3-sheet__p">
                      {p}
                    </p>
                  ))}
                  <div className="v3-sheet__acts">
                    {node.to && (
                      <Link to={`${base}${node.to}`} className="v3-cta">
                        {node.toLabel} <span aria-hidden="true">→</span>
                      </Link>
                    )}
                    {node.href && (
                      <a
                        href={node.href}
                        className={node.to ? 'v3-cta v3-cta--ghost' : 'v3-cta'}
                        {...(node.href.startsWith('http') || node.href.endsWith('.pdf') ? { target: '_blank', rel: 'noopener' } : {})}
                      >
                        {node.hrefLabel} <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                  <p className="v3-mono v3-sheet__pos">pos {fmt(node.pos)}</p>
                </motion.div>
              </AnimatePresence>
              {siblings.length > 1 && (
                <div className="v3-sheet__nav">
                  <button className="v3-btn" onClick={() => open(siblings[(sIdx - 1 + siblings.length) % siblings.length].i)}>
                    ← Prev
                  </button>
                  <button className="v3-btn" onClick={() => open(siblings[(sIdx + 1) % siblings.length].i)}>
                    Next →
                  </button>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
