/*
 * v6 "Latent space": a language model's embedding space that you fly through. Each body of work is a cluster.
 * The steering vectors are real (src/data/steering.json, Qwen2.5-1.5B-Instruct), and moving α bends the whole field.
 *
 * Patterns: PORTFOLIO_TASTE.md §4, plus docs/patterns-v6.md (V6-Pn)
 *   P04 embedding field (raw WebGL2 point field; the interpretability cluster is the real activation clouds)
 *   P01 steering slider (the HUD: real outputs type out, and the scene reads α, the read-back projection and xy)
 *   P29 HUD over the canvas (DOM telemetry in mono) · P12 pause (the loop sleeps when hidden or settled, never at SSR)
 *   P05 dot-grid ground (poster + fallback) · P19 one metric per row · P27 copy-email morph · P08 sticky figure, stepping text
 *   V6-P1 words left, scene right · V6-P2 labels pinned to data · V6-P3/P4 parameter panel with inline strength
 *   V6-P6 resolve from noise (shader resolve per cluster + <Decode> titles) · V6-P7 intensity follows the motion level
 * Tokens: ease-out, ease-expo, ease-drawer from §3; the flight uses exponential smoothing tuned per motion level.
 * Type: Geist Mono (display, HUD, numbers: the model's voice) + Newsreader (the human document). Both are
 * latin-subset, weight-limited files in public/v6 (64 KB total), with metric-matched fallbacks.
 */
import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from 'react'
import { person, research, experience, engineering, earlier, beri, links, workLinkOrder } from '../../content/site'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { useProof, useCommunity } from '../../content/useContent'
import { Show, useFlags } from '../../lib/labprefs'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { bus } from './bus'
import { Decode } from './Decode'
import './v6.css'

const SteerHud = lazy(() => import('./SteerHud'))

// Cluster world centroids (mirrors scene.ts; kept here so the static HTML doesn't import the scene chunk).
const CENT = [
  [0, 0, 0],
  [6, 0, -70],
  [-7, 2, -150],
  [7, -1, -230],
  [-6, 1, -310],
  [6, 0, -390],
]
const STOPS = [
  { id: 'top', label: 'Origin' },
  { id: 'research', label: 'Interpretability' },
  { id: 'systems', label: 'Systems' },
  { id: 'work', label: 'Industry' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'earlier', label: 'Earlier' },
  { id: 'contact', label: 'Contact' },
]
const parkFor = (page: VariantProps['page']) => {
  if (page.kind === 'research') return ['billion-vector-retrieval', 'ocean-sensing'].includes(page.slug) ? 2 : 1
  if (page.kind === 'beri') return 3
  return 0
}
const useStop = () => {
  const [s, set] = useState(0)
  useEffect(() => {
    const on = () => set(bus.stop)
    bus.listeners.add(on)
    return () => void bus.listeners.delete(on)
  }, [])
  return s
}

/* ---------------- the field ---------------- */

function Field() {
  const cv = useRef<HTMLCanvasElement>(null)
  const lbl = useRef<HTMLDivElement>(null)
  const tags = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'idle' | 'live' | 'fallback'>('idle')
  useEffect(() => {
    let dead = false
    let handle: { dispose: () => void } | null = null
    if (new URLSearchParams(location.search).get('gl') === '0') {
      setState('fallback')
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
            root: cv.current!.closest('.v6') as HTMLElement,
            mobile,
            low,
            onReady: () => !dead && setState('live'),
            onFail: () => !dead && setState('fallback'),
          })
          if (!handle) setState('fallback')
        })
        .catch(() => !dead && setState('fallback'))
    // After first paint, when the main thread is idle.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number; cancelIdleCallback?: (n: number) => void }
    const id = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1500 }) : window.setTimeout(go, 400)
    return () => {
      dead = true
      if (w.cancelIdleCallback) w.cancelIdleCallback(id)
      else clearTimeout(id)
      handle?.dispose()
    }
  }, [])
  return (
    <div className="v6-field" data-state={state} aria-hidden="true">
      <div className="v6-poster" />
      {state === 'fallback' && (
        <figure className="v6-fallback">
          <img src="/v6/fallback.svg" alt="" width={1200} height={800} decoding="async" />
          <figcaption>Static map · real activation clouds, Qwen2.5-1.5B · WebGL unavailable</figcaption>
        </figure>
      )}
      <canvas ref={cv} className="v6-canvas" />
      <div className="v6-scrim" />
      <div ref={tags} className="v6-tags">
        {STOPS.slice(1, 6).map((x, i) => (
          <span key={x.id} data-c={i + 1}>
            C{String(i + 1).padStart(2, '0')} · {x.label}
          </span>
        ))}
      </div>
      <div ref={lbl} className="v6-qlabel" />
    </div>
  )
}

/* ---------------- chrome ---------------- */

function Top({ base, home }: { base: string; home: boolean }) {
  const s = useStop()
  return (
    <header className="v6-top">
      <div className="v6-top__in">
        <Link to={`${base}/`} className="v6-top__name">
          Tanuj Dargan
        </Link>
        <nav className="v6-top__stops" aria-label="Clusters">
          {STOPS.map((x, i) => (
            <Link key={x.id} to={`${base}/#${x.id}`} aria-current={home && s === i ? 'location' : undefined} title={x.label}>
              <span className="v6-num">{String(i).padStart(2, '0')}</span>
              <span className="v6-top__lbl">{x.label}</span>
            </Link>
          ))}
        </nav>
        <span className="v6-top__z v6-num" aria-hidden="true">
          z {home ? (s === 0 ? '+30' : s === 6 ? 'all' : String(CENT[s][2])).padStart(4, ' ') : 'park'}
        </span>
        <Links className="v6-top__links" mode="icon" size={17} only={workLinkOrder} />
      </div>
    </header>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="v6-copy"
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
      <span className="v6-copy__a">{person.email}</span>
      <span className="v6-copy__b" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
      <span className="v6-copy__hint" aria-hidden="true">
        copy
      </span>
    </button>
  )
}

/* ---------------- home ---------------- */

function Cluster({
  n,
  id,
  title,
  dek,
  note,
  children,
}: {
  n: number
  id: string
  title: string
  dek: string
  note: string
  children: React.ReactNode
}) {
  const c = CENT[n]
  return (
    <section id={id} data-stop={n} className="v6-stop" data-c={n} aria-labelledby={`${id}-h`}>
      <div className="v6-panel">
        <p className="v6-coord">
          <span className="v6-sw" aria-hidden="true" />
          <span className="v6-num">C{String(n).padStart(2, '0')}</span>
          <span className="v6-dim v6-num">
            centroid ({c[0]}, {c[1]}, {c[2]})
          </span>
        </p>
        <Decode as="h2" id={`${id}-h`} className="v6-h2" text={title} />
        <p className="v6-dek">{dek}</p>
        <p className="v6-note">{note}</p>
        {children}
      </div>
    </section>
  )
}

function Row({ to, n, title, meta, line, flag }: { to: string; n: string; title: string; meta: string; line: string; flag?: string }) {
  return (
    <li>
      <Link to={to} className="v6-row">
        <span className="v6-row__n v6-num">{n}</span>
        <span className="v6-row__t">
          {title}
          {flag && <Flag note={flag} />}
        </span>
        <span className="v6-row__m">{meta}</span>
        <span className="v6-row__l">{line}</span>
        <span className="v6-row__go" aria-hidden="true">
          open →
        </span>
      </Link>
    </li>
  )
}

function Roles({ items }: { items: typeof experience }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <ol className="v6-roles">
      {items.map((r, i) => (
        <li key={r.org} data-open={open === i || undefined}>
          <button className="v6-role" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span className="v6-role__org">
              <OrgLogo org={r.logo} height={16} className="v6-logo" />
              {r.org}
            </span>
            <Decode className="v6-role__metric v6-num" text={r.metric} />
            <span className="v6-role__role">
              {r.role} · {r.when}
            </span>
            <span className="v6-role__line">{r.line}</span>
          </button>
          <div className="v6-role__more">
            <div>
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

const earlierLogo: Record<string, OrgKey> = { 'Pear Care': 'pearcare', 'Apache Airflow': 'airflow' }
const R = (slug: string) => research.find((r) => r.slug === slug)!
const X = (org: string) => experience.find((e) => e.org.startsWith(org))!

function Home({ base }: { base: string }) {
  const proof = useProof()
  const community = useCommunity()
  const flags = useFlags()
  const hw = X('UVic Centre')
  const homelab = engineering[1]
  return (
    <>
      <section className="v6-hero" id="top" data-stop={0} aria-labelledby="v6-name">
        <p className="v6-kicker v6-in" style={{ ['--i' as string]: 0 }}>
          CS at UVic · class of {person.grad}
          <span className="v6-kicker__loc"> · {person.location}</span>
        </p>
        <h1 id="v6-name" className="v6-name v6-in" style={{ ['--i' as string]: 1 }}>
          Tanuj Dargan
        </h1>
        <p className="v6-claim v6-in" style={{ ['--i' as string]: 2 }}>
          I build ML systems and study what happens inside language models.
        </p>
        <ol className="v6-proof">
          {proof.map((p, i) => (
            <li key={p.key} className="v6-in" style={{ ['--i' as string]: 3 + i }}>
              <span className="v6-proof__n v6-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="v6-proof__l">{p.label}</span>
              <span className="v6-proof__d">{p.detail}</span>
            </li>
          ))}
        </ol>
        <Links className="v6-links v6-in" mode="both" size={15} only={workLinkOrder} />
        <p className="v6-hint v6-in" style={{ ['--i' as string]: 7 }}>
          <span className="v6-live" aria-hidden="true" /> Scroll to fly through five clusters.<span className="v6-hint__fine"> Your cursor is a query vector. α steers the space.</span>
        </p>
      </section>

      <Cluster
        n={1}
        id="research"
        title="Interpretability"
        dek="Find a concept as a direction in the residual stream, push the model along it, and check that its behaviour changes the way the label says."
        note="The orange and cyan points are real: 120 residual-stream activations from Qwen2.5-1.5B-Instruct, 20 per pole for joy, distress and certainty, projected onto the concept direction and the top principal component. The bright thread is the steered answer at each α. Steer it and watch the space bend."
      >
        <ol className="v6-rows">
          <Row
            to={`${base}/research/activation-steering`}
            n="R1"
            title={R('activation-steering').title}
            meta={`${R('activation-steering').where} · ${R('activation-steering').when}`}
            line="Joy steering is a switch, not a dial: between +0.3 and +0.6‖h‖ the read-back projection jumps from −8.0 to +9.6."
            flag={R('activation-steering').unverified?.[0]}
          />
          <Row
            to={`${base}/research/loss-masking-distress`}
            n="R2"
            title={R('loss-masking-distress').title}
            meta={`${R('loss-masking-distress').where} · ${R('loss-masking-distress').when}`}
            line="Assistant-only loss maximises expressed shutdown distress, and calm-sounding models still represent it negatively."
          />
          <Row
            to={`${base}/research/es-lora`}
            n="R3"
            title={R('es-lora').title}
            meta={`${R('es-lora').where} · ${R('es-lora').when}`}
            line="45 Gaussian perturbations of a LoRA per step, keep the top 8, with a binary GSM8K reward. Adapter on Hugging Face."
            flag={R('es-lora').unverified?.[0]}
          />
        </ol>
        <div className="v6-demo">
          <Demo kind="steering" />
        </div>
      </Cluster>

      <Cluster
        n={2}
        id="systems"
        title="Systems & retrieval"
        dek="GPU vector search at billion scale, and a model that reads deep-water temperature from satellites."
        note="Laid out like an IVF index: 48 partitions on a sphere, with graph edges between neighbouring cells."
      >
        <p className="v6-metrics">
          {['1–4M QPS', '90–95% recall', '< 250 ms', '4.3× scaling', '2 TB index'].map((t) => (
            <Decode key={t} className="v6-metric v6-num" text={t} />
          ))}
        </p>
        <ol className="v6-rows">
          <Row
            to={`${base}/research/billion-vector-retrieval`}
            n="R4"
            title={R('billion-vector-retrieval').title}
            meta={R('billion-vector-retrieval').where}
            line="A modified cuVS fork (CAGRA, IVF-PQ) across 8+ GPUs. Stress tests exposed memory bandwidth and NVLink saturation."
          />
          <Row
            to={`${base}/research/ocean-sensing`}
            n="R5"
            title={R('ocean-sensing').title}
            meta={R('ocean-sensing').where}
            line="R² = 0.936 for satellite-to-deep-water temperature, validated with NRC Canada."
            flag={R('ocean-sensing').unverified?.[0]}
          />
        </ol>
      </Cluster>

      <Cluster
        n={3}
        id="work"
        title={flags.beri ? 'Industry & product' : 'Industry'}
        dek="Production LLM work at Amazon Robotics, and applied ML with RBC Borealis, Pear Care and Apache Airflow."
        note="180 points on a grid, one for each fulfillment site the planning assistant runs in. The four clouds above them are the four cohorts UMAP found at RBC Borealis."
      >
        <Roles items={[X('Amazon'), X('RBC'), X('Pear'), X('MLH')]} />
        <Show when="beri">
          <ol className="v6-rows">
            <Row to={`${base}/beri`} n="B" title="Beri, the food app I'm building" meta={beri.url.replace('https://', '')} line={beri.oneLiner} />
          </ol>
        </Show>
      </Cluster>

      <Cluster
        n={4}
        id="hardware"
        title="Hardware"
        dek="Firmware for a satellite that is now in orbit, and a homelab that serves my models."
        note="The ring is an orbit, and the bright knot travelling along it is the satellite."
      >
        <Roles items={[hw]} />
        <ul className="v6-mini">
          <li>
            <a href={homelab.href} target="_blank" rel="noopener" className="v6-mini__a">
              {homelab.title} ↗
            </a>
            <span>
              {homelab.role}. {homelab.detail}
            </span>
          </li>
        </ul>
      </Cluster>

      <Cluster
        n={5}
        id="earlier"
        title="Earlier work"
        dek="Competitions, open-source fixes and things I shipped before the research."
        note="Eight knots on a spiral, one for each earlier project."
      >
        <ul className="v6-earlier">
          {earlier.map((e) => (
            <li key={e.title}>
              {e.href ? (
                <a href={e.href} target="_blank" rel="noopener">
                  {earlierLogo[e.title] && <OrgLogo org={earlierLogo[e.title]} height={15} className="v6-logo" />}
                  {e.title} ↗
                </a>
              ) : (
                <span className="v6-earlier__t">{e.title}</span>
              )}
              <span className="v6-earlier__r">
                {e.role}
                {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in a local repo; confirm it's okay to list." />}
              </span>
              <span className="v6-earlier__d">{e.detail}</span>
              <span className="v6-earlier__w v6-num">{e.when}</span>
            </li>
          ))}
        </ul>
        <h3 className="v6-h3">Community</h3>
        <ul className="v6-mini">
          {community.map((c) => (
            <li key={c.title}>
              {c.href ? (
                <a href={c.href} target="_blank" rel="noopener" className="v6-mini__a">
                  {c.title} ↗
                </a>
              ) : (
                <b className="v6-mini__a">{c.title}</b>
              )}
              <span>
                {c.role}, {c.when}. {c.detail}
              </span>
            </li>
          ))}
        </ul>
        <p className="v6-tools">
          <span className="v6-lbl">Tools</span> Python, PyTorch, Hugging Face, CUDA/cuVS, vLLM · C on STM32 · TypeScript, React, Swift · Nix, Proxmox,
          Kubernetes
        </p>
      </Cluster>

      <section id="contact" data-stop={6} className="v6-stop v6-contact" aria-labelledby="contact-h">
        <div className="v6-panel">
          <p className="v6-coord">
            <span className="v6-num">C06</span>
            <span className="v6-dim">all five clusters, from outside</span>
          </p>
          <Decode as="h2" id="contact-h" className="v6-h2" text="Contact" />
          <p className="v6-dek">Research programs, labs and founders: email is fastest.</p>
          <CopyEmail />
          <Links className="v6-links" mode="both" size={15} />
        </div>
      </section>
    </>
  )
}

/* ---------------- root ---------------- */

export default function V6({ page, base }: VariantProps) {
  const { path, navigate } = useRouter()
  const m = useMotionPrefs()
  const [leaving, setLeaving] = useState(false)
  const home = page.kind === 'home'

  useEffect(() => {
    bus.k = m.k
    bus.level = m.level
    bus.reduced = m.reduced
    bus.wake()
  }, [m.k, m.level, m.reduced])
  useEffect(() => {
    bus.home = home
    bus.park = parkFor(page)
    bus.warp = 0
    bus.wake()
  }, [home, page])

  // Opening a write-up: the points rush past the camera (warp) while the page dissolves, then the route changes.
  const onClickCapture = (e: MouseEvent) => {
    if (!home || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href') || ''
    if (!href.startsWith(`${base}/research/`) && href !== `${base}/beri`) return
    e.preventDefault()
    e.stopPropagation()
    setLeaving(true)
    bus.warp = m.reduced ? 0 : 1
    bus.wake()
    setTimeout(
      () => {
        navigate(href)
        setLeaving(false)
      },
      m.reduced ? 120 : Math.round(m.dur(0.42) * 1000),
    )
  }

  return (
    <div className="v6" data-page={page.kind} data-leaving={leaving || undefined} data-lab={base.startsWith('/lab') || undefined}>
      <a href="#main" className="v6-skip">
        Skip to content
      </a>
      <Field />
      <Top base={base} home={home} />
      <main id="main" key={path} onClickCapture={onClickCapture}>
        {home && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="v6-doc">
            <ResearchArticle slug={page.slug} base={base} />
            <p className="v6-back">
              <Link to={`${base}/#research`}>← Back into the latent space</Link>
            </p>
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="v6-doc">
            <BeriCaseStudy base={base} />
            <p className="v6-back">
              <Link to={`${base}/#work`}>← Back into the latent space</Link>
            </p>
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="v6-hero">
            <h1 className="v6-name">Out of distribution.</h1>
            <p className="v6-claim">
              Nothing embedded here. <Link to={`${base}/`}>Back to the origin →</Link>
            </p>
          </section>
        )}
      </main>
      {home && <HudMount />}
      <footer className="v6-foot">
        <span>© 2026 {person.name}</span>
        <span className="v6-dim">React and raw WebGL2. The orange and cyan points are real activations from Qwen2.5-1.5B-Instruct.</span>
      </footer>
    </div>
  )
}

// The console is client-only (it carries the 37 KB steering.json), mounted after first paint.
function HudMount() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 600)
    return () => clearTimeout(t)
  }, [])
  return on ? (
    <Suspense fallback={null}>
      <SteerHud />
    </Suspense>
  ) : null
}
