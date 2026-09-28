/*
 * S4 "Signal". The home page is a receiver. A full-bleed screen shows the in-focus work's poster (drawn from the
 * demo's own data) as a 1-bit Bayer-dithered signal; the six works are channels, indexed bottom-left in Mona Sans
 * whose width axis follows focus. Switching work is tuning a channel (macroblock noise, row tearing and an RGB split
 * that peak mid-switch), the pointer carries a lens that shows the full-colour signal, and clicking a channel tunes in:
 * the dither resolves and the live demo slides up. Write-ups are reached through a full-screen wipe in the channel's
 * accent. (PATTERNS 13, 15, 38, 39, 42, 7; Kode's accent wipe; Neon's per-item accent; basement's dithered hero.)
 *
 * The screen is raw WebGL2 (gl.ts), loaded after first paint. Before that, and whenever WebGL is off (?gl=0) or
 * fails, the same poster is dithered in CSS: a Bayer threshold tile added over the poster, then thresholded with
 * contrast() (see .s4-tv). The static HTML is a finished page.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent as RPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { works, roles, prefetchDemo, type Work, type WorkKey } from '../../content/work'
import { person, links, earlier } from '../../content/site'
import { posters } from '../../shared/posters/data'
import { Links } from '../../shared/Links'
import { OrgTile } from '../../shared/OrgLogo'
import { Flag } from '../../shared/Flag'
import { Scramble } from '../../shared/Scramble'
import { Split } from '../../shared/Split'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import { useLenis, lenis, scrollToEl } from '../../lib/lenis'
import type { VariantProps } from '../../routes'
import type { Screen as GlScreen } from './gl'
import { place } from './place'
import '../../shared/posters.css'
import './s4.css'

const CYCLE_MS = 6000
const CYCLE_LAPS = 2
/** the channel to come back to after a write-up (client navigations only; hydration always starts on CH 01) */
let resumeCh: number | null = null

const tagLabel: Record<Work['tag'], string> = {
  'real model outputs': 'real model outputs',
  'real tokens': 'real tokens',
  'real TLE': 'real TLE',
  illustrative: 'illustrative',
}
/** The card's caption: shorter than work.ts's hooks (the tune panel carries the full one), same facts. */
const caption: Record<WorkKey, string> = {
  steering: 'Push Qwen2.5-1.5B toward joy. It flips like a switch.',
  orbit: 'I led its onboard-computer firmware. It’s in orbit now.',
  lossmask: 'Loss masking decides how loudly models voice shutdown distress.',
  retrieval: 'GPU vector search: 1–4M QPS at billion scale.',
  es: 'Tuning a LoRA with no gradients, only a binary reward.',
  ocean: 'Satellite imagery in, temperature at depth out.',
}
const osdLine = (w: Work) => `${w.short} · ${tagLabel[w.tag]} · ${w.metric}`.toUpperCase().replace('R² = ', 'R² ')

const Arrow = ({ out = false, back = false }: { out?: boolean; back?: boolean }) => (
  <svg className="s4-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={back ? { transform: 'scaleX(-1)' } : undefined}>
    {out ? <path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.4" /> : <path d="M1.5 6h8.5M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" />}
  </svg>
)

const useFine = () => {
  const [fine, setFine] = useState(true)
  useEffect(() => {
    const mq = matchMedia('(hover: hover) and (pointer: fine)')
    setFine(mq.matches)
    const on = () => setFine(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return fine
}

/* ---------------- the CSS signal (static HTML, and the no-WebGL fallback) ---------------- */

function Tv({ w, on, full = false }: { w: Work; on: boolean; full?: boolean }) {
  const svg = (cls: string) => <svg className={`s-poster s4-tv__svg ${cls}`} viewBox="0 0 360 140" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: posters[w.key] }} />
  return (
    <div className="s4-tv" data-on={on || undefined} style={{ ['--accent' as string]: w.accent, ['--dx' as string]: place[w.key].desk[0], ['--dy' as string]: place[w.key].desk[1], ['--ps' as string]: place[w.key].desk[2], ['--fx' as string]: place[w.key].fx } as CSSProperties}>
      <div className="s4-tv__g">
        <i className="s4-tv__field" />
        {svg('s4-pv--grey')}
        <i className="s4-tv__scrim" />
        <i className="s4-tv__bayer" />
      </div>
      <div className="s4-tv__a">
        <div className="s4-tv__g s4-tv__g--a">
          {svg('s4-pv--acc')}
          <i className="s4-tv__scrim" />
          <i className="s4-tv__bayer" />
        </div>
        <i className="s4-tv__tint" />
      </div>
      {full && <div className="s4-tv__full">{svg('s4-pv--full')}</div>}
    </div>
  )
}

type ScreenState = 'css' | 'gl' | 'fallback'

function Screen({ ch, tuned, api, onState }: { ch: number; tuned: boolean; api: React.MutableRefObject<GlScreen | null>; onState: (s: ScreenState) => void }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const m = useMotionPrefs()
  const [state, setState] = useState<ScreenState>('css')
  const first = useRef(ch)
  useEffect(() => onState(state), [state, onState])

  useEffect(() => {
    let dead = false
    if (new URLSearchParams(location.search).get('gl') === '0') {
      setState('fallback')
      return
    }
    const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches
    const go = () =>
      import('./gl')
        .then(({ createScreen }) => {
          if (dead || !cv.current) return
          const s = createScreen({
            canvas: cv.current,
            keys: works.map((w) => w.key),
            accents: works.map((w) => w.accent),
            first: first.current,
            mobile,
            reduced: m.reduced,
            t: m.reduced ? 0.5 : m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.2 : 1,
            k: m.k,
            onReady: () => !dead && setState('gl'),
            onFail: () => {
              if (dead) return
              api.current?.dispose()
              api.current = null
              setState('fallback')
            },
          })
          if (!s) setState('fallback')
          api.current = s
        })
        .catch(() => !dead && setState('fallback'))
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number; cancelIdleCallback?: (n: number) => void }
    const id = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1200 }) : window.setTimeout(go, 300)
    return () => {
      dead = true
      if (w.cancelIdleCallback) w.cancelIdleCallback(id)
      else clearTimeout(id)
      api.current?.dispose()
      api.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api.current?.prefs({ reduced: m.reduced, t: m.reduced ? 0.5 : m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.2 : 1, k: m.k })
  }, [m.reduced, m.level, m.k, api, state])
  useEffect(() => api.current?.show(ch), [ch, api, state])
  useEffect(() => api.current?.tune(tuned), [tuned, api, state])

  return (
    <div className="s4-screen" data-state={state} data-tuned={tuned || undefined} aria-hidden="true">
      <div className="s4-screen__css">
        {state === 'fallback' ? works.map((w, i) => <Tv key={w.key} w={w} on={i === ch} full={i === ch} />) : <Tv w={works[ch]} on />}
      </div>
      <canvas ref={cv} className="s4-screen__gl" />
      <i className="s4-screen__vig" />
    </div>
  )
}

/* ---------------- chrome ---------------- */

function Bar({ base, home }: { base: string; home: boolean }) {
  return (
    <header className="s4-bar">
      {home ? (
        <p className="s4-bar__id">
          <span className="s4-bar__name">{person.name}</span>
          <span className="s4-bar__line">ML systems · interpretability</span>
        </p>
      ) : (
        <Link to={`${base}/`} className="s4-bar__id s4-bar__back">
          <Arrow back />
          <span className="s4-bar__name">{person.name}</span>
          <span className="s4-bar__line">Back to the signal</span>
        </Link>
      )}
      <nav className="s4-bar__links" aria-label="Links">
        <Links className="s4-links s4-links--cv" mode="label" only={['resume']} />
        <Links className="s4-links" mode="icon" size={16} only={['github', 'linkedin', 'x', 'email']} />
      </nav>
    </header>
  )
}

/* ---------------- hero: the receiver ---------------- */

function Osd({ w, i, onLens, lensOn }: { w: Work; i: number; onLens: () => void; lensOn: boolean }) {
  return (
    <div className="s4-osd">
      <p className="s4-osd__ch">
        <span className="s4-osd__lbl">CH</span>
        <Scramble className="s4-osd__n" text={w.n} trigger="change" duration={420} />
        <span className="s4-osd__of">/06</span>
      </p>
      <Scramble as="p" className="s4-osd__id" text={osdLine(w)} trigger="change" duration={560} />
      <button type="button" className="s4-osd__lens" aria-pressed={lensOn} onClick={onLens}>
        <span className="s4-osd__dot" aria-hidden="true" data-i={i} />
        Lens<span className="sr-only">: show the full signal</span>
      </button>
    </div>
  )
}

function Card({ w, cycling, onTune, tuned }: { w: Work; cycling: boolean; onTune: () => void; tuned: boolean }) {
  return (
    <div className="s4-card">
      <p className="s4-card__hook" key={w.key}>
        <Split text={caption[w.key]} />
      </p>
      <div className="s4-card__row">
        <button type="button" className="s4-tunebtn" onClick={onTune} aria-expanded={tuned} aria-controls="s4-tune">
          <span className="s4-tunebtn__dot" aria-hidden="true" />
          Tune in
          <kbd aria-hidden="true">↵</kbd>
        </button>
        <span className="s4-card__prog" aria-hidden="true" data-on={cycling || undefined}>
          <i key={`${w.key}-${cycling}`} />
        </span>
      </div>
    </div>
  )
}

function TunePanel({ w, base, onClose, fine }: { w: Work; base: string; onClose: () => void; fine: boolean }) {
  const m = useMotionPrefs()
  const h = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const t = setTimeout(() => h.current?.focus({ preventScroll: true }), 60)
    return () => clearTimeout(t)
  }, [w.key])
  return (
    <motion.div
      id="s4-tune"
      className="s4-tune"
      role="dialog"
      aria-modal="false"
      aria-labelledby="s4-tune-h"
      data-lenis-prevent
      initial={m.reduced ? { opacity: 0.01 } : { opacity: 0.01, y: 48 * m.k, clipPath: 'inset(12% 0% 0% 0% round 18px)' }}
      animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 18px)', transition: { duration: m.dur(0.7), ease: [0.16, 1, 0.3, 1], delay: m.reduced ? 0 : m.dur(0.12) } }}
      exit={m.reduced ? { opacity: 0 } : { opacity: 0, y: 32 * m.k, transition: { duration: m.dur(0.333), ease: [0.65, 0, 0.35, 1] } }}
      style={{ ['--accent' as string]: w.accent } as CSSProperties}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="s4-tune__head">
        <p className="s4-tune__osd">
          <span>CH {w.n}</span>
          <span>{tagLabel[w.tag]}</span>
          <span>{w.meta}</span>
        </p>
        <button type="button" className="s4-tune__close" onClick={onClose}>
          Close <kbd aria-hidden="true">{fine ? 'esc' : '×'}</kbd>
        </button>
      </div>
      <div className="s4-tune__body">
        <div className="s4-tune__meta">
          <h2 ref={h} className="s4-tune__t" id="s4-tune-h" tabIndex={-1}>
            {w.title}
            {w.flag && <Flag note={w.flag} />}
          </h2>
          <p className="s4-tune__hook">{w.hook}</p>
          <p className="s4-tune__metric">{w.metric}</p>
          {w.slug && (
            <Link to={`${base}/research/${w.slug}`} className="s4-go" data-accent={w.accent} data-ch={w.n}>
              Read the write-up <Arrow />
            </Link>
          )}
        </div>
        <div className="s4-tune__demo">
          <Demo kind={w.key} />
        </div>
      </div>
    </motion.div>
  )
}

function Hero({ base }: { base: string }) {
  const m = useMotionPrefs()
  const fine = useFine()
  const [ch, setChState] = useState(() => {
    const r = resumeCh
    resumeCh = null
    return r ?? 0
  })
  const [tuned, setTuned] = useState(false)
  const tunedRef = useRef(false)
  tunedRef.current = tuned
  const [cycling, setCycling] = useState(false)
  const [lensKey, setLensKey] = useState(false)
  const [screen, setScreen] = useState<ScreenState>('css')
  const api = useRef<GlScreen | null>(null)
  const hero = useRef<HTMLElement>(null)
  const idx = useRef<HTMLOListElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const osd = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLButtonElement | null)[]>([])
  const laps = useRef(0)
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined)
  const w = works[ch]

  const setCh = useCallback((i: number) => {
    setChState(i)
    prefetchDemo[works[i].key]?.().catch(() => {})
  }, [])

  // auto-cycle: every 6 s, at most two laps, paused by any interaction, never under reduced motion
  const pause = useCallback(
    (resumeAfter = 7000) => {
      setCycling(false)
      clearTimeout(idle.current)
      if (resumeAfter > 0 && !m.reduced && laps.current < CYCLE_LAPS * works.length)
        idle.current = setTimeout(() => setCycling(true), resumeAfter)
    },
    [m.reduced],
  )
  useEffect(() => {
    if (m.reduced) return
    idle.current = setTimeout(() => setCycling(true), 2400)
    return () => clearTimeout(idle.current)
  }, [m.reduced])
  useEffect(() => {
    if (!cycling || tuned || m.reduced) return
    const t = setTimeout(() => {
      laps.current += 1
      setChState((c) => (c + 1) % works.length)
      if (laps.current >= CYCLE_LAPS * works.length) setCycling(false)
    }, CYCLE_MS)
    return () => clearTimeout(t)
  }, [cycling, ch, tuned, m.reduced])
  useEffect(() => api.current?.cycle(cycling && !tuned), [cycling, tuned, screen])

  // the screen thins its dither behind the type (desktop); rects are relative to the screen
  useEffect(() => {
    // the index scrim hugs the words (their width animates with the wdth axis), not the full-width row buttons
    const words = [...idx.current!.querySelectorAll<HTMLElement>('.s4-row__t')]
    const union = () => {
      const rs = words.map((x) => x.getBoundingClientRect())
      const l = Math.min(...rs.map((r) => r.left)) - 34
      return new DOMRect(l, rs[0].top, Math.max(...rs.map((r) => r.right)) - l, rs[rs.length - 1].bottom - rs[0].top)
    }
    const upd = () => api.current?.scrim([union(), card.current!.getBoundingClientRect(), osd.current!.firstElementChild!.getBoundingClientRect()])
    upd()
    const ro = new ResizeObserver(upd)
    words.forEach((x) => ro.observe(x))
    ro.observe(card.current!)
    ro.observe(osd.current!.firstElementChild!)
    // phones: the index scrolls over the pinned screen, so the scrim follows it
    let raf = 0
    const fade = () => {
      // rows fade out as they rise towards the OSD
      for (const r of rows.current) {
        if (!r) continue
        const b = r.getBoundingClientRect()
        const t = (b.top + b.height / 2) / innerHeight
        r.style.setProperty('--vis', String(Math.max(0, Math.min(1, (t - 0.24) / 0.16)).toFixed(3)))
      }
    }
    const onScroll = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0
          upd()
          fade()
        })
    }
    if (!fine) fade()
    if (!fine) addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [fine, screen])

  // phones: the row crossing the band under the screen is on air (scroll is the tuning dial)
  useEffect(() => {
    if (fine) return
    let armed = false
    const arm = () => (armed = true)
    addEventListener('touchstart', arm, { passive: true, once: true })
    addEventListener('wheel', arm, { passive: true, once: true })
    const io = new IntersectionObserver(
      (es) => {
        if (!armed) return
        for (const e of es)
          if (e.isIntersecting) {
            const i = rows.current.indexOf(e.target as HTMLButtonElement)
            if (i >= 0 && !tunedRef.current) {
              setCh(i)
              pause(0)
            }
          }
      },
      // the band sits where the first row's centre is at rest, so the page opens on CH 01 and each row's worth of
      // scroll tunes the next channel
      (() => {
        const r = rows.current[0]!.getBoundingClientRect()
        const y = r.top + scrollY + r.height / 2 - (hero.current!.getBoundingClientRect().top + scrollY)
        return { rootMargin: `${-Math.round(y - 2)}px 0px ${-Math.round(innerHeight - y - 2)}px 0px` }
      })(),
    )
    rows.current.forEach((r) => r && io.observe(r))
    return () => {
      io.disconnect()
      removeEventListener('touchstart', arm)
      removeEventListener('wheel', arm)
    }
  }, [fine, setCh, pause])

  // tuned: lock the page (the panel scrolls), Esc closes, focus returns to the row
  const close = useCallback(() => {
    setTuned(false)
    rows.current[ch]?.focus({ preventScroll: true })
  }, [ch])
  useEffect(() => {
    if (!tuned) return
    const html = document.documentElement
    html.dataset.s4Lock = ''
    lenis()?.stop()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('keydown', onKey)
    return () => {
      delete html.dataset.s4Lock
      lenis()?.start()
      removeEventListener('keydown', onKey)
    }
  }, [tuned, close])

  const tune = (i: number) => {
    setCh(i)
    setTuned(true)
    pause(0)
    // desktop: bring the whole screen into view under the panel (phones keep their place on the dial)
    const top = hero.current?.getBoundingClientRect().top ?? 0
    if (fine && Math.abs(top) > 2) scrollToEl(hero.current!, true)
  }

  // the lens: follows a fine pointer; on touch, press and hold the screen; the OSD button pins it for keys and taps
  const hold = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [lensPinned, setLensPinned] = useState(false)
  const lensAt = (x: number, y: number, on: boolean) => {
    api.current?.lens(x, y, on)
    if (screen === 'fallback' && hero.current) {
      hero.current.style.setProperty('--lx', `${x}px`)
      hero.current.style.setProperty('--ly', `${y - hero.current.getBoundingClientRect().top}px`)
      hero.current.dataset.lens = on ? '1' : ''
    }
  }
  const overUi = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('button, a, .s4-tune')
  const onMove = (e: RPointerEvent) => {
    if (tuned) return
    if (e.pointerType === 'mouse') {
      lensAt(e.clientX, e.clientY, !overUi(e.target) && !(e.target as HTMLElement).closest('.s4-idx, .s4-hero__card, .s4-osd'))
      if (!overUi(e.target)) pause()
    } else if (hero.current?.dataset.hold) lensAt(e.clientX, e.clientY, true)
  }
  const onDown = (e: RPointerEvent) => {
    if (e.pointerType === 'mouse' || overUi(e.target) || tuned) return
    const { clientX: x, clientY: y } = e
    clearTimeout(hold.current)
    hold.current = setTimeout(() => {
      hero.current!.dataset.hold = '1'
      lensAt(x, y, true)
      pause()
    }, 380)
  }
  const onUp = () => {
    clearTimeout(hold.current)
    if (hero.current?.dataset.hold) {
      delete hero.current.dataset.hold
      lensAt(0, 0, false)
    }
  }
  const pinLens = () => {
    const next = !lensPinned
    setLensPinned(next)
    setLensKey(next)
    const r = hero.current!.getBoundingClientRect()
    lensAt(r.left + r.width * 0.62, r.top + r.height * 0.42, next)
    if (next) pause(0)
  }

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = (i + (e.key === 'ArrowDown' ? 1 : works.length - 1)) % works.length
      rows.current[n]?.focus()
    }
  }

  return (
    <section
      id="work"
      ref={hero}
      className="s4-hero"
      aria-labelledby="s4-h1"
      data-tuned={tuned || undefined}
      style={{ ['--accent' as string]: w.accent } as CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={(e) => e.pointerType === 'mouse' && !lensPinned && lensAt(e.clientX, e.clientY, false)}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => hero.current?.dataset.hold && e.preventDefault()}
    >
      <span id="research" className="s4-anchor" />
      <div className="s4-pin">
        <Screen ch={ch} tuned={tuned} api={api} onState={setScreen} />
        <div className="s4-hero__ui">
          <div ref={osd} className="s4-hero__osd">
            <Osd w={w} i={ch} lensOn={lensKey} onLens={pinLens} />
          </div>
          <div ref={card} className="s4-hero__card">
            <Card w={w} cycling={cycling && !tuned} tuned={tuned} onTune={() => tune(ch)} />
          </div>
        </div>
      </div>
      <h1 id="s4-h1" className="sr-only">
        {person.name}: six works, as channels
      </h1>
      <ol ref={idx} className="s4-idx" aria-label="Six works" onPointerLeave={() => pause()}>
        {works.map((x, i) => (
          <li key={x.key}>
            <button
              ref={(el) => void (rows.current[i] = el)}
              type="button"
              className="s4-row"
              data-on={i === ch || undefined}
              aria-current={i === ch ? 'true' : undefined}
              aria-expanded={tuned && i === ch}
              aria-controls="s4-tune"
              style={{ ['--acc' as string]: x.accent } as CSSProperties}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'mouse') return
                pause()
                if (i !== ch) setCh(i)
              }}
              onFocus={() => {
                if (i !== ch && !tuned) setCh(i)
                pause()
              }}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => tune(i)}
            >
              <span className="s4-row__n">{x.n}</span>
              <span className="s4-row__t">{x.short}</span>
              <span className="s4-row__go" aria-hidden="true">
                Tune in
              </span>
            </button>
          </li>
        ))}
      </ol>
      <AnimatePresence>{tuned && <TunePanel key="tune" w={w} base={base} fine={fine} onClose={close} />}</AnimatePresence>
    </section>
  )
}

/* ---------------- below the fold ---------------- */

/** Entrances, once. Anything on screen at hydration stays put; the rest rasters in as it arrives. */
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('.s4 [data-reveal]')].filter((el) => el.getBoundingClientRect().top > innerHeight)
    els.forEach((el) => el.classList.add('s4-pre'))
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('s4-in')
          e.target.classList.remove('s4-pre')
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -10% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function Head({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <header className="s4-head" data-reveal>
      <Scramble as="p" className="s4-kick" text={kicker} />
      <h2 className="s4-h2" id={`${id}-h`}>
        <Split text={title} by="char" />
      </h2>
    </header>
  )
}

function Experience() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="experience" className="s4-sec" aria-labelledby="experience-h">
      <Head id="experience" kicker="06 roles · 2025–26" title="Experience" />
      <ol className="s4-xp">
        {roles.map((r, i) => {
          const o = open === i
          return (
            <li key={r.org} className="s4-xp__item" data-open={o || undefined} data-reveal style={{ ['--i' as string]: i } as CSSProperties}>
              <button type="button" className="s4-xp__row" aria-expanded={o} aria-controls={`s4-xp-${i}`} onClick={() => setOpen(o ? null : i)}>
                <OrgTile org={r.logo} size={36} className="s4-xp__tile" />
                <span className="s4-xp__main">
                  <span className="s4-xp__t">
                    {r.role}
                    <span className="s4-xp__org"> · {r.org}</span>
                  </span>
                  <span className="s4-xp__line">{r.line}</span>
                </span>
                <span className="s4-xp__when">{r.when}</span>
                <span className="s4-plus" aria-hidden="true" />
              </button>
              <div className="s4-xp__more" id={`s4-xp-${i}`}>
                <div className="s4-xp__inner">
                  <p className="s4-xp__metric">
                    <b>{r.metric}</b>
                    <span>{r.where}</span>
                  </p>
                  <ul className="s4-xp__bul">
                    {r.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Elsewhere({ base }: { base: string }) {
  return (
    <section id="elsewhere" className="s4-sec s4-sec--else" aria-labelledby="elsewhere-h">
      <Head id="elsewhere" kicker="off-air" title="Elsewhere" />
      <div className="s4-else" data-reveal>
        <Show when="beri">
          <Link to={`${base}/beri`} className="s4-else__beri" data-accent="#e8e8ea" data-ch="B">
            <span className="s4-else__k">Beri</span>
            <span className="s4-else__v">A food app I’m building, for iOS.</span>
            <Arrow />
          </Link>
        </Show>
        <details className="s4-earlier">
          <summary>
            <span className="s4-else__k">Earlier work</span>
            <span className="s4-else__v">Hackathons, Kaggle, open source</span>
            <span className="s4-earlier__n">{String(earlier.length).padStart(2, '0')}</span>
            <span className="s4-plus" aria-hidden="true" />
          </summary>
          <ul className="s4-earlier__list">
            {earlier.map((e) => {
              const inner = (
                <>
                  <span className="s4-earlier__t">
                    {e.title}
                    {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in a local repo; confirm it's okay to list." />}
                  </span>
                  <span className="s4-earlier__r">{e.role}</span>
                  <span className="s4-earlier__w">{e.when}</span>
                  {e.href && <Arrow out />}
                </>
              )
              return (
                <li key={e.title}>
                  {e.href ? (
                    <a href={e.href} target="_blank" rel="noopener" className="s4-earlier__row">
                      {inner}
                    </a>
                  ) : (
                    <div className="s4-earlier__row">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </details>
      </div>
    </section>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button
      type="button"
      className="s4-mail"
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          clearTimeout(t.current)
          t.current = setTimeout(() => setCopied(false), 1800)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="s4-mail__a">{person.email}</span>
      <span className="s4-mail__hint" aria-hidden="true">
        <Scramble text={copied ? 'copied' : 'copy'} trigger="change" duration={360} />
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : ', copy to clipboard'}
      </span>
    </button>
  )
}

function Contact() {
  return (
    <section id="contact" className="s4-sec s4-contact" aria-labelledby="contact-h">
      <Head id="contact" kicker="open channel" title="Contact" />
      <div data-reveal>
        <p className="s4-contact__line">Email is fastest.</p>
        <CopyEmail />
        <Links className="s4-contact__links" mode="label" />
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="s4-foot">
      <ol className="s4-bars" aria-hidden="true">
        {works.map((w) => (
          <li key={w.key} style={{ background: w.accent }} />
        ))}
      </ol>
      <p>
        © 2026 {person.name} · Set in Mona Sans and Martian Mono · The screen is WebGL2, dithered 1-bit through an 8×8 Bayer matrix.
      </p>
    </footer>
  )
}

function Home({ base }: { base: string }) {
  useReveal()
  useLenis(true)
  return (
    <>
      <Hero base={base} />
      <Experience />
      <Elsewhere base={base} />
      <Contact />
      <Footer />
    </>
  )
}

/* ---------------- inner pages ---------------- */

function DocHead({ w }: { w: Work }) {
  return (
    <p className="s4-docosd">
      <span className="s4-docosd__ch">CH {w.n}</span>
      <span>{osdLine(w)}</span>
    </p>
  )
}

/* ---------------- root: routes and the accent wipe ---------------- */

type Wipe = { phase: 'in' | 'out'; color: string; label: string } | null

export default function S4({ page, base }: VariantProps) {
  const { path, navigate } = useRouter()
  const m = useMotionPrefs()
  const home = page.kind === 'home'
  const [wipe, setWipe] = useState<Wipe>(null)
  const pending = useRef(false)
  const work = page.kind === 'research' ? works.find((x) => x.slug === page.slug) : undefined

  // After the route commits under the wipe, uncover the new page from the other side.
  useEffect(() => {
    if (!pending.current) return
    pending.current = false
    let r2 = 0
    const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(() => setWipe((x) => (x ? { ...x, phase: 'out' } : x)))))
    const t = setTimeout(() => setWipe(null), 60 + 900 * (m.level === 'expressive' ? 1.2 : 1))
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      clearTimeout(t)
    }
  }, [path, m.level])

  const onClickCapture = (e: MouseEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || m.reduced) return
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href') || ''
    if (!href.startsWith(base + '/') || a?.target === '_blank' || href.endsWith('.pdf')) return
    const bare = href.split('#')[0]
    if (bare === path || (home && href.startsWith(`${base}/#`))) return
    const to = bare.slice(base.length) || '/'
    const tw = works.find((x) => x.slug && to === `/research/${x.slug}`)
    let color = a?.dataset.accent || tw?.accent || '#c9ccd2'
    let label = tw ? `CH ${tw.n} · ${tw.short} · write-up` : to === '/beri' ? 'Beri · case study' : 'Back to the signal'
    if (to === '/') {
      const from = work ?? works[0]
      color = from.accent
      label = `CH ${from.n} · back to the signal`
      resumeCh = works.indexOf(from)
    }
    e.preventDefault()
    e.stopPropagation()
    setWipe({ phase: 'in', color, label })
    setTimeout(() => {
      pending.current = true
      navigate(href)
    }, 440 * (m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.2 : 1))
  }

  return (
    <div className="s4" data-page={page.kind} data-wipe={wipe?.phase} data-lab={base.startsWith('/lab') || undefined} style={work ? ({ ['--accent' as string]: work.accent } as CSSProperties) : undefined}>
      <a href="#main" className="s4-skip">
        Skip to content
      </a>
      <Bar base={base} home={home} />
      <main id="main" key={path} tabIndex={-1} onClickCapture={onClickCapture}>
        {home && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="s4-doc">
            {work && <DocHead w={work} />}
            <ResearchArticle slug={page.slug} base={base} />
            <p className="s4-doc__back">
              <Link to={`${base}/`} className="s4-go">
                <Arrow back /> Back to the signal
              </Link>
            </p>
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="s4-doc">
            <BeriCaseStudy base={base} />
            <p className="s4-doc__back">
              <Link to={`${base}/`} className="s4-go">
                <Arrow back /> Back to the signal
              </Link>
            </p>
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="s4-nf" aria-labelledby="s4-nf-h">
            <div className="s4-nf__static s4-tv__g" aria-hidden="true">
              <i className="s4-nf__field" />
              <i className="s4-tv__bayer" />
            </div>
            <p className="s4-kick">CH 404 · no signal</p>
            <h1 className="s4-nf__t" id="s4-nf-h">
              Nothing on this channel.
            </h1>
            <Link to={`${base}/`} className="s4-go">
              Back to the signal <Arrow />
            </Link>
          </section>
        )}
      </main>
      {!home && (
        <footer className="s4-foot s4-foot--doc">
          <p>© 2026 {person.name}</p>
        </footer>
      )}
      <div className="s4-wipe" data-phase={wipe?.phase} style={{ ['--wc' as string]: wipe?.color } as CSSProperties} aria-hidden="true">
        <i className="s4-wipe__p" />
        <p className="s4-wipe__l">{wipe?.label}</p>
      </div>
    </div>
  )
}

export type { WorkKey }
