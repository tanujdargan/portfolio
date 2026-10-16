import type { ComponentType, ReactNode } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { more } from '../content'
import { research } from '../../../content/site'
import { Poster } from '../../../shared/Poster'
import { Link } from '../../../lib/router'
import type { WorkKey } from '../../../content/work'
import './more.css'

// Versions 2–4 of this section for the review round. Version 1 is the current one in Home/index/Article.
// Reached at /gate/more2 … /gate/more4.
export type Props = {}

type Row = (typeof more)[number]
const by = (prefix: string) => more.find((x) => x.title.startsWith(prefix))!
const gpu = by('Billion-vector')
const es = by('Fine-tuning')
const optimate = by('Optimate')
const aimo = by('AIMO')
const beri = by('Beri')

// Visible label for each destination, so the link says where it goes (write-up, repo or site).
const dest = (x: Row) => (!x.href ? null : x.href.startsWith('/research/') ? 'Write-up' : x.href.includes('github.com') ? 'GitHub' : x.href.replace(/^https?:\/\//, ''))

// Internal links use the router; external ones open a new tab.
function Go({ x, className, children, label }: { x: Row; className: string; children: ReactNode; label?: string }) {
  if (!x.href) return <div className={className}>{children}</div>
  return x.ext ? (
    <a className={className} href={x.href} target="_blank" rel="noopener" aria-label={label}>
      {children}
    </a>
  ) : (
    <Link className={className} to={x.href} aria-label={label}>
      {children}
    </Link>
  )
}
// Keep "Qwen2.5-1.5B" on one line: a non-breaking hyphen inside model names.
const nb = (t: string) => t.replace(/(\d)-(\d)/g, '$1\u2011$2')
const Arrow = ({ x, size = 16 }: { x: Row; size?: number }) =>
  x.ext ? <ArrowUpRight size={size} strokeWidth={1.75} aria-hidden="true" /> : <ArrowRight size={size} strokeWidth={1.75} aria-hidden="true" />

// ---------- v2: research with data-drawn previews, then what was built or won ----------
const poster: Record<string, WorkKey> = { [gpu.title]: 'retrieval', [es.title]: 'es' }
const slugOf = (x: Row) => x.href?.replace('/research/', '')

function V2() {
  return (
    <section id="more" className="m-wrap m-sec" aria-labelledby="more-h">
      <h2 id="more-h" className="m-h2">
        More work
      </h2>
      <div className="m-mw2-grid">
        <div className="m-mw2-col">
          <h3 className="m-mw2-k">Research</h3>
          <ul className="m-mw2-cards">
            {[gpu, es].map((x) => {
              const r = research.find((r) => r.slug === slugOf(x))
              return (
                <li key={x.title}>
                  <Go x={x} className="m-mw2-card">
                    <span className="m-mw2-fig">
                      <Poster k={poster[x.title]} />
                    </span>
                    <span className="m-mw2-t">{nb(x.title)}</span>
                    <span className="m-mw2-l">{x.line.replace(/(\d) ms/g, "$1\u00a0ms")}</span>
                    <span className="m-mw2-go">
                      {dest(x)}
                      {r && <span className="m-mw2-when"> · {r.when}</span>}
                      <Arrow x={x} />
                    </span>
                  </Go>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="m-mw2-col">
          <h3 className="m-mw2-k">Built and competed</h3>
          <ul className="m-mw2-rows">
            {[optimate, aimo, beri].map((x) => (
              <li key={x.title}>
                <Go x={x} className="m-mw2-row">
                  <span className="m-mw2-t">{nb(x.title)}</span>
                  <span className="m-mw2-l">{x.line.replace(/(\d) ms/g, "$1\u00a0ms")}</span>
                  {x.href && (
                    <span className="m-mw2-go">
                      {dest(x)}
                      <Arrow x={x} />
                    </span>
                  )}
                </Go>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

// ---------- v3: a ledger with a kind column and a named destination column ----------
const kind: [Row, string][] = [
  [gpu, 'Research'],
  [es, 'Research'],
  [optimate, 'Hackathon'],
  [aimo, 'Competition'],
  [beri, 'Building'],
]

function V3() {
  return (
    <section id="more" className="m-wrap m-sec" aria-labelledby="more-h">
      <h2 id="more-h" className="m-h2">
        More work
      </h2>
      <ul className="m-mw3-list">
        {kind.map(([x, k]) => (
          <li key={x.title}>
            <Go x={x} className="m-mw3-row" label={x.href ? `${x.title}: ${dest(x)}` : undefined}>
              <span className="m-mw3-k">{k}</span>
              <span className="m-mw3-body">
                <span className="m-mw3-t">{nb(x.title)}</span>
                <span className="m-mw3-l">{x.line.replace(/(\d) ms/g, "$1\u00a0ms")}</span>
              </span>
              <span className="m-mw3-go" data-none={x.href ? undefined : ''}>
                {x.href ? (
                  <>
                    {dest(x)}
                    <Arrow x={x} size={15} />
                  </>
                ) : (
                  <span className="m-mw3-sr">No link</span>
                )}
              </span>
            </Go>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------- v4: one paragraph, links inline ----------
// Facts restated from `more` (content.ts) as sentences; no new claims.
function A({ x, children }: { x: Row; children: ReactNode }) {
  return (
    <Go x={x} className="m-mw4-a">
      {children}
      <span className="m-mw4-ar">
        {'\u2060'}
        <Arrow x={x} size={15} />
      </span>
    </Go>
  )
}

function V4() {
  return (
    <section id="more" className="m-wrap m-sec" aria-labelledby="more-h">
      <h2 id="more-h" className="m-h2">
        More work
      </h2>
      <p className="m-mw4-p">
        <A x={gpu}>Billion-vector search on GPUs</A> at DEIA Lab with Prof. Sean Chester, on a modified cuVS fork: 1–4M QPS at
        90–95% recall, under 250&nbsp;ms. <A x={es}>Fine{'\u2011'}tuning Qwen2.5{'\u2011'}1.5B without gradients</A>, using evolution strategies
        on a LoRA with a binary GSM8K reward. <A x={optimate}>Optimate</A>, two prizes from 300+ teams at Hack the North 2025: YC
        Unicorn and Federato Best RiskOps. A silver medal at AIMO Progress Prize 2, top 10% of 2,200 teams. And{' '}
        <A x={beri}>Beri</A>, a food app I’m building for iOS.
      </p>
    </section>
  )
}

export const versions: Record<string, ComponentType<Props>> = { '2': V2, '3': V3, '4': V4 }
