import { useEffect, useRef, useState } from 'react'
import type { AnchorKey, AnchorPos, SatHandle } from './cubesat.lazy'
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
    const id = idle(start, 2500)
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

/**
 * The CubeSat: a static poster in the HTML (a render of the 3D scene at its rest pose), replaced after first paint and
 * idle by the live three.js object. Hotspots are DOM buttons, projected from the 3D anchors when live.
 */
export function SatStage({ lit, reduced, sunlit, live: allowLive }: { lit: boolean; reduced: boolean; sunlit: boolean | null; live: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const handle = useRef<SatHandle | null>(null)
  const spots = useRef<Partial<Record<AnchorKey, HTMLDivElement | null>>>({})
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState<AnchorKey | null>(null)

  useEffect(() => {
    if (reduced || !allowLive) return
    let dead = false
    const canWebGL = (() => {
      try {
        const c = document.createElement('canvas')
        return !!(c.getContext('webgl2') || c.getContext('webgl'))
      } catch {
        return false
      }
    })()
    if (!canWebGL) return
    // first paint, then idle, then the 3D chunk
    const id = idle(() => {
      import('./cubesat.lazy').then(({ mountSat }) => {
        if (dead || !cv.current) return
        const fine = matchMedia('(pointer: fine)').matches
        handle.current = mountSat(cv.current, {
          intro: true,
          drag: fine,
          onFirstFrame: () => setReady(true),
          onAnchors: (as: AnchorPos[]) => {
            const b = box.current
            if (!b) return
            for (const a of as) {
              const el = spots.current[a.k]
              if (!el) continue
              el.style.left = `${a.x * 100}%`
              el.style.top = `${a.y * 100}%`
              if (a.x > 0.62) el.dataset.flip = ''
              else delete el.dataset.flip
              el.style.opacity = String(a.vis)
              el.style.pointerEvents = a.vis > 0.5 ? '' : 'none'
            }
          },
        })
        if (import.meta.env.DEV) (window as unknown as { __h3sat: SatHandle }).__h3sat = handle.current
      })
    }, 1800)
    return () => {
      dead = true
      cancelIdle(id)
      handle.current?.dispose()
      handle.current = null
    }
  }, [reduced, allowLive])

  useEffect(() => handle.current?.sun(sunlit !== false), [sunlit, ready])
  useEffect(() => handle.current?.focus(open), [open, ready])
  useEffect(() => {
    if (!lit) {
      setOpen(null)
      handle.current?.tilt(null)
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
        if (e.pointerType !== 'mouse' || !box.current) return
        const r = box.current.getBoundingClientRect()
        handle.current?.tilt(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
      }}
      onPointerLeave={() => handle.current?.tilt(null)}
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
