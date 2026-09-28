import { useEffect, useRef, useState } from 'react'
import type { MotionValue } from 'framer-motion'
import data from '../data/timelapse.json'

/**
 * Scroll-scrubbed timelapse (Apple-style image sequence on a canvas).
 * - First paint is a small poster <img> (≤ 27 KB), so the sequence never touches LCP.
 * - Frames load after first paint, only near the viewport, coarse-to-fine (every 8th, 4th, 2nd, then all),
 *   so any scroll position has a nearby frame within ~1 s on 4G. Missing frames crossfade from their neighbours.
 * - Picks the 3:4 phone set when the box is portrait, else 16:9. Save-Data or 2G: posters only.
 * The caller sizes the box (className/height); poster and canvas fill it. `progress` is 0 → 1 (golden hour → night). Pass a framer MotionValue (from useScroll) or a number.
 */
type SetKey = keyof typeof data
export function ScrollTimelapse({
  progress,
  set = 'toronto',
  className,
  alt,
  priority = false,
  position = 'center',
}: {
  progress: MotionValue<number> | number
  set?: SetKey
  className?: string
  alt?: string
  /** true only if this is above the fold; raises poster fetch priority */
  priority?: boolean
  /** object-position for the cover crop, e.g. '50% 70%' */
  position?: string
}) {
  const src = data[set]
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [tall, setTall] = useState(false)
  const [live, setLive] = useState(false)
  const seq = tall ? src.tall : src.wide
  const posters = tall ? src.posters.tall : src.posters.wide
  const p0 = typeof progress === 'number' ? progress : progress.get()
  const posterIdx = p0 < 0.34 ? 0 : p0 < 0.72 ? 1 : 2

  // choose the set from the box's aspect (client only; SSR renders the wide poster)
  useEffect(() => {
    const el = box.current!
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setTall(r.height > r.width * 1.05)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = box.current!
    const cv = canvas.current!
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return // posters only

    const n = seq.count
    const frames: (HTMLImageElement | null)[] = Array(n).fill(null)
    let cancelled = false
    let raf = 0
    let started = false
    const url = (i: number) => `${seq.path}${String(i + 1).padStart(3, '0')}.webp`
    const get = () => (typeof progress === 'number' ? progress : progress.get())

    const draw = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const W = Math.round(r.width * dpr)
      const H = Math.round(r.height * dpr)
      if (!W || !H) return
      if (cv.width !== W || cv.height !== H) {
        cv.width = W
        cv.height = H
      }
      const f = Math.max(0, Math.min(1, get())) * (n - 1)
      let a = Math.floor(f)
      let b = Math.ceil(f)
      while (a > 0 && !frames[a]) a--
      while (b < n - 1 && !frames[b]) b++
      const A = frames[a] ?? frames[b]
      const B = frames[b] ?? frames[a]
      if (!A || !B) return
      const cover = (img: HTMLImageElement, alpha: number) => {
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
        const w = img.naturalWidth * s
        const h = img.naturalHeight * s
        const [px, py] = position.split(' ').map((v) => (v === 'center' ? 0.5 : parseFloat(v) / 100))
        ctx.globalAlpha = alpha
        ctx.drawImage(img, (W - w) * (px ?? 0.5), (H - h) * (py ?? px ?? 0.5), w, h)
      }
      cover(A, 1)
      if (B !== A && b > a) cover(B, (f - a) / (b - a))
      ctx.globalAlpha = 1
      if (!live) setLive(true)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }

    const load = async () => {
      const order: number[] = []
      for (const step of [8, 4, 2, 1]) for (let i = 0; i < n; i += step) if (!order.includes(i)) order.push(i)
      if (!order.includes(n - 1)) order.splice(1, 0, n - 1)
      // 4 parallel lanes keeps the network busy without flooding it
      let k = 0
      const lane = async () => {
        while (!cancelled && k < order.length) {
          const i = order[k++]
          const img = new Image()
          img.decoding = 'async'
          img.src = url(i)
          try {
            await img.decode()
            if (cancelled) return
            frames[i] = img
            schedule()
          } catch {
            /* a missing frame is covered by its neighbours */
          }
        }
      }
      await Promise.all([lane(), lane(), lane(), lane()])
    }

    const start = () => {
      if (started) return
      started = true
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
      idle ? idle(() => load()) : setTimeout(load, 200)
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && start(), { rootMargin: '100% 0px' })
    io.observe(el)
    const unsub = typeof progress === 'number' ? undefined : progress.on('change', schedule)
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
      ro.disconnect()
      unsub?.()
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq, progress, position])

  return (
    <div ref={box} className={`s-tl ${className ?? ''}`} data-live={live || undefined}>
      <img
        className="s-tl__poster"
        src={posters[posterIdx]}
        alt={alt ?? src.title}
        width={seq.w}
        height={seq.h}
        decoding="async"
        {...(priority ? { fetchpriority: 'high' } : { loading: 'lazy' })}
        style={{ objectPosition: position }}
      />
      <canvas ref={canvas} className="s-tl__canvas" aria-hidden="true" />
    </div>
  )
}
