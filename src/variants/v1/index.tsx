/*
 * v1 "Research lab": a small lab's homepage set in editorial type on a warm dark ground.
 * Patterns (PORTFOLIO_TASTE.md §4): P01 steering slider as the hero figure, P06 token strip (Fig. 2),
 * P10 sidenotes (margin ≥1180px, inline tap below), P11 colour-linked terms, P12 global pause,
 * P14 sticky ToC with sliding indicator (write-up pages), P13-style margin preview of each note's question,
 * P27 copy-email morph. Type: §5 V1 scale (Newsreader + IBM Plex Mono; opsz and italic dropped for the font budget). Motion tokens: §3.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionConfig } from 'framer-motion'
// Fonts: one text family (wght axis only, 58 KB) + one mono weight (15 KB) keeps first-paint fonts under 80 KB.
import '@fontsource-variable/newsreader/wght.css'
import '@fontsource/ibm-plex-mono/500.css'
import { person, proof, research, engineering, community, earlier, beri, type DemoKey } from '../../content/site'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import type { VariantProps } from '../../routes'
import { CopyEmail, PauseCtx, PauseToggle, Sidenote, Term, TermScope, usePauseEffects } from './parts'
import { Toc } from './Toc'
import './v1.css'

const nav = [
  { id: 'fig-1', label: 'Figures' },
  { id: 'notes', label: 'Notes' },
  { id: 'applied', label: 'Applied' },
  { id: 'contact', label: 'Contact' },
]

function Bar({ base }: { base: string }) {
  return (
    <header className="v1-bar">
      <div className="v1-bar__in">
        <Link to={`${base}/`} className="v1-bar__name" aria-label={`${person.name}, home`}>
          <span className="v1-bar__full">{person.name}</span>
          <span className="v1-bar__init" aria-hidden="true">
            T. D.
          </span>
        </Link>
        <nav aria-label="Sections" className="v1-bar__nav">
          {nav.map((n) => (
            <Link key={n.id} to={`${base}/#${n.id}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Links className="v1-bar__links" mode="icon" size={17} />
        <PauseToggle />
      </div>
    </header>
  )
}

/* One-line abstracts, written from the facts in content/site.ts. */
const abstracts: Record<string, string> = {
  'activation-steering':
    'Difference-of-means vectors on Qwen2.5-1.5B-Instruct. Joy steering acts as a switch, not a dial; the distress vector mostly produces refusals.',
  'loss-masking-distress':
    'Sweeping the prompt-token loss weight λp in LoRA SFT and reading shutdown responses through persona directions. Prior work had already run the λ sweep, so the claim moved to the representation level.',
  'es-lora': 'Evolution strategies on LoRA weights with a binary GSM8K reward: 45 perturbations, keep the best 8, 15 iterations. Adapter on Hugging Face; accuracy numbers pending.',
  'billion-vector-retrieval':
    'cuVS CAGRA and IVF across 8+ GPUs and 2 TB of index: 90–95% recall under 250 ms at 1–4M QPS. Memory and interconnect bandwidth set the ceiling.',
  'ocean-sensing':
    'A multimodal model on Ocean Networks Canada sensors and satellite imagery predicts deep-water temperature at R² = 0.936. Delivered to NRC Canada.',
}
const figTag = (d: DemoKey) =>
  d === 'steering' ? 'Fig. 1, on this page' : d === 'lossmask' ? 'Fig. 2, on this page' : d === 'es' ? 'Live figure: ES population' : d === 'retrieval' ? 'Live figure: IVF search' : 'Text and numbers'

function SecHead({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return (
    <header className="v1-sec__head">
      <span className="v1-sec__n" aria-hidden="true">
        §{n}
      </span>
      <h2 id={id} className="v1-h2">
        {children}
      </h2>
    </header>
  )
}

function FigLabel({ n, parts, live }: { n: number; parts: string[]; live?: boolean }) {
  return (
    <p className="v1-fig__label">
      <span className="v1-fig__n">Fig. {n}</span>
      {parts.map((x) => (
        <span key={x}>{x}</span>
      ))}
      {live && <span className="v1-live">Live</span>}
    </p>
  )
}

/** External-link mark, set small in mono so it doesn't shout. */
const Ext = () => (
  <span className="v1-ext-mark" aria-hidden="true">
    ↗
  </span>
)

const shipped = [
  { f: 'home', t: 'Home', d: 'Stories, then rails you can reorder.' },
  { f: 'recipe', t: 'Recipe', d: 'Photo first, steps and scores below.' },
  { f: 'pantry', t: 'Pantry', d: 'What you have, what expires soon.' },
]

function Home({ base }: { base: string }) {
  const steer = research[0]
  const mask = research[1]
  return (
    <>
      {/* Masthead: the recruiter test lives here. */}
      <section className="v1-mast v1-grid" aria-labelledby="v1-name">
        <p className="v1-mast__k v1-in" style={{ ['--i' as string]: 0 }}>
          CS, University of Victoria · class of{' '}
          <Sidenote n={1} before={person.grad}>
            Accelerated three-year track. Based between Toronto and Victoria.
          </Sidenote>
        </p>
        <h1 id="v1-name" className="v1-mast__name v1-in" style={{ ['--i' as string]: 1 }}>
          {person.name}
        </h1>
        <p className="v1-mast__deck v1-in" style={{ ['--i' as string]: 2 }}>
          I build ML systems and study what happens inside language models.
        </p>
        <div className="v1-rule" aria-hidden="true" />
        <dl className="v1-proof">
          {proof.map((p, i) => (
            <div key={p.key} className="v1-in" style={{ ['--i' as string]: 3 + i }}>
              <dt>{p.key === 'amazon' ? 'Now' : p.key === 'beri' ? 'Building' : 'Research'}</dt>
              <dd>
                {p.key === 'beri' ? (
                  <Link to={`${base}/beri`} className="v1-proof__t">
                    {p.label}
                  </Link>
                ) : p.key === 'research' ? (
                  <a href="#fig-1" className="v1-proof__t">
                    {p.label}
                  </a>
                ) : (
                  <b className="v1-proof__t">{p.label}</b>
                )}
                <span>{p.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
        <Links className="v1-mast__links v1-in" mode="both" size={14} />
      </section>

      {/* Fig. 1: the hero figure. */}
      <TermScope className="v1-sec v1-grid" id="fig-1" label="Figure 1, activation steering">
        {(term) => (
          <>
            <SecHead n={1} id="h-steer">
              A concept, as a direction
            </SecHead>
            <p className="v1-p v1-lede">
              If a concept like joy is a direction in a model's residual{' '}
              <Sidenote n={2} before="stream,">
                A difference of means over contrastive answers, averaged over answer tokens only. The layer is picked by class separation in the middle third of the
                network.
              </Sidenote>{' '}
              you should be able to find it and push along it.{' '}
              Drag <Term t="alpha">α</Term> to steer Qwen2.5-1.5B-Instruct: <Term t="text">the reply</Term> is its real greedy output,{' '}
              <Term t="plot">the scatter</Term> its activations along the vector, and <Term t="bars">the bars</Term> read the effect back out.
            </p>
            <div className="v1-fig v1-wide" data-term={term ?? undefined}>
              <FigLabel n={1} parts={['Activation steering', 'Qwen2.5-1.5B-Instruct']} live />
              <Demo kind="steering" hero />
            </div>
            <p className="v1-p">
              Joy steering is a switch, not a dial. Between +0.3 and +0.6‖h‖ the reply flips from “As an AI language model, I don't have the ability to experience…”
              to “Ah, the sweet aroma of fresh coffee…”, and the read-back projection jumps from −8.0 to{' '}
              <Sidenote n={3} before="+9.6.">
                Push the distress vector instead and the model refuses rather than frets: “I'm sorry, I can't assist with that.” Extracted this way, distress overlaps
                with refusal.
              </Sidenote>{' '}
              Steering negative barely moves the text, because the default assistant voice is already flat.
              {steer.unverified && <Flag note={steer.unverified.join(' ')} />}
            </p>
            <p className="v1-p v1-more">
              <Link to={`${base}/research/${steer.slug}`}>Read note No. 1: method, results, next steps →</Link>
            </p>
          </>
        )}
      </TermScope>

      {/* The index of write-ups, set like a list of papers. */}
      <section className="v1-sec v1-grid" aria-labelledby="notes">
        <SecHead n={2} id="notes">
          Notes
        </SecHead>
        <p className="v1-p">Five write-ups. Each states the question, the method, the result, and what I'd do next.</p>
        <ol className="v1-notes v1-wide">
          {research.map((r, i) => (
            <li key={r.slug} className="v1-note">
              <Link to={`${base}/research/${r.slug}`} className="v1-note__a">
                <span className="v1-note__n">No. {i + 1}</span>
                <span className="v1-note__t">{r.title}</span>
                <span className="v1-note__abs">{abstracts[r.slug]}</span>
                <span className="v1-note__meta">
                  <span>{r.where}</span>
                  <span>{r.when}</span>
                  <span className="v1-note__fig" data-live={r.demo ? '' : undefined}>
                    {figTag(r.demo)}
                  </span>
                </span>
                <span className="v1-note__q" aria-hidden="true">
                  <span className="v1-note__qk">Question</span>
                  {r.question}
                </span>
              </Link>
              {r.unverified && <Flag note={r.unverified.join(' ')} />}
            </li>
          ))}
        </ol>
      </section>

      {/* Fig. 2: a second live figure. */}
      <TermScope className="v1-sec v1-grid" id="fig-2" label="Figure 2, loss masking">
        {(term) => (
          <>
            <SecHead n={3} id="h-mask">
              Where the loss lands
            </SecHead>
            <p className="v1-p v1-lede">
              Post-training usually puts the loss on the assistant's tokens only. Raise the prompt weight <Term t="lp">λp</Term> and{' '}
              <Term t="tokens">the user's tokens</Term> start to carry <Term t="share">training signal</Term> too. At Apart Research's Digital Minds sprint (Aug
              2026) I asked whether that moves the assistant persona, and with it how a model talks about being shut down.
            </p>
            <div className="v1-fig v1-wide" data-term={term ?? undefined}>
              <FigLabel n={2} parts={['Per-token loss weights', 'Real Qwen2.5 tokens']} live />
              <Demo kind="lossmask" />
            </div>
            <p className="v1-p">
              Scouting turned up prior work first: Jindal et al. (TACL 2025) had already run the λ sweep, and benchmarks hold even at 100% prompt{' '}
              <Sidenote n={4} before="loss.">
                So the question moved from “does it break?” to “what happens to the persona direction while benchmarks stay flat?”{' '}
                <a href="https://arxiv.org/abs/2507.07817" target="_blank" rel="noopener">
                  arXiv:2507.07817 <Ext />
                </a>
              </Sidenote>
            </p>
            <p className="v1-p">
              The datasets are picked by measured user-to-assistant token ratio: No Robots (0.47) is the clean substrate, WildChat-1M (0.59) the scale arm, OASST2
              the provenance{' '}
              <Sidenote n={5} before="control.">
                WildChat's shards are time-ordered, so reading only the first rows biases the sample. Two independent measurements resolved a 0.375 vs 0.67
                discrepancy.
              </Sidenote>{' '}
              The readout is self-report, continue-vs-exit, and projection onto emotion and persona directions. The claim is always “distress-vector expression
              increases”, never “the model is distressed”.
              {mask.unverified && <Flag note={mask.unverified.join(' ')} />}
            </p>
            <p className="v1-p v1-more">
              <Link to={`${base}/research/${mask.slug}`}>Read note No. 2 →</Link>
            </p>
          </>
        )}
      </TermScope>

      {/* Applied work */}
      <section className="v1-sec v1-grid" aria-labelledby="applied">
        <SecHead n={4} id="applied">
          Applied work
        </SecHead>
        <div className="v1-entry">
          <h3 className="v1-h3">
            Amazon Robotics AI <span className="v1-meta">SDE intern · Summer 2026 · Toronto</span>
          </h3>
          <p className="v1-p">ML tooling for planning agents on the Robotics AI team. The internship ended with a return offer.</p>
        </div>
        <div className="v1-entry">
          <h3 className="v1-h3">
            <Link to={`${base}/beri`}>Beri</Link> <span className="v1-meta">Co-founder · 2025 –</span>
          </h3>
          <p className="v1-p">
            {beri.oneLiner} I build the iOS app in SwiftUI, the Supabase backend, and the design system. The redesign ran as nine full directions inside a hidden
            in-app design lab, judged on a phone at 120 Hz rather than in{' '}
            <Sidenote n={6} before="Figma.">This site's lab, with its variant switcher and Subtle / Default / Expressive motion toggle, is the same idea.</Sidenote>
          </p>
          <p className="v1-p v1-more">
            <Link to={`${base}/beri`}>Read the case study →</Link>
            <a href={beri.url} target="_blank" rel="noopener" className="v1-ext">
              getberi.com <Ext />
            </a>
          </p>
        </div>
        <div className="v1-fig v1-wide">
          <FigLabel n={3} parts={['Beri, the shipped iOS app', 'Three screens']} />
          <div className="v1-phones">
            {shipped.map((s) => (
              <figure key={s.f} className="v1-phone">
                <div className="v1-phone__frame">
                  <img src={`/beri/shipped/${s.f}.jpg`} alt={`Beri ${s.t} screen`} loading="lazy" decoding="async" width={420} height={914} />
                </div>
                <figcaption>
                  <b>{s.t}.</b> {s.d}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering, community, earlier */}
      <section className="v1-sec v1-grid" aria-labelledby="elsewhere">
        <SecHead n={5} id="elsewhere">
          Engineering, community, earlier
        </SecHead>
        {engineering.map((e) => (
          <div key={e.title} className="v1-entry">
            <h3 className="v1-h3">
              {e.href ? (
                <a href={e.href} target="_blank" rel="noopener">
                  {e.title} <Ext />
                </a>
              ) : (
                e.title
              )}{' '}
              <span className="v1-meta">{e.role}</span>
            </h3>
            <p className="v1-p v1-p--s">{e.detail}</p>
          </div>
        ))}
        <h3 className="v1-label">Community</h3>
        <ul className="v1-list">
          {community.map((c) => (
            <li key={c.title}>
              <span className="v1-list__w">{c.when}</span>
              <span className="v1-list__t">
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noopener">
                    {c.title} <Ext />
                  </a>
                ) : (
                  <b>{c.title}</b>
                )}
                <span className="v1-dim"> · {c.role}</span>
              </span>
              <span className="v1-list__d">{c.detail}</span>
            </li>
          ))}
        </ul>
        <h3 className="v1-label">Earlier</h3>
        <ul className="v1-list">
          {earlier.map((e) => (
            <li key={e.title}>
              <span className="v1-list__w">{e.when}</span>
              <span className="v1-list__t">
                {e.href ? (
                  <a href={e.href} target="_blank" rel="noopener">
                    {e.title} <Ext />
                  </a>
                ) : (
                  <b>{e.title}</b>
                )}
                <span className="v1-dim"> · {e.role}</span>
                {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in local repo; confirm it's okay to list." />}
              </span>
              <span className="v1-list__d">{e.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="v1-sec v1-grid v1-contact" aria-labelledby="contact">
        <SecHead n={6} id="contact">
          Correspondence
        </SecHead>
        <p className="v1-p v1-lede">Research programs, labs and founders: email is the fastest route.</p>
        <CopyEmail />
        <Links className="v1-mast__links" mode="both" size={14} />
      </section>
    </>
  )
}

function Colophon({ base }: { base: string }) {
  return (
    <footer className="v1-foot v1-grid">
      <div className="v1-foot__in">
        <p>
          <span className="v1-label">Colophon</span>
          Set in Newsreader and IBM Plex Mono, with old-style figures from Source Serif 4. Every figure runs in your browser: steering outputs were generated
          locally from Qwen2.5-1.5B-Instruct, and the loss weights follow Jindal et al. 2025.
        </p>
        <p className="v1-foot__meta">
          <span>© 2026 {person.name}</span>
          <span>Updated Sep 2026</span>
          <Link to={`${base}/`}>Index</Link>
          <a href={`mailto:${person.email}`}>{person.email}</a>
        </p>
      </div>
    </footer>
  )
}

export default function V1({ page, base }: VariantProps) {
  const { path } = useRouter()
  const root = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('v1-paused')
    setPaused(saved ? saved === '1' : matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])
  const toggle = useCallback(() => {
    setPaused((p) => {
      localStorage.setItem('v1-paused', p ? '0' : '1')
      return !p
    })
  }, [])
  usePauseEffects(root, paused)

  return (
    <PauseCtx.Provider value={{ paused, toggle }}>
      <MotionConfig reducedMotion={paused ? 'always' : 'user'}>
        <div className="v1" ref={root} data-paused={paused || undefined} data-page={page.kind}>
          <a href="#main" className="v1-skip">
            Skip to content
          </a>
          <Bar base={base} />
          {page.kind === 'research' && <div className="v1-progress" aria-hidden="true" />}
          <main id="main" key={path}>
            {page.kind === 'home' && <Home base={base} />}
            {page.kind === 'research' && (
              <div className="v1-read">
                <Toc slug={page.slug} />
                <ResearchArticle slug={page.slug} base={base} />
              </div>
            )}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && (
              <section className="v1-mast v1-grid">
                <p className="v1-mast__k">Error 404</p>
                <h1 className="v1-mast__name">No such page.</h1>
                <p className="v1-mast__deck">
                  <Link to={`${base}/`}>Back to the index →</Link>
                </p>
              </section>
            )}
          </main>
          <Colophon base={base} />
        </div>
      </MotionConfig>
    </PauseCtx.Provider>
  )
}
