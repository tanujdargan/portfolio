import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400-italic.css'
import { person, research, engineering, earlier, links, experience } from '../../content/site'
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
import './v0.css'

const sections = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'research', label: 'Research' },
  { id: 'contact', label: 'Contact' },
]

function Nav({ base, home }: { base: string; home: boolean }) {
  const [active, setActive] = useState('')
  const m = useMotionPrefs()
  useEffect(() => {
    if (!home) return
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' })
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [home])
  return (
    <header className="v0-nav">
      <div className="v0-nav__in">
        <Link to={`${base}/`} className="v0-nav__name">
          {person.name}
        </Link>
        <nav aria-label="Sections" className="v0-nav__links">
          {sections.map((s) => (
            <Link key={s.id} to={`${base}/#${s.id}`} aria-current={active === s.id ? 'location' : undefined}>
              {active === s.id && <motion.span layoutId="v0-pill" className="v0-nav__pill" transition={m.spring(520)} />}
              <span>{s.label}</span>
            </Link>
          ))}
        </nav>
        <Links className="v0-nav__icons" mode="icon" size={17} />
      </div>
    </header>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  return (
    <button
      className="v0-copy"
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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          initial={{ opacity: 0, y: 8 * m.k, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8 * m.k, filter: 'blur(2px)' }}
          transition={{ duration: m.dur(0.18) }}
        >
          {copied ? 'Copied ✓' : person.email}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

interface Role {
  org: string
  role: string
  when: string
  where: string
  line: string
  more: string
  to?: string
}

// Short labels for the row grid; the full resume title goes in the expanded text.
const shortOrg: Record<string, string> = { 'UVic Centre for Aerospace Research': 'UVic CFAR', 'MLH Fellowship · Apache Airflow': 'MLH · Apache Airflow' }
const shortRole: Record<string, string> = {
  'Amazon Robotics': 'SDE intern',
  'RBC Borealis': 'AI/ML research mentee',
  'UVic Centre for Aerospace Research': 'MarmotSat firmware lead',
  'DEIA Lab, UVic': 'Undergraduate researcher',
  'MLH Fellowship · Apache Airflow': 'SWE fellow',
}

// Resume roles (content/experience), plus Beri when its flag is on.
const resumeRoles: Role[] = experience.map((e) => ({
  org: shortOrg[e.org] ?? e.org,
  role: shortRole[e.org] ?? e.role,
  when: e.when,
  where: `${e.org}, ${e.role}, ${e.where}`,
  line: e.line,
  more: e.bullets.join(' '),
  to: e.org.startsWith('DEIA') ? '/research/billion-vector-retrieval' : undefined,
}))
const beriRole: Role = {
  org: 'Beri',
  role: 'Co-founder',
  when: '2025 –',
  where: 'getberi.com',
  line: 'Native iOS food and recipe social app. iOS, backend, design system.',
  more: 'SwiftUI app, Kotlin Android twin, Supabase backend. Ran the redesign as nine directions inside a hidden in-app design lab.',
  to: '/beri',
}

function Experience({ base }: { base: string }) {
  const [open, setOpen] = useState<number | null>(0)
  const m = useMotionPrefs()
  const { beri } = useFlags()
  const roles = beri ? [resumeRoles[0], beriRole, ...resumeRoles.slice(1)] : resumeRoles
  return (
    <ol className="v0-rows">
      {roles.map((r, i) => (
        <li key={r.org} className="v0-row" data-open={open === i || undefined}>
          <button className="v0-row__head" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span className="v0-row__org">{r.org}</span>
            <span className="v0-row__role">{r.role}</span>
            <span className="v0-row__when">{r.when}</span>
            <span className="v0-row__line">{r.line}</span>
            <span className="v0-row__chev" aria-hidden="true" />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                className="v0-row__more"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={m.reduced ? { duration: 0.18 } : { height: m.spring(300), opacity: { duration: m.dur(0.2) } }}
              >
                <p>
                  {r.more} <span className="v0-dim">{r.where}.</span>
                  {r.to && (
                    <>
                      {' '}
                      <Link to={`${base}${r.to}`} className="v0-inline">
                        Read more →
                      </Link>
                    </>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </li>
      ))}
    </ol>
  )
}

function Home({ base }: { base: string }) {
  const proof = useProof()
  const community = useCommunity()
  return (
    <>
      <section className="v0-hero" aria-labelledby="v0-name">
        <p className="v0-kicker v0-in" style={{ ['--i' as string]: 0 }}>
          CS at UVic<span className="v0-long">, accelerated three-year track</span> · class of {person.grad}
        </p>
        <h1 id="v0-name" className="v0-name v0-in" style={{ ['--i' as string]: 1 }}>
          {person.name}
        </h1>
        <p className="v0-claim v0-in" style={{ ['--i' as string]: 2 }}>
          I build ML systems and study what happens <em>inside</em> models.
        </p>
        <ul className="v0-proof">
          {proof.map((p, i) => (
            <li key={p.key} className="v0-in" style={{ ['--i' as string]: 3 + i }}>
              <span className="v0-proof__label">{p.label}</span>
              <span className="v0-proof__detail">{p.detail}</span>
            </li>
          ))}
        </ul>
        <Links className="v0-links v0-in" mode="both" size={15} />
      </section>

      <section id="about" className="v0-sec">
        <h2 className="v0-h2">About</h2>
        <div className="v0-prose">
          <p>
            I'm finishing a CS degree at the University of Victoria in three years instead of four. This summer I was an SDE intern at Amazon Robotics, where I
            shipped an LLM planning assistant to production across 180+ fulfillment sites, and I'm going back.
            <Show when="beri">
              {' '}
              I also co-founded <Link to={`${base}/beri`}>Beri</Link>, a native iOS app for cooking and sharing food.
            </Show>
          </p>
          <p>
            My research is about finding concepts as directions inside a model, then checking whether pushing along them does what the label says. Before that I
            worked on billion-vector search on GPUs and on ocean-sensing models. I also led onboard-computer firmware for MarmotSat, which is now in orbit.
          </p>
        </div>
      </section>

      <section id="experience" className="v0-sec">
        <h2 className="v0-h2">Experience</h2>
        <Experience base={base} />
      </section>

      <section id="research" className="v0-sec">
        <h2 className="v0-h2">Research</h2>
        <p className="v0-sub">Each one has a write-up: the question, the method, the result, and what I'd do next.</p>
        <div className="v0-feature">
          <Demo kind="steering" />
        </div>
        <ol className="v0-list">
          {research.map((r, i) => (
            <li key={r.slug}>
              <Link to={`${base}/research/${r.slug}`} className="v0-list__a">
                <span className="v0-list__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="v0-list__t">
                  {r.title}
                  {r.unverified && <Flag note={r.unverified.join(' ')} />}
                </span>
                <span className="v0-list__m">{r.where}</span>
                <span className="v0-list__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="v0-sec">
        <h2 className="v0-h2">Also</h2>
        <div className="v0-cols">
          <div>
            <h3 className="v0-h3">Engineering</h3>
            <ul className="v0-mini">
              {engineering.map((e) => (
                <li key={e.title}>
                  <b>{e.title}</b> {e.role}.
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="v0-h3">Community</h3>
            <ul className="v0-mini">
              {community.map((c) => (
                <li key={c.title}>
                  <b>{c.title}</b> {c.role}. {c.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <h3 className="v0-h3" style={{ marginTop: 40 }}>
          Earlier
        </h3>
        <ul className="v0-earlier">
          {earlier.map((e) => (
            <li key={e.title}>
              {e.href ? (
                <a href={e.href} target="_blank" rel="noopener">
                  {e.title} ↗
                </a>
              ) : (
                <span>{e.title}</span>
              )}
              <span className="v0-dim">
                {e.role}. {e.detail}
                {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in local repo; confirm it's okay to list." />}
              </span>
              <span className="v0-list__m">{e.when}</span>
            </li>
          ))}
        </ul>
        <p className="v0-tools">
          <span className="v0-h3">Tools</span> Python, PyTorch, Hugging Face, CUDA/cuVS, vLLM, LangGraph · <Show when="beri">Swift/SwiftUI, </Show>
          TypeScript/React · C firmware · Nix, Proxmox, Kubernetes, GCP/AWS.
        </p>
      </section>

      <section id="contact" className="v0-sec v0-contact">
        <h2 className="v0-h2">Contact</h2>
        <p className="v0-contact__line">
          Research programs, labs and founders: <em>email is fastest.</em>
        </p>
        <CopyEmail />
        <Links className="v0-links" mode="both" size={15} />
      </section>
    </>
  )
}

export default function V0({ page, base }: VariantProps) {
  const { path } = useRouter()
  return (
    <div className="v0">
      <a href="#main" className="v0-skip">
        Skip to content
      </a>
      <Nav base={base} home={page.kind === 'home'} />
      <main id="main" key={path}>
        {page.kind === 'home' && <Home base={base} />}
        {page.kind === 'research' && <ResearchArticle slug={page.slug} base={base} />}
        {page.kind === 'beri' && <BeriCaseStudy base={base} />}
        {page.kind === 'notfound' && (
          <section className="v0-hero">
            <h1 className="v0-name">Not here.</h1>
            <p className="v0-claim">
              <Link to={`${base}/`}>Back to the start →</Link>
            </p>
          </section>
        )}
      </main>
      <footer className="v0-foot">
        <span>© 2026 {person.name}</span>
        <span className="v0-dim">Built with Vite, React and Framer Motion. Demos run in your browser.</span>
      </footer>
    </div>
  )
}
