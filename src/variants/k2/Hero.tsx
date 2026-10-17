import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronRight, FileText, Linkedin, Mail, RotateCcw, Search } from 'lucide-react'
import data from '../../data/steering.json'
import { proofs, context, thesis, type Mark } from '../../content/curated'
import { links } from '../../content/site'
import { Logo } from '../../shared/Mark'
import { useMotionPrefs } from '../../lib/motion'
import { BrandMark, Key, Prov, useVisible } from './bits'

type Concept = keyof typeof data.concepts
const A = data.alphas
const fmtA = (a: number) => `${a > 0 ? '+' : a < 0 ? '−' : ''}${Math.abs(a).toFixed(1)}`
const fmtE = (e: number) => `${e > 0 ? '+' : e < 0 ? '−' : ''}${Math.abs(e).toFixed(1)}`
const concepts: { k: Concept; label: string }[] = [
  { k: 'joy', label: 'Joy' },
  { k: 'distress', label: 'Distress' },
  { k: 'certainty', label: 'Certainty' },
]
// The thesis, split for the two-tone headline (Chronicle): the claim in white, the second half in grey.
const [h1a, h1b] = (() => {
  const i = thesis.indexOf(' and ')
  return [thesis.slice(0, i), thesis.slice(i + 1)]
})()

/** ElevenLabs-style live widget: real cached outputs of Qwen2.5-1.5B-Instruct, steered along a concept direction. */
function SteerWidget() {
  const m = useMotionPrefs()
  const [concept, setConcept] = useState<Concept>('joy')
  const [qi, setQi] = useState(0)
  const [ai, setAi] = useState(4)
  const [press, setPress] = useState<'l' | 'r' | null>(null)
  const [replay, setReplay] = useState(false)
  const touched = useRef(false)
  const played = useRef(false)
  const [ref, vis] = useVisible<HTMLDivElement>()
  const c = data.concepts[concept]
  const outs = c.outputs[qi]
  const out = outs[ai]
  const t = Math.max(0, Math.min(1, (out.expr + 14) / 26))
  const maxE = Math.max(...outs.map((o) => Math.abs(o.expr)))

  const flash = (d: 'l' | 'r') => {
    setPress(d)
    setTimeout(() => setPress(null), 170)
  }
  const step = (d: -1 | 1, auto = false) => {
    if (!auto) {
      touched.current = true
      setReplay(false)
    }
    flash(d < 0 ? 'l' : 'r')
    setAi((a) => Math.max(0, Math.min(A.length - 1, a + d)))
  }

  // Once, the first time it's on screen: the → key presses itself twice, α 0 → +0.3 → +0.6, which is where joy flips.
  useEffect(() => {
    if (!vis || m.reduced || played.current || touched.current) return
    played.current = true
    setReplay(true)
    const ts = [
      setTimeout(() => !touched.current && step(1, true), 1100),
      setTimeout(() => !touched.current && step(1, true), 2300),
      setTimeout(() => setReplay(false), 4200),
    ]
    return () => ts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vis, m.reduced])

  const text = out.text.length > 190 ? out.text.slice(0, 187).replace(/\s+\S*$/, '') + '…' : out.text
  return (
    <div className="k2-steer" ref={ref} style={{ ['--t' as string]: t }} data-on={vis || undefined}>
      <div className="k2-steer__head">
        <span className="k2-live">
          <i aria-hidden="true" /> Live widget
        </span>
        <div className="k2-seg" role="group" aria-label="Concept direction">
          {concepts.map((x) => (
            <button
              key={x.k}
              aria-pressed={x.k === concept}
              onClick={() => {
                touched.current = true
                setReplay(false)
                setConcept(x.k)
              }}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="k2-steer__stage">
        <div className="k2-orb" aria-hidden="true">
          <i />
        </div>
        <div className="k2-steer__read">
          <span className="k2-mono k2-dim3">Read-back on v̂</span>
          <b className="k2-steer__expr">{fmtE(out.expr)}</b>
          <span className="k2-mono k2-dim3">
            α {fmtA(A[ai])}·‖h‖ · layer {c.layer}
          </span>
        </div>
      </div>
      <div className="k2-steer__bars" aria-hidden="true">
        {outs.map((o, i) => (
          <span
            key={i}
            data-on={i === ai || undefined}
            data-neg={o.expr < 0 || undefined}
            style={{ ['--h' as string]: Math.abs(o.expr) / maxE }}
            onClick={() => {
              touched.current = true
              setReplay(false)
              setAi(i)
            }}
          />
        ))}
      </div>
      <div className="k2-steer__out">
        <p className="k2-steer__q">
          <span className="k2-mono k2-dim3">Prompt</span> {data.test_questions[qi]}
          <button
            className="k2-steer__next"
            onClick={() => {
              touched.current = true
              setReplay(false)
              setQi((q) => (q + 1) % data.test_questions.length)
            }}
            aria-label="Next prompt"
          >
            <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </p>
        <p className="k2-steer__text" aria-live="polite" key={`${concept}${qi}${ai}`}>
          {text}
        </p>
      </div>
      <div className="k2-steer__ctl">
        <button className="k2-keybtn" onClick={() => step(-1)} aria-label="Steer less (α down)" disabled={ai === 0}>
          <Key pressed={press === 'l'}>←</Key>
        </button>
        <label className="k2-range">
          <span className="k2-sr">Steering strength α</span>
          <input
            type="range"
            min={0}
            max={A.length - 1}
            step={1}
            value={ai}
            aria-valuetext={`α ${fmtA(A[ai])}, read-back ${fmtE(out.expr)}`}
            onChange={(e) => {
              touched.current = true
              setReplay(false)
              setAi(+e.target.value)
            }}
          />
        </label>
        <button className="k2-keybtn" onClick={() => step(1)} aria-label="Steer more (α up)" disabled={ai === A.length - 1}>
          <Key pressed={press === 'r'}>→</Key>
        </button>
      </div>
      <div className="k2-steer__foot">
        <Prov>{replay ? 'Replaying cached real outputs' : 'Real outputs · Qwen2.5-1.5B-Instruct'}</Prov>
        <span className="k2-mono k2-dim3">method replicated for this page</span>
      </div>
    </div>
  )
}

const rows: { id: string; m: Mark; title: string; line: string; chip: string }[] = [
  { id: 'amazon', m: 'amazon', title: 'Amazon Robotics', line: proofs[0].line, chip: 'Production' },
  { id: 'marmotsat', m: 'cfar', title: 'MarmotSat firmware', line: proofs[1].line, chip: 'In orbit' },
  { id: 'lossmask', m: 'apart', title: 'Apart Research', line: proofs[2].line, chip: 'Finding' },
]
const tilesL: { m: Mark; label: string; y: number }[] = [
  { m: 'amazon', label: 'Amazon', y: 16 },
  { m: 'cfar', label: 'UVic CfAR', y: 47 },
  { m: 'rbc', label: 'RBC Borealis', y: 78 },
]
const tilesR: { m: Mark; label: string; y: number }[] = [
  { m: 'apart', label: 'Apart', y: 12 },
  { m: 'uvic', label: 'DEIA · SOLIDS', y: 38 },
  { m: 'mlh', label: 'MLH · Airflow', y: 64 },
  { m: 'pearcare', label: 'Pear Care', y: 88 },
]

function Tiles({ side, tiles }: { side: 'l' | 'r'; tiles: typeof tilesL }) {
  return (
    <div className={`k2-src k2-src--${side}`} aria-hidden="true">
      {tiles.map((t, i) => (
        <div key={t.m} className="k2-src__t" style={{ top: `${t.y}%`, ['--d' as string]: `${i * 0.9 + (side === 'r' ? 0.45 : 0)}s` }}>
          <span className="k2-src__tile">
            <Logo m={t.m} w={28} h={28} />
          </span>
          <span className="k2-src__label">{t.label}</span>
          <span className="k2-src__wire">
            <i />
          </span>
          <span className="k2-src__port" />
        </div>
      ))}
    </div>
  )
}

export function Hero({ onPalette }: { onPalette: () => void }) {
  const [ref, vis] = useVisible<HTMLElement>()
  return (
    <section className="k2-hero" ref={ref} data-idle={!vis || undefined} aria-labelledby="k2-h1">
      <picture className="k2-hero__art" aria-hidden="true">
        <source media="(max-width: 640px)" srcSet="/k2/hero-m.webp" width={780} height={501} />
        <source media="(max-width: 1100px)" srcSet="/k2/hero-1000.webp" width={1000} height={563} />
        <img src="/k2/hero-1600.webp" width={1600} height={900} alt="" decoding="async" {...{ fetchpriority: "high" }} />
      </picture>
      <div className="k2-hero__copy">
        <a className="k2-ann" href="#marmotsat">
          <span className="k2-ann__dot" aria-hidden="true" />
          <span>MarmotSat is in orbit</span>
          <span className="k2-ann__sep" aria-hidden="true" />
          <span className="k2-mono">NORAD 69912</span>
          <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        </a>
        <h1 id="k2-h1" className="k2-h1">
          <span className="k2-h1__a">{h1a}</span> <span className="k2-h1__b">{h1b}</span>
        </h1>
        <p className="k2-hero__sub">
          <strong>Tanuj Dargan.</strong> {context}
        </p>
        <div className="k2-cta">
          <a className="k2-btn k2-btn--light" href={links.resume.href} target="_blank" rel="noopener">
            <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
            Resume (PDF)
          </a>
          <a className="k2-btn" href={links.email.href}>
            <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
            Email
          </a>
          <a className="k2-btn" href={links.linkedin.href} target="_blank" rel="noopener">
            <Linkedin size={16} strokeWidth={1.8} aria-hidden="true" />
            LinkedIn
          </a>
        </div>
        <p className="k2-hint">
          Press <Key>⌘</Key>
          <Key>K</Key> to jump to any work, the resume or contact
        </p>
      </div>

      <div className="k2-console">
        <Tiles side="l" tiles={tilesL} />
        <div className="k2-win k2-launch" role="group" aria-label="Tanuj: proof and a live widget">
          <button className="k2-launch__search" onClick={onPalette}>
            <Search size={18} strokeWidth={1.7} aria-hidden="true" />
            <span>Search work, resume, contact…</span>
            <span className="k2-launch__keys" aria-hidden="true">
              <Key>⌘</Key>
              <Key>K</Key>
            </span>
          </button>
          <div className="k2-launch__grid">
            <div className="k2-launch__list">
              <p className="k2-launch__group">Proof</p>
              <ul>
                {rows.map((r) => (
                  <li key={r.id}>
                    <a className="k2-row" href={`#${r.id}`}>
                      <span className="k2-row__logo">
                        <Logo m={r.m} w={24} h={24} />
                      </span>
                      <span className="k2-row__txt">
                        <b>{r.title}</b>
                        <span>{r.line}</span>
                      </span>
                      <span className="k2-row__chip">{r.chip}</span>
                      <ArrowRight className="k2-row__go" size={15} strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <SteerWidget />
          </div>
          <div className="k2-launch__foot">
            <span className="k2-launch__brand">
              <BrandMark size={18} /> Tanuj
            </span>
            <span className="k2-launch__acts" aria-hidden="true">
              <span>
                Open feature <Key>↵</Key>
              </span>
              <span className="k2-launch__div" />
              <span>
                Actions <Key>⌘</Key>
                <Key>K</Key>
              </span>
            </span>
          </div>
        </div>
        <Tiles side="r" tiles={tilesR} />
      </div>
    </section>
  )
}
