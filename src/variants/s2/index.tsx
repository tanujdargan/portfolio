/*
 * S2 "Latent": v6's real activation space, rebuilt so the work is the hero.
 *
 * The first screen is the steering experiment itself: 120 real residual-stream activations from Qwen2.5-1.5B-Instruct
 * as a WebGL point field, the model's real answer set large, and an α rail. Drag α and the field bends while the
 * sentence rewrites itself the way a greedy decoder would (shared prefix stays, the rest backspaces and re-streams).
 * Scrolling flies the camera through five clusters (steering, research, systems, hardware, experience) to an overview.
 *
 * Patterns (research/PATTERNS.md): 16 numbered dock with preview cards · 2/31 scramble decodes and morphing labels ·
 * 1 word-masked reveals · 6 per-letter roll · 11 focus-dim rows · 52 number ticker · 53 the value moves with the control ·
 * 29 scroll as a camera move · 24 clip-path reveal · 18 shared-element title into the write-up · 33/35 cursor as a
 * query vector · 54 detent haptics. Studios: basement (spec rows, one accent as an event), Koto (two-tone headings,
 * one lit thing), Unseen (routes as camera moves), Neon (per-work accent re-theme), Kode (instrument chrome).
 * Type: Geist Mono (display, instruments) + Newsreader (the model's voice and prose), latin subsets from public/s2.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { person, earlier, links } from '../../content/site'
import { works, roles, prefetchDemo, workBySlug, type Work, type WorkKey } from '../../content/work'
import { OrgTile } from '../../shared/OrgLogo'
import { Show } from '../../lib/labprefs'
import { Links, LinkIcon } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { Poster } from '../../shared/Poster'
import { Split } from '../../shared/Split'
import { Scramble } from '../../shared/Scramble'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { useLenis, lenis } from '../../lib/lenis'
import type { VariantProps } from '../../routes'
import { bus } from './bus'
import { useLayoutEffect as useLE } from 'react'
// layout effects on the client only (the prerender has no layout)
const useIsoLayout = typeof window === 'undefined' ? useEffect : useLE
import { Steer } from './Steer'
import './s2.css'

const Demo = lazy(() => import('../../demos/Demo').then((m) => ({ default: m.Demo })))

/* ---------------- the six works, in flight order ---------------- */

const ORDER: WorkKey[] = ['steering', 'lossmask', 'es', 'retrieval', 'ocean', 'orbit']
const W = (k: WorkKey) => works.find((w) => w.key === k)!
const hashFor = (k: WorkKey) => (k === 'steering' ? 'steering' : `w-${k}`)
const NUM = (k: WorkKey) => String(ORDER.indexOf(k) + 1).padStart(2, '0')
const TONE: Record<WorkKey, string> = {
  steering: 'along emotion directions',
  lossmask: 'and shutdown distress',
  es: 'fine-tuning without gradients',
  retrieval: 'at billion scale',
  ocean: 'deep-water temperature from orbit',
  orbit: 'in orbit',
}
// Shorter hooks where the work.ts one repeats the title (launch date: SatNOGS, noted in site.ts milestones).
const HOOK: Partial<Record<WorkKey, string>> = { orbit: 'I led its onboard-computer firmware. It launched on a Falcon 9 in July 2026.' }
const TAG: Record<Work['tag'], string> = { 'real model outputs': 'real outputs', 'real tokens': 'real tokens', 'real TLE': 'real TLE', illustrative: 'illustrative' }
const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]

// Cluster centroids (mirrors scene.ts, kept here so the static HTML doesn't import the scene chunk).
const STOPS = [
  { id: 'steering', name: 'Steering', c: '(6, 0, −70)' },
  { id: 'research', name: 'Research', c: '(−7, 2, −150)' },
  { id: 'systems', name: 'Systems', c: '(7, −1, −230)' },
  { id: 'hardware', name: 'Hardware', c: '(−6, 1, −310)' },
  { id: 'experience', name: 'Experience', c: '(6, 0, −390)' },
  { id: 'contact', name: 'Contact', c: 'all five, from outside' },
]
const parkFor = (page: VariantProps['page']) => {
  if (page.kind === 'research') return ['billion-vector-retrieval', 'ocean-sensing'].includes(page.slug) ? 2 : page.slug === 'activation-steering' ? 0 : 1
  if (page.kind === 'beri') return 4
  return 5
}

/** Scroll to an element without touching the URL (a hash change re-routes the app). */
function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  const y = id === 'steering' ? 0 : el.getBoundingClientRect().top + scrollY - (innerWidth < 761 ? 64 : 88)
  lenis() && !reduced ? lenis()!.scrollTo(y, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4) }) : scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' })
  el.focus({ preventScroll: true })
}

/* ---------------- hooks ---------------- */

/** The work under the reading band (centre of the viewport). Experience and contact light nothing. */
function useActive(on: boolean) {
  const [active, setActive] = useState<WorkKey | null>('steering')
  useEffect(() => {
    if (!on) return
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive(((e.target as HTMLElement).dataset.work as WorkKey) || null)
      },
      { rootMargin: '-46% 0px -46% 0px' },
    )
    document.querySelectorAll('.s2 [data-work]:not(a), #experience, #contact').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [on])
  return active
}

/** Entrances, once. Anything on screen at hydration stays; the rest is armed and plays as it arrives. */
function useReveal(on: boolean, reduced: boolean) {
  useEffect(() => {
    if (!on || reduced || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = [...document.querySelectorAll<HTMLElement>('.s2 [data-rv]')].filter((el) => el.getBoundingClientRect().top > innerHeight * 0.92)
    els.forEach((el) => el.classList.add('s2-pre'))
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('s2-on')
          e.target.classList.remove('s2-pre')
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -12% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => {
      io.disconnect()
      els.forEach((el) => el.classList.remove('s2-pre'))
    }
  }, [on, reduced])
}

/* ---------------- the field ---------------- */

function Field({ onReady }: { onReady: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const lbl = useRef<HTMLDivElement>(null)
  const tags = useRef<HTMLDivElement>(null)
  const pos = useRef<HTMLSpanElement>(null)
  const neg = useRef<HTMLSpanElement>(null)
  const mk = useRef<HTMLSpanElement>(null)
  const [state, setState] = useState<'idle' | 'live' | 'fallback'>('idle')
  const [pin, setPin] = useState({ c: 'joy', a: '±0.00', e: '−10.2', lo: 'flat', hi: 'joyful' })
  useEffect(() => {
    let dead = false
    let handle: { dispose: () => void } | null = null
    const fail = () => {
      if (dead) return
      setState('fallback')
      onReady()
    }
    if (new URLSearchParams(location.search).get('gl') === '0') {
      fail()
      return
    }
    const go = () =>
      import('./scene')
        .then(({ createScene }) => {
          if (dead) return
          const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches
          const nav = navigator as Navigator & { deviceMemory?: number }
          const low = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 3
          handle = createScene({
            canvas: cv.current!,
            label: lbl.current,
            tags: Array.from(tags.current!.children) as HTMLElement[],
            pins: { pos: pos.current, neg: neg.current, marker: mk.current },
            root: cv.current!.closest('.s2') as HTMLElement,
            mobile,
            low,
            onReady: () => {
              if (dead) return
              setState('live')
              onReady()
            },
            onFail: fail,
          })
          if (!handle) fail()
        })
        .catch(fail)
    // After first paint, when the main thread is idle.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number; cancelIdleCallback?: (n: number) => void }
    const id = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1200 }) : window.setTimeout(go, 300)
    return () => {
      dead = true
      if (w.cancelIdleCallback) w.cancelIdleCallback(id)
      else clearTimeout(id)
      handle?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // pin text follows the hero (read from the DOM the hero renders, so the field stays decoupled)
  useEffect(() => {
    const on = () => {
      const s = document.querySelector<HTMLElement>('.s2-steer')
      if (!s) return
      setPin({ c: s.dataset.c || 'joy', a: s.dataset.a || '±0.00', e: s.dataset.e || '', lo: s.dataset.lo || '', hi: s.dataset.hi || '' })
    }
    const mo = new MutationObserver(on)
    const s = document.querySelector('.s2-steer')
    if (s) mo.observe(s, { attributes: true, attributeFilter: ['data-a', 'data-c', 'data-e'] })
    on()
    return () => mo.disconnect()
  }, [])
  return (
    <div className="s2-field" data-state={state} aria-hidden="true">
      <div className="s2-poster-bg" />
      {state === 'fallback' && (
        <figure className="s2-fallback">
          <img src="/s2/fallback.svg" alt="" width={1200} height={800} decoding="async" />
          <figcaption>Static map · real activation clouds, Qwen2.5-1.5B · WebGL off</figcaption>
        </figure>
      )}
      <canvas ref={cv} className="s2-canvas" />
      <div className="s2-scrim" />
      <div className="s2-pins">
        <span ref={pos} className="s2-pin s2-pin--pos">
          <b>+</b> {pin.hi}
          <span className="s2-pin__n"> · 20 activations</span>
        </span>
        <span ref={neg} className="s2-pin s2-pin--neg">
          <b>−</b> {pin.lo}
          <span className="s2-pin__n"> · 20 activations</span>
        </span>
        <span ref={mk} className="s2-pin s2-pin--mk">
          <span className="s2-pin__n">output · </span>α {pin.a} → {pin.e}
        </span>
      </div>
      <div ref={tags} className="s2-tags">
        {STOPS.slice(1, 5).map((x, i) => (
          <span key={x.id} data-c={i + 2}>
            C{String(i + 2).padStart(2, '0')} · {x.name}
          </span>
        ))}
      </div>
      <div ref={lbl} className="s2-qlabel" />
    </div>
  )
}

/** Scramble, remounted when the reduced-motion preference resolves after hydration (so reduced motion never keeps noise). */
function Dec(props: Parameters<typeof Scramble>[0]) {
  const { reduced } = useMotionPrefs()
  return <Scramble key={reduced ? 'r' : 'm'} {...props} trigger={reduced ? 'none' : props.trigger} />
}

/* ---------------- chrome ---------------- */

/** Per-letter roll (a duplicated glyph stack), for buttons and links. */
function Roll({ text }: { text: string }) {
  return (
    <span className="s2-roll">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="s2-roll__v">
        {Array.from(text).map((ch, i) => (
          <span key={i} data-ch={ch} style={{ ['--i' as string]: i }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </span>
    </span>
  )
}

function Dock({ base, home, active, reduced }: { base: string; home: boolean; active: WorkKey | null; reduced: boolean }) {
  const [hover, setHover] = useState<WorkKey | null>(null)
  const [seen, setSeen] = useState(false)
  const [x, setX] = useState(0)
  const ol = useRef<HTMLOListElement>(null)
  const show = (k: WorkKey, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const o = ol.current!.getBoundingClientRect()
    setX(r.left + r.width / 2 - o.left)
    setHover(k)
    setSeen(true)
    prefetchDemo[k]().catch(() => {})
  }
  const w = hover ? W(hover) : null
  return (
    <nav className="s2-dock" aria-label="The six works" onPointerLeave={() => setHover(null)}>
      <ol ref={ol}>
        {ORDER.map((k) => (
          <li key={k}>
            <Link
              to={`${base}/#${hashFor(k)}`}
              aria-current={home && active === k ? 'true' : undefined}
              aria-label={`${NUM(k)} ${W(k).short}`}
              onPointerEnter={(e) => e.pointerType === 'mouse' && show(k, e.currentTarget)}
              onFocus={(e) => show(k, e.currentTarget)}
              onBlur={() => setHover(null)}
              onClick={(e) => {
                if (!home) return
                e.preventDefault()
                jump(hashFor(k), reduced)
              }}
              style={{ ['--wa' as string]: W(k).accent }}
            >
              {NUM(k)}
            </Link>
          </li>
        ))}
      </ol>
      <div className="s2-card" data-on={hover ? '' : undefined} style={{ ['--x' as string]: `${x}px`, ['--accent' as string]: w?.accent }} aria-hidden="true">
        {seen && (
          <>
            <div className="s2-card__art">{w && <Poster key={w.key} k={w.key} />}</div>
            <p className="s2-card__t">
              <span className="s2-num">{w ? NUM(w.key) : ''}</span> {w?.short}
            </p>
            <p className="s2-card__m">
              <span className="s2-num">{w?.metric}</span> · {w ? TAG[w.tag] : ''}
            </p>
          </>
        )}
      </div>
    </nav>
  )
}

function Chips({ base, home, active, reduced }: { base: string; home: boolean; active: WorkKey | null; reduced: boolean }) {
  // hidden over the hero (its own rail is the steering control), then it rises in
  const [on, setOn] = useState(false)
  useEffect(() => {
    const f = () => setOn(scrollY > innerHeight * 0.75)
    f()
    addEventListener('scroll', f, { passive: true })
    return () => removeEventListener('scroll', f)
  }, [])
  return (
    <nav className="s2-chips" aria-label="The six works" data-on={on || undefined}>
      <ol>
        {ORDER.map((k) => (
          <li key={k} data-on={active === k || undefined} style={{ ['--wa' as string]: W(k).accent }}>
            <Link
              to={`${base}/#${hashFor(k)}`}
              aria-current={home && active === k ? 'true' : undefined}
              onClick={(e) => {
                if (!home) return
                e.preventDefault()
                jump(hashFor(k), reduced)
              }}
            >
              <span className="s2-num">{NUM(k)}</span>
              <span className="s2-chips__l">
                <span>{W(k).short}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function Top({ base, home, active, reduced }: { base: string; home: boolean; active: WorkKey | null; reduced: boolean }) {
  return (
    <header className="s2-top">
      <div className="s2-top__in">
        <Link to={`${base}/`} className="s2-top__name">
          {person.name}
        </Link>
        <Dock base={base} home={home} active={active} reduced={reduced} />
        <ul className="s2-top__links">
          <li className="s2-top__cv">
            <a href={links.resume.href} target="_blank" rel="noopener" aria-label="Resume (PDF)">
              <LinkIcon k="resume" size={15} />
              <span>Resume</span>
            </a>
          </li>
          {(['github', 'linkedin', 'x', 'email'] as const).map((k) => (
            <li key={k}>
              <a href={links[k].href} {...(k === 'email' ? {} : { target: '_blank', rel: 'noopener' })} aria-label={links[k].label}>
                <LinkIcon k={k} size={16} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}

/* ---------------- home ---------------- */

function StopHead({ i, children }: { i: number; children?: ReactNode }) {
  const s = STOPS[i]
  return (
    <header className="s2-stop__head" data-rv>
      {/* the stop label is the section's h2 (work titles below are h3) */}
      <h2 className="s2-lbl s2-coord">
        <span className="s2-sw" aria-hidden="true" />
        <span className="s2-num">C{String(i + 1).padStart(2, '0')}</span>
        <Dec as="span" text={s.name} trigger="view" />
        <span className="s2-dim s2-num" aria-hidden="true">{i < 5 ? `centroid ${s.c}` : s.c}</span>
      </h2>
      {children}
    </header>
  )
}

function TwoTone({ a, b, as = 'h3', id, vt }: { a: string; b: string; as?: 'h2' | 'h3'; id?: string; vt?: boolean }) {
  const H = as
  return (
    <H className="s2-t2" id={id} data-vt={vt || undefined}>
      <Dec text={a} trigger="view" className="s2-t2__a" />
      <Dec text={b} trigger="view" className="s2-t2__b" duration={760} />
    </H>
  )
}

function Entry({ k, base, onDemo }: { k: WorkKey; base: string; onDemo: (k: WorkKey, el: HTMLElement) => void }) {
  const w = W(k)
  const warm = () => prefetchDemo[k]().catch(() => {})
  return (
    <article className="s2-work" data-work={k} id={`w-${k}`} tabIndex={-1} data-rv style={{ ['--wa' as string]: w.accent }} aria-labelledby={`w-${k}-h`}>
      <p className="s2-lbl s2-work__meta">
        <span className="s2-num s2-work__n">{NUM(k)}</span>
        <span>{w.meta}</span>
      </p>
      <TwoTone a={w.short} b={TONE[k]} id={`w-${k}-h`} vt />
      <p className="s2-work__hook">
        <Split text={HOOK[k] ?? w.hook} />
        {w.flag && <Flag note={w.flag} />}
      </p>
      <button className="s2-shot" onClick={(e) => onDemo(k, e.currentTarget)} onPointerEnter={warm} aria-hidden="true" tabIndex={-1}>
        <Poster k={k} />
        <span className="s2-tag s2-lbl" data-real={w.tag !== 'illustrative' || undefined}>
          {TAG[w.tag]}
        </span>
        <span className="s2-shot__cta s2-lbl" aria-hidden="true">
          ▶ run it live
        </span>
      </button>
      <div className="s2-work__go">
        <p className="s2-work__metric s2-num">
          <Dec text={w.metric} trigger="view" />
        </p>
        <button className="s2-btn s2-btn--run" onClick={(e) => onDemo(k, e.currentTarget)} onPointerEnter={warm} onFocus={warm}>
          <span className="s2-btn__dot" aria-hidden="true" />
          <Roll text="Run the demo" />
        </button>
        {w.slug && (
          <Link to={`${base}/research/${w.slug}`} className="s2-btn s2-btn--go" data-tint={k}>
            <Roll text="Write-up" /> <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </article>
  )
}

function Roles() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <ol className="s2-roles" data-rv>
      {roles.map((r, i) => (
        <li key={r.org} data-open={open === i || undefined} style={{ ['--i' as string]: i }}>
          <button className="s2-role" aria-expanded={open === i} aria-controls={`s2-role-${i}`} onClick={() => setOpen(open === i ? null : i)}>
            <OrgTile org={r.logo} size={36} />
            <span className="s2-role__h">
              <span className="s2-role__r">{r.role}</span>
              <span className="s2-role__o"> · {r.org}</span>
            </span>
            <span className="s2-role__w s2-num">{r.when}</span>
            <span className="s2-role__l">{r.line}</span>
            <span className="s2-role__x" aria-hidden="true" />
          </button>
          <div className="s2-role__more" id={`s2-role-${i}`}>
            <div>
              <p className="s2-role__metric s2-num">
                {open === i ? <Dec text={r.metric} trigger="none" run={1} /> : r.metric}
                <span className="s2-dim"> · {r.where}</span>
              </p>
              <ul>
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Earlier() {
  const [open, setOpen] = useState(false)
  return (
    <div className="s2-earlier" data-open={open || undefined}>
      <button className="s2-earlier__b" aria-expanded={open} aria-controls="s2-earlier" onClick={() => setOpen(!open)}>
        <span className="s2-lbl">Earlier work</span>
        <span className="s2-dim">competitions, open source, things I shipped · {earlier.length}</span>
        <span className="s2-role__x" aria-hidden="true" />
      </button>
      <div className="s2-role__more" id="s2-earlier">
        <div>
          <ul className="s2-earlier__l">
            {earlier.map((e) => (
              <li key={e.title}>
                {e.href ? (
                  <a href={e.href} target="_blank" rel="noopener">
                    {e.title} ↗
                  </a>
                ) : (
                  <span>{e.title}</span>
                )}
                <span className="s2-dim">
                  {e.role}
                  {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in a local repo; confirm it's okay to list." />}
                </span>
                <span className="s2-num s2-dim">{e.when}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="s2-copy"
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="s2-copy__a">{person.email}</span>
      <span className="s2-copy__b" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
      <span className="s2-copy__k s2-lbl" aria-hidden="true">
        {copied ? '✓' : 'copy'}
      </span>
    </button>
  )
}

function Home({ base, onDemo, ready }: { base: string; onDemo: (k: WorkKey, el: HTMLElement) => void; ready: boolean }) {
  return (
    <>
      <section className="s2-hero" id="steering" data-stop={0} data-work="steering" tabIndex={-1} aria-labelledby="s2-h1">
        <h1 id="s2-h1" className="sr-only">
          {person.name}: ML systems and interpretability. Drag α to steer a real model.
        </h1>
        <Steer base={base} ready={ready} onDemo={(el) => onDemo('steering', el)} />
        <p className="s2-who s2-in" style={{ ['--i' as string]: 6 }}>
          ML systems and interpretability · CS at UVic ’27
        </p>
      </section>

      <section className="s2-stop" id="research" data-stop={1} aria-label="Research">
        <StopHead i={1} />
        <Entry k="lossmask" base={base} onDemo={onDemo} />
        <Entry k="es" base={base} onDemo={onDemo} />
      </section>

      <section className="s2-stop" id="systems" data-stop={2} aria-label="Systems">
        <StopHead i={2} />
        <Entry k="retrieval" base={base} onDemo={onDemo} />
        <Entry k="ocean" base={base} onDemo={onDemo} />
      </section>

      <section className="s2-stop" id="hardware" data-stop={3} aria-label="Hardware">
        <StopHead i={3} />
        <Entry k="orbit" base={base} onDemo={onDemo} />
      </section>

      <section className="s2-stop s2-exp" id="experience" data-stop={4} aria-labelledby="s2-exp-h">
        <StopHead i={4}>
          <TwoTone as="h2" id="s2-exp-h" a="Experience" b="six roles, newest first" />
        </StopHead>
        <Roles />
        <Show when="beri">
          <p className="s2-beri" data-rv>
            <span className="s2-lbl">Also</span>
            <Link to={`${base}/beri`} data-tint="beri">
              Beri, a food app I’m building for iOS <span aria-hidden="true">→</span>
            </Link>
          </p>
        </Show>
        <Earlier />
      </section>

      <section className="s2-stop s2-contact" id="contact" data-stop={5} aria-labelledby="s2-contact-h">
        <StopHead i={5}>
          <TwoTone as="h2" id="s2-contact-h" a="Contact" b="email is fastest" />
        </StopHead>
        <div data-rv className="s2-contact__b">
          <CopyEmail />
          <Links className="s2-links" mode="both" size={15} />
        </div>
      </section>
    </>
  )
}

/* ---------------- the demo panel (a glass sheet over the field) ---------------- */

function DemoPanel({ k, from, base, onClose }: { k: WorkKey | null; from: DOMRect | null; base: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const m = useMotionPrefs()
  const closing = useRef(false)
  const w = k ? W(k) : null
  useEffect(() => {
    const d = ref.current
    if (!d || !k) return
    closing.current = false
    if (!d.open) d.showModal()
    d.scrollTop = 0
    d.querySelector<HTMLElement>('.s2-panel__in')?.focus({ preventScroll: true })
    if (m.reduced || !from || !d.animate) return
    const r = d.getBoundingClientRect()
    const ins = `inset(${Math.max(0, from.top - r.top)}px ${Math.max(0, r.right - from.right)}px ${Math.max(0, r.bottom - from.bottom)}px ${Math.max(0, from.left - r.left)}px round 12px)`
    d.animate([{ clipPath: ins, opacity: 0.5 }, { clipPath: 'inset(0px 0px 0px 0px round 18px)', opacity: 1 }], { duration: m.dur(0.5) * 1000, easing: 'cubic-bezier(.16,1,.3,1)' })
    d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: m.dur(0.333) * 1000, easing: 'ease-out', pseudoElement: '::backdrop' })
    d.querySelector('.s2-panel__body')?.animate([{ opacity: 0, transform: `translateY(${12 * m.k}px)` }, { opacity: 1, transform: 'none' }], {
      duration: m.dur(0.5) * 1000,
      delay: m.dur(0.2) * 1000,
      easing: 'cubic-bezier(.16,1,.3,1)',
      fill: 'backwards',
    })
  }, [k, from, m])
  const close = useCallback(() => {
    const d = ref.current
    if (!d || closing.current) return
    closing.current = true
    const done = () => {
      d.close()
      onClose()
    }
    if (m.reduced || !d.animate) return done()
    const a = d.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${10 * m.k}px) scale(0.985)` }], { duration: m.dur(0.24) * 1000, easing: 'cubic-bezier(.65,0,.35,1)' })
    a.onfinish = done
  }, [m, onClose])
  if (!k || !w) return null
  return (
    <dialog
      ref={ref}
      className="s2-panel"
      aria-labelledby="s2-panel-h"
      data-lenis-prevent
      style={{ ['--accent' as string]: w.accent }}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="s2-panel__in" tabIndex={-1}>
        <header className="s2-panel__head">
          <p className="s2-lbl">
            <span className="s2-num s2-work__n">{NUM(k)}</span> {w.meta}
          </p>
          <h2 id="s2-panel-h" className="s2-panel__t">
            {w.title}
          </h2>
          <button className="s2-panel__x" onClick={close} aria-label="Close the demo">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="s2-panel__body">
          <Suspense fallback={<div className="demo-loading" />}>
            <Demo kind={k} />
          </Suspense>
        </div>
        <footer className="s2-panel__foot">
          <p>{w.hook}</p>
          {w.slug && (
            <Link to={`${base}/research/${w.slug}`} className="s2-btn s2-btn--go" data-tint={k}>
              <Roll text="Read the write-up" /> <span aria-hidden="true">→</span>
            </Link>
          )}
        </footer>
      </div>
    </dialog>
  )
}

/* ---------------- root ---------------- */

export default function S2({ page, base }: VariantProps) {
  const { path, navigate } = useRouter()
  const m = useMotionPrefs()
  const [leaving, setLeaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [panel, setPanel] = useState<{ k: WorkKey; from: DOMRect } | null>(null)
  const home = page.kind === 'home'
  const active = useActive(home)
  const prevKind = useRef(page.kind)
  const trigger = useRef<HTMLElement | null>(null)
  const ghost = useRef<HTMLElement | null>(null)
  const rootEl = useRef<HTMLDivElement>(null)
  // The title ghost only lives until the new page commits (inside the view transition's update callback).
  useIsoLayout(() => {
    ghost.current?.remove()
    ghost.current = null
  }, [page])
  useLenis(home)
  useReveal(home, m.reduced)

  useEffect(() => {
    bus.k = m.k
    bus.level = m.level
    bus.reduced = m.reduced
    bus.wake()
  }, [m.k, m.level, m.reduced])
  useEffect(() => {
    const was = prevKind.current
    prevKind.current = page.kind
    bus.home = home
    bus.park = parkFor(page)
    bus.warp = 0
    // back from a write-up: fly in (the field falls back into place from far ahead)
    if (home && was !== 'home' && !m.reduced) bus.arrive = 1
    bus.wake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, page])
  useEffect(() => {
    bus.focus = panel ? 1 : 0
    bus.wake()
    if (panel) lenis()?.stop()
    else lenis()?.start()
  }, [panel])

  // keys 1–6 jump to a work
  useEffect(() => {
    if (!home) return
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest('input, textarea, select, dialog')) return
      const n = Number(e.key)
      if (n >= 1 && n <= 6) jump(hashFor(ORDER[n - 1]), m.reduced)
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [home, m.reduced])

  // The cursor glow (desktop): a soft light in the colour of α that trails the pointer, then stops.
  const glow = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!home || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let raf = 0
    const p = { x: innerWidth * 0.7, y: innerHeight * 0.45, tx: innerWidth * 0.7, ty: innerHeight * 0.45 }
    const step = () => {
      p.x += (p.tx - p.x) * 0.16
      p.y += (p.ty - p.y) * 0.16
      if (glow.current) glow.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      raf = Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) > 0.5 ? requestAnimationFrame(step) : 0
    }
    const on = (e: PointerEvent) => {
      p.tx = e.clientX
      p.ty = e.clientY
      glow.current?.setAttribute('data-on', '')
      if (!raf) raf = requestAnimationFrame(step)
    }
    addEventListener('pointermove', on, { passive: true })
    return () => {
      removeEventListener('pointermove', on)
      cancelAnimationFrame(raf)
    }
  }, [home])

  // Accent as an event: the chrome re-themes to the work in view.
  const acc = page.kind === 'research' ? workBySlug(page.slug)?.accent : home && active ? W(active).accent : undefined

  const openDemo = (k: WorkKey, el: HTMLElement) => {
    trigger.current = el
    prefetchDemo[k]().catch(() => {})
    setPanel({ k, from: el.getBoundingClientRect() })
  }
  const closeDemo = () => {
    setPanel(null)
    trigger.current?.focus({ preventScroll: true })
  }

  // Opening a write-up: the clicked title keeps its place (it becomes the article's title in the view transition),
  // the page dissolves, and the points rush past the camera in the work's colour. Then the route changes.
  const onClickCapture = (e: MouseEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href') || ''
    if (!home || !a || (!href.startsWith(`${base}/research/`) && href !== `${base}/beri`)) return
    e.preventDefault()
    e.stopPropagation()
    const slug = href.split('/research/')[1]
    const k = (a.dataset.tint as WorkKey) || workBySlug(slug ?? '')?.key
    const d = document.querySelector<HTMLDialogElement>('dialog.s2-panel[open]')
    if (d) {
      d.close()
      setPanel(null)
    }
    // the title stays behind as a ghost while everything else dissolves; the view transition then flies it into place
    const t = document.querySelector<HTMLElement>(`#w-${k} [data-vt]`)
    if (t && !m.reduced && rootEl.current) {
      const r = t.getBoundingClientRect()
      const g = t.cloneNode(true) as HTMLElement
      g.removeAttribute('id')
      g.classList.add('s2-ghost')
      Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px` })
      rootEl.current.appendChild(g)
      ghost.current = g
    }
    const tint = k && ORDER.includes(k) ? W(k).accent : '#d8d4cc'
    rootEl.current?.style.setProperty('--warp', tint)
    bus.tint = rgb(tint)
    if (m.reduced) return navigate(href)
    setLeaving(true)
    bus.warp = 1
    bus.wake()
    setTimeout(() => {
      navigate(href)
      setLeaving(false)
    }, Math.round(m.dur(0.46) * 1000))
  }

  return (
    <div
      ref={rootEl}
      className="s2"
      data-page={page.kind}
      data-leaving={leaving || undefined}
      data-lab={base.startsWith('/lab') || undefined}
      data-ready={ready || undefined}
      style={acc ? { ['--s2-acc' as string]: acc } : undefined}
      onClickCapture={onClickCapture}
    >
      <a href="#main" className="s2-skip">
        Skip to content
      </a>
      <Field onReady={() => setReady(true)} />
      <div className="s2-warp" aria-hidden="true" />
      {home && <div ref={glow} className="s2-glow" aria-hidden="true" />}
      <Top base={base} home={home} active={active} reduced={m.reduced} />
      <main id="main" key={path}>
        {home && <Home base={base} ready={ready} onDemo={openDemo} />}
        {page.kind === 'research' && (
          <div className="s2-doc">
            <ResearchArticle slug={page.slug} base={base} />
            <p className="s2-back">
              <Link to={`${base}/#${hashFor(workBySlug(page.slug)?.key ?? 'steering')}`}>← Back into the latent space</Link>
            </p>
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="s2-doc">
            <BeriCaseStudy base={base} />
            <p className="s2-back">
              <Link to={`${base}/#experience`}>← Back into the latent space</Link>
            </p>
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="s2-404">
            <p className="s2-lbl">
              <span className="s2-num">q·c &lt; 0.20</span> · no cluster within reach
            </p>
            <h1 className="s2-t2">
              <span className="s2-t2__a">Out of distribution.</span>
              <span className="s2-t2__b">Nothing is embedded here.</span>
            </h1>
            <p>
              <Link to={`${base}/`} className="s2-btn s2-btn--go">
                <Roll text="Back to the field" /> <span aria-hidden="true">→</span>
              </Link>
            </p>
          </section>
        )}
      </main>
      {home && <Chips base={base} home={home} active={active} reduced={m.reduced} />}
      <DemoPanel k={panel?.k ?? null} from={panel?.from ?? null} base={base} onClose={closeDemo} />
      <footer className="s2-foot">
        <span>© 2026 {person.name}</span>
        <span className="s2-dim">React and raw WebGL2. The orange and cyan points are real activations from Qwen2.5-1.5B-Instruct.</span>
      </footer>
    </div>
  )
}
