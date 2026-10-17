import { useEffect, useRef, useState, type ReactNode } from 'react'
import { thesis, context, proofs, selected, roles, more, type Item } from '../../content/curated'
import { links, research } from '../../content/site'
import type { WorkKey } from '../../content/work'
import { Logo } from '../../shared/Mark'
import { Poster } from '../../shared/Poster'
import { LinkIcon } from '../../shared/Links'
import { Demo } from '../../demos/Demo'
import { useMotionPrefs } from '../../lib/motion'
import { CLink, MagA, MagButton, TwoTone, ArrowR, ArrowUR, Corners, useReveals } from './bits'
import { LossPlayback, SteerSpec, SteerCloud, AmazonFlow, SatStack, useSteer } from './modules'
import { SatGlyph } from './chrome'

/* ---------------- shared bits ---------------- */
const SHORT: Record<string, { name: string; org: string; to: string; media: WorkKey | 'amazon'; tint: string }> = {
  lossmask: { name: 'Loss masking', org: 'Apart Research', to: '/research/loss-masking-distress', media: 'lossmask', tint: '#1f2233' },
  steering: { name: 'Activation steering', org: 'Replication, Qwen2.5-1.5B', to: '/research/activation-steering', media: 'steering', tint: '#22213a' },
  amazon: { name: 'Amazon Optimus', org: 'Amazon Robotics', to: '#amazon', media: 'amazon', tint: '#2a2418' },
  orbit: { name: 'MarmotSat', org: 'UVic CfAR', to: '#marmotsat', media: 'orbit', tint: '#172629' },
  ocean: { name: 'Ocean sensing', org: 'SOLIDS Lab, UVic', to: '/research/ocean-sensing', media: 'ocean', tint: '#16232c' },
}
const proofTo: Record<string, string> = { amazon: '#amazon', cfar: '#marmotsat', apart: '#lossmask' }

/** A schematic of the Amazon pipeline for the hover follower (no screenshots exist; nothing here is data). */
function AmazonMini() {
  return (
    <svg viewBox="0 0 360 140" className="k1-amini" aria-hidden="true">
      {[40, 130, 220, 310].map((x) => (
        <g key={x}>
          <rect x={x - 34} y="14" width="68" height="26" rx="5" />
          <path d={`M${x} 40v18H180v22`} />
        </g>
      ))}
      <rect x="168" y="80" width="24" height="24" rx="4" className="k1-amini__core" />
      <path d="M180 104v12" />
      <rect x="110" y="116" width="140" height="22" rx="5" />
    </svg>
  )
}
const Media = ({ k }: { k: WorkKey | 'amazon' }) => (k === 'amazon' ? <AmazonMini /> : <Poster k={k} />)

/* ---------------- hero ---------------- */
function Hero() {
  const [lit, ...rest] = thesis.split(' and ')
  return (
    <section className="k1-hero" id="top" aria-labelledby="k1-h1">
      <div className="k1-hero__top">
        <p className="k1-hero__who">
          <span className="k1-label">Tanuj Dargan</span>
          <span>{context}</span>
        </p>
        <a href="#marmotsat" className="k1-orbitpill">
          <span className="k1-orbitpill__t">
            MarmotSat
            <br />
            in orbit since July 2026
          </span>
          <span className="k1-orbitpill__globe" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="11" />
              <ellipse cx="24" cy="24" rx="5" ry="11" />
              <path d="M13 24h22M15 18h18M15 30h18" />
              <g className="k1-orbitpill__orbit">
                <ellipse cx="24" cy="24" rx="20" ry="7" transform="rotate(-24 24 24)" />
                <circle cx="44" cy="24" r="2.6" transform="rotate(-24 24 24)" className="k1-orbitpill__sat" />
              </g>
            </svg>
          </span>
        </a>
      </div>
      <TwoTone as="h1" id="k1-h1" className="k1-hero__h" lit={lit} rest={`and ${rest.join(' and ')}`} page />
      <svg className="k1-hero__scribble" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
        <path d="M3 15C60 8 120 6 180 9c40 2 80 5 114 2" pathLength={1} />
      </svg>
      <div className="k1-hero__grid">
        <ul className="k1-proofs" aria-label="Three things I have shipped">
          {proofs.map((p, i) => (
            <li key={p.org} className="k1-proof" style={{ ['--i' as string]: i }}>
              <Corners />
              <a href={proofTo[p.mark]} className="k1-proof__a">
                <span className="k1-proof__top">
                  <Logo m={p.mark} w={30} h={24} />
                  <span className="k1-proof__org">{p.org}</span>
                </span>
                <span className="k1-proof__line">{p.line}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="k1-hero__links">
          <MagA href={links.resume.href} variant="solid" strength={0.3}>
            <LinkIcon k="resume" size={16} /> Resume (PDF)
          </MagA>
          <MagA href={links.email.href} variant="line" strength={0.3}>
            <LinkIcon k="email" size={16} /> Email
          </MagA>
          <MagA href={links.linkedin.href} target="_blank" rel="noopener" variant="line" strength={0.3}>
            <LinkIcon k="linkedin" size={16} /> LinkedIn
          </MagA>
          <MagA href={links.github.href} target="_blank" rel="noopener" variant="line" strength={0.3} className="k1-hide-s">
            <LinkIcon k="github" size={16} /> GitHub
          </MagA>
        </div>
      </div>
    </section>
  )
}

/* ---------------- work list + hover follower (Dennis) ---------------- */
function WorkList({ base }: { base: string }) {
  const list = useRef<HTMLUListElement>(null)
  const fol = useRef<HTMLDivElement>(null)
  const view = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(-1)
  const [fine, setFine] = useState(false)
  const { reduced } = useMotionPrefs()
  useEffect(() => setFine(matchMedia('(hover: hover) and (pointer: fine)').matches), [])
  // lerped follower; the loop sleeps once it has caught up
  useEffect(() => {
    if (!fine) return
    const el = list.current!
    let tx = 0,
      ty = 0,
      x = 0,
      y = 0,
      vx = 0,
      vy = 0,
      raf = 0,
      primed = false
    const tick = () => {
      const k = reduced ? 1 : 0.14
      const k2 = reduced ? 1 : 0.24
      x += (tx - x) * k
      y += (ty - y) * k
      vx += (tx - vx) * k2
      vy += (ty - vy) * k2
      if (fol.current) fol.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      if (view.current) view.current.style.transform = `translate3d(${vx}px, ${vy}px, 0) translate(-50%, -50%)`
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tx - vx) > 0.3 ? requestAnimationFrame(tick) : 0
    }
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (!primed) {
        x = vx = tx
        y = vy = ty
        primed = true
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    el.addEventListener('pointermove', move)
    return () => {
      el.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [fine, reduced])
  const items = selected
  return (
    <section className="k1-work" id="work" aria-labelledby="k1-work-h">
      <div className="k1-sechead">
        <h2 id="k1-work-h" className="k1-label">
          Selected work
        </h2>
        <span className="k1-label">( {String(items.length).padStart(2, '0')} )</span>
      </div>
      <ul className="k1-work__list" ref={list} onPointerLeave={() => setHover(-1)} data-hover={hover >= 0 ? '1' : '0'}>
        {items.map((it, i) => (
          <WorkRow key={it.id} it={it} i={i} on={hover === i} setHover={setHover} base={base} />
        ))}
      </ul>
      {fine && (
        <>
          <div className="k1-fol" ref={fol} data-on={hover >= 0 ? '1' : '0'} aria-hidden="true">
            <div className="k1-fol__strip" style={{ transform: `translateY(${-Math.max(0, hover) * 100}%)` }}>
              {items.map((it) => (
                <div key={it.id} className="k1-fol__card" style={{ background: SHORT[it.id].tint }}>
                  <Media k={SHORT[it.id].media} />
                </div>
              ))}
            </div>
          </div>
          <div className="k1-fol__view" ref={view} data-on={hover >= 0 ? '1' : '0'} aria-hidden="true">
            {hover >= 0 && SHORT[items[hover].id].to.startsWith('#') ? 'Explore' : 'Read'}
          </div>
        </>
      )}
    </section>
  )
}

function WorkRow({ it, i, on, setHover, base }: { it: Item; i: number; on: boolean; setHover: (i: number) => void; base: string }) {
  const s = SHORT[it.id]
  const body = (
    <>
      <span className="k1-row__n">{String(i + 1).padStart(2, '0')}</span>
      <span className="k1-row__name">{s.name}</span>
      <span className="k1-row__meta">
        <span>{s.org}</span>
        <span className="k1-row__res">{it.result}</span>
      </span>
      <span className="k1-row__media" aria-hidden="true" style={{ background: s.tint }}>
        <Media k={s.media} />
      </span>
    </>
  )
  return (
    <li className="k1-row" data-on={on ? '1' : '0'} onPointerEnter={() => setHover(i)}>
      {s.to.startsWith('#') ? (
        <a href={s.to} className="k1-row__a" aria-label={`${s.name}: ${it.title}`}>
          {body}
        </a>
      ) : (
        <CLink to={`${base}${s.to}`} label={s.name} className="k1-row__a" aria-label={`${s.name}: ${it.title}. Read the write-up`}>
          {body}
        </CLink>
      )}
    </li>
  )
}

/* ---------------- module frame ---------------- */
function Module({ id, n, item, children, demo, demoLabel, write, kicker }: { id: string; n: number; item: Item; children: ReactNode; demo?: 'lossmask' | 'steering' | 'orbit' | 'ocean'; demoLabel?: string; write?: { to: string; label: string }; kicker: string }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="k1-mod" id={id} aria-labelledby={`${id}-h`}>
      <header className="k1-mod__head" data-k1-reveal>
        <p className="k1-mod__n">
          <span>{String(n).padStart(2, '0')}</span> / 05
        </p>
        <p className="k1-label k1-mod__k">{kicker}</p>
        <h3 id={`${id}-h`} className="k1-mod__h">
          {item.title}
        </h3>
        <p className="k1-mod__f">{item.finding}</p>
        <p className="k1-mod__meta">
          <span>{item.where}</span>
          <span>{item.when}</span>
          <span className="k1-mod__res">{item.result}</span>
        </p>
      </header>
      <div className="k1-mod__vis" data-k1-reveal>
        {children}
      </div>
      {(demo || write) && (
        <div className="k1-mod__acts">
          {demo && (
            <MagButton variant={open ? 'line' : 'solid'} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`${id}-demo`} strength={0.25}>
              {open ? 'Close the live demo' : (demoLabel ?? 'Open the live demo')}
            </MagButton>
          )}
          {write && (
            <CLink to={write.to} label={write.label} className="k1-textlink">
              Read the write-up <ArrowR />
            </CLink>
          )}
        </div>
      )}
      {demo && (
        <div className="k1-mod__demo" id={`${id}-demo`} data-open={open ? '1' : '0'}>
          <div>{open && <Demo kind={demo} finding rest={0.6} />}</div>
        </div>
      )}
    </article>
  )
}

function How({ base }: { base: string }) {
  const steer = useSteer()
  const it = (id: string) => selected.find((s) => s.id === id)!
  return (
    <section className="k1-how" id="how" aria-labelledby="k1-how-h">
      <div className="k1-sechead">
        <h2 id="k1-how-h" className="k1-label">
          How the work works
        </h2>
        <span className="k1-label">Real data where it exists; labelled where it doesn’t</span>
      </div>

      <Module id="lossmask" n={1} item={it('lossmask')} kicker="Annotated playback" demo="lossmask" write={{ to: `${base}/research/loss-masking-distress`, label: 'Loss masking' }}>
        <LossPlayback />
      </Module>

      <Module id="steering" n={2} item={it('steering')} kicker="Spec card over the real output" demo="steering" write={{ to: `${base}/research/activation-steering`, label: 'Activation steering' }}>
        <SteerSpec s={steer} />
        <div className="k1-wild">
          <SteerCloud c={steer.c} />
          <ol className="k1-wild__steps">
            {research[0].method.slice(0, 3).map((m, i) => (
              <li key={i}>
                <span className="k1-wild__n">{String(i + 1).padStart(2, '0')}</span>
                <b>{['Extract', 'Difference of means', 'Steer and read back'][i]}</b>
                <p>{m}</p>
              </li>
            ))}
          </ol>
          <p className="k1-prov">
            <b>Real:</b> a method replicated on Qwen2.5-1.5B-Instruct for this page. 20 answers under each system prompt, read back without it, shown in 2-D. Squares start
            scattered and settle into their measured positions as you scroll.
          </p>
        </div>
      </Module>

      <Module id="amazon" n={3} item={it('amazon')} kicker="One lit step, one pipeline">
        <AmazonFlow />
        <p className="k1-prov">
          <b>Illustrative diagram.</b> An internal tool, so there are no screenshots. The steps paraphrase the resume; the three numbers are the resume’s.
        </p>
      </Module>

      <Module id="marmotsat" n={4} item={it('orbit')} kicker="Exploded layers" demo="orbit" demoLabel="Track MarmotSat live">
        <SatStack />
        <p className="k1-prov">
          <b>Diagram, not a CAD model.</b> Layers from the resume. The live tracker propagates MarmotSat’s real published orbit (TLE).
        </p>
      </Module>

      <Module id="ocean" n={5} item={it('ocean')} kicker="One number" demo="ocean" demoLabel="Open the illustrative demo" write={{ to: `${base}/research/ocean-sensing`, label: 'Ocean sensing' }}>
        <div className="k1-r2">
          <p className="k1-r2__n">
            R² <b>0.936</b>
          </p>
          <p className="k1-r2__l">Satellite-to-deep-water temperature, validated against Ocean Networks Canada sensors with the National Research Council Canada.</p>
          <p className="k1-prov">
            <b>Real:</b> only the R². The demo behind the button is an illustrative simulation.
          </p>
        </div>
      </Module>
    </section>
  )
}

/* ---------------- experience: Chronicle sentence + card rail ---------------- */
function Experience() {
  const rail = useRef<HTMLUListElement>(null)
  const { reduced } = useMotionPrefs()
  const step = (d: number) => {
    const r = rail.current
    if (!r) return
    const card = r.querySelector('li') as HTMLElement | null
    r.scrollBy({ left: d * ((card?.offsetWidth ?? 360) + 16), behavior: reduced ? 'auto' : 'smooth' })
  }
  return (
    <section className="k1-exp" id="experience" aria-labelledby="k1-exp-h">
      <div className="k1-sechead">
        <h2 id="k1-exp-h" className="k1-label">
          Experience
        </h2>
        <span className="k1-label">( {String(roles.length).padStart(2, '0')} )</span>
      </div>
      <TwoTone
        className="k1-exp__s"
        lit="Production ML, research and flight software."
        rest="An LLM assistant at Amazon Robotics, models at RBC Borealis, medical agents at Pear Care, GPU retrieval at DEIA Lab, Airflow tooling with MLH, and satellite firmware at UVic CfAR."
      />
      <ul className="k1-rail" ref={rail} aria-label="Roles, newest first">
        {roles.map((r) => (
          <li key={r.org} className="k1-card">
            <div className="k1-card__top">
              <Logo m={r.mark} w={40} h={30} />
              <span className="k1-label">{r.when}</span>
            </div>
            <p className="k1-card__role">{r.role}</p>
            <p className="k1-card__org">{r.org}</p>
            <p className="k1-card__line">{r.line}</p>
            <details className="k1-card__more">
              <summary>From the resume</summary>
              <ul>
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
      <div className="k1-rail__nav">
        <button type="button" onClick={() => step(-1)} aria-label="Previous roles">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Next roles">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>
      </div>
    </section>
  )
}

/* ---------------- more (Ravi's ruled list) ---------------- */
function More({ base }: { base: string }) {
  return (
    <section className="k1-more" aria-labelledby="k1-more-h">
      <div className="k1-sechead">
        <h2 id="k1-more-h" className="k1-label">
          Also
        </h2>
        <span className="k1-label">( {String(more.length).padStart(2, '0')} )</span>
      </div>
      <ul className="k1-more__list">
        {more.map((m) => {
          const inner = (
            <>
              <span className="k1-more__t">+ {m.title}</span>
              <span className="k1-more__l">{m.line}</span>
              <span className="k1-more__go" aria-hidden="true">
                {m.href ? m.ext ? <ArrowUR /> : <ArrowR /> : null}
              </span>
            </>
          )
          return (
            <li key={m.title}>
              {!m.href ? (
                <div className="k1-more__a">{inner}</div>
              ) : m.ext ? (
                <a className="k1-more__a" href={m.href} target="_blank" rel="noopener">
                  {inner}
                </a>
              ) : (
                <CLink className="k1-more__a" to={`${base}${m.href}`} label={m.title}>
                  {inner}
                </CLink>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Home({ base }: { base: string }) {
  const root = useRef<HTMLDivElement>(null)
  useReveals(root)
  return (
    <div ref={root}>
      <Hero />
      <WorkList base={base} />
      <How base={base} />
      <Experience />
      <More base={base} />
    </div>
  )
}

export { SatGlyph }
