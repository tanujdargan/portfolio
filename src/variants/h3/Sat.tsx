import { useEffect, useRef, useState } from 'react'
import type { AnchorKey, AnchorPos, FromSat, ToSat } from './cubesat.lazy'
import { hotspots, restAnchors } from './data'

/** Live sunlight state for MarmotSat from the public TLE (SGP4 in the browser). Loaded after idle; null until known. */
export function useSunlit() {
  const [lit, setLit] = useState<boolean | null>(null)
  useEffect(() => {
    let dead = false
    let timer = 0
    const start = () =>
      import('../../demos/orbit/model').then(async ({ loadTle, Sat }) => {
        const r = await loadTle(4000)
        if (dead) return
        const s = new Sat(r.tle)
        const tick = () => {
          const st = s.state(Date.now())
          if (st && !dead) setLit(st.sunlit)
        }
        tick()
        timer = window.setInterval(tick, 30_000)
      })
    // after load and idle; the SGP4 call is a few ms
    const id = idle(start, 6000)
    return () => {
      dead = true
      cancelIdle(id)
      clearInterval(timer)
    }
  }, [])
  return lit
}

type IdleWin = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
export function idle(cb: () => void, timeout = 2000): number {
  const w = window as IdleWin
  return w.requestIdleCallback ? w.requestIdleCallback(cb, { timeout }) : window.setTimeout(cb, Math.min(timeout, 1200))
}
export function cancelIdle(id: number) {
  const w = window as IdleWin
  if (w.cancelIdleCallback) w.cancelIdleCallback(id)
  else clearTimeout(id)
}

type Send = (m: ToSat, transfer?: Transferable[]) => void

/**
 * The CubeSat: a static poster in the HTML (a render of the 3D scene at its rest pose). The live three.js object boots
 * only once someone engages with the bench (pointer, touch, focus or a scroll), in a Web Worker on an OffscreenCanvas,
 * so the page's main thread never waits on WebGL. The first live frame is the poster's exact pose, so the swap is a cut.
 * Hotspots are DOM buttons, projected from the 3D anchors when live.
 */
export function SatStage({ lit, reduced, sunlit, live: allowLive }: { lit: boolean; reduced: boolean; sunlit: boolean | null; live: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const send = useRef<Send | null>(null)
  const spots = useRef<Partial<Record<AnchorKey, HTMLDivElement | null>>>({})
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState<AnchorKey | null>(null)

  useEffect(() => {
    if (reduced || !allowLive || !('WebGLRenderingContext' in window)) return
    let dead = false
    let started = false
    let worker: Worker | null = null
    const cleanups: (() => void)[] = []
    const canvas = cv.current!
    const bench = box.current?.closest('.h3-bench') ?? document.body

    const onMsg = (m: FromSat) => {
      if (dead) return
      if (m.t === 'first') setReady(true)
      else if (m.t === 'fail') setReady(false)
      else if (m.t === 'anchors')
        for (const a of m.a as AnchorPos[]) {
          const el = spots.current[a.k]
          if (!el) continue
          el.style.left = `${a.x * 100}%`
          el.style.top = `${a.y * 100}%`
          if (a.x > 0.62) el.dataset.flip = ''
          else delete el.dataset.flip
          el.style.opacity = String(a.vis)
          el.style.pointerEvents = a.vis > 0.5 ? '' : 'none'
        }
      else devReply?.(m)
    }
    let devReply: ((m: FromSat) => void) | null = null

    const wire = (s: Send, viaWorker: boolean) => {
      send.current = s
      const r = canvas.getBoundingClientRect()
      const fine = matchMedia('(pointer: fine)').matches
      const target: HTMLCanvasElement | OffscreenCanvas = viaWorker ? canvas.transferControlToOffscreen() : canvas
      s({ t: 'init', canvas: target, w: r.width, h: r.height, pr: devicePixelRatio || 1, coarse: !fine, intro: true, drag: fine }, viaWorker ? [target as OffscreenCanvas] : [])
      // size, visibility and pointer input stay on the main thread and are forwarded
      const ro = new ResizeObserver(([e]) => s({ t: 'size', w: e.contentRect.width, h: e.contentRect.height }))
      ro.observe(canvas)
      let onScreen = true
      const io = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting
        s({ t: 'vis', v: onScreen && !document.hidden })
      })
      io.observe(canvas)
      const onVis = () => s({ t: 'vis', v: onScreen && !document.hidden })
      document.addEventListener('visibilitychange', onVis)
      const down = (e: PointerEvent) => {
        if (!fine || e.button !== 0) return
        canvas.setPointerCapture(e.pointerId)
        canvas.dataset.drag = ''
        s({ t: 'down', x: e.clientX, y: e.clientY })
      }
      const move = (e: PointerEvent) => canvas.dataset.drag !== undefined && s({ t: 'move', x: e.clientX, y: e.clientY })
      const up = () => {
        if (canvas.dataset.drag === undefined) return
        delete canvas.dataset.drag
        s({ t: 'up' })
      }
      canvas.addEventListener('pointerdown', down)
      canvas.addEventListener('pointermove', move)
      canvas.addEventListener('pointerup', up)
      canvas.addEventListener('pointercancel', up)
      cleanups.push(() => {
        ro.disconnect()
        io.disconnect()
        document.removeEventListener('visibilitychange', onVis)
        canvas.removeEventListener('pointerdown', down)
        canvas.removeEventListener('pointermove', move)
        canvas.removeEventListener('pointerup', up)
        canvas.removeEventListener('pointercancel', up)
      })
      if (import.meta.env.DEV) {
        // poster tooling: window.__h3sat.snapshot(1.5) → PNG data URL of the rest pose; .restAnchors() → hotspot spots
        const ask = <T,>(m: ToSat, want: FromSat['t'], pick: (r: FromSat) => T) =>
          new Promise<T>((res) => {
            devReply = (r) => r.t === want && res(pick(r))
            s(m)
          })
        ;(window as unknown as { __h3sat: object }).__h3sat = {
          snapshot: (pr: number) =>
            ask({ t: 'snap', pr }, 'snap', (r) => (r as { blob: Blob }).blob).then(
              (b) => new Promise<string>((res) => Object.assign(new FileReader(), { onload: (e: ProgressEvent<FileReader>) => res(e.target!.result as string) }).readAsDataURL(b)),
            ),
          restAnchors: () => ask({ t: 'rest' }, 'rest', (r) => (r as { a: AnchorPos[] }).a),
        }
      }
    }

    const start = () => {
      if (started || dead) return
      started = true
      off()
      if ('transferControlToOffscreen' in canvas && typeof Worker !== 'undefined') {
        worker = new Worker(new URL('./sat.worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (e: MessageEvent<FromSat>) => onMsg(e.data)
        worker.onerror = () => onMsg({ t: 'fail' })
        const w = worker
        wire((m, transfer) => w.postMessage(m, transfer ?? []), true)
      } else {
        // no OffscreenCanvas: the same host on the main thread (its boot is still staged across frames)
        import('./cubesat.lazy')
          .then(({ host }) => {
            if (dead) return
            wire(host(onMsg), false)
          })
          .catch(() => onMsg({ t: 'fail' }))
      }
    }
    const evs = ['pointerenter', 'pointerdown', 'touchstart', 'focusin'] as const
    const onScroll = () => start()
    function off() {
      evs.forEach((e) => bench.removeEventListener(e, start))
      removeEventListener('scroll', onScroll)
    }
    evs.forEach((e) => bench.addEventListener(e, start, { passive: true }))
    addEventListener('scroll', onScroll, { passive: true, once: true })
    return () => {
      dead = true
      off()
      send.current?.({ t: 'dispose' })
      send.current = null
      worker?.terminate()
      cleanups.forEach((c) => c())
    }
  }, [reduced, allowLive])

  useEffect(() => send.current?.({ t: 'sun', lit: sunlit !== false }), [sunlit, ready])
  useEffect(() => send.current?.({ t: 'focus', k: open }), [open, ready])
  useEffect(() => {
    if (!lit) {
      setOpen(null)
      send.current?.({ t: 'tilt', x: null, y: 0 })
    }
  }, [lit])

  const powerLine =
    sunlit === null
      ? 'Body-mounted solar cells. Checking whether MarmotSat is in sunlight right now…'
      : sunlit
        ? 'Live: MarmotSat is in sunlight right now. Computed with SGP4 from its public TLE, in your browser.'
        : 'Live: MarmotSat is in Earth’s shadow right now. Computed with SGP4 from its public TLE, in your browser.'

  const openSpot = hotspots.find((h) => h.k === open)

  return (
    <div
      className="h3-sat"
      ref={box}
      data-ready={ready || undefined}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !box.current || !send.current) return
        const r = box.current.getBoundingClientRect()
        send.current({ t: 'tilt', x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 })
      }}
      onPointerLeave={() => send.current?.({ t: 'tilt', x: null, y: 0 })}
    >
      <div className="h3-sat__sq">
        <img
          className="h3-sat__poster"
          src="/h3/sat-rest.webp"
          width={600}
          height={600}
          alt="MarmotSat, a 2U CubeSat: an aluminium frame with blue solar cells on every long face and four tape antennas folded out from the top."
          decoding="async"
          draggable={false}
        />
        <canvas ref={cv} className="h3-sat__cv" aria-hidden="true" />
        <div className="h3-sat__shadow" aria-hidden="true" />
        {hotspots.map((h) => (
          <div
            key={h.k}
            className="h3-spot"
            ref={(el) => {
              spots.current[h.k] = el
            }}
            style={{ left: `${restAnchors[h.k].x * 100}%`, top: `${restAnchors[h.k].y * 100}%` }}
            data-open={open === h.k || undefined}
            data-flip={restAnchors[h.k].x > 0.62 || undefined}
          >
            <button
              type="button"
              className="h3-spot__btn"
              aria-expanded={open === h.k}
              aria-label={h.label}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(open === h.k ? null : h.k)
              }}
            >
              <span className="h3-spot__dot" />
            </button>
            <span className="h3-spot__tag" aria-hidden="true">
              {h.label}
            </span>
          </div>
        ))}
      </div>
      <div className="h3-note" data-on={openSpot ? '' : undefined} aria-live="polite" onClick={(e) => e.stopPropagation()}>
        {openSpot && (
          <>
            <b>{openSpot.label}</b>
            <span>{openSpot.k === 'power' ? powerLine : openSpot.line}</span>
          </>
        )}
      </div>
    </div>
  )
}
