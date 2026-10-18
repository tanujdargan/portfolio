/*
 * N2 "Lift". Round 8. A short opening: the name rises letter by letter at full width, an accent line draws under it,
 * then the name lifts into its place in the hero while the page fades up. After that it's a calm, well-spaced site.
 * Projects are a list on the left; hovering or focusing one shows its live demo in a sticky panel on the right
 * (the first project is shown by default, so a demo is visible without doing anything).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, stagger } from 'framer-motion'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education } from '../../content/curated'
import { links, type LinkKey } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Logo } from '../../shared/Mark'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import './n2.css'

const NAME = 'Tanuj Dargan'
const KEY = 'n2-intro-seen'

const sections = [
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

const short: Record<string, { org: string; title: string; result: string }> = {
  amazon: { org: 'Amazon Robotics', title: 'LLM planning assistant, in production', result: '180+ sites' },
  lossmask: { org: 'Apart Research', title: 'Loss masking and shutdown distress', result: 'Calm output, negative inside' },
  orbit: { org: 'UVic CfAR', title: 'MarmotSat flight firmware', result: 'In orbit' },
  steering: { org: 'Independent', title: 'Steering a model along emotion directions', result: 'A switch, not a dial' },
  ocean: { org: 'SOLIDS Lab, UVic', title: 'Deep-water temperature from satellites', result: 'R² 0.936' },
}
const order = ['amazon', 'lossmask', 'orbit', 'steering', 'ocean']
const projects = order.map((id) => ({ ...selected.find((s) => s.id === id)!, ...short[id] }))
type P = (typeof projects)[number]

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']

// Runs before hydration in the prerendered HTML: decides whether the intro plays, so there's no flash either way.
// ponytail: inline script instead of a cookie/SSR flag; the lab is static HTML
const decide = `try{var d=document.documentElement;if(sessionStorage.getItem('${KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('n2-nointro');else d.classList.add('n2-playing')}catch(e){}`

function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current!
    const big = el.querySelector<HTMLElement>('.n2-intro__name')!
    const target = document.querySelector<HTMLElement>('.n2-name')!
    const site = document.querySelector<HTMLElement>('.n2-site')!
    sessionStorage.setItem(KEY, '1')
    let stopped = false
    const controls: { stop: () => void }[] = []
    const run = (...a: Parameters<typeof animate>) => {
      const c = animate(...a)
      controls.push(c)
      return c
    }
    const finish = () => {
      if (stopped) return
      stopped = true
      controls.forEach((c) => c.stop())
      site.style.opacity = ''
      site.style.transform = ''
      document.documentElement.classList.remove('n2-playing')
      onDone()
    }
    ;(async () => {
      await run(el.querySelectorAll('.n2-intro__ch'), { y: ['105%', '0%'] }, { duration: 0.65, delay: stagger(0.03, { startDelay: 0.12 }), ease: [0.2, 0.75, 0.15, 1] })
      if (stopped) return
      await run(el.querySelector('.n2-intro__line')!, { scaleX: [0, 1] }, { duration: 0.4, ease: [0.6, 0, 0.2, 1] })
      if (stopped) return
      // FLIP: move the big name onto the hero name's box
      const a = big.getBoundingClientRect()
      const b = target.getBoundingClientRect()
      const s = b.width / a.width
      run(el.querySelector('.n2-intro__line')!, { opacity: 0 }, { duration: 0.25 })
      run(el, { backgroundColor: ['rgba(9,10,12,1)', 'rgba(9,10,12,0)'] }, { duration: 0.6, delay: 0.2, ease: 'easeOut' })
      // the page rises only as the name is landing, so the two never overlap
      run(site, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, delay: 0.45, ease: [0.2, 0.7, 0.2, 1] })
      await run(big, { x: b.left - a.left, y: b.top - a.top, scale: s }, { duration: 0.8, ease: [0.7, 0, 0.2, 1] })
      finish()
    })()
    const skip = () => finish()
    const opts = { once: true, passive: true } as const
    window.addEventListener('pointerdown', skip, opts)
    window.addEventListener('keydown', skip, opts)
    window.addEventListener('wheel', skip, opts)
    window.addEventListener('touchmove', skip, opts)
    return () => {
      stopped = true
      controls.forEach((c) => c.stop())
      ;['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach((t) => window.removeEventListener(t, skip))
    }
  }, [onDone])
  return (
    <div className="n2-intro" ref={root} aria-hidden="true">
      <div className="n2-intro__name">
        {NAME.split('').map((c, i) => (
          <span key={i} className="n2-intro__mask">
            <span className="n2-intro__ch">{c === ' ' ? ' ' : c}</span>
          </span>
        ))}
        <span className="n2-intro__line" />
      </div>
    </div>
  )
}

function useWide() {
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const m = matchMedia('(min-width: 960px)')
    const on = () => setWide(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

function Preview({ p, base }: { p: P; base: string }) {
  return (
    <div className="n2-preview__body">
      <p className="n2-kicker">
        {p.where} · {p.when}
      </p>
      <div className="n2-preview__demo">
        {p.demo ? (
          <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
        ) : (
          <dl className="n2-metrics">
            {amazonMetrics.map((m) => (
              <div key={m.l}>
                <dt>{m.n}</dt>
                <dd>{m.l}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <p className="n2-finding">{p.finding}</p>
      {p.slug && (
        <Link className="n2-arrow" to={`${base}/research/${p.slug}`}>
          Read the write-up <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  )
}

function Projects({ base }: { base: string }) {
  const wide = useWide()
  const [active, setActive] = useState(projects[0].id)
  // ponytail: demos stay mounted once visited so hovering back is instant; at most 5, each lazy
  const [seen, setSeen] = useState<string[]>([projects[0].id])
  const t = useRef<number>()
  const tap = (id: string, el: HTMLElement) => {
    if (wide) return pick(id, true)
    setActive(active === id ? '' : id)
    requestAnimationFrame(() => el.closest('li')!.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const pick = (id: string, now = false) => {
    window.clearTimeout(t.current)
    const go = () => {
      setActive(id)
      setSeen((s) => (s.includes(id) ? s : [...s, id]))
    }
    if (now) go()
    else t.current = window.setTimeout(go, 90) // small delay so sweeping across rows doesn't flash every demo
  }
  return (
    <div className="n2-work">
      <ol className="n2-rows">
        {projects.map((p, i) => {
          const on = active === p.id
          return (
            <li key={p.id} className="n2-row" data-on={on || undefined}>
              <button
                aria-expanded={wide ? undefined : on}
                aria-current={wide && on ? 'true' : undefined}
                onMouseEnter={() => wide && pick(p.id)}
                onFocus={() => wide && pick(p.id, true)}
                onClick={(e) => tap(p.id, e.currentTarget)}
              >
                <span className="n2-row__n">0{i + 1}</span>
                <span className="n2-row__main">
                  <span className="n2-row__org">
                    {p.mark && <Logo m={p.mark} w={p.mark === 'pearcare' ? 54 : 16} h={16} />}
                    {p.org}
                  </span>
                  <span className="n2-row__title">{p.title}</span>
                </span>
                <span className="n2-row__result">{p.result}</span>
              </button>
              {!wide && on && (
                <div className="n2-inline">
                  <Preview p={p} base={base} />
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {wide && (
        <aside className="n2-preview" aria-live="polite">
          {projects
            .filter((p) => seen.includes(p.id))
            .map((p) => (
              <div key={p.id} className="n2-preview__pane" data-on={active === p.id || undefined} aria-hidden={active !== p.id}>
                <Preview p={p} base={base} />
              </div>
            ))}
        </aside>
      )}
    </div>
  )
}

function Home({ base }: { base: string }) {
  const [intro, setIntro] = useState(true)
  useLayoutEffect(() => {
    // Client-side navigation into the lab doesn't run the inline script, so decide again here.
    let play = false
    try {
      play = !sessionStorage.getItem(KEY) && !matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {}
    if (play) document.documentElement.classList.add('n2-playing')
    else setIntro(false)
    return () => document.documentElement.classList.remove('n2-playing', 'n2-nointro')
  }, [])
  const done = useRef(() => setIntro(false)).current
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: decide }} />
      {intro && <Intro onDone={done} />}
      <div className="n2-site">
        <header className="n2-head">
          <a className="n2-mark" href="#top">
            Tanuj Dargan
          </a>
          <nav aria-label="Sections">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.label}
              </a>
            ))}
            <a className="n2-resume" href={links.resume.href} target="_blank" rel="noopener">
              Resume <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </header>

        <main id="n2-main">
          <section className="n2-hero" id="top" aria-label="Intro">
            <h1 className="n2-name">{NAME}</h1>
            <p className="n2-lede">
              ML engineer &amp; researcher. I ship production ML and study what language models represent inside.
            </p>
          </section>

          <section id="projects" className="n2-sec" aria-label="Projects">
            <h2 className="n2-h">Selected work</h2>
            <Projects base={base} />
          </section>

          <section id="about" className="n2-sec n2-about" aria-label="About">
            <h2 className="n2-h">About</h2>
            <p>
              CS at the <b>University of Victoria</b>, graduating April 2027. This summer I built an LLM planning assistant at{' '}
              <b>Amazon Robotics</b>, now in production; I’m going back with a return offer.
            </p>
            <p>
              Before that I led flight firmware for <b>MarmotSat</b>, in orbit since July 2026. I also study what models represent
              inside, most recently at <b>Apart Research</b>.
            </p>
          </section>

          <section id="experience" className="n2-sec" aria-label="Experience">
            <h2 className="n2-h">Experience</h2>
            <ol className="n2-roles">
              {roles.map((r) => (
                <li key={r.org}>
                  <span className="n2-when">{r.when}</span>
                  <span className="n2-role">
                    <Logo m={r.mark} w={r.mark === 'pearcare' ? 60 : 18} h={18} />
                    <b>{r.org}</b>
                    <span>{r.role}</span>
                  </span>
                </li>
              ))}
              <li>
                <span className="n2-when">Until {education.when}</span>
                <span className="n2-role">
                  <Logo m="uvic" w={18} h={18} />
                  <b>{education.school}</b>
                  <span>{education.degree}</span>
                </span>
              </li>
            </ol>
            <a className="n2-arrow" href={links.resume.href} target="_blank" rel="noopener">
              Full resume <span aria-hidden="true">↗</span>
            </a>
          </section>

          <section id="more" className="n2-sec" aria-label="Also">
            <h2 className="n2-h">Also</h2>
            <ul className="n2-more">
              {more.map((m) => {
                const inner = (
                  <>
                    <b>{m.title}</b>
                    <span>{m.line}</span>
                  </>
                )
                return (
                  <li key={m.title}>
                    {m.href ? (
                      m.ext ? (
                        <a href={m.href} target="_blank" rel="noopener">
                          {inner}
                        </a>
                      ) : (
                        <Link to={`${base}${m.href}`}>{inner}</Link>
                      )
                    ) : (
                      <div>{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <section id="contact" className="n2-sec n2-contact" aria-label="Contact">
            <h2 className="n2-h">Contact</h2>
            <a className="n2-email" href={links.email.href}>
              tanujd@uvic.ca
            </a>
            <ul className="n2-socials">
              {socials.map((k) => {
                const l = links[k]
                const ext = !l.href.startsWith('mailto:')
                return (
                  <li key={k}>
                    <a href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={l.label} title={l.label}>
                      <LinkIcon k={k} size={20} />
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
          <footer className="n2-foot">Victoria, BC · {new Date().getFullYear()}</footer>
        </main>
      </div>
    </>
  )
}

export default function N2({ page, base }: VariantProps) {
  return (
    <div className="n2" data-page={page.kind}>
      <a className="n2-skip" href="#n2-main">
        Skip to content
      </a>
      {page.kind === 'home' && <Home base={base} />}
      {page.kind !== 'home' && (
        <div className="n2-page">
          <Link to={`${base}/`} className="n2-arrow">
            <span aria-hidden="true">←</span> Tanuj Dargan
          </Link>
          <main id="n2-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="n2-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
