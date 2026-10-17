/*
 * W3 "Descent". igloo.inc's scroll-linked cinematic 3D, in the dark: one camera journey from beside MarmotSat in orbit,
 * down through the cloud deck into an activation cloud, along a token stream, over a fulfillment-centre floor, under the
 * sea to an ocean probe, and up through the surface to a calm end card.
 *
 * Everything readable is DOM. Native scroll speed (no Lenis, no hijack): the camera follows scroll with a damped spring.
 * The SSR page is complete on its own (a rendered still behind the hero); three.js streams in after first interaction or
 * an idle timeout, from scene.lazy.ts. Reduced motion and no-WebGL get the same chapters over rendered stills.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { person, links, research } from '../../content/site'
import { thesis, context, proofs, selected, amazonMetrics, roles, more, education, type Item } from '../../content/curated'
import { Logo } from '../../shared/Mark'
import { LinkIcon } from '../../shared/Links'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import steering from '../../data/steering.json'
import lossmask from '../../data/lossmask.json'
import { store, poke, onFrame, CHAPTERS, REGIMES, type Regime, type ChapterId } from './store'
import './w3.css'

type DemoKind = 'steering' | 'lossmask' | 'orbit' | 'ocean' | 'es' | 'retrieval'
const item = (id: string) => selected.find((s) => s.id === id) as Item
const RESUME = links.resume.href

/* =============================== shell =============================== */

export default function W3({ page, base }: VariantProps) {
  return (
    <div className="w3" data-page={page.kind}>
      <a className="w3-skip" href="#w3-main">
        Skip to content
      </a>
      <Header base={base} home={page.kind === 'home'} />
      {page.kind === 'home' && <Home base={base} />}
      {page.kind === 'research' && <Research slug={page.slug} base={base} />}
      {page.kind === 'beri' && (
        <main id="w3-main" className="w3-doc w3-beri">
          <BeriCaseStudy base={base} />
          <DocFoot base={base} />
        </main>
      )}
      {page.kind === 'notfound' && <NotFound base={base} />}
    </div>
  )
}

function Header({ base, home }: { base: string; home: boolean }) {
  return (
    <header className="w3-top">
      <Link to={`${base}/`} className="w3-word" aria-label={`${person.name}, home`}>
        <span className="w3-word__name">Tanuj Dargan</span>
        <span className="w3-word__sub" aria-hidden="true">
          // ML systems · interpretability
        </span>
      </Link>
      <nav className="w3-contact" aria-label="Contact">
        <a className="w3-btn w3-btn--solid" href={RESUME} target="_blank" rel="noopener">
          <LinkIcon k="resume" size={15} />
          <span>
            Resume<span className="w3-hide-s"> (PDF)</span>
          </span>
        </a>
        <a className="w3-btn" href={links.email.href}>
          <LinkIcon k="email" size={15} />
          <span>Email</span>
        </a>
        <a className="w3-btn" href={links.linkedin.href} target="_blank" rel="noopener">
          <LinkIcon k="linkedin" size={15} />
          <span>LinkedIn</span>
        </a>
        <a className="w3-btn w3-hide-m" href={links.github.href} target="_blank" rel="noopener">
          <LinkIcon k="github" size={15} />
          <span>GitHub</span>
        </a>
      </nav>
      {home && <span className="w3-top__veil" aria-hidden="true" />}
    </header>
  )
}

/* =============================== home =============================== */

const LEN: Record<ChapterId, string> = {
  orbit: '170svh',
  firmware: '210svh',
  steering: '320svh',
  lossmask: '240svh',
  amazon: '240svh',
  ocean: '230svh',
  contact: 'auto',
}

function Home({ base }: { base: string }) {
  const { reduced } = useMotionPrefs()
  const [demo, setDemo] = useState<{ kind: DemoKind; title: string } | null>(null)
  const [active, setActive] = useState<ChapterId>('orbit')
  const [alphaIdx, setAlphaIdx] = useState(4)
  const [regime, setRegime] = useState<Regime>('standard')
  const [mode, setMode] = useState<'poster' | 'live' | 'still'>('poster')
  const lastOpener = useRef<HTMLElement | null>(null)

  useScrollDriver(setActive, setAlphaIdx)

  const open = useCallback((kind: DemoKind, title: string) => (e: React.MouseEvent<HTMLElement>) => {
    lastOpener.current = e.currentTarget
    setDemo({ kind, title })
  }, [])
  const chooseRegime = (r: Regime) => {
    setRegime(r)
    store.regime = r
    poke()
  }
  const jumpAlpha = (i: number) => {
    const sec = document.getElementById('steering')
    if (!sec) return
    const top = sec.getBoundingClientRect().top + scrollY
    const span = sec.offsetHeight - innerHeight
    scrollTo({ top: top + span * (ALPHA_FROM + (i / 8) * (ALPHA_TO - ALPHA_FROM)), behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <>
      <Stage reduced={reduced} active={active} mode={mode} setMode={setMode} />
      <Rail active={active} />
      <main id="w3-main" className="w3-main" data-mode={mode}>
        {/* 00 orbit: hero */}
        <section id="orbit" className="w3-ch w3-ch--hero" style={{ '--len': LEN.orbit } as CSSProperties} aria-labelledby="w3-h1">
          <div className="w3-pin">
            <div className="w3-hero w3-panel">
              <p className="w3-kick w3-rise" style={{ '--i': 0 } as CSSProperties}>
                <span>////// 00</span> Orbit · MarmotSat · NORAD 69912
              </p>
              <h1 id="w3-h1" className="w3-h1 w3-rise" style={{ '--i': 1 } as CSSProperties}>
                {thesis}
              </h1>
              <p className="w3-ctx w3-rise" style={{ '--i': 2 } as CSSProperties}>
                {person.name}. {context}
              </p>
              <div className="w3-cta w3-rise" style={{ '--i': 3 } as CSSProperties}>
                <a className="w3-btn w3-btn--solid w3-btn--lg" href={RESUME} target="_blank" rel="noopener">
                  <LinkIcon k="resume" size={16} />
                  <span>Resume (PDF)</span>
                </a>
                <a className="w3-btn w3-btn--lg" href={links.email.href}>
                  <LinkIcon k="email" size={16} />
                  <span>{person.email}</span>
                </a>
                <a className="w3-btn w3-btn--lg" href={links.linkedin.href} target="_blank" rel="noopener">
                  <LinkIcon k="linkedin" size={16} />
                  <span>LinkedIn</span>
                </a>
              </div>
            </div>
            <ol className="w3-proofs" aria-label="Three proofs">
              {proofs.map((p, i) => (
                <li key={p.mark} className="w3-rise" style={{ '--i': 3 + i } as CSSProperties}>
                  <a href={`#${['amazon', 'firmware', 'lossmask'][i]}`} className="w3-proof">
                    <span className="w3-proof__n">PROOF_0{i + 1}</span>
                    <span className="w3-proof__org">
                      <Logo m={p.mark} w={22} h={16} />
                      {p.org}
                    </span>
                    <span className="w3-proof__line">{p.line}</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="w3-scrollhint" aria-hidden="true">
              Scroll down
              <br />
              to descend.
            </p>
            <LiveCaption />
            <HudMark k="orbit" lines={['VICTORIA, BC', '48.43° N 123.37° W']} />
          </div>
        </section>

        {/* 01 firmware */}
        <Chapter id="firmware" n="01" it={item('orbit')} side="left" kick="UVic CfAR · 2025–26 · Flight firmware" hud={['WORK_01', 'MARMOTSAT · 3U']}>
          <p className="w3-note">
            The CubeSat here is an illustrative 3U model (340 × 100 × 100 mm), not the flight hardware layout. Its position in the caption is real: SGP4 on
            the latest public TLE.
          </p>
          <Actions>
            <button className="w3-btn w3-btn--solid" onClick={open('orbit', 'MarmotSat, live')}>
              Open the live tracker
            </button>
          </Actions>
        </Chapter>

        {/* 02 steering */}
        <Chapter id="steering" n="02" it={item('steering')} side="right" kick="Interpretability · replication" hud={['WORK_02', 'JOY DIRECTION · LAYER 17']}>
          <AlphaScrub idx={alphaIdx} onPick={jumpAlpha} />
          <Actions>
            <button className="w3-btn w3-btn--solid" onClick={open('steering', 'Steering, live')}>
              Open the live demo
            </button>
            <Link className="w3-btn" to={`${base}/research/activation-steering`}>
              Read the write-up
            </Link>
          </Actions>
        </Chapter>

        {/* 03 loss masking */}
        <Chapter id="lossmask" n="03" it={item('lossmask')} side="left" kick="Model welfare · Apart Research" hud={['WORK_03', 'WHERE THE LOSS LANDS']} wide>
          <Tokens regime={regime} onRegime={chooseRegime} />
          <Actions>
            <button className="w3-btn w3-btn--solid" onClick={open('lossmask', 'Where the loss lands')}>
              Open the demo
            </button>
            <Link className="w3-btn" to={`${base}/research/loss-masking-distress`}>
              Read the write-up
            </Link>
          </Actions>
        </Chapter>

        {/* 04 amazon */}
        <Chapter id="amazon" n="04" it={item('amazon')} side="right" kick="Amazon Robotics · SDE intern" hud={['WORK_04', 'FULFILLMENT FLOOR · ILLUSTRATIVE']}>
          <dl className="w3-metrics">
            {amazonMetrics.map((m) => (
              <div key={m.n}>
                <dt>{m.l}</dt>
                <dd>{m.n}</dd>
              </div>
            ))}
          </dl>
          <p className="w3-note">Illustrative scene, no Amazon imagery. The three numbers are from the resume.</p>
        </Chapter>

        {/* 05 ocean */}
        <Chapter id="ocean" n="05" it={item('ocean')} side="left" kick="Remote sensing · NRC Canada" hud={['WORK_05', 'SENSOR · ILLUSTRATIVE']}>
          <p className="w3-big">
            R² <b>0.936</b>
            <span>satellite-to-deep-water temperature, against real sensors</span>
          </p>
          <p className="w3-note">The probe and the water are illustrative. Only R² 0.936 is a measured result.</p>
          <Actions>
            <button className="w3-btn w3-btn--solid" onClick={open('ocean', 'Ocean sensing (illustrative)')}>
              Open the demo
            </button>
            <Link className="w3-btn" to={`${base}/research/ocean-sensing`}>
              Read the write-up
            </Link>
          </Actions>
        </Chapter>

        {/* 06 surface: contact + index */}
        <section id="contact" className="w3-ch w3-ch--end" aria-labelledby="w3-end">
          <div className="w3-end">
            <p className="w3-kick">
              <span>////// 06</span> Surface
            </p>
            <h2 id="w3-end" className="w3-end__h">Let’s talk.</h2>
            <p className="w3-end__lede">Open to research and engineering roles from 2027, and to conversations before then.</p>
            <a className="w3-end__mail" href={links.email.href}>
              {person.email}
            </a>
            <ul className="w3-end__links">
              {(['resume', 'linkedin', 'github', 'x'] as const).map((k) => (
                <li key={k}>
                  <a className="w3-btn w3-btn--lg" href={links[k].href} target="_blank" rel="noopener">
                    <LinkIcon k={k} size={16} />
                    <span>{k === 'resume' ? 'Resume (PDF)' : links[k].label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <Index base={base} />
        </section>
      </main>
      <Sheet demo={demo} onClose={() => setDemo(null)} returnTo={lastOpener} />
    </>
  )
}

function Chapter({
  id, n, it, side, kick, hud, wide, children,
}: { id: ChapterId; n: string; it: Item; side: 'left' | 'right'; kick: string; hud: [string, string]; wide?: boolean; children?: ReactNode }) {
  return (
    <section id={id} className="w3-ch" style={{ '--len': LEN[id] } as CSSProperties} aria-labelledby={`w3-${id}-h`}>
      <div className="w3-pin">
        <div className="w3-panel w3-card" data-side={side} data-wide={wide || undefined}>
          <p className="w3-kick">
            <span>////// {n}</span> {kick}
          </p>
          <h2 id={`w3-${id}-h`} className="w3-h2">
            {it.title}
          </h2>
          <p className="w3-find">{it.finding}</p>
          <dl className="w3-meta">
            <div>
              <dt>Result</dt>
              <dd>{it.result}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{it.where}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{it.when}</dd>
            </div>
          </dl>
          {children}
        </div>
        <HudMark k={id} lines={hud} away={side === 'right'} />
      </div>
    </section>
  )
}

const Actions = ({ children }: { children: ReactNode }) => <div className="w3-actions">{children}</div>

/** igloo-style annotation pinned to the 3D object: a cross at the projected point, a leader, two mono lines. Decorative. */
function HudMark({ k, lines, away }: { k: string; lines: [string, string]; away?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const txt = useRef<HTMLSpanElement>(null)
  const full = lines.join('\n')
  useEffect(() => {
    let was = false
    let raf = 0
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    // igloo-style decode: each glyph resolves out of noise, left to right with jitter
    const decode = () => {
      const el = txt.current
      if (!el || reduced) return
      const at = [...full].map((_, i) => (i / full.length) * 380 + Math.random() * 260)
      const t0 = performance.now()
      const G = '01<>/\\{}[]#%&*+=~^?!;:'
      const step = (now: number) => {
        const e = now - t0
        let out = ''
        for (let i = 0; i < full.length; i++) out += full[i] === '\n' || full[i] === ' ' || e >= at[i] ? full[i] : G[(Math.random() * G.length) | 0]
        el.textContent = out
        if (e < 680) raf = requestAnimationFrame(step)
        else el.textContent = full
      }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(step)
    }
    const off = onFrame(() => {
      const m = store.marks[k]
      const el = ref.current
      if (!el) return
      if (!m || !m.on) {
        delete el.dataset.on
        was = false
        return
      }
      el.dataset.on = '1'
      if (!was) decode()
      was = true
      if (away || m.x > store.w - 230) el.dataset.flip = ''
      else delete el.dataset.flip
      el.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0)`
    })
    return () => {
      off()
      cancelAnimationFrame(raf)
    }
  }, [k, away, full])
  return (
    <div ref={ref} className="w3-mark" aria-hidden="true">
      <i className="w3-mark__x" />
      <i className="w3-mark__lead" />
      <span ref={txt} className="w3-mark__t">
        {full}
      </span>
    </div>
  )
}

/* ---------- steering: α scrub, real cached outputs ---------- */

export const ALPHA_FROM = 0.28
export const ALPHA_TO = 0.86
const joy = steering.concepts.joy
const alphas = steering.alphas

function AlphaScrub({ idx, onPick }: { idx: number; onPick: (i: number) => void }) {
  const o = joy.outputs[0][idx]
  const a = alphas[idx]
  return (
    <div className="w3-alpha">
      <p className="w3-prov">
        <b>Replay</b> of real cached outputs · Qwen2.5-1.5B-Instruct · prompt “{steering.test_questions[0]}”
      </p>
      <div className="w3-alpha__steps" role="group" aria-label="Steering strength α (scrolls the page)">
        {alphas.map((x, i) => (
          <button key={x} aria-pressed={i === idx} onClick={() => onPick(i)} aria-label={`α ${x > 0 ? '+' : ''}${x.toFixed(1)}`}>
            {x > 0 ? '+' : ''}
            {x.toFixed(1)}
          </button>
        ))}
      </div>
      <div className="w3-alpha__read" aria-live="polite">
        <span>
          α <b>{(a > 0 ? '+' : '') + a.toFixed(1)}</b>‖h‖
        </span>
        <span>
          read-back <b data-pos={o.expr > 0 || undefined}>{(o.expr > 0 ? '+' : '') + o.expr.toFixed(1)}</b>
        </span>
      </div>
      <blockquote className="w3-alpha__out" data-pos={o.expr > 0 || undefined}>
        {clip(o.text, 190)}
      </blockquote>
    </div>
  )
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, s.lastIndexOf(' ', n)) + '…' : s)

/* ---------- loss masking: Giga-style token chips ---------- */

function Tokens({ regime, onRegime }: { regime: Regime; onRegime: (r: Regime) => void }) {
  const p = REGIMES.find((r) => r.value === regime)!
  const finding =
    p.lr === 0
      ? 'No loss on the assistant’s own words: outside the regimes the sprint reported.'
      : p.lp === 0
        ? 'Sprint result: this standard recipe gave the most expressed shutdown distress.'
        : 'Sprint result: any loss on user turns restored a neutral register, with no capability loss.'
  return (
    <div className="w3-tok">
      <div className="w3-seg" role="group" aria-label="Loss regime">
        {REGIMES.map((r) => (
          <button key={r.value} aria-pressed={r.value === regime} onClick={() => onRegime(r.value)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="w3-tok__seq">
        {lossmask.segments.map((s) => {
          const w = s.role === 'assistant' ? p.lr : p.lp
          return (
            <p key={s.role} className="w3-tok__row" style={{ '--w': w } as CSSProperties} data-zero={w === 0 || undefined}>
              <span className="w3-tok__chip">
                {s.role} · weight {w.toFixed(1)}
              </span>
              {s.tokens.map((t, i) => (
                <span key={i} className="w3-tok__t">
                  {t}
                </span>
              ))}
            </p>
          )
        })}
      </div>
      <p className="w3-tok__find" aria-live="polite">
        {finding}
      </p>
      <p className="w3-prov">
        <b>Exact:</b> the λp / λr loss weights (Jindal et al. 2025) on real Qwen2.5 tokens. <b>Illustrative:</b> the conversation.
      </p>
    </div>
  )
}

/* ---------- live caption: real SGP4 position ---------- */

function LiveCaption() {
  const [s, setS] = useState<{ lat: string; lon: string; alt: number; lit: boolean; src: string } | null>(null)
  useEffect(() => {
    let dead = false
    let id = 0
    const go = () =>
      import('../../demos/orbit/model').then(async (M) => {
        const r = await M.loadTle()
        if (dead) return
        const sat = new M.Sat(r.tle)
        const tick = () => {
          const st = sat.state(Date.now())
          if (st) setS({ lat: M.fmtLat(st.lat), lon: M.fmtLon(st.lon), alt: Math.round(st.alt), lit: st.sunlit, src: r.source === 'build' ? 'build-time TLE' : 'CelesTrak TLE' })
        }
        tick()
        id = window.setInterval(tick, 2000)
      })
    const t = window.setTimeout(go, 1800)
    return () => {
      dead = true
      clearTimeout(t)
      clearInterval(id)
    }
  }, [])
  return (
    <p className="w3-live" aria-live="off">
      <span className="w3-live__dot" data-on={s ? '1' : undefined} />
      {s ? (
        <>
          MarmotSat now · {s.lat} {s.lon} · {s.alt} km · {s.lit ? 'sunlit' : 'eclipse'}
          <small>SGP4 on {s.src}. The view of Victoria is illustrative.</small>
        </>
      ) : (
        <>
          MarmotSat · live position loading
          <small>SGP4 on the public TLE. The view of Victoria is illustrative.</small>
        </>
      )}
    </p>
  )
}

/* ---------- chapter rail ---------- */

function Rail({ active }: { active: ChapterId }) {
  return (
    <nav className="w3-rail" aria-label="Chapters" data-hero={active === 'orbit' || active === 'contact' || undefined}>
      <ol>
        {CHAPTERS.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`} aria-current={c.id === active ? 'step' : undefined}>
              <span className="w3-rail__n">{c.n}</span>
              <span className="w3-rail__l">{c.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/* ---------- end index: experience, more, education, write-ups ---------- */

function Index({ base }: { base: string }) {
  return (
    <div className="w3-index">
      <section aria-labelledby="w3-exp">
        <h2 id="w3-exp" className="w3-kick">
          <span>//</span> Experience
        </h2>
        <ul className="w3-roles">
          {roles.map((r) => (
            <li key={r.org}>
              <Logo m={r.mark} w={28} h={20} />
              <div>
                <p className="w3-roles__h">
                  <b>{r.org}</b> {r.role}
                </p>
                <p className="w3-roles__l">{r.line}</p>
              </div>
              <span className="w3-roles__w">{r.when}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="w3-more">
        <h2 id="w3-more" className="w3-kick">
          <span>//</span> More work
        </h2>
        <ul className="w3-more">
          {more.map((m) => (
            <li key={m.title}>
              {m.href ? (
                m.ext ? (
                  <a href={m.href} target="_blank" rel="noopener">
                    <b>{m.title} ↗</b>
                    <span>{m.line}</span>
                  </a>
                ) : (
                  <Link to={`${base}${m.href}`}>
                    <b>{m.title}</b>
                    <span>{m.line}</span>
                  </Link>
                )
              ) : (
                <div>
                  <b>{m.title}</b>
                  <span>{m.line}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <h2 className="w3-kick w3-index__sub">
          <span>//</span> Education
        </h2>
        <p className="w3-edu">
          <Logo m="uvic" w={22} h={22} />
          <span>
            <b>{education.school}</b> · {education.degree} · {education.when} · {education.note}
          </span>
        </p>
        <h2 className="w3-kick w3-index__sub">
          <span>//</span> Write-ups
        </h2>
        <ul className="w3-writeups">
          {research.map((r) => (
            <li key={r.slug}>
              <Link to={`${base}/research/${r.slug}`}>{r.title}</Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="w3-colophon">
        © 2026 {person.name}. 3D modelled and light-baked in Blender; Earth imagery NASA Blue Marble and Black Marble (public domain).
      </p>
    </div>
  )
}

/* =============================== scroll → t =============================== */

function useScrollDriver(setActive: (c: ChapterId) => void, setAlpha: (i: number) => void) {
  useEffect(() => {
    const secs = CHAPTERS.map((c) => document.getElementById(c.id)!).filter(Boolean)
    let raf = 0
    let lastActive = ''
    let lastAlpha = -1
    const measure = () => {
      raf = 0
      const vh = innerHeight
      store.w = innerWidth
      store.h = vh
      store.mobile = innerWidth < 760
      let t = 0
      secs.forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const span = i === secs.length - 1 ? vh : Math.max(1, r.height - vh)
        const local = Math.min(1, Math.max(0, -r.top / span))
        if (r.top <= vh * 0.001 || i === 0) t = i + local
        // panel visibility: fade in over the first 9 %, out over the last 12 % (hero never fades in, the end never fades out)
        const vis = Math.min(i === 0 ? 1 : smooth(local / 0.09), i === secs.length - 1 ? 1 : smooth((1 - local) / 0.12))
        el.style.setProperty('--vis', vis.toFixed(3))
        el.style.setProperty('--p', local.toFixed(4))
      })
      store.t = t
      const act = CHAPTERS[Math.min(CHAPTERS.length - 1, Math.floor(t))].id
      if (act !== lastActive) {
        lastActive = act
        setActive(act)
      }
      // steering α follows scroll through its chapter
      const st = t - 2
      const a = st >= 0 && st <= 1 ? Math.min(1, Math.max(0, (st - ALPHA_FROM) / (ALPHA_TO - ALPHA_FROM))) * 8 : st < 0 ? 4 : 8
      store.alpha = a
      const ai = Math.round(a)
      if (ai !== lastAlpha) {
        lastAlpha = ai
        setAlpha(ai)
      }
      poke()
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    addEventListener('scroll', on, { passive: true })
    addEventListener('resize', on)
    return () => {
      removeEventListener('scroll', on)
      removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [setActive, setAlpha])
}
const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/* =============================== stage: still → live world =============================== */

const STILLS: ChapterId[] = ['orbit', 'firmware', 'steering', 'lossmask', 'amazon', 'ocean', 'contact']

function Stage({ reduced, active, mode, setMode }: { reduced: boolean; active: ChapterId; mode: 'poster' | 'live' | 'still'; setMode: (m: 'poster' | 'live' | 'still') => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [stillsOn, setStillsOn] = useState(false)

  useEffect(() => {
    if (reduced || !hasWebGL2()) {
      setMode('still')
      setStillsOn(true)
      return
    }
    let dead = false
    let api: { dispose: () => void } | null = null
    let started = false
    const boot = () => {
      if (started || dead) return
      started = true
      cleanup()
      import('./scene.lazy').then(async (m) => {
        if (dead) return
        try {
          api = await m.createWorld(canvas.current!, () => !dead && setMode('live'))
          if (dead) api.dispose()
        } catch (e) {
          console.warn('w3: world failed, showing stills', e)
          if (!dead) {
            setMode('still')
            setStillsOn(true)
          }
        }
      })
    }
    const evs = ['scroll', 'pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'] as const
    const cleanup = () => evs.forEach((e) => removeEventListener(e, boot))
    evs.forEach((e) => addEventListener(e, boot, { passive: true, once: true }))
    // desktop: also boot after a short idle; phones wait for the first touch or scroll (the poster is the same frame)
    const idle = matchMedia('(pointer: fine) and (min-width: 761px)').matches ? window.setTimeout(boot, 2600) : 0
    return () => {
      dead = true
      cleanup()
      clearTimeout(idle)
      api?.dispose()
    }
  }, [reduced, setMode])

  return (
    <div className="w3-stage" data-mode={mode} aria-hidden="true">
      <picture className="w3-still" data-on={!stillsOn || active === 'orbit' ? '1' : undefined}>
        <source media="(max-width: 700px)" srcSet="/w3/stills/orbit-m.webp" />
        <img src="/w3/stills/orbit-d.webp" alt="" decoding="async" {...{ fetchpriority: 'high' }} />
      </picture>
      {stillsOn &&
        STILLS.slice(1).map((c) => (
          <picture key={c} className="w3-still" data-on={active === c ? '1' : undefined}>
            <source media="(max-width: 700px)" srcSet={`/w3/stills/${c}-m.webp`} />
            <img src={`/w3/stills/${c}-d.webp`} alt="" loading="lazy" decoding="async" />
          </picture>
        ))}
      <canvas ref={canvas} className="w3-canvas" />
      <div className="w3-grain" />
    </div>
  )
}

function hasWebGL2() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

/* =============================== sheet =============================== */

function Sheet({ demo, onClose, returnTo }: { demo: { kind: DemoKind; title: string } | null; onClose: () => void; returnTo: React.MutableRefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState(demo)
  useEffect(() => {
    const d = ref.current!
    if (demo) {
      setShown(demo)
      if (!d.open) d.showModal()
      document.documentElement.dataset.w3sheet = '1'
    } else if (d.open) {
      d.close()
    }
  }, [demo])
  useEffect(() => {
    const d = ref.current!
    const closed = () => {
      delete document.documentElement.dataset.w3sheet
      onClose()
      returnTo.current?.focus()
    }
    d.addEventListener('close', closed)
    return () => d.removeEventListener('close', closed)
  }, [onClose, returnTo])
  return (
    <dialog ref={ref} className="w3-sheet" aria-labelledby="w3-sheet-h" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="w3-sheet__in">
        <header className="w3-sheet__head">
          <p className="w3-kick">
            <span>//////</span> Live demo
          </p>
          <h2 id="w3-sheet-h">{shown?.title}</h2>
          <button className="w3-btn w3-sheet__x" onClick={() => ref.current?.close()} aria-label="Close demo">
            Close <kbd>Esc</kbd>
          </button>
        </header>
        <div className="w3-sheet__body">{shown && demo && <Demo kind={shown.kind} rest={0.6} finding />}</div>
      </div>
    </dialog>
  )
}

/* =============================== research write-up =============================== */

const STILL_FOR: Record<string, ChapterId> = {
  'activation-steering': 'steering',
  'loss-masking-distress': 'lossmask',
  'ocean-sensing': 'ocean',
  'es-lora': 'steering',
  'billion-vector-retrieval': 'amazon',
}

function Research({ slug, base }: { slug: string; base: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const next = research[(i + 1) % research.length]
  // The activation-steering method's line 3 describes an assumed pipeline; it's dropped here.
  const method = useMemo(() => (slug === 'activation-steering' ? r.method.filter((_, j) => j !== 3) : r.method), [r, slug])
  const still = STILL_FOR[slug] ?? 'orbit'
  const note =
    slug === 'activation-steering'
      ? 'Results come from a replication run on Qwen2.5-1.5B-Instruct generated for this page.'
      : slug === 'ocean-sensing'
        ? 'The demo below is illustrative; R² 0.936 is the measured result.'
        : slug === 'loss-masking-distress'
          ? 'The demo conversation is illustrative; its tokens and the loss weights are exact.'
          : null
  return (
    <main id="w3-main" className="w3-doc">
      <div className="w3-doc__hero" aria-hidden="true">
        <picture>
          <source media="(max-width: 700px)" srcSet={`/w3/stills/${still}-m.webp`} />
          <img src={`/w3/stills/${still}-d.webp`} alt="" decoding="async" />
        </picture>
      </div>
      <article className="w3-art">
        <header className="w3-art__head">
          <p className="w3-kick">
            <Link to={`${base}/`}>
              <span>//////</span> Descent
            </Link>{' '}
            · Write-up · {r.where} · {r.when}
          </p>
          <h1 className="w3-art__title">{r.title}</h1>
          <ul className="w3-tags">
            {r.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </header>
        <section className="w3-art__sec">
          <h2 className="w3-art__h">
            <span>01</span> Question
          </h2>
          <p className="w3-art__lede">{r.question}</p>
        </section>
        {r.demo && (
          <section className="w3-art__sec w3-art__demo" aria-label="Demo">
            {note && <p className="w3-prov">{note}</p>}
            <Demo kind={r.demo} rest={0.6} finding />
          </section>
        )}
        <section className="w3-art__sec">
          <h2 className="w3-art__h">
            <span>02</span> Method
          </h2>
          <ol className="w3-art__list">
            {method.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        </section>
        <section className="w3-art__sec">
          <h2 className="w3-art__h">
            <span>03</span> Result
          </h2>
          <ol className="w3-art__list w3-art__list--result">
            {r.result.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        </section>
        <section className="w3-art__sec">
          <h2 className="w3-art__h">
            <span>04</span> Next
          </h2>
          <ol className="w3-art__list">
            {r.next.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
          {r.links && (
            <p className="w3-art__links">
              {r.links.map((l) => (
                <a key={l.href} className="w3-btn" href={l.href} target="_blank" rel="noopener">
                  {l.label} ↗
                </a>
              ))}
            </p>
          )}
        </section>
        <nav className="w3-art__next" aria-label="Next write-up">
          <Link to={`${base}/research/${next.slug}`}>
            <span className="w3-kick">Next write-up</span>
            <b>{next.title}</b>
          </Link>
        </nav>
      </article>
      <DocFoot base={base} />
    </main>
  )
}

function DocFoot({ base }: { base: string }) {
  return (
    <footer className="w3-foot">
      <Link to={`${base}/`} className="w3-btn">
        ← Back to the descent
      </Link>
      <a className="w3-btn" href={links.email.href}>
        {person.email}
      </a>
    </footer>
  )
}

function NotFound({ base }: { base: string }) {
  return (
    <main id="w3-main" className="w3-doc w3-404">
      <div className="w3-doc__hero" aria-hidden="true">
        <picture>
          <source media="(max-width: 700px)" srcSet="/w3/stills/contact-m.webp" />
          <img src="/w3/stills/contact-d.webp" alt="" decoding="async" />
        </picture>
      </div>
      <div className="w3-404__in">
        <p className="w3-kick">
          <span>//////</span> 404 · Signal lost
        </p>
        <h1 className="w3-art__title">Nothing at this depth.</h1>
        <p className="w3-art__lede">The page you asked for doesn’t exist. The descent starts from the top.</p>
        <p className="w3-actions">
          <Link to={`${base}/`} className="w3-btn w3-btn--solid w3-btn--lg">
            Back to orbit
          </Link>
          <a className="w3-btn w3-btn--lg" href={RESUME} target="_blank" rel="noopener">
            Resume (PDF)
          </a>
        </p>
      </div>
    </main>
  )
}
