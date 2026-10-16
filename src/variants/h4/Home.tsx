import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Plus } from 'lucide-react'
import { context, education, more, proofs, roles, selected, thesis, type Mark } from '../../content/curated'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { Logo } from '../../shared/Mark'
import { Badge, Panel } from './Panel'
import { OrbitPreview } from './Orbit'
import { LossMaskPreview, SteeringPreview } from './Research'
import { OceanPreview, PlanPreview } from './Systems'
import { Contact } from './Chrome'
import { useReduced } from './util'

type Id = 'orbit' | 'lossmask' | 'steering' | 'plan' | 'ocean'
type L = { c: number; r: number; o: number }

/** Desktop bento (12 columns): MarmotSat across the top, research side by side, systems below. Below 960 px the CSS
 *  ignores all of this and stacks one column. */
function layoutFor(open: Id | null): Record<Id, L> {
  const out: Record<Id, L> = {
    orbit: { c: 12, r: 1, o: 1 },
    lossmask: { c: 6, r: 1, o: 2 },
    steering: { c: 6, r: 1, o: 3 },
    plan: { c: 7, r: 1, o: 4 },
    ocean: { c: 5, r: 1, o: 5 },
  }
  // the open panel takes its row; its row-mate follows it at full width
  const mate: Partial<Record<Id, Id>> = { lossmask: 'steering', steering: 'lossmask', plan: 'ocean', ocean: 'plan' }
  if (open && mate[open]) {
    out[open] = { ...out[open], c: 12 }
    out[mate[open]!] = { ...out[mate[open]!], c: 12 }
  }
  return out
}

const proofTarget: Partial<Record<Mark, Id>> = { amazon: 'plan', cfar: 'orbit', apart: 'lossmask' }
const [thesisA, thesisB] = thesis.split(' and ')
const sel = (id: string) => selected.find((s) => s.id === id)!

export function Home({ base }: { base: string }) {
  const reduced = useReduced()
  const [open, setOpen] = useState<Id | null>(null)
  const [lit, setLit] = useState<Id | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const first = useRef<Map<string, DOMRect> | null>(null)
  const scrollTo = useRef<Id | null>(null)

  const toggle = useCallback((id: string) => {
    const m = new Map<string, DOMRect>()
    grid.current?.querySelectorAll<HTMLElement>('[data-panel]').forEach((el) => m.set(el.dataset.panel!, el.getBoundingClientRect()))
    first.current = m
    setOpen((o) => {
      const next = o === id ? null : (id as Id)
      scrollTo.current = (next ?? id) as Id
      return next
    })
  }, [])

  // FLIP: every panel glides from where it was. The opening panel also un-clips from its old size, so the preview
  // reads as growing into the full demo rather than being replaced.
  useLayoutEffect(() => {
    const m = first.current
    if (!m || !grid.current) return
    first.current = null
    const reducedNow = matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = scrollTo.current
    scrollTo.current = null
    const tEl = target ? grid.current.querySelector<HTMLElement>(`[data-panel="${target}"]`) : null
    if (tEl) {
      const r = tEl.getBoundingClientRect()
      const top = parseFloat(getComputedStyle(tEl).scrollMarginTop) || 76
      if (r.top < top || r.top > innerHeight * 0.5) {
        // scroll first (instantly), so the FLIP deltas below are measured in the final scroll position
        const y = scrollY + r.top - top
        for (const [k, v] of m) m.set(k, new DOMRect(v.x, v.y - (y - scrollY), v.width, v.height))
        scrollTo.current = null
        window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
      }
    }
    if (reducedNow) return
    grid.current.querySelectorAll<HTMLElement>('[data-panel]').forEach((el) => {
      const a = m.get(el.dataset.panel!)
      if (!a) return
      const b = el.getBoundingClientRect()
      const dx = a.left - b.left,
        dy = a.top - b.top
      const grow = el.dataset.panel === open
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && !grow) return
      const clip = grow ? `inset(0px ${Math.max(0, b.width - a.width)}px ${Math.max(0, b.height - a.height)}px 0px round 18px)` : 'inset(0px 0px 0px 0px round 18px)'
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)`, clipPath: clip },
          { transform: 'translate(0, 0)', clipPath: 'inset(0px 0px 0px 0px round 18px)' },
        ],
        { duration: grow ? 560 : 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      )
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggle(open)
        requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-toggle="${open}"]`)?.focus())
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, toggle])

  const L = layoutFor(open)
  const common = (id: Id, i: number) => ({ id, open: open === id, lit: lit === id, onToggle: toggle, layout: L[id], i: i + 4 })
  const orbit = sel('orbit'),
    lmI = sel('lossmask'),
    amz = sel('amazon'),
    oc = sel('ocean')
  const wr = (slug: string, label = 'Read the write-up') => (
    <Link to={`${base}/research/${slug}`} className="h4-link">
      {label} <ArrowRight size={14} aria-hidden="true" />
    </Link>
  )

  return (
    <>
      <section className="h4-intro" aria-labelledby="h4-thesis">
        <div className="h4-in" style={{ ['--i' as string]: 0 }}>
          <h1 id="h4-thesis" className="h4-thesis">
            {thesisA} <span>and {thesisB}</span>
          </h1>
          <p className="h4-context">{context}</p>
        </div>
        <ul className="h4-proofs" aria-label="Three proofs">
          {proofs.map((p, i) => {
            const t = proofTarget[p.mark]!
            return (
              <li key={p.mark} className="h4-in" style={{ ['--i' as string]: i + 1 }}>
                <a
                  className="h4-proof"
                  href={`#h4-${t}`}
                  onMouseEnter={() => setLit(t)}
                  onMouseLeave={() => setLit(null)}
                  onFocus={() => setLit(t)}
                  onBlur={() => setLit(null)}
                  onClick={(e) => {
                    e.preventDefault()
                    const el = document.getElementById(`h4-${t}`)
                    el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
                    setLit(t)
                    window.setTimeout(() => setLit((x) => (x === t ? null : x)), 1800)
                  }}
                >
                  <Logo m={p.mark} w={p.mark === 'cfar' ? 50 : 30} h={30} />
                  <span className="h4-proof__org">
                    {p.org}
                    <ArrowDown className="h4-proof__go" size={14} aria-hidden="true" />
                  </span>
                  <span className="h4-proof__line">{p.line}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="h4-bento" ref={grid}>
        <Panel
          {...common('orbit', 0)}
          meta={
            <>
              <Logo m="cfar" w={64} h={20} />
              <span>
                <span className="h4-hide-sm">{orbit.where}</span>
                <span className="h4-show-sm">UVic CfAR</span> · {orbit.when}
              </span>
            </>
          }
          title="Firmware I led is in orbit: MarmotSat, live"
          finding={<>{orbit.finding} Launched July 2026 on a SpaceX Falcon 9.</>}
          openLabel="Open the globe"
          full={<Demo kind="orbit" />}
        >
          <OrbitPreview reduced={reduced} />
        </Panel>

        <Panel
          {...common('lossmask', 1)}
          meta={
            <>
              <Logo m="apart" w={20} h={20} />
              <span>
                {lmI.where} · {lmI.when}
              </span>
            </>
          }
          title={lmI.title}
          finding="Calm-sounding models still represent shutdown negatively, so output-based welfare signals are unreliable."
          openLabel="Open"
          full={
            <>
              <Demo kind="lossmask" finding />
              <p style={{ marginTop: 12 }}>{wr('loss-masking-distress')}</p>
            </>
          }
        >
          <LossMaskPreview
            reduced={reduced}
            foot={
              <>
                <Badge k="real">Exact weights · real Qwen2.5 tokens</Badge>
                <Badge k="ill">Illustrative conversation</Badge>
                {wr('loss-masking-distress', 'Write-up')}
              </>
            }
          />
        </Panel>

        <Panel
          {...common('steering', 2)}
          meta={<span>Method replicated on Qwen2.5-1.5B-Instruct for this page · not my main project</span>}
          title="Joy steering is a switch, not a dial"
          finding="Between +0.3 and +0.6‖h‖ the read-back projection jumps from −8.0 to +9.6, and the voice flips with it."
          openLabel="Open"
          full={
            <>
              <Demo kind="steering" rest={0.6} />
              <p style={{ marginTop: 12 }}>{wr('activation-steering')}</p>
            </>
          }
        >
          <SteeringPreview
            reduced={reduced}
            foot={
              <>
                <Badge k="real">Real model outputs, replayed</Badge>
                {wr('activation-steering', 'Write-up')}
              </>
            }
          />
        </Panel>

        <Panel
          {...common('plan', 3)}
          meta={
            <>
              <Logo m="amazon" w={20} h={20} />
              <span>
                {amz.where} · {amz.when}
              </span>
            </>
          }
          title="An LLM planning assistant in production at 180+ Amazon sites"
          finding="Built into Optimus, Amazon’s labor-planning platform for fulfillment sites in North America and Europe. Return offer."
          openLabel="Details"
          full={
            <>
              <PlanPreview reduced={reduced} />
              <ul className="h4-role" style={{ marginTop: 20 }}>
                {roles[0].bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p style={{ marginTop: 14 }}>
                <Badge k="ill">Illustrative pipeline · numbers from the resume</Badge>
              </p>
            </>
          }
          foot={<Badge k="ill">Illustrative pipeline · numbers from the resume</Badge>}
        >
          <PlanPreview reduced={reduced} />
        </Panel>

        <Panel
          {...common('ocean', 4)}
          meta={
            <>
              <Logo m="uvic" w={20} h={20} />
              <span>
                {oc.where} · {oc.when}
              </span>
            </>
          }
          title="Deep-water temperature, predicted from satellite imagery"
          finding="A multimodal model on Ocean Networks Canada sensors and satellite imagery, validated with the National Research Council Canada."
          openLabel="Open"
          full={
            <>
              <Demo kind="ocean" />
              <p style={{ marginTop: 12 }}>{wr('ocean-sensing')}</p>
            </>
          }
          foot={
            <>
              <Badge k="ill">Illustrative profile · R² is real</Badge>
              {wr('ocean-sensing', 'Write-up')}
            </>
          }
        >
          <OceanPreview reduced={reduced} />
        </Panel>
      </div>

      <section className="h4-sect" aria-labelledby="h4-exp">
        <h2 className="h4-sect__h" id="h4-exp">
          Experience <span>Newest first · open a row for detail</span>
        </h2>
        <div className="h4-lower">
          <div className="h4-card">
            <ul className="h4-roles">
              {roles.map((r) => (
                <li key={r.org}>
                  <details className="h4-role">
                    <summary>
                      <Logo m={r.mark} w={r.mark === 'cfar' || r.mark === 'mlh' ? 44 : 28} h={28} />
                      <span className="h4-role__who">
                        {r.role} <span>· {r.org}</span>
                      </span>
                      <span className="h4-role__when">
                        {r.when}
                        <Plus className="h4-role__plus" size={14} aria-hidden="true" />
                      </span>
                      <span className="h4-role__line">{r.line}</span>
                    </summary>
                    <ul>
                      {r.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
          <div className="h4-card">
            <h3 className="h4-card__h">More work</h3>
            <ul className="h4-more">
              {more.map((m) => {
                const inner = (
                  <>
                    <span className="h4-more__t">
                      {m.title}
                      {m.href && (m.ext ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />)}
                    </span>
                    <span className="h4-more__l">{m.line}</span>
                  </>
                )
                return (
                  <li key={m.title}>
                    {!m.href ? (
                      <div>{inner}</div>
                    ) : m.ext ? (
                      <a href={m.href} target="_blank" rel="noopener">
                        {inner}
                      </a>
                    ) : (
                      <Link to={`${base}${m.href}`}>{inner}</Link>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="h4-edu">
              <Logo m="uvic" w={28} h={28} />
              <b>{education.school}</b>
              <span>
                {education.degree} · graduating {education.when} · {education.note}
              </span>
            </div>
          </div>
        </div>
      </section>

      <Contact />
    </>
  )
}
