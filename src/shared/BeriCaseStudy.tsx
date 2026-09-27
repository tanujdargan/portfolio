import { useEffect, useRef, useState } from 'react'
import { beri } from '../content/site'
import { Link } from '../lib/router'
import { useMotionPrefs } from '../lib/motion'
import { Flag } from './Flag'
import './shared.css'

const shipped = [
  { f: 'home', t: 'Home', d: 'Stories, then rails you can reorder.' },
  { f: 'recipe', t: 'Recipe', d: 'Photo first, steps and scores below.' },
  { f: 'chat', t: 'Chat', d: 'Ask for a craving, get recipes back.' },
  { f: 'pantry', t: 'Pantry', d: 'What you have, what expires soon.' },
  { f: 'taste', t: 'Taste', d: 'A profile learned from what you cook.' },
  { f: 'library', t: 'Library', d: 'Saved recipes, in folders.' },
]
const screens = ['home', 'chat', 'pantry', 'library', 'profile', 'taste'] as const
const dirs = [
  { v: 'current', t: 'Shipped' },
  { v: 'v3', t: 'V3 Wild' },
  { v: 'v5', t: 'V5 Motion-first' },
  { v: 'v6', t: 'V6 Apple Pro' },
  { v: 'v7', t: 'V7 Waterline' },
]
const clips = [
  { f: 'home-v5', t: 'Home, V5', d: 'Tonight carousel; the card zooms into the recipe and back.' },
  { f: 'chat-v5', t: 'Chat, V5', d: 'The bubble rises out of the composer and the reply lands.' },
  { f: 'pantry-v6', t: 'Pantry, V6', d: 'A freshness chart that opens the Expiring sheet.' },
]
const principles = [
  'One idea per screen.',
  'Bottom-weighted: content sits where the thumb is.',
  'Content arrives in reading order, 0.1 s apart.',
  'The ground never cuts. Only the foreground changes.',
  'Colour is atmosphere, never UI.',
  'Haptics on commits, never on navigation.',
  'Every motion degrades to a crossfade.',
]

/** Plays only while visible; never autoplays under reduced motion. */
function Clip({ f }: { f: string }) {
  const v = useRef<HTMLVideoElement>(null)
  const m = useMotionPrefs()
  useEffect(() => {
    const el = v.current!
    if (m.reduced) return el.pause()
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? el.play().catch(() => {}) : el.pause()), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [m.reduced])
  return (
    <video
      ref={v}
      src={`/beri/redesign/${f}.mp4`}
      poster={`/beri/redesign/${f}-poster.jpg`}
      muted
      loop
      playsInline
      preload="none"
      controls={m.reduced}
      aria-label={`Screen recording: ${f}`}
    />
  )
}

export function BeriCaseStudy({ base }: { base: string }) {
  const [screen, setScreen] = useState<(typeof screens)[number]>('home')
  return (
    <article className="s-case">
      <header>
        <p className="s-kicker">
          <Link to={`${base}/`}>Work</Link> · Co-founder · 2025 –
        </p>
        <h1 className="s-case__title">Beri</h1>
        <p className="s-case__lede">{beri.oneLiner} I co-founded it and build the iOS app, the backend and the design system.</p>
        <dl className="s-case__meta">
          <div>
            <dt>Role</dt>
            <dd>{beri.role}</dd>
          </div>
          <div>
            <dt>Platform</dt>
            <dd>Native iOS in SwiftUI. Android in Kotlin.</dd>
          </div>
          <div>
            <dt>Backend</dt>
            <dd>Supabase / Postgres, one domain model across three codebases.</dd>
          </div>
          <div>
            <dt>Site</dt>
            <dd>
              <a href={beri.url} target="_blank" rel="noopener">
                getberi.com ↗
              </a>
              <Flag note="App Store status and usage numbers not verified; none claimed." />
            </dd>
          </div>
        </dl>
      </header>

      <section className="s-sec s-wide">
        <h2 className="s-h2">The shipped app</h2>
        <div className="s-phones">
          {shipped.map((s) => (
            <figure key={s.f} className="s-phone">
              <div className="s-phone__frame">
                <img src={`/beri/shipped/${s.f}.jpg`} alt={`Beri ${s.t} screen`} loading="lazy" decoding="async" width={420} height={913} />
              </div>
              <figcaption>
                <b>{s.t}</b>
                {s.d}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="s-sec">
        <h2 className="s-h2">The redesign: extract the bar, then branch</h2>
        <p className="s-p">
          The onboarding flow was the best-feeling part of the app. So before redesigning anything else, I wrote down what it actually does, with <b>file:line</b>{' '}
          citations. That gave seven principles every new screen has to pass:
        </p>
        <ol className="s-steps" style={{ marginTop: 20 }}>
          {principles.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <p className="s-p" style={{ marginTop: 24 }}>
          Then I built nine full directions across six screens inside the app, behind a hidden Design Lab. It has a variant switcher, forced loading and empty
          states, and a Subtle / Default / Expressive motion toggle. Directions get judged on a phone at 120 Hz, not in Figma. This site's lab is the same idea.
        </p>
      </section>

      <section className="s-sec s-wide">
        <h2 className="s-h2">Same screen, five directions</h2>
        <div className="s-screen-tabs" role="group" aria-label="Screen">
          {screens.map((s) => (
            <button key={s} aria-pressed={s === screen} onClick={() => setScreen(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="s-compare">
          {dirs.map((d) => (
            <figure key={d.v} className="s-phone">
              <div className="s-phone__frame">
                <img src={`/beri/redesign/${screen}-${d.v}.jpg`} alt={`${screen} screen, ${d.t}`} loading="lazy" decoding="async" width={360} height={783} />
              </div>
              <figcaption>
                <b>{d.t}</b>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="s-sec s-wide">
        <h2 className="s-h2">Motion, recorded from the simulator</h2>
        <div className="s-phones">
          {clips.map((c) => (
            <figure key={c.f} className="s-phone">
              <div className="s-phone__frame">
                <Clip f={c.f} />
              </div>
              <figcaption>
                <b>{c.t}</b>
                {c.d}
              </figcaption>
            </figure>
          ))}
        </div>
        <blockquote className="s-quote">
          Motion explains. Every move answers one of three questions: what is on top, what did my touch do, and where did that thing go.
          <cite>Beri motion spec, principle 1</cite>
        </blockquote>
      </section>

      <section className="s-sec">
        <h2 className="s-h2">Where it stands</h2>
        <p className="s-p">
          September 2026. Directions are built and recorded, and picks per screen are next. The winners get promoted into the real screens and the lab gets deleted, the
          same way this site will be finished.
        </p>
      </section>
    </article>
  )
}
