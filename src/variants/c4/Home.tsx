import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { person, research, experience, earlier, engineering, beri, workLinkOrder } from '../../content/site'
import { useProof, useCommunity } from '../../content/useContent'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { ScrollTimelapse } from '../../shared/ScrollTimelapse'
import { Demo } from '../../demos/Demo'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import unsplash from '../../data/unsplash.json'
import youtube from '../../data/youtube.json'
import { Arrow, Big, CopyEmail, Drawer, Go, Minor, jump } from './parts'
import { CHAPTERS, type ChapterId } from './chapters'

const R = (slug: string) => research.find((r) => r.slug === slug)!
const X = (org: string) => experience.find((e) => e.org.startsWith(org))!
const E = (title: string) => earlier.find((e) => e.title === title)!
const photo = (id: string) => unsplash.photos.find((p) => p.id === id)!
const img = (src: string, w: number) => `${src}?w=${w}&q=70&auto=format`

/* ---------------- hero ---------------- */

const PROOF_MARK: Record<string, OrgKey | undefined> = { amazon: 'amazon', marmotsat: 'uvic' }

/** The research proof has no org mark; a drawn direction vector stands in (a steering direction, literally). */
function VectorMark() {
  return (
    <svg className="c4-vec" viewBox="0 0 24 16" aria-hidden="true">
      <circle cx="3" cy="13" r="1.8" fill="currentColor" />
      <path d="M3 13 20 3.5M14.6 3.2l5.4.3-2.6 4.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Hero({ reduced }: { reduced: boolean }) {
  const proof = useProof()
  return (
    <section className="c4-hero c4-col" aria-labelledby="c4-name">
      <h1 id="c4-name" className="c4-name">
        {person.name}
      </h1>
      <p className="c4-lede">
        I ship ML systems and study what happens inside language models. These are my notes on the work, by year.
      </p>
      <p className="c4-sub c4-in" style={{ ['--i' as string]: 1 }}>
        UVic CS, class of {person.grad} · Toronto / Victoria
      </p>
      <ul className="c4-proof" aria-label="In short">
        {proof.map((p, i) => (
          <li key={p.key} className="c4-in" style={{ ['--i' as string]: 2 + i }}>
            <span className="c4-proof__m">{PROOF_MARK[p.key] ? <OrgLogo org={PROOF_MARK[p.key]!} height={16} /> : <VectorMark />}</span>
            <span className="c4-proof__t">{p.label}</span>
            <span className="c4-proof__d">{p.detail}</span>
          </li>
        ))}
      </ul>
      <Links className="c4-pills c4-in" mode="both" size={15} only={workLinkOrder} />
      <nav className="c4-toc c4-in" aria-label="Contents" style={{ ['--i' as string]: 6 }}>
        <p className="c4-toc__h">Contents</p>
        <ol>
          {CHAPTERS.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  jump(c.id, reduced)
                }}
              >
                <span className="c4-toc__y">{c.label}</span>
                <span className="c4-toc__l">{c.toc}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  )
}

/* ---------------- plates ---------------- */

const PHASES = ['golden hour', 'dusk', 'night']

/** The 2026 chapter plate: Tanuj's Toronto timelapse, scrubbed from golden hour to night as it passes. */
function TorontoPlate() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const p = useTransform(scrollYProgress, [0.14, 0.86], [0, 1], { clamp: true })
  const [phase, setPhase] = useState(0)
  useMotionValueEvent(p, 'change', (v) => setPhase(v < 0.34 ? 0 : v < 0.72 ? 1 : 2))
  return (
    <>
      <div className="c4-plate c4-plate--tl" ref={ref}>
        <ScrollTimelapse progress={p} className="c4-plate__media" position="50% 62%" alt="Toronto skyline from golden hour to night, a timelapse I shot" />
        <PlateHead place="Toronto" year="2026" id="y2026-h" />
        <span className="c4-phase" aria-hidden="true">
          <span className="c4-phase__l">{PHASES[phase]}</span>
          <span className="c4-phase__bar">
            <motion.span style={{ scaleX: p }} />
          </span>
        </span>
      </div>
      <p className="c4-cap c4-col">My timelapse, scrubbed by your scroll.</p>
    </>
  )
}

function PlateHead({ place, year, suffix, id }: { place: string; year: string; suffix?: string; id: string }) {
  return (
    <div className="c4-plate__head">
      <div className="c4-col">
        <p className="c4-plate__place">{place}</p>
        <h2 className="c4-year" id={id}>
          {year}
          {suffix && <span className="c4-year__s"> {suffix}</span>}
        </h2>
      </div>
    </div>
  )
}

function PhotoPlate({ id, place, year, suffix, hid, position = '50% 50%' }: { id: string; place: string; year: string; suffix?: string; hid: string; position?: string }) {
  const ph = photo(id)
  return (
    <>
      <div className="c4-plate">
        <img
          className="c4-plate__media"
          src={img(ph.src, 800)}
          srcSet={`${img(ph.src, 800)} 800w, ${img(ph.src, 1600)} 1600w`}
          sizes="100vw"
          width={1600}
          height={Math.round(1600 / ph.aspect)}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ objectPosition: position }}
        />
        <PlateHead place={place} year={year} suffix={suffix} id={hid} />
        <a className="c4-credit" href={ph.page} target="_blank" rel="noopener">
          Photo: mine, on Unsplash <Arrow out />
        </a>
      </div>
    </>
  )
}

/* ---------------- entries ---------------- */

function Meta({ org, children }: { org?: OrgKey; children: ReactNode }) {
  return (
    <p className="c4-meta">
      {org && <OrgLogo org={org} height={17} />}
      <span>{children}</span>
    </p>
  )
}

function Facts({ items }: { items: string[] }) {
  return (
    <ul className="c4-facts">
      {items.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  )
}

/** v6/v9 instrument framing: one sentence of why, the instrument at full measure, one sentence of result. */
function Instrument({
  slug,
  meta,
  title,
  why,
  result,
  big,
  mode = 'inline',
  label = 'Try it live',
  org,
  extra,
  whyFlag,
  resultFlag,
  base,
}: {
  slug: string
  meta: string
  title: string
  why: string
  result: ReactNode
  big?: [string, string]
  /** inline: instrument always shown · phone: inline on wide screens, one tap away on phones · tap: one tap away everywhere */
  mode?: 'inline' | 'phone' | 'tap'
  label?: string
  org?: OrgKey
  extra?: ReactNode
  whyFlag?: string
  resultFlag?: string
  base: string
}) {
  const r = R(slug)
  const demo = r.demo ? <Demo kind={r.demo} /> : null
  const writeUp = <Go to={`${base}/research/${slug}`}>Write-up</Go>
  return (
    <Foldable mode={mode} label={label} links={<>{writeUp}{extra}</>} demo={demo} className="c4-inst" labelledBy={`${slug}-h`}
      head={
        <div className="c4-col">
          <Meta org={org}>{meta}</Meta>
          <h3 className="c4-h" id={`${slug}-h`}>
            {title}
          </h3>
          {big && <Big value={big[0]} unit={big[1]} />}
          <p className="c4-why">
            <span className="c4-lab">Why</span>
            {why}
            {whyFlag && <Flag note={whyFlag} />}
          </p>
        </div>
      }
      after={
        <p className="c4-result">
          <span className="c4-lab">Result</span>
          {result}
          {resultFlag && <Flag note={resultFlag} />}
        </p>
      }
    />
  )
}

/**
 * An entry whose instrument can sit inline or one tap away. On phones, a folded entry also keeps its result sentence
 * in the fold, so the order stays why → instrument → result either way.
 */
function Foldable({
  mode,
  label,
  head,
  demo,
  after,
  links,
  className,
  labelledBy,
  demoClass = '',
}: {
  mode: 'inline' | 'phone' | 'tap'
  label: string
  head: ReactNode
  demo: ReactNode
  after?: ReactNode
  links?: ReactNode
  className: string
  labelledBy: string
  demoClass?: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const id = useId()
  return (
    <article className={`c4-entry ${className}`} aria-labelledby={labelledBy} data-fold={mode === 'inline' ? undefined : mode} data-open={open || undefined}>
      {head}
      {mode !== 'inline' && (
        <div className={`c4-col c4-taprow ${mode === 'phone' ? 'c4-phone-only' : ''}`}>
          <button
            type="button"
            className="c4-tap"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => {
              setMounted(true)
              setOpen((o) => !o)
            }}
          >
            <span className="c4-tap__dot" aria-hidden="true" />
            <span>{open ? 'Close' : label}</span>
            <span className="c4-plus" aria-hidden="true" />
          </button>
          {links && <span className="c4-taprow__links">{links}</span>}
        </div>
      )}
      {mode === 'inline' && <div className={`c4-wide c4-inst__demo ${demoClass}`}>{demo}</div>}
      {mode === 'phone' && <div className={`c4-wide c4-inst__demo c4-wide-only ${demoClass}`}>{demo}</div>}
      {mode !== 'inline' && (
        <div className={mode === 'phone' ? 'c4-phone-only' : undefined}>
          <Drawer open={open} id={id}>
            <div className={`c4-wide c4-inst__demo c4-inst__demo--tap ${demoClass}`}>{mounted && demo}</div>
          </Drawer>
        </div>
      )}
      {(after || (links && mode !== 'tap')) && (
        <div className="c4-col">
          {after}
          {links && mode !== 'tap' && <p className={`c4-links ${mode === 'phone' ? 'c4-wide-only' : ''}`}>{links}</p>}
        </div>
      )}
    </article>
  )
}

/* ---------------- chapters ---------------- */

function Y2026({ base }: { base: string }) {
  const amazon = X('Amazon')
  const rbc = X('RBC')
  const community = useCommunity()
  const cde = community.find((c) => c.title.startsWith('CDE'))
  const pg = E('Parameter Golf')
  const hive = E('Hive')
  const homelab = engineering[1]
  return (
    <section className="c4-chap" id="y2026" data-chapter="y2026" tabIndex={-1} aria-labelledby="y2026-h">
      <TorontoPlate />
      <p className="c4-chap__lede c4-col">
        Toronto: a planning assistant in production, research you can run on this page, and firmware I led, now in orbit.
      </p>

      <p className="c4-kind c4-col">Work</p>
      <article className="c4-entry c4-flag" aria-labelledby="amazon-h">
        <div className="c4-col">
          <Meta org="amazon">
            {amazon.org} · {amazon.when} · {amazon.where}
          </Meta>
          <h3 className="c4-h" id="amazon-h">
            A planning assistant, in production at 180+ sites
          </h3>
          <Big value="$136.2M" unit="a year in projected savings" />
          <div className="c4-prose">
            <p>
              I was an SDE intern on Optimus, the platform Amazon Robotics uses to plan labor across 180+ fulfillment sites in North America and Europe. I built its
              LLM planning assistant: planners ask in plain language, and it answers plan queries, flags anomalies and recommends labor.
            </p>
            <p className="c4-wide-only">
              Underneath is a RAG pipeline over historical labor plans and site configurations, and a multi-turn layer on the optimization engine that returns
              re-optimized what-if plans without a full solver run.
            </p>
            <p>It shipped to production, and I have a return offer.</p>
          </div>
          <Facts items={['180+ sites, NA and EU', '60%+ faster time-to-insight', 'Return offer']} />
        </div>
      </article>

      <p className="c4-kind c4-col" id="research" tabIndex={-1}>
        Research
      </p>
      <p className="c4-kind__lede c4-col c4-wide-only">Three questions about what models do when you train or push them, each with an instrument you can use here.</p>

      <Instrument
        base={base}
        slug="activation-steering"
        meta="Independent · 2026"
        title="Steering a model along emotion and persona directions"
        why="If joy or distress is a direction inside a model, can I find it cheaply, push along it, and have behaviour change the way the label says?"
        mode="phone"
        result={
          <>
            On Qwen2.5-1.5B-Instruct, joy is a switch, not a dial: a small push turns “As an AI language model…” into “Ah, the sweet aroma of fresh coffee…”. Pushing
            distress doesn't make it anxious. It makes it refuse.
          </>
        }
        resultFlag={R('activation-steering').unverified?.[0]}
      />
      <Instrument
        base={base}
        slug="loss-masking-distress"
        meta="Apart Research · Digital Minds sprint · Aug 2026"
        title="Does loss masking change how a model talks about being shut down?"
        why="Post-training usually learns from the assistant's tokens only. Does that change what a model says about being shut down, and does it mean it?"
        mode="phone"
        result="It does. Assistant-only loss maximises expressed distress; any loss on user turns restores a neutral voice at no cost to capability. But the calm models still represent shutdown negatively: sounding fine isn't evidence of being fine."
      />
      <Instrument
        base={base}
        slug="es-lora"
        meta="Independent · May 2026"
        title="Fine-tuning Qwen2.5-1.5B without gradients"
        why="Can random nudges to a LoRA, keeping what scores well, teach a 1.5B model grade-school math from a right-or-wrong reward alone?"
        mode="tap"
        result="The adapter is on Hugging Face. I'm still confirming the accuracy numbers, so there are none here yet."
        resultFlag={R('es-lora').unverified?.[0]}
        extra={
          <Go href={R('es-lora').links![0].href} className="c4-go c4-go--quiet">
            Adapter
          </Go>
        }
      />

      <p className="c4-kind c4-col">Built</p>
      <Foldable
        mode="phone"
        label="Open the live tracker"
        className="c4-flag"
        labelledBy="marmot-h"
        demoClass="c4-orbit"
        demo={
          <>
            <OrbitStill />
            <Demo kind="orbit" />
          </>
        }
        head={
          <div className="c4-col">
            <Meta org="uvic">UVic Centre for Aerospace Research · Apr 2025 – Apr 2026</Meta>
            <h3 className="c4-h" id="marmot-h">
              Firmware I led is in orbit
            </h3>
            <Big value="In orbit" unit="since July 2026, on a SpaceX Falcon 9" />
            <div className="c4-prose">
              <p>
                I led MarmotSat's onboard-computer firmware in C, the TTC board design, and the integration between them. I also built the test rig: every commit is
                flashed over SWD and checked against 80+ rules, which cut testing from 180 minutes to 15.
              </p>
              <p className="c4-wide-only">The tracker is live: the satellite's public orbit, propagated in your browser, with its next pass over Victoria.</p>
            </div>
          </div>
        }
        after={
          <div className="c4-wide-only">
            <Facts items={['OBC firmware in C', 'Tests: 180 → 15 min', '20+ h saved per release']} />
          </div>
        }
      />

      <Show when="beri">
        <article className="c4-entry c4-beri c4-col" aria-labelledby="beri-h">
          <p className="c4-meta">Building · 2025 –</p>
          <h3 className="c4-h" id="beri-h">
            Beri, a food app I'm building
          </h3>
          <p className="c4-body">Find a recipe, cook it, post it, see what friends made. I'm building the iOS app, the backend and the design system.</p>
          <p className="c4-links">
            <Go to={`${base}/beri`}>Read the case study</Go>
            <Go href={beri.url} className="c4-go c4-go--quiet">
              getberi.com
            </Go>
          </p>
        </article>
      </Show>

      <p className="c4-kind c4-col">Also this year</p>
      <ul className="c4-minors c4-col">
        <Minor mark={{ org: 'rbc' }} title="RBC Borealis" line="AI mentorship: spotting at-risk youth in 1,500+ records." when="Mar – May" more={rbc.bullets} />
        <Minor
          mark={{ kind: 'repo' }}
          title="Parameter Golf"
          line="OpenAI's 8×H100 challenge: two clean negatives, one tie."
          when="2026"
          more={[pg.detail]}
          href={pg.href}
          go="Repository"
          flag={pg.unverified ? "Parameter Golf found in local repo; confirm it's okay to list." : undefined}
        />
        <Minor mark={{ kind: 'fix' }} title="Hive" line="A cross-platform fix for a 7.7k-star agent framework." when="2026" more={[hive.detail]} href={hive.href} go="Repository" />
        <Minor mark={{ kind: 'lab' }} title="Homelab" line="Nix on Proxmox: GPU serving and 15+ services." when="now" more={[homelab.detail]} href={homelab.href} go="Config on GitHub" />
        {cde && <Minor mark={{ kind: 'club' }} title={cde.title} line={cde.role} when={cde.when} more={[cde.detail]} href={cde.href} go="cde2026.cfes.ca" />}
      </ul>
    </section>
  )
}

/** Designed still behind the orbit tracker: shows while it loads, and if WebGL or the tracker isn't available. */
function OrbitStill() {
  return (
    <div className="c4-orbit__still" aria-hidden="true">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
        <circle cx="200" cy="150" r="92" className="c4-orbit__earth" />
        <ellipse cx="200" cy="150" rx="150" ry="46" transform="rotate(-18 200 150)" className="c4-orbit__path" />
        <circle cx="336" cy="110" r="3.4" className="c4-orbit__sat" />
      </svg>
      <span>MarmotSat · NORAD 69912</span>
    </div>
  )
}

function Y2025({ base }: { base: string }) {
  const pear = X('Pear')
  const mlh = X('MLH')
  const deia = X('DEIA')
  const community = useCommunity()
  const vike = community.find((c) => c.title === 'VikeLabs')
  const optimate = E('Optimate')
  const drop = E('Drop')
  return (
    <section className="c4-chap" id="y2025" data-chapter="y2025" tabIndex={-1} aria-labelledby="y2025-h">
      <PhotoPlate id="cC9gBUPAj-s" place="Victoria" year="2025" hid="y2025-h" position="50% 72%" />
      <p className="c4-chap__lede c4-col">Two labs at UVic: one pushed GPU search to a billion vectors, the other read the ocean from space.</p>

      <p className="c4-kind c4-col">Research</p>
      <Instrument
        base={base}
        slug="billion-vector-retrieval"
        org="uvic"
        meta={`DEIA Lab, UVic · Prof. Sean Chester · ${deia.when}`}
        title="Keeping billion-vector search fast on GPUs"
        big={['1–4M', 'queries a second, at billion scale']}
        why="At a billion vectors, where does a GPU index run out: compute, memory, or the links between GPUs?"
        whyFlag={R('billion-vector-retrieval').flags?.question?.[0]}
        mode="tap"
        result="On a modified cuVS fork across 8+ GPUs and 2 TB of index: 90–95% recall under 250 ms and 4.3× throughput scaling, with memory bandwidth and NVLink as the walls."
      />
      <Instrument
        base={base}
        slug="ocean-sensing"
        org="uvic"
        meta="SOLIDS Lab, UVic · Dr. Navneet Popli · 2025"
        title="Reading deep-water temperature from satellites"
        big={['R² 0.936', 'satellite to deep-water temperature']}
        why="Deep-water sensors are costly to keep running. Could what a satellite sees at the surface stand in for them?"
        mode="phone"
        result="A multimodal model on Ocean Networks Canada data and satellite imagery, validated against real sensor readings with the National Research Council Canada."
        resultFlag={R('ocean-sensing').unverified?.[0]}
      />

      <p className="c4-kind c4-col">Also this year</p>
      <ul className="c4-minors c4-col">
        <Minor mark={{ org: 'pearcare' }} title="Pear Care" line="Lead AI developer: agents for 1,000+ specialties." when="Jul 2025 –" more={pear.bullets} href="https://pearcare.ai" go="pearcare.ai" />
        <Minor mark={{ org: 'mlh' }} title="MLH · Apache Airflow" line="IDE debugging in Docker: hours to minutes." when="May – Aug" more={[mlh.line, ...mlh.bullets]} href="https://github.com/apache/airflow" go="Apache Airflow" />
        <Minor mark={{ kind: 'prize' }} title="Hack the North" line="Optimate: 2 prizes of 300+ teams, incl. YC Unicorn." when="Sep" more={[optimate.detail]} href={optimate.href} go="Repository" />
        <Minor mark={{ kind: 'repo' }} title="Drop" line="AirDrop without the Apple, in Rust and WebRTC." when="2025" more={[drop.detail]} href={drop.href} go="Repository" />
        {vike && <Minor mark={{ kind: 'club' }} title={vike.title} line={vike.role} when={vike.when} more={[vike.detail]} />}
      </ul>
    </section>
  )
}

function Y2024() {
  const aimo = E('AIMO Progress Prize 2')
  const wedding = E('Wedding Studio')
  const community = useCommunity()
  const hack = community.find((c) => c.title === 'Hack@JBCNOsh')!
  return (
    <section className="c4-chap" id="y2024" data-chapter="y2024" tabIndex={-1} aria-labelledby="y2024-h">
      <PhotoPlate id="ukqvZyxMBfg" place="Mumbai, then Victoria" year="2024" suffix="and earlier" hid="y2024-h" position="50% 58%" />
      <p className="c4-chap__lede c4-col">Kaggle notebooks, hackathons in Bengaluru and Kolkata, one I started myself, then UVic.</p>
      <ul className="c4-minors c4-minors--first c4-col">
        <Minor
          mark={{ kind: 'prize' }}
          title="AIMO Prize 2"
          line="Kaggle silver, top 10% of 2,200."
          when="2024–25"
          more={['Multi-stage LLM pipelines for olympiad maths.', aimo.detail]}
        />
        <Minor mark={{ org: 'uvic' }} title="UVic" line="Started CS on the accelerated track." when="2024" more={[`${person.degree}, graduating ${person.gradMonth}.`]} />
        <Minor mark={{ kind: 'build' }} title="Wedding Studio" line="Venue mock-ups from real photos, via diffusion." when="2024" more={[`${wedding.role}. ${wedding.detail}`]} />
        <Minor mark={{ kind: 'event' }} title={hack.title} line="My high school's hackathon: 450+ people." when={hack.when} more={[hack.detail]} />
      </ul>
    </section>
  )
}

/* ---------------- photography ---------------- */

const SHOTS = ['pON0WCHIvy4', 'MKkMzd98yW0', 'DnGPvlBV9hs', 'Q0-bs2HEU2w', 'HFRXmZdUXlg', 'T8wngWppfwc', 'KXY9fcgkrY4', 'LHjeCSPynu8']
const FILM: Record<string, string> = {
  agTlgPNwRio: 'Mumbai, day to night',
  O5Cn0bBGE8k: 'Cyclone Nisarga passing Mumbai',
  fdue3lnMhXk: 'Lightning over YYZ',
  yTZC8sqx5Nw: 'Moonrise',
}

function Photography() {
  const films = youtube.videos.filter((v) => FILM[v.id])
  return (
    <section className="c4-chap c4-shoot" id="photos" data-chapter="photos" tabIndex={-1} aria-labelledby="photos-h">
      <div className="c4-col">
        <p className="c4-plate__place">Photographs and timelapses</p>
        <h2 className="c4-year c4-year--sm" id="photos-h">
          What I shoot
        </h2>
        <p className="c4-chap__lede c4-chap__lede--flush">
          Skies, mostly: dusk, the moon, a city switching its lights on. Every plate on this page is mine, and so are these.
        </p>
      </div>
      <ul className="c4-strip" aria-label={`Photographs on Unsplash (${unsplash.total} in all)`}>
        {SHOTS.map((id) => {
          const ph = photo(id)
          return (
            <li key={id} style={{ ['--a' as string]: ph.aspect }}>
              <a href={ph.page} target="_blank" rel="noopener" aria-label="Open this photo on Unsplash">
                <img src={img(ph.src, 600)} width={600} height={Math.round(600 / ph.aspect)} alt="" loading="lazy" decoding="async" />
              </a>
            </li>
          )
        })}
      </ul>
      <div className="c4-col">
        <ul className="c4-films" aria-label="Timelapses on YouTube">
          {films.map((v) => (
            <li key={v.id}>
              <a href={v.url} target="_blank" rel="noopener">
                <span className="c4-films__thumb">
                  <img src={v.thumb} width={480} height={360} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="c4-films__t">{FILM[v.id]}</span>
                <span className="c4-films__go" aria-hidden="true">
                  <Arrow out />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Links className="c4-pills c4-pills--photo" mode="both" size={15} only={['unsplash', 'youtube']} />
      </div>
    </section>
  )
}

function Contact() {
  return (
    <section className="c4-contact c4-col" id="contact" data-chapter="contact" tabIndex={-1} aria-labelledby="contact-h">
      <h2 className="c4-h c4-h--contact" id="contact-h">
        Write to me
      </h2>
      <p className="c4-body">I finish at UVic in {person.gradMonth}. If you work on ML systems or interpretability, email is fastest.</p>
      <CopyEmail />
      <Links className="c4-pills c4-pills--contact" mode="both" size={15} />
    </section>
  )
}

/* ---------------- home ---------------- */

export function Home({ base, onActive }: { base: string; onActive: (id: ChapterId | null) => void }) {
  const m = useMotionPrefs()
  // Which chapter holds the middle of the screen: drives the year rail and the phone's year chip.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.c4 [data-chapter]'))
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => seen.set(e.target.id, e.isIntersecting))
        const hit = els.find((el) => seen.get(el.id))
        onActive(hit ? (hit.id as ChapterId) : null)
      },
      { rootMargin: '-45% 0px -54% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [onActive])
  return (
    <>
      <Hero reduced={m.reduced} />
      <Y2026 base={base} />
      <Y2025 base={base} />
      <Y2024 />
      <Photography />
      <Contact />
    </>
  )
}

