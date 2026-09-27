/*
 * v4 "Narrative": Dehradun to Toronto, told through the work.
 * Patterns (PORTFOLIO_TASTE.md §4): P02 masked line reveal (hero name), P03 live "now" line,
 * P05 static grain, P08 sticky figure with stepping text, P17-style swap for pinned years,
 * P19 one proof metric per step, P22 route line draw-on (scroll-scrubbed), P27 copy-email morph,
 * P28 outline wordmark footer, P30 chapter scroll with pinned place names and years.
 * Type: Fraunces Variable (light, wght axis only, per the font budget) for display at 96-160px, Onest Variable 18/29
 * at 60ch for body and labels. Mono is the system stack, used only by the shared demos and data captions.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
// Font budget (orchestrator, Lighthouse mobile): Fraunces wght latin 37 KB + Onest 34 KB. No italic, no opsz/SOFT/WONK files,
// and mono falls back to the system stack so nothing else is fetched before first paint.
import '@fontsource-variable/fraunces'
import { person, proof, research, engineering, community, earlier, links, beri } from '../../content/site'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { buildChapters, type Chapter } from './chapters'
import { Route } from './Route'
import './v4.css'

const EXPO = [0.16, 1, 0.3, 1] as const
const UNVERIFIED_EARLY = 'No verified years or details before Mumbai. Kept to one line on purpose.'

/** Scroll to an element without touching the URL (a hash change would re-route the whole app). */
function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

/* ---------------- nav ---------------- */

function Nav({ base, home }: { base: string; home: boolean }) {
  const m = useMotionPrefs()
  const item = (id: string, label: string) =>
    home ? (
      <a
        href={`#${id}`}
        onClick={(e) => {
          e.preventDefault()
          jump(id, m.reduced)
        }}
      >
        {label}
      </a>
    ) : (
      <Link to={`${base}/#${id}`}>{label}</Link>
    )
  return (
    <header className="v4-nav">
      <div className="v4-nav__in">
        <Link to={`${base}/`} className="v4-nav__name">
          Tanuj <span className="v4-soft">Dargan</span>
        </Link>
        <nav aria-label="Sections" className="v4-nav__sec">
          {item('story', 'Story')}
          {item('work', 'Work')}
          {item('contact', 'Contact')}
        </nav>
        <Links className="v4-nav__icons" mode="icon" size={18} />
      </div>
    </header>
  )
}

/* ---------------- hero (the recruiter screen, not the story) ---------------- */

function NowLine() {
  const [t, setT] = useState<string | null>(null)
  useEffect(() => {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hour12: false })
    let id: ReturnType<typeof setTimeout>
    const tick = () => {
      setT(f.format(new Date()))
      id = setTimeout(tick, 60000 - (Date.now() % 60000))
    }
    tick()
    return () => clearTimeout(id)
  }, [])
  return (
    <p className="v4-now v4-in" style={{ ['--i' as string]: 0 }}>
      <span className="v4-now__dot" aria-hidden="true" />
      <span>{t ? `${t} in Toronto` : 'Toronto'}</span>
      <span className="v4-now__sep" aria-hidden="true">
        ·
      </span>
      <span>
        CS at UVic<span className="v4-long">, accelerated track</span> · class of {person.grad}
      </span>
    </p>
  )
}

function Hero({ chapters }: { chapters: Chapter[] }) {
  const m = useMotionPrefs()
  return (
    <section className="v4-hero" aria-labelledby="v4-name">
      <NowLine />
      <h1 id="v4-name" className="v4-name">
        <span className="v4-mask">
          <span className="v4-rise" style={{ ['--i' as string]: 0 }}>
            Tanuj
          </span>
        </span>{' '}
        <span className="v4-mask">
          <span className="v4-rise" style={{ ['--i' as string]: 1 }}>
            Dargan
          </span>
        </span>
      </h1>
      <p className="v4-claim v4-in" style={{ ['--i' as string]: 2 }}>
        I build ML systems and study what language models do on the inside.
      </p>
      <ul className="v4-proof">
        {proof.map((p, i) => (
          <li key={p.key} className="v4-in" style={{ ['--i' as string]: 3 + i }}>
            <span className="v4-proof__label">{p.label}</span>
            <span className="v4-proof__detail">{p.detail}</span>
          </li>
        ))}
      </ul>
      <div className="v4-hero__foot v4-in" style={{ ['--i' as string]: 6 }}>
        <Links className="v4-pills" mode="label" />
        <div className="v4-cta">
          <button type="button" className="v4-cta__story" onClick={() => jump('story', m.reduced)}>
            Read the story <span aria-hidden="true">↓</span>
          </button>
          <a
            href="#work"
            className="v4-cta__skip"
            onClick={(e) => {
              e.preventDefault()
              jump('work', m.reduced)
            }}
          >
            Skip to the work
          </a>
        </div>
      </div>
      <nav className="v4-toc v4-in" style={{ ['--i' as string]: 7 }} aria-label="Chapters">
        <span className="v4-toc__n">(05)</span>
        <ol>
          {chapters.map((c) => (
            <li key={c.id}>
              <a
                href={`#ch-${c.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  jump(`ch-${c.id}`, m.reduced)
                }}
              >
                {c.place}
                {!c.unverified && <span> {c.when.replace(' – ', '–')}</span>}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  )
}

/* ---------------- the story ---------------- */

function useSeg(ref: RefObject<HTMLElement>) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start center'] })
  return useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
}

/** Keeps k in a motion value so scroll transforms re-scale live when the motion level changes. */
function useK() {
  const m = useMotionPrefs()
  const k = useMotionValue(m.k)
  useEffect(() => k.set(m.k), [m.k, k])
  return k
}

function Stage({
  ch,
  fig,
  figKey,
  dir,
  ghostY,
  children,
}: {
  ch: Chapter
  fig?: { v: string; cap: string }
  figKey: string
  dir: number
  ghostY: MotionValue<number>
  children: React.ReactNode
}) {
  const m = useMotionPrefs()
  const travel = `${Math.round(105 * m.k)}%`
  const neg = `${-Math.round(105 * m.k)}%`
  // Exits run at 0.7x the entrance (tokens §3), so a fast jump across chapters never stacks titles for long.
  const out = { duration: m.dur(0.49), ease: EXPO }
  const title = {
    enter: (d: number) => ({ y: d > 0 ? travel : neg, opacity: 0 }),
    center: { y: '0%', opacity: 1 },
    exit: (d: number) => ({ y: d > 0 ? neg : travel, opacity: 0, transition: out }),
  }
  const t = { duration: m.dur(0.7), ease: EXPO }
  const small = {
    enter: (d: number) => ({ y: 14 * m.k * d, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (d: number) => ({ y: -14 * m.k * d, opacity: 0, transition: out }),
  }
  return (
    <div className="v4-stage">
      <div className="v4-stage__in">
        <motion.span className="v4-stage__ghost" aria-hidden="true" style={{ y: ghostY }}>
          <AnimatePresence initial={false} custom={dir}>
            <motion.span key={ch.num} custom={dir} variants={small} initial="enter" animate="center" exit="exit" transition={{ duration: m.dur(0.5) }}>
              {ch.num}
            </motion.span>
          </AnimatePresence>
        </motion.span>
        <div className="v4-stage__top" aria-hidden="true">
          <span className="v4-swap">
            <AnimatePresence initial={false} custom={dir}>
              <motion.span key={ch.num} custom={dir} variants={small} initial="enter" animate="center" exit="exit" transition={t}>
                Chapter {ch.num} / 05
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="v4-swap v4-swap--end">
            <AnimatePresence initial={false} custom={dir}>
              <motion.span key={ch.when} custom={dir} variants={small} initial="enter" animate="center" exit="exit" transition={t}>
                {ch.when}
              </motion.span>
            </AnimatePresence>
            {ch.unverified && <Flag note={UNVERIFIED_EARLY} />}
          </span>
        </div>
        <p className="v4-stage__title" aria-hidden="true">
          <AnimatePresence initial={false} custom={dir}>
            <motion.span key={ch.id} custom={dir} variants={title} initial="enter" animate="center" exit="exit" transition={t}>
              {ch.place}
            </motion.span>
          </AnimatePresence>
        </p>
        <div className="v4-stage__fig" aria-hidden="true">
          <AnimatePresence initial={false} custom={dir}>
            {fig && (
              <motion.div
                key={figKey}
                custom={dir}
                variants={small}
                initial="enter"
                animate="center"
                exit="exit"
                transition={m.reduced ? { duration: 0.2 } : { ...m.spring(220), opacity: { duration: m.dur(0.25) } }}
              >
                <span className="v4-fig__v">{fig.v}</span>
                <span className="v4-fig__cap">{fig.cap}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {children}
      </div>
    </div>
  )
}

function More({ id, label, items }: { id: string; label: string; items: React.ReactNode[] }) {
  const [open, setOpen] = useState(false)
  const m = useMotionPrefs()
  return (
    <div className="v4-more" data-open={open || undefined}>
      <button type="button" className="v4-more__btn" aria-expanded={open} aria-controls={`more-${id}`} onClick={() => setOpen(!open)}>
        <span className="v4-more__icon" aria-hidden="true" />
        {label}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`more-${id}`}
            className="v4-more__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={m.reduced ? { duration: 0.2 } : { height: m.spring(220), opacity: { duration: m.dur(0.24) } }}
          >
            <ul>
              {items.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ChapterHead({ ch, k }: { ch: Chapter; k: MotionValue<number> }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  // Parallax for the stacked layout (phones, reduced motion reads k = 0). Desktop ignores --py in CSS.
  // Only ever lifts (never drops onto the date row below it).
  const py = useTransform([scrollYProgress, k], ([p, kk]: number[]) => -p * 64 * kk)
  return (
    <motion.h2 ref={ref} className="v4-ch__head" style={{ ['--py' as string]: py }}>
      <span className="v4-ch__num">{ch.num}</span>
      <span className="v4-ch__place">{ch.place}</span>
      <span className="v4-ch__when">
        {ch.when}
        {ch.unverified && <Flag note={UNVERIFIED_EARLY} />}
      </span>
    </motion.h2>
  )
}

function Story({ chapters }: { chapters: Chapter[] }) {
  const m = useMotionPrefs()
  const k = useK()
  const flat = useMemo(() => chapters.flatMap((c, ci) => c.steps.map((s) => ({ ...s, ci }))), [chapters])
  const [active, setActive] = useState(0)
  const prev = useRef(0)
  const dir = active >= prev.current ? 1 : -1
  useEffect(() => {
    prev.current = active
  }, [active])
  const cur = flat[active]
  const ci = cur.ci

  // One opener per chapter; segment i draws while opener i+1 rises to the centre.
  const o0 = useRef<HTMLDivElement>(null)
  const o1 = useRef<HTMLDivElement>(null)
  const o2 = useRef<HTMLDivElement>(null)
  const o3 = useRef<HTMLDivElement>(null)
  const o4 = useRef<HTMLDivElement>(null)
  const openers = [o0, o1, o2, o3, o4]
  const s0 = useSeg(o1)
  const s1 = useSeg(o2)
  const s2 = useSeg(o3)
  const s3 = useSeg(o4)
  const segs = useMemo(() => [s0, s1, s2, s3], [s0, s1, s2, s3])

  const story = useRef<HTMLElement>(null)
  const { scrollYProgress: sp } = useScroll({ target: story, offset: ['start end', 'end start'] })
  const ghostY = useTransform([sp, k], ([p, kk]: number[]) => (0.5 - p) * 360 * kk)

  // P08: the step nearest the centre band is the active one. Observer only, no scroll handler.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.v4 [data-step]'))
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step))
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    els.forEach((el) => io.observe(el))
    // Stacked layout crossfade: chapters fade in once as they arrive.
    const fade = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            ;(e.target as HTMLElement).dataset.in = ''
            fade.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -12% 0px' },
    )
    document.querySelectorAll('.v4 .v4-ch').forEach((el) => fade.observe(el))
    return () => {
      io.disconnect()
      fade.disconnect()
    }
  }, [])

  const toChapter = (i: number) => jump(`ch-${chapters[i].id}`, m.reduced)
  let n = -1

  return (
    <section id="story" className="v4-story" ref={story} tabIndex={-1} aria-label="The story, Dehradun to Toronto">
      <div className="v4-strip">
        <div className="v4-strip__label" aria-hidden="true">
          <span>
            <b>{chapters[ci].num}</b> {chapters[ci].place}
          </span>
          <span>{chapters[ci].when}</span>
        </div>
        <nav aria-label="Chapters">
          <Route geo="strip" segs={segs} full={m.reduced} active={ci} chapters={chapters} onJump={toChapter} />
        </nav>
      </div>

      <Stage ch={chapters[ci]} fig={cur.fig} figKey={cur.id} dir={dir} ghostY={ghostY}>
        <nav aria-label="Chapters" className="v4-stage__route">
          <Route geo="stage" segs={segs} full={m.reduced} active={ci} chapters={chapters} onJump={toChapter} />
        </nav>
      </Stage>

      <div className="v4-chapters">
        {chapters.map((c, i) => (
          <section key={c.id} id={`ch-${c.id}`} className="v4-ch" data-short={c.unverified || undefined} tabIndex={-1} aria-labelledby={`h-${c.id}`}>
            <div ref={openers[i]} id={`h-${c.id}`}>
              <ChapterHead ch={c} k={k} />
            </div>
            {c.steps.map((s) => {
              n++
              return (
                <div key={s.id} className="v4-step" data-step={n} data-active={n === active || undefined}>
                  {s.fig && (
                    <p className="v4-step__fig" aria-hidden="true">
                      <span className="v4-fig__v">{s.fig.v}</span>
                      <span className="v4-fig__cap">{s.fig.cap}</span>
                    </p>
                  )}
                  <div className="v4-step__text">{s.body}</div>
                </div>
              )
            })}
            {c.more && <More id={c.id} label={c.more.label} items={c.more.items} />}
          </section>
        ))}
        <div className="v4-coda">
          <p>
            That's the story so far. Everything is listed once more below, and email is the fastest way to reach me.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ---------------- the work, without the story ---------------- */

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  return (
    <button
      type="button"
      className="v4-copy"
      aria-label={copied ? 'Email address copied' : `Copy email address ${person.email}`}
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
          initial={{ opacity: 0, y: 10 * m.k }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 * m.k }}
          transition={{ duration: m.dur(0.18) }}
        >
          {copied ? 'Copied to clipboard' : person.email}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function Row({ title, meta, detail, to, href, flag }: { title: string; meta: string; detail?: string; to?: string; href?: string; flag?: string }) {
  const inner = (
    <>
      <span className="v4-row__t">
        {title}
        {flag && <Flag note={flag} />}
      </span>
      <span className="v4-row__m">{meta}</span>
      {detail && <span className="v4-row__d">{detail}</span>}
      {(to || href) && (
        <span className="v4-row__arrow" aria-hidden="true">
          {to ? '→' : '↗'}
        </span>
      )}
    </>
  )
  return (
    <li className="v4-row">
      {to ? (
        <Link to={to} className="v4-row__a">
          {inner}
        </Link>
      ) : href ? (
        <a href={href} target="_blank" rel="noopener" className="v4-row__a">
          {inner}
        </a>
      ) : (
        <div className="v4-row__a">{inner}</div>
      )}
    </li>
  )
}

function Work({ base }: { base: string }) {
  return (
    <section id="work" className="v4-work" tabIndex={-1} aria-labelledby="v4-work-h">
      <h2 id="v4-work-h" className="v4-work__h">
        The work, <span className="v4-soft">without the story.</span>
      </h2>

      <div className="v4-group">
        <h3 className="v4-label">Now</h3>
        <ul className="v4-rows">
          <Row title="Amazon Robotics AI" meta="Summer 2026 · Toronto" detail="SDE intern. ML tooling for planning agents. Return offer." />
          <Row title="Beri" meta="Co-founder" detail={`${beri.oneLiner.split('.')[0]}. ${beri.role.replace('Co-founder. ', '')}`} to={`${base}/beri`} />
        </ul>
      </div>

      <div className="v4-group" id="research" tabIndex={-1}>
        <h3 className="v4-label">Research</h3>
        <ul className="v4-rows">
          {research.map((r) => (
            <Row key={r.slug} title={r.title} meta={`${r.where} · ${r.when}`} to={`${base}/research/${r.slug}`} />
          ))}
        </ul>
      </div>

      <div className="v4-group">
        <h3 className="v4-label">Engineering</h3>
        <ul className="v4-rows">
          {engineering.map((e) => (
            <Row key={e.title} title={e.title} meta={e.role} detail={e.detail} href={'href' in e ? e.href : undefined} />
          ))}
        </ul>
      </div>

      <div className="v4-group">
        <h3 className="v4-label">Community</h3>
        <ul className="v4-rows">
          {community.map((c) => (
            <Row key={c.title} title={c.title} meta={`${c.role} · ${c.when}`} detail={c.detail} href={'href' in c ? c.href : undefined} />
          ))}
        </ul>
      </div>

      <div className="v4-group v4-group--earlier">
        <h3 className="v4-label">Earlier</h3>
        <ul className="v4-rows v4-rows--small">
          {earlier.map((e) => (
            <Row
              key={e.title}
              title={e.title}
              meta={`${e.role} · ${e.when}`}
              detail={e.detail}
              href={e.href}
              flag={'unverified' in e && e.unverified ? "Parameter Golf found in local repo; confirm it's okay to list." : undefined}
            />
          ))}
        </ul>
        <p className="v4-tools">
          Python, PyTorch, Hugging Face, CUDA/cuVS, vLLM · Swift/SwiftUI, TypeScript/React · C on STM32 · Nix, Proxmox, Kubernetes.
        </p>
      </div>

      <div className="v4-contact" id="contact" tabIndex={-1}>
        <h3 className="v4-label">Contact</h3>
        <p className="v4-contact__line">
          Research programs, labs and founders: <span className="v4-hot">email is fastest.</span>
        </p>
        <CopyEmail />
        <Links className="v4-pills" mode="both" size={15} />
      </div>
    </section>
  )
}

/* ---------------- chrome ---------------- */

function Footer() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current!
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (el.dataset.in = ''), { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <footer className="v4-foot">
      <div ref={ref} className="v4-mark" aria-hidden="true">
        <span className="v4-mark__o">Tanuj Dargan</span>
        <span className="v4-mark__f">Tanuj Dargan</span>
      </div>
      <div className="v4-foot__row">
        <span>© 2026 {person.name}</span>
        <span>Dehradun · Gurgaon · Mumbai · Victoria · Toronto</span>
        <span>Demos run in your browser.</span>
      </div>
    </footer>
  )
}

export default function V4({ page, base }: VariantProps) {
  const { path } = useRouter()
  const chapters = useMemo(() => buildChapters(base), [base])
  return (
    <div className="v4">
      <a href="#main" className="v4-skip">
        Skip to content
      </a>
      <Nav base={base} home={page.kind === 'home'} />
      <main id="main" key={path}>
        {page.kind === 'home' && (
          <>
            <Hero chapters={chapters} />
            <Story chapters={chapters} />
            <Work base={base} />
          </>
        )}
        {page.kind === 'research' && <ResearchArticle slug={page.slug} base={base} />}
        {page.kind === 'beri' && <BeriCaseStudy base={base} />}
        {page.kind === 'notfound' && (
          <section className="v4-hero v4-hero--nf">
            <h1 className="v4-name">
              Off the <span className="v4-soft">route.</span>
            </h1>
            <p className="v4-claim">
              <Link to={`${base}/`} className="v4-a">
                Back to the start <span aria-hidden="true">→</span>
              </Link>
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
