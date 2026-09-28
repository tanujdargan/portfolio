/*
 * v8 "Billion vectors": the site is an index, and retrieval is the navigation.
 * A procedural GPU point field (1M points on desktop, 128–256K on phones; positions hashed from gl_VertexID, animated in
 * the vertex shader) stands in for Tanuj's billion-vector cuVS work. The nav is a search box: a query lands in the field,
 * the IVF coarse quantiser lights nprobe lists, a greedy graph walk draws its hops, and the camera flies to the top-k,
 * which are this site's sections and write-ups. Scrolling descends from "all 1B" to a single vector: the project card.
 *
 * Patterns (PORTFOLIO_TASTE.md §4 + docs/patterns-v8.md):
 *   P04 embedding field (procedural, one draw call) · P25 command menu → V8-P1 search-as-nav · P19 one metric per row
 *   P27 copy-email morph · P03-style honest live readout (points drawn, fps) · P12 pauses offscreen
 *   V8-P1 search is the nav · V8-P2 retrieval replay (probe → hops → top-k) · V8-P3 labelled counters (simulated/measured/illustrative)
 *   V8-P4 scroll descent 1B → 1 · V8-P5 nearest-neighbour halo · V8-P6 plain index (the no-WebGL route)
 * Tokens: ease-out entrances, ease-drawer for the dialog, snap spring for segmented control, layout spring for rows.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { person, research, engineering, earlier, experience, beri, links, workLinkOrder } from '../../content/site'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { useProof, useCommunity } from '../../content/useContent'
import { Show, useFlags } from '../../lib/labprefs'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { SearchProvider, SearchTrigger, SearchDialog, SearchIcon, useSearch } from './Search'
import { Field, useFieldClick, descentDoc } from './Field'
import { field } from './fieldClient'
import { visibleDocs, groupNames, type Doc } from './index-docs'
import './v8.css'

const nf = new Intl.NumberFormat('en-US')
// React 18 has no `inert` prop type; pass the attribute through as a string.
const inert = (on: boolean) => (on ? ({ inert: '' } as object) : {})
const expId = ['amazon', 'rbc', 'cfar', 'deia', 'pear', 'mlh']
const earlierLogo: Record<string, OrgKey> = { 'Pear Care': 'pearcare', 'Apache Airflow': 'airflow' }

function Top({ base }: { base: string }) {
  return (
    <header className="v8-top">
      <div className="v8-top__in">
        <Link to={`${base}/`} className="v8-top__name" aria-label="Tanuj Dargan, home">
          <span className="v8-top__dot" aria-hidden="true" />
          <span>Tanuj Dargan</span>
        </Link>
        <SearchTrigger />
        <Links className="v8-top__links" mode="icon" size={17} only={workLinkOrder} />
      </div>
    </header>
  )
}

function Hero({ base }: { base: string }) {
  const proof = useProof()
  const s = useSearch()
  const to = (k: string) => (k === 'amazon' ? `${base}/#w-amazon` : k === 'beri' ? `${base}/beri` : k === 'marmotsat' ? `${base}/#w-cfar` : `${base}/#research`)
  return (
    <section className="v8-hero" aria-labelledby="v8-name">
      <div className="v8-hero__col">
        <p className="v8-kicker v8-in" style={{ ['--i' as string]: 0 }}>
          CS at UVic · class of {person.grad}
          <span className="v8-long"> · accelerated three-year track</span>
        </p>
        <h1 id="v8-name" className="v8-name v8-in" style={{ ['--i' as string]: 1 }}>
          Tanuj <span>Dargan</span>
        </h1>
        <p className="v8-line v8-in" style={{ ['--i' as string]: 2 }}>
          I build ML systems, from billion-vector search on GPUs to an LLM planner in production, and study what happens inside models.
        </p>
        <ol className="v8-proof" aria-label="Proof">
          {proof.map((p, i) => (
            <li key={p.key} className="v8-in" style={{ ['--i' as string]: 3 + i }}>
              <span className="v8-proof__n v8-mono" aria-hidden="true">
                0{i + 1}
              </span>
              <span>
                <Link to={to(p.key)} className="v8-proof__l">
                  {p.label}
                </Link>{' '}
                <span className="v8-proof__d">{p.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <Links className="v8-links v8-in" mode="both" size={14} only={workLinkOrder} />
        <div className="v8-try v8-in" style={{ ['--i' as string]: 7 }}>
          <span className="v8-mono">Query the index</span>
          <ul className="v8-chips">
            {['steering', 'amazon', 'satellite', 'retrieval'].map((q) => (
              <li key={q}>
                <button type="button" className="v8-chip" onClick={() => s.openWith(q)}>
                  <SearchIcon size={12} />
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="v8-scrollcue v8-mono" aria-hidden="true">
        Scroll to descend · 1,000,000,000 → 1
      </p>
    </section>
  )
}

/** Scroll descent: the camera falls from the whole field into one vector, which becomes the project card. */
function Descent({ base }: { base: string }) {
  const ref = useRef<HTMLElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const m = useMotionPrefs()
  useEffect(() => {
    const el = ref.current!
    let top = 0
    let h = 1
    let vh = 1
    let tick = 0
    const measure = () => {
      const r = el.getBoundingClientRect()
      top = r.top + scrollY
      h = r.height
      vh = innerHeight
      update()
    }
    const update = () => {
      tick = 0
      const raw = Math.min(1, Math.max(0, (scrollY - top) / Math.max(1, h - vh)))
      const p = m.reduced ? Math.round(raw * 3) / 3 : raw
      el.style.setProperty('--p', p.toFixed(4))
      el.dataset.end = p > 0.82 ? '1' : ''
      field.scroll(raw)
      if (count.current) {
        const n = Math.max(1, Math.round(10 ** (9 * (1 - Math.min(1, p / 0.86)))))
        count.current.textContent = nf.format(n < 1000 ? n : Number(n.toPrecision(3)))
      }
    }
    const onScroll = () => {
      if (!tick) tick = requestAnimationFrame(update)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', measure)
      cancelAnimationFrame(tick)
    }
  }, [m.reduced])
  const r = research.find((x) => x.slug === 'billion-vector-retrieval')!
  return (
    <section ref={ref} className="v8-descent" aria-labelledby="v8-vec-t">
      <div className="v8-descent__sticky">
        <p className="v8-count" aria-hidden="true">
          <span className="v8-mono">vectors in view</span>
          <span ref={count} className="v8-count__n">
            1,000,000,000
          </span>
          <span className="v8-mono v8-dim">implied at 1B scale · the field draws ~1M</span>
        </p>
        <ol className="v8-steps" aria-hidden="true">
          <li style={{ ['--a' as string]: -1, ['--b' as string]: 0.3 }}>A billion vectors, 2 TB of index, spread across 8+ NVIDIA GPUs.</li>
          <li style={{ ['--a' as string]: 0.3, ['--b' as string]: 0.58 }}>A query reads a few of the index's lists, then walks a graph to its nearest neighbours.</li>
          <li style={{ ['--a' as string]: 0.58, ['--b' as string]: 0.82 }}>
            At DEIA Lab that ran at <span className="v8-nw">1–4M</span> queries a second, <span className="v8-nw">90–95%</span> recall, under <span className="v8-nw">250 ms</span>.
          </li>
        </ol>
        <article className="v8-vec" data-noclick>
          <p className="v8-mono v8-vec__id">
            vector 418,207,556 · list {descentDoc.cell} · top-1
          </p>
          <h2 id="v8-vec-t" className="v8-vec__t">
            {r.title}
          </h2>
          <p className="v8-vec__w">
            {r.where} · {r.when}
          </p>
          <dl className="v8-metrics">
            {[
              ['1–4M', 'queries / sec'],
              ['90–95%', 'recall'],
              ['<250 ms', 'latency'],
              ['8+', 'NVIDIA GPUs'],
              ['2 TB', 'of index'],
              ['4.3×', 'throughput scaling'],
            ].map(([v, k]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="v8-vec__d">
            Custom retrieval on a modified cuVS fork (CAGRA and IVF-PQ). Automated stress tests on Kubernetes GPU clusters found the ceiling: memory bandwidth and
            NVLink saturation.
          </p>
          <Link to={`${base}/research/billion-vector-retrieval`} className="v8-btn">
            Read the write-up <span aria-hidden="true">→</span>
          </Link>
        </article>
      </div>
    </section>
  )
}

function SecHead({ id, n, title, count, note }: { id: string; n: string; title: string; count: number; note?: string }) {
  return (
    <header className="v8-sec__h">
      <p className="v8-mono v8-sec__n">
        list {n} · {count} {count === 1 ? 'vector' : 'vectors'}
      </p>
      <h2 id={id} className="v8-h2">
        {title}
      </h2>
      {note && <p className="v8-sec__note">{note}</p>}
    </header>
  )
}

function Work() {
  const [open, setOpen] = useState<number | null>(0)
  const m = useMotionPrefs()
  return (
    <ol className="v8-rows">
      {experience.map((e, i) => (
        <li key={e.org} id={`w-${expId[i]}`} className="v8-row" data-open={open === i || undefined}>
          <button type="button" className="v8-row__h" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <OrgLogo org={e.logo} height={16} className="v8-logo v8-row__logo" />
            <span className="v8-row__org">{e.org}</span>
            <span className="v8-row__role">{e.role}</span>
            <span className="v8-row__when v8-mono">{e.when}</span>
            <span className="v8-row__m">{e.metric}</span>
            <span className="v8-row__line">{e.line}</span>
            <span className="v8-row__chev" aria-hidden="true" />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                className="v8-row__more"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={m.reduced ? { duration: 0.18 } : { height: m.spring(380), opacity: { duration: m.dur(0.2) } }}
              >
                <ul>
                  {e.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <p className="v8-mono v8-dim">{e.where}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </li>
      ))}
    </ol>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  return (
    <button
      type="button"
      className="v8-copy"
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
      <span className="v8-copy__dot" data-on={copied || undefined} aria-hidden="true" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          initial={{ opacity: 0, y: 8 * m.k, filter: m.reduced ? 'none' : 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: m.reduced ? 'none' : 'blur(0px)' }}
          exit={{ opacity: 0, y: -8 * m.k }}
          transition={{ duration: m.dur(0.18), ease: [0.23, 1, 0.32, 1] }}
        >
          {copied ? 'Copied to clipboard' : person.email}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email copied' : ''}
      </span>
    </button>
  )
}

function DocLink({ d, base, children, className }: { d: Doc; base: string; children: React.ReactNode; className?: string }) {
  if (d.to) {
    return (
      <Link to={base + d.to} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <a href={d.href} className={className} {...(d.href?.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
      {children}
    </a>
  )
}

/** The plain index: every vector the search can return, as links. Works with no WebGL and no JS. */
function PlainIndex({ base }: { base: string }) {
  const flags = useFlags()
  const pool = visibleDocs(flags)
  const groups = [-1, 0, 1, 2, 3, 4, 5]
  return (
    <div className="v8-index">
      {groups.map((g) => {
        const ds = pool.filter((d) => d.group === g)
        if (!ds.length) return null
        return (
          <div key={g} className="v8-index__g">
            <h3 className="v8-mono">{g < 0 ? 'you are here' : groupNames[g]}</h3>
            <ul>
              {ds.map((d) => (
                <li key={d.id}>
                  <span className="v8-mono v8-index__id" aria-hidden="true">
                    {String(d.cell).padStart(2, '0')}·{d.id.slice(0, 3)}
                  </span>
                  <DocLink d={d} base={base} className="v8-index__a">
                    {d.logo && <OrgLogo org={d.logo} height={13} className="v8-logo" />}
                    {d.title}
                    {!d.to && <span aria-hidden="true"> ↗</span>}
                  </DocLink>
                  <span className="v8-index__k v8-mono">{d.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function Home({ base }: { base: string }) {
  const community = useCommunity()
  const flags = useFlags()
  const stage = useRef<HTMLDivElement>(null)
  useFieldClick(stage)
  const buildCount = engineering.length + (flags.beri ? 1 : 0)
  return (
    <>
      <div id="v8-stage" ref={stage} className="v8-stage">
        <Hero base={base} />
        <Descent base={base} />
      </div>

      <div className="v8-doc">
        <section className="v8-sec v8-sec--demo" aria-labelledby="retrieval">
          <SecHead id="retrieval" n="00" title="The same idea, small enough to touch" count={24000} note="24,000 points in 2-D instead of a billion in high dimensions. Move the query, change nprobe, and watch recall trade against work." />
          <Demo kind="retrieval" />
        </section>

        <section className="v8-sec" aria-labelledby="work">
          <SecHead id="work" n="01" title="Work" count={experience.length} note="Newest first. One number each; open a row for the rest." />
          <Work />
        </section>

        <section className="v8-sec" aria-labelledby="research">
          <SecHead id="research" n="02" title="Research" count={research.length} note="Each write-up has the question, the method, the result, and what I'd do next." />
          <ol className="v8-res">
            {research.map((r, i) => (
              <li key={r.slug}>
                <Link to={`${base}/research/${r.slug}`} className="v8-res__a">
                  <span className="v8-res__n v8-mono">R{i + 1}</span>
                  <span className="v8-res__t">{r.title}</span>
                  <span className="v8-res__w">
                    {r.where} · {r.when}
                  </span>
                  <span className="v8-res__tags v8-mono">
                    {r.demo && <span className="v8-live">live demo</span>}
                    {r.tags.join(' · ')}
                  </span>
                  <span className="v8-res__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
                {r.unverified && <Flag note={r.unverified[0]} />}
              </li>
            ))}
          </ol>
        </section>

        <section className="v8-sec" aria-labelledby="build">
          <SecHead id="build" n="03" title="Built" count={buildCount} />
          <ul className="v8-cards" data-n={buildCount}>
            <Show when="beri">
              <li className="v8-card">
                <p className="v8-mono v8-card__k">Building · iOS</p>
                <h3 className="v8-card__t">Beri</h3>
                <p className="v8-card__d">
                  {beri.oneLiner} {beri.role}
                </p>
                <p className="v8-card__acts">
                  <Link to={`${base}/beri`} className="v8-inline">
                    Case study <span aria-hidden="true">→</span>
                  </Link>
                  <a href={beri.url} className="v8-inline" target="_blank" rel="noopener">
                    getberi.com <span aria-hidden="true">↗</span>
                  </a>
                </p>
              </li>
            </Show>
            {engineering.map((e, i) => (
              <li key={e.title} className="v8-card">
                {i === 0 && <OrgLogo org="uvic" height={18} className="v8-logo v8-card__logo" />}
                <p className="v8-mono v8-card__k">{e.role}</p>
                <h3 className="v8-card__t">{e.title}</h3>
                <p className="v8-card__d">{e.detail}</p>
                <p className="v8-card__acts v8-mono">
                  {e.tags.join(' · ')}
                  {'href' in e && e.href && (
                    <a href={e.href} className="v8-inline" target="_blank" rel="noopener">
                      GitHub <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="v8-sec" aria-labelledby="community">
          <SecHead id="community" n="04" title="Community" count={community.length} />
          <ul className="v8-list">
            {community.map((c) => (
              <li key={c.title}>
                <span className="v8-list__t">
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noopener">
                      {c.title} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    c.title
                  )}
                </span>
                <span className="v8-list__r">{c.role}</span>
                <span className="v8-list__d">{c.detail}</span>
                <span className="v8-list__w v8-mono">{c.when}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="v8-sec v8-sec--quiet" aria-labelledby="earlier">
          <SecHead id="earlier" n="05" title="Earlier" count={earlier.length} />
          <ul className="v8-list v8-list--quiet">
            {earlier.map((e) => (
              <li key={e.title}>
                <span className="v8-list__t">
                  {e.href ? (
                    <a href={e.href} target="_blank" rel="noopener">
                      {earlierLogo[e.title] && <OrgLogo org={earlierLogo[e.title]} height={14} className="v8-logo v8-list__logo" />}
                      {e.title} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    e.title
                  )}
                  {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in local repo; confirm it's okay to list." />}
                </span>
                <span className="v8-list__r">{e.role}</span>
                <span className="v8-list__d">{e.detail}</span>
                <span className="v8-list__w v8-mono">{e.when}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="v8-sec" aria-labelledby="index">
          <SecHead id="index" n="06" title="The plain index" count={visibleDocs(flags).length} note="Everything the search can return, as ordinary links. This is the whole site without the field." />
          <PlainIndex base={base} />
        </section>

        <section id="contact" className="v8-sec v8-contact" aria-labelledby="contact-h">
          <SecHead id="contact-h" n="07" title="Contact" count={1} />
          <p className="v8-contact__line">Research programs, labs and founders: email is fastest.</p>
          <CopyEmail />
          <Links className="v8-links" mode="both" size={14} />
          <p className="v8-mono v8-dim v8-contact__where">{person.location}</p>
        </section>
      </div>
    </>
  )
}

function Crumbs({ base, trail }: { base: string; trail: string[] }) {
  return (
    <nav className="v8-crumbs v8-mono" aria-label="Breadcrumb">
      <Link to={`${base}/`}>index</Link>
      {trail.map((t) => (
        <span key={t}>
          <span aria-hidden="true"> / </span>
          {t}
        </span>
      ))}
    </nav>
  )
}

function Shell({ page, base }: VariantProps) {
  const s = useSearch()
  const home = page.kind === 'home'
  return (
    <div className="v8" data-page={page.kind} data-search={s.open || undefined}>
      <a href="#main" className="v8-skip">
        Skip to content
      </a>
      <Top base={base} />
      <main id="main" className="v8-main" {...inert(s.open)}>
        {home && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="v8-page">
            <Crumbs base={base} trail={['research', page.slug]} />
            <ResearchArticle slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="v8-page">
            <Crumbs base={base} trail={['beri']} />
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="v8-nf">
            <p className="v8-mono">404 · no vector at this address</p>
            <h1 className="v8-name">Nothing here.</h1>
            <p className="v8-line">
              Nearest neighbours are one query away.{' '}
              <button type="button" className="v8-inline" onClick={() => s.openWith()}>
                Search the index
              </button>{' '}
              or go <Link to={`${base}/`} className="v8-inline">back to the start</Link>.
            </p>
          </section>
        )}
      </main>
      <footer className="v8-foot" {...inert(s.open)}>
        <p className="v8-mono">
          © 2026 {person.name} · The field is one WebGL2 draw call: every point's position is hashed from its vertex id on the GPU. Search scoring is lexical; the
          geometry is illustrative.
        </p>
      </footer>
      <Field home={home} />
      <AnimatePresence>
        {s.open && (
          <motion.div key="s" className="v8-s-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <SearchDialog />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function V8(props: VariantProps) {
  return (
    <SearchProvider base={props.base}>
      <Shell {...props} />
    </SearchProvider>
  )
}
