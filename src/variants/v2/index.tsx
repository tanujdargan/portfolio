/*
 * v2 "Design engineer". Small, exact, and alive under the cursor.
 * Patterns (PORTFOLIO_TASTE §4): P01 steering demo inline under the identity, P03 live "now" line (Toronto time, rolling digits),
 * P17 odometer metrics, P18 index rows with a cursor-following preview (tap-to-expand on touch), P19 one proof metric per row,
 * P24 nav pill with a sliding spring indicator, P25 ⌘K command menu, P27 copy-email morph.
 * Motion: §3 tokens only (./motion.ts), scaled by the lab level via useMotionPrefs() and --k/--t. Reduced motion → crossfades.
 * Type: Inter Tight Variable + JetBrains Mono Variable. Body 14/21, one display step (22/28), mono 12/18.
 */
import { useState } from 'react'
import { person, proof, links } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import type { VariantProps } from '../../routes'
import { Nav, CommandMenu } from './chrome'
import { CopyEmail, Index, NowLine } from './parts'
import { work, researchRows, communityRows, earlierRows } from './rows'
import './v2.css'

const I = (i: number) => ({ ['--i' as string]: i })

function Identity({ base }: { base: string }) {
  const to: Record<string, string> = { amazon: '#work', beri: `${base}/beri`, research: '#demo' }
  return (
    <section id="v2-top" className="v2-id" aria-labelledby="v2-name">
      <h1 id="v2-name" className="v2-display v2-in" style={I(0)}>
        <span className="v2-id__name">{person.name}</span>{' '}
        <span className="v2-id__claim">builds ML systems and studies what happens inside models.</span>
      </h1>
      <p className="v2-meta v2-in" style={I(1)}>
        CS at UVic<span className="v2-hide-s"> · accelerated three-year track</span> · class of {person.grad}
      </p>

      <ul className="v2-proof" aria-label="Proof">
        {proof.map((p, i) => {
          const href = to[p.key]
          const body = (
            <>
              <span className="v2-proof__k">{p.label}</span>
              <span className="v2-proof__d">{p.detail}</span>
              <span className="v2-proof__go" aria-hidden="true">
                {href.startsWith('#') ? '↓' : '→'}
              </span>
            </>
          )
          return (
            <li key={p.key} className="v2-in" style={I(2 + i)}>
              {href.startsWith('#') ? (
                <a href={href} className="v2-proof__a">
                  {body}
                </a>
              ) : (
                <Link to={href} className="v2-proof__a">
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ul>

      <div className="v2-actions v2-in" style={I(5)}>
        <ul className="v2-chips" aria-label="Links">
          {(['resume', 'github', 'linkedin', 'x'] as const).map((k) => (
            <li key={k}>
              <a href={links[k].href} target="_blank" rel="noopener" className="v2-chip">
                <LinkIcon k={k} size={14} />
                <span>{links[k].label}</span>
              </a>
              {links[k].unverified && <Flag note="X handle guessed; not found on GitHub, old site or resume." />}
            </li>
          ))}
        </ul>
        <CopyEmail className="v2-chip v2-chip--mail" />
      </div>

      <div className="v2-in" style={I(6)}>
        <NowLine />
      </div>
    </section>
  )
}

function Home({ base }: { base: string }) {
  return (
    <>
      <Identity base={base} />

      <section id="demo" className="v2-sec v2-sec--demo" aria-labelledby="v2-h-demo">
        <h2 id="v2-h-demo" className="v2-h2">
          Live
        </h2>
        <div>
          <p className="v2-lede">
            Push a real model along a concept direction. Drag α: the text is actual output from Qwen2.5-1.5B-Instruct, not an animation.{' '}
            <Link to={`${base}/research/activation-steering`} className="v2-inline">
              Write-up →
            </Link>
          </p>
          <Demo kind="steering" hero />
        </div>
      </section>

      <section id="work" className="v2-sec" aria-labelledby="v2-h-work">
        <h2 id="v2-h-work" className="v2-h2">
          Work
        </h2>
        <Index rows={work} base={base} />
      </section>

      <section id="research" className="v2-sec" aria-labelledby="v2-h-research">
        <h2 id="v2-h-research" className="v2-h2">
          Research
        </h2>
        <div>
          <p className="v2-lede">Five write-ups. Each one: the question, the method, the result, and what I'd do next.</p>
          <Index rows={researchRows} base={base} />
        </div>
      </section>

      <section id="community" className="v2-sec" aria-labelledby="v2-h-community">
        <h2 id="v2-h-community" className="v2-h2">
          Community
        </h2>
        <Index rows={communityRows} base={base} compact />
      </section>

      <section id="earlier" className="v2-sec" aria-labelledby="v2-h-earlier">
        <h2 id="v2-h-earlier" className="v2-h2">
          Earlier
        </h2>
        <Index rows={earlierRows} base={base} compact />
      </section>

      <section id="contact" className="v2-sec v2-contact" aria-labelledby="v2-h-contact">
        <h2 id="v2-h-contact" className="v2-h2">
          Contact
        </h2>
        <div>
          <p className="v2-display v2-contact__line">
            Research programs, labs and founders: <span className="v2-id__claim">email is fastest.</span>
          </p>
          <div className="v2-contact__row">
            <CopyEmail className="v2-chip v2-chip--mail v2-chip--big" />
            <a href={links.email.href} className="v2-chip">
              <LinkIcon k="email" size={14} />
              <span>Open mail</span>
            </a>
          </div>
          <p className="v2-meta">{person.location}</p>
        </div>
      </section>
    </>
  )
}

export default function V2({ page, base }: VariantProps) {
  const { path } = useRouter()
  const [cmd, setCmd] = useState(false)
  const home = page.kind === 'home'
  return (
    <div className="v2">
      <a href="#main" className="v2-skip">
        Skip to content
      </a>
      <span id="v2-sentinel" aria-hidden="true" />
      <Nav base={base} home={home} onCmd={() => setCmd(true)} />
      <main id="main" key={path} className={home ? 'v2-main' : 'v2-main v2-main--page'}>
        {home && <Home base={base} />}
        {page.kind === 'research' && <ResearchArticle slug={page.slug} base={base} />}
        {page.kind === 'beri' && <BeriCaseStudy base={base} />}
        {page.kind === 'notfound' && (
          <section className="v2-id v2-404">
            <h1 className="v2-display">
              <span className="v2-id__name">404.</span> <span className="v2-id__claim">Nothing lives at this address.</span>
            </h1>
            <p className="v2-lede">
              <Link to={`${base}/`} className="v2-inline">
                Back to the index →
              </Link>{' '}
              or press <kbd className="v2-kbd">⌘K</kbd>.
            </p>
          </section>
        )}
      </main>
      <footer className="v2-foot">
        <span>© 2026 {person.name}</span>
        <button type="button" className="v2-foot__k" onClick={() => setCmd(true)}>
          <kbd className="v2-kbd">⌘K</kbd> for everything
        </button>
        <span className="v2-dim">Vite, React, Framer Motion. Every number rolls once.</span>
      </footer>
      <CommandMenu open={cmd} setOpen={setCmd} base={base} home={home} />
    </div>
  )
}
