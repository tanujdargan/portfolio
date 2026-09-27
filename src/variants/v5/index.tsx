/*
 * v5 "Model card": Tanuj documented like a model release.
 * Patterns (PORTFOLIO_TASTE.md §4): P01 steering demo (live, on home), P06 token strip (Inference widget),
 * P14 tab bar with sliding indicator (desktop), P18/P19 one proof metric per eval row, P24 sliding pill → tab underline,
 * P27 copy morph (email + citation), P03-style "current checkpoint" line.
 * Motion tokens (§3): spring layout 380 for row reorder, snap 520 for tab indicator, pop 600 for copy check, ease-out entrances.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import '@fontsource/ibm-plex-mono/400.css'
import { person, research, engineering, experience, earlier, links, linkOrder, chapters, beri, type LinkKey } from '../../content/site'
import { useProof, useCommunity } from '../../content/useContent'
import { Show, useFlags } from '../../lib/labprefs'
import { LinkIcon } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { Inference } from './Inference'
import { EvalTable } from './EvalTable'
import './v5.css'

const tabs = [
  { id: 'details', label: 'Model card' },
  { id: 'evaluations', label: 'Evaluations' },
  { id: 'interpretability', label: 'Interpretability' },
  { id: 'applied', label: 'Applied' },
  { id: 'citation', label: 'Citation' },
]

// "Files and versions": the five one-tap links, named like files in a repo.
const files: Record<LinkKey, { name: string; meta: string }> = {
  resume: { name: 'resume.pdf', meta: 'PDF' },
  email: { name: 'email', meta: person.email },
  github: { name: 'github', meta: 'tanujdargan' },
  linkedin: { name: 'linkedin', meta: 'in/tanujdargan' },
  x: { name: 'x', meta: '@DarganTanuj' },
}

function FileLink({ k, compact }: { k: LinkKey; compact?: boolean }) {
  const l = links[k]
  const ext = !l.href.startsWith('mailto:')
  return (
    <li data-link={k}>
      <a href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={compact ? l.label : undefined}>
        <LinkIcon k={k} size={compact ? 17 : 16} />
        {!compact && (
          <>
            <span className="v5-file__name">{files[k].name}</span>
            <span className="v5-file__meta">{files[k].meta}</span>
          </>
        )}
      </a>
      {l.unverified && <Flag note="X handle guessed; not found on GitHub, old site or resume." />}
    </li>
  )
}

function TopBar({ base, home }: { base: string; home: boolean }) {
  const m = useMotionPrefs()
  const [showLinks, setShowLinks] = useState(!home)
  const [active, setActive] = useState('')
  useEffect(() => {
    if (!home) return setShowLinks(true)
    const files = document.getElementById('v5-files')
    const io = new IntersectionObserver(([e]) => setShowLinks(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    if (files) io.observe(files)
    const io2 = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-30% 0px -65% 0px' })
    tabs.forEach((t) => {
      const el = document.getElementById(t.id)
      if (el) io2.observe(el)
    })
    return () => {
      io.disconnect()
      io2.disconnect()
    }
  }, [home])
  return (
    <header className="v5-bar">
      <div className="v5-bar__in">
        <Link to={`${base}/`} className="v5-bar__repo" title={`${person.name}, model card home`}>
          <span className="v5-mark" aria-hidden="true" />
          <span className="v5-bar__owner">tanujdargan /</span>
          <b>tanuj-dargan</b>
        </Link>
        <nav className="v5-tabs" aria-label="Card sections">
          {tabs.map((t) => (
            <Link
              key={t.id}
              to={`${base}/#${t.id}`}
              aria-current={active === t.id ? 'location' : undefined}
              onClick={(e) => {
                const el = home && document.getElementById(t.id)
                if (!el) return
                e.preventDefault()
                el.scrollIntoView({ behavior: m.reduced ? 'auto' : 'smooth' })
                history.replaceState(null, '', `#${t.id}`)
              }}
            >
              {t.label}
              {active === t.id && <motion.span layoutId="v5-tab" className="v5-tabs__bar" transition={m.spring(520)} />}
            </Link>
          ))}
        </nav>
        <ul className="v5-bar__links" data-show={showLinks || undefined} aria-label="Links">
          {linkOrder.map((k) => (
            <FileLink key={k} k={k} compact />
          ))}
        </ul>
      </div>
    </header>
  )
}

function H2({ id, children, n }: { id: string; children: ReactNode; n: string }) {
  return (
    <h2 className="v5-h2">
      <a href={`#${id}`} className="v5-anchor" aria-label={`Link to this section`}>
        #
      </a>
      <span className="v5-h2__n">{n}</span>
      {children}
    </h2>
  )
}

function CopyButton({ text, label, className }: { text: string; label: ReactNode; className?: string }) {
  const [done, setDone] = useState(false)
  const m = useMotionPrefs()
  const t = useRef<number>()
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button
      className={`v5-copy ${className ?? ''}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          clearTimeout(t.current)
          t.current = window.setTimeout(() => setDone(false), 1600)
        } catch {
          if (text.includes('@') && !text.includes('\n')) location.href = `mailto:${text}`
        }
      }}
    >
      <span className="v5-copy__i" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={done ? 'y' : 'n'}
            initial={{ opacity: 0, scale: m.reduced ? 1 : 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: m.reduced ? 1 : 0.6,
              transition: { duration: m.dur(0.12) },
            }}
            transition={m.reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 600 / m.dur(1), damping: 24 }}
          >
            {done ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.7} />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span>{done ? 'Copied' : label}</span>
      <span className="sr-only" aria-live="polite">
        {done ? 'Copied to clipboard' : ''}
      </span>
    </button>
  )
}

const bibtexFor = (showBeri: boolean) => `@misc{dargan2027,
  author      = {Dargan, Tanuj},
  title       = {tanuj-dargan: ML systems and interpretability},
  year        = {2027},
  institution = {University of Victoria, CS (accelerated)},
  note        = {SDE intern, Amazon Robotics (return offer);
                 ${showBeri ? 'co-founder, Beri' : 'OBC firmware lead, MarmotSat (in orbit)'}},
  url         = {https://tanujdargan.com},
  email       = {tanujd@uvic.ca}
}`

// Roles told in Applied. The satellite role lives in Technical specifications, DEIA in the write-ups,
// and Pear Care and Airflow leave "Earlier runs" so nothing is listed twice.
const roles = experience.filter((x) => !x.org.startsWith('UVic') && !x.org.startsWith('DEIA'))
const earlierOnly = earlier.filter((e) => !roles.some((x) => x.org.includes(e.title)))
const bySlug = (slug: string) => research.find((r) => r.slug === slug)

/** One headline-eval row per proof point; the order and the second slot come from useProof(). */
function headline(key: string, base: string) {
  switch (key) {
    case 'amazon':
      return (
        <>
          <span className="v5-headline__task">
            <b>Amazon Robotics</b>
            <span>SDE intern, summer 2026 · LLM planning assistant in production, 180+ sites</span>
          </span>
          <span className="v5-headline__res">
            <Check size={14} strokeWidth={2} aria-hidden="true" /> return offer
          </span>
        </>
      )
    case 'beri':
      return (
        <>
          <span className="v5-headline__task">
            <b>Beri</b>
            <span>Native iOS food and recipe social app</span>
          </span>
          <Link to={`${base}/beri`} className="v5-headline__res v5-headline__res--a">
            co-founder · case study →
          </Link>
        </>
      )
    case 'marmotsat':
      return (
        <>
          <span className="v5-headline__task">
            <b>MarmotSat</b>
            <span>Led onboard-computer firmware and the TTC board · SpaceX Falcon 9</span>
          </span>
          <span className="v5-headline__res">
            <Check size={14} strokeWidth={2} aria-hidden="true" /> in orbit
          </span>
        </>
      )
    default:
      return (
        <>
          <span className="v5-headline__task">
            <b>Interpretability</b>
            <span>Activation steering, emotion and persona vectors, SFT loss-masking</span>
          </span>
          <a href="#steering" className="v5-headline__res v5-headline__res--live">
            <span className="v5-live" aria-hidden="true" /> live demo ↓
          </a>
        </>
      )
  }
}

function Header({ base }: { base: string }) {
  const proof = useProof()
  const { beri: showBeri } = useFlags()
  return (
    <section className="v5-card" aria-labelledby="v5-title">
      <div className="v5-card__main">
        <h1 id="v5-title" className="v5-title">
          <span className="v5-mark v5-mark--lg" aria-hidden="true" />
          <span aria-hidden="true">
            <span className="v5-title__owner">tanujdargan /</span> <span className="v5-title__repo">tanuj-dargan</span>
          </span>
          <span className="sr-only">{person.name}</span>
        </h1>
        <p className="v5-version v5-in" style={{ ['--i' as string]: 1 }}>
          <span className="v5-pill">{person.grad} release</span> CS @ UVic, accelerated · {person.location}
        </p>
        <p className="v5-desc v5-in" style={{ ['--i' as string]: 2 }}>
          {person.name} builds ML systems and studies what happens <em>inside</em> models.
        </p>
        <ul className="v5-tags v5-in" style={{ ['--i' as string]: 3 }} aria-label="Tags">
          {['activation steering', 'persona vectors', 'SFT', 'GPU retrieval', showBeri ? 'iOS' : 'LLM agents', 'firmware'].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="v5-headline v5-in" style={{ ['--i' as string]: 4 }}>
          <p className="v5-label">Headline evals</p>
          <ol>
            {proof.map((p) => (
              <li key={p.key}>{headline(p.key, base)}</li>
            ))}
          </ol>
        </div>
      </div>
      <div className="v5-files v5-in" id="v5-files" style={{ ['--i' as string]: 5 }}>
        <p className="v5-files__head">
          <span>Files and versions</span>
          <span className="v5-dim">5 files</span>
        </p>
        <ul className="v5-files__list">
          {linkOrder.map((k) => (
            <FileLink key={k} k={k} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function Home({ base }: { base: string }) {
  const community = useCommunity()
  const { beri: showBeri } = useFlags()
  const solids = bySlug('ocean-sensing')
  return (
    <>
      <Header base={base} />
      <div className="v5-body">
        <aside className="v5-side" aria-label="Inference widget">
          <div className="v5-side__in">
            <Inference />
          </div>
        </aside>

        <div className="v5-doc">
          <section id="details" className="v5-sec" aria-labelledby="h-details">
            <H2 id="details" n="1">
              <span id="h-details">Model details</span>
            </H2>
            <p className="v5-p">
              {person.name} is a Computer Science student at the {person.school}, on the accelerated three-year track, graduating in {person.grad}. He builds ML
              systems and does interpretability research. In summer 2026 he was an SDE intern at Amazon Robotics in Toronto, where he shipped an LLM planning
              assistant to production across 180+ fulfillment sites, and left with a return offer. He led the onboard-computer firmware for MarmotSat, now in
              orbit.
              <Show when="beri">
                {' '}He co-founded <Link to={`${base}/beri`}>Beri</Link>, a native iOS app for food and recipes.
              </Show>
            </p>
            <dl className="v5-dl">
              <dt>Developed by</dt>
              <dd>{person.name}</dd>
              <dt>Model type</dt>
              <dd>Undergraduate, {person.degree}</dd>
              <dt>Release</dt>
              <dd className="v5-mono">{person.grad}</dd>
              <dt>Current checkpoint</dt>
              <dd>Amazon Robotics · SDE intern, May – Aug 2026 → return offer</dd>
              <dt>In orbit</dt>
              <dd>MarmotSat · OBC firmware and TTC board lead, UVic CFAR</dd>
              <Show when="beri">
                <dt>Co-founded</dt>
                <dd>
                  Beri ·{' '}
                  <a href={beri.url} target="_blank" rel="noopener">
                    getberi.com ↗
                  </a>
                </dd>
              </Show>
              <dt>Research labs</dt>
              <dd>
                DEIA Lab (Prof. Sean Chester) · SOLIDS Lab (Dr. Navneet Popli)
                {solids?.unverified?.length ? <Flag note={solids.unverified.join(' ')} /> : null} · RBC Borealis mentorship · Apart Research sprint
              </dd>
              <dt>Location</dt>
              <dd>{person.location}</dd>
              <dt>Contact</dt>
              <dd className="v5-mono">{person.email}</dd>
            </dl>
          </section>

          <section id="intended-use" className="v5-sec" aria-labelledby="h-use">
            <H2 id="intended-use" n="2">
              <span id="h-use">Intended use</span>
            </H2>
            <h3 className="v5-h3">Direct use</h3>
            <ul className="v5-uses">
              <li>
                <b>Research programs.</b> Interpretability and model-behaviour work: steering vectors, persona directions, how SFT data shapes a persona.
              </li>
              <li>
                <b>Labs.</b> ML systems: billion-vector GPU retrieval, LoRA fine-tuning with evolutionary strategies, model serving on his own hardware.
              </li>
              <li>
                <b>Product teams.</b> LLM features in production: a planning assistant across 180+ Amazon fulfillment sites, medical-AI agents at Pear Care.
              </li>
              <Show when="beri">
                <li>
                  <b>Founders.</b> A native iOS app, its backend and its design system, as built at Beri.
                </li>
              </Show>
            </ul>
            <h3 className="v5-h3">How to get started</h3>
            <div className="v5-code">
              <div className="v5-code__head">
                <span>contact</span>
                <CopyButton text={person.email} label="Copy email" />
              </div>
              <pre>
                <code>
                  <span className="v5-c">{'# email is the fastest path'}</span>
                  {'\n'}
                  <span className="v5-k">email</span>
                  {'   '}
                  <a href={links.email.href}>{person.email}</a>
                  {'\n'}
                  <span className="v5-k">resume</span>
                  {'  '}
                  <a href={links.resume.href} target="_blank" rel="noopener">
                    /resume.pdf
                  </a>
                </code>
              </pre>
            </div>
          </section>

          <section id="training-data" className="v5-sec" aria-labelledby="h-data">
            <H2 id="training-data" n="3">
              <span id="h-data">Training data</span>
            </H2>
            <p className="v5-p v5-p--dim">Chronological. Places, in order of ingestion.</p>
            <ol className="v5-chrono">
              {chapters.map((c) => (
                <li key={c.place} data-unverified={c.unverified || undefined}>
                  <span className="v5-chrono__when">{c.when}</span>
                  <span className="v5-chrono__place">
                    {c.place}
                    {c.unverified && <Flag note="Early chapters (years before Mumbai) not confirmed." />}
                  </span>
                  <span className="v5-chrono__line">{c.line}</span>
                </li>
              ))}
            </ol>
            <details className="v5-more">
              <summary>
                Earlier runs <span className="v5-dim">{earlierOnly.length} checkpoints, 2024–2026</span>
              </summary>
              <ul className="v5-earlier">
                {earlierOnly.map((e) => (
                  <li key={e.title}>
                    <span className="v5-earlier__when">{e.when}</span>
                    <span className="v5-earlier__t">
                      {e.href ? (
                        <a href={e.href} target="_blank" rel="noopener">
                          {e.title} ↗
                        </a>
                      ) : (
                        e.title
                      )}
                      {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in local repo; confirm it's okay to list." />}
                    </span>
                    <span className="v5-earlier__d">
                      {e.role}. {e.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <section id="evaluations" className="v5-sec" aria-labelledby="h-evals">
            <H2 id="evaluations" n="4">
              <span id="h-evals">Evaluations</span>
            </H2>
            <p className="v5-p v5-p--dim">Numbers as reported. Sort by any column; write-ups are linked where they exist.</p>
            <EvalTable base={base} />
          </section>

          <section id="interpretability" className="v5-sec" aria-labelledby="h-interp">
            <H2 id="interpretability" n="5">
              <span id="h-interp">Interpretability</span>
            </H2>
            <p className="v5-p">
              The main line of research: find a concept as a direction in the residual stream, then check whether pushing along it changes behaviour the way the
              label promises. Each write-up states the question, the method, the result and what comes next.
            </p>
            <h3 className="v5-h3" id="steering">
              Steering this model
            </h3>
            <p className="v5-p v5-p--dim">
              “This model” is {'Qwen2.5-1.5B-Instruct'}. Pick a concept and drag <span className="v5-gk">α</span>. Outputs are real, precomputed at nine steps
              from −1.2 to +1.2‖h‖.
            </p>
            <div className="v5-demo">
              <Demo kind="steering" hero />
            </div>
            <h3 className="v5-h3">Write-ups</h3>
            <ol className="v5-papers">
              {research.map((r, i) => (
                <li key={r.slug}>
                  <Link to={`${base}/research/${r.slug}`}>
                    <span className="v5-papers__n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="v5-papers__t">
                      {r.title}
                      {r.unverified?.length ? <Flag note={r.unverified.join(' ')} /> : null}
                      <span className="v5-papers__w">
                        {r.where} · {r.when}
                      </span>
                    </span>
                    <span className="v5-papers__demo">{r.demo ? 'demo' : ''}</span>
                    <span className="v5-papers__arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section id="applied" className="v5-sec" aria-labelledby="h-applied">
            <H2 id="applied" n="6">
              <span id="h-applied">Applied</span>
            </H2>
            <Show when="beri">
              <Link to={`${base}/beri`} className="v5-beri">
                <img src="/beri/shipped/home.jpg" alt="Beri home screen" width={420} height={914} loading="lazy" decoding="async" />
                <span className="v5-beri__body">
                  <span className="v5-label">Downstream deployment · iOS</span>
                  <b className="v5-beri__t">Beri</b>
                  <span className="v5-beri__d">{beri.oneLiner}</span>
                  <span className="v5-beri__d v5-dim">{beri.role}</span>
                  <span className="v5-stack">
                    {beri.stack.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </span>
                  <span className="v5-beri__cta">Read the case study →</span>
                </span>
              </Link>
            </Show>
            <p className="v5-label v5-applied__h">Downstream deployments · roles</p>
            <dl className="v5-specs v5-applied">
              {roles.map((x) => (
                <div key={x.org}>
                  <dt>
                    <span className="v5-label">{x.when}</span>
                    <b>{x.org}</b>
                    <span className="v5-dim">{x.role}</span>
                  </dt>
                  <dd>
                    {x.line}
                    <span className="v5-stack">
                      <span>{x.metric}</span>
                      <span>{x.where}</span>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="specs" className="v5-sec" aria-labelledby="h-specs">
            <H2 id="specs" n="7">
              <span id="h-specs">Technical specifications</span>
            </H2>
            <dl className="v5-specs">
              {engineering.map((e, i) => (
                <div key={e.title}>
                  <dt>
                    <span className="v5-label">{i === 0 ? 'Hardware' : 'Compute infrastructure'}</span>
                    {'href' in e && e.href ? (
                      <a href={e.href} target="_blank" rel="noopener">
                        {e.title} ↗
                      </a>
                    ) : (
                      <b>{e.title}</b>
                    )}
                    <span className="v5-dim">{e.role}</span>
                  </dt>
                  <dd>
                    {e.detail}
                    <span className="v5-stack">
                      {e.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="community" className="v5-sec" aria-labelledby="h-comm">
            <H2 id="community" n="8">
              <span id="h-comm">Community</span>
            </H2>
            <ul className="v5-earlier v5-earlier--comm">
              {community.map((c) => (
                <li key={c.title}>
                  <span className="v5-earlier__when">{c.when}</span>
                  <span className="v5-earlier__t">
                    {c.href ? (
                      <a href={c.href} target="_blank" rel="noopener">
                        {c.title} ↗
                      </a>
                    ) : (
                      c.title
                    )}
                  </span>
                  <span className="v5-earlier__d">
                    {c.role}. {c.detail}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section id="limitations" className="v5-sec" aria-labelledby="h-lim">
            <H2 id="limitations" n="9">
              <span id="h-lim">Limitations</span>
            </H2>
            <ul className="v5-lims">
              <li>
                The steering results on this page come from a replication on Qwen2.5-1.5B-Instruct, run for this site. They are not the main project's models or
                numbers.
                <Flag note={bySlug('activation-steering')?.unverified?.join(' ') ?? ''} />
              </li>
              <li>
                Two directions don't do what their labels say. Distress, extracted this way, overlaps with refusal. Certainty partly encodes the word
                “Certainly!” rather than the stance.
              </li>
              <li>
                ES-LoRA: the adapter is on Hugging Face, but GSM8K accuracy before and after, and the proxy-vs-random ablation, are <i>results pending</i>.
                <Flag note={bySlug('es-lora')?.unverified?.join(' ') ?? ''} />
              </li>
              <li>
                Loss-masking sprint: the findings are reported as directions of effect (which regime raises expressed distress, and where expression and
                representation split). Per-regime numbers are not on this page.
              </li>
              <li>Amazon's $136.2M a year is a projection, not measured savings.</li>
              <li>
                Training data before 2021 is sparse. The early chapters are unconfirmed.
                <Flag note="Dehradun and Gurgaon chapters, and their years, need Tanuj's confirmation." />
              </li>
            </ul>
          </section>

          <section id="citation" className="v5-sec" aria-labelledby="h-cite">
            <H2 id="citation" n="10">
              <span id="h-cite">Citation</span>
            </H2>
            <p className="v5-p v5-p--dim">For your notes, or the top of an intro email.</p>
            <div className="v5-code">
              <div className="v5-code__head">
                <span>BibTeX</span>
                <CopyButton text={bibtexFor(showBeri)} label="Copy" />
              </div>
              <pre>
                <code>{bibtexFor(showBeri)}</code>
              </pre>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default function V5({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  return (
    <div className="v5">
      <a href="#main" className="v5-skip">
        Skip to content
      </a>
      <TopBar base={base} home={home} />
      <main id="main" key={path} className={home ? 'v5-main' : 'v5-main v5-main--page'}>
        {!home && (
          <p className="v5-crumb">
            <Link to={`${base}/`}>tanujdargan / tanuj-dargan</Link>
            <span aria-hidden="true"> / </span>
            {page.kind === 'research' ? `research / ${page.slug}` : page.kind === 'beri' ? 'applied / beri' : '404'}
          </p>
        )}
        {home && <Home base={base} />}
        {page.kind === 'research' && <ResearchArticle slug={page.slug} base={base} />}
        {page.kind === 'beri' && <BeriCaseStudy base={base} />}
        {page.kind === 'notfound' && (
          <section className="v5-404">
            <p className="v5-label">404 · file not found</p>
            <h1 className="v5-title">This path isn't in the repo.</h1>
            <p className="v5-p">
              <Link to={`${base}/`}>Back to the model card →</Link>
            </p>
          </section>
        )}
      </main>
      <footer className="v5-foot">
        <span>tanujdargan / tanuj-dargan · © 2026 {person.name}</span>
        <span className="v5-dim">Card revised Sep 2026. Built with Vite, React and Framer Motion. Demos run in your browser.</span>
      </footer>
    </div>
  )
}
