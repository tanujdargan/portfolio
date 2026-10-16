import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { amazonMetrics, details, type ObjKey } from './data'
import { Diagram } from './Diagrams'

/**
 * An object, opened. The bench object's frame becomes this stage (shared-element view transition), with a step list
 * on the left lighting the matching part of the diagram, then the spec card, the real demo and the write-up link.
 */
export function Sheet({ k, base, reduced, onClose }: { k: ObjKey; base: string; reduced: boolean; onClose: () => void }) {
  const d = details[k]
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(!reduced)
  const closeRef = useRef<HTMLButtonElement>(null)

  // the step list plays itself once through, slowly, until touched
  useEffect(() => {
    if (!auto) return
    const t = window.setTimeout(() => {
      if (step >= d.steps.length - 1) setAuto(false)
      else setStep(step + 1)
    }, 3200)
    return () => clearTimeout(t)
  }, [auto, step, d.steps.length])

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="h3-sheet" role="dialog" aria-modal="true" aria-labelledby="h3-sheet-t" data-k={k}>
      <div className="h3-sheet__in">
        <div className="h3-sheet__top">
          <button ref={closeRef} type="button" className="h3-btn h3-btn--ghost" onClick={onClose}>
            <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            Back to the bench
          </button>
          {d.writeup && (
            <Link to={`${base}/research/${d.writeup}`} className="h3-btn h3-btn--ghost">
              Read the write-up
              <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          )}
        </div>
        <header className="h3-sheet__head">
          <p className="h3-eyebrow">{d.eyebrow}</p>
          <h2 id="h3-sheet-t">{d.title}</h2>
          <p className="h3-sheet__finding">{d.finding}</p>
        </header>

        <div className="h3-stage" style={{ viewTransitionName: 'h3-obj' } as React.CSSProperties}>
          <ol className="h3-steps" aria-label="Steps">
            {d.steps.map((s, i) => (
              <li key={s.t}>
                <button
                  type="button"
                  className="h3-steps__b"
                  aria-current={i === step ? 'step' : undefined}
                  onClick={() => {
                    setAuto(false)
                    setStep(i)
                  }}
                >
                  <span className="h3-steps__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="h3-steps__t">{s.t}</span>
                  <span className="h3-steps__d">{s.d}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="h3-stage__fig">
            <Diagram k={k} step={step} />
            <p className="h3-stage__prov">{d.provenance}</p>
          </div>
        </div>

        <div className="h3-specrow">
          <dl className="h3-spec">
            {d.spec.map((s) => (
              <div key={s.k}>
                <dt>{s.k}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
          {k === 'plan' && (
            <dl className="h3-spec h3-spec--n">
              {amazonMetrics.map((m) => (
                <div key={m.n}>
                  <dt>{m.l}</dt>
                  <dd>{m.n}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {d.demo && (
          <section className="h3-sheet__demo" aria-label="Live demo">
            {d.demo === 'steering' && <p className="h3-sheet__note">Method replicated on Qwen2.5-1.5B-Instruct for this page. Every output below is a cached real decode.</p>}
            {d.demo === 'steering' ? (
              <Demo kind="steering" rest={0.6} />
            ) : d.demo === 'lossmask' ? (
              <Demo kind="lossmask" finding />
            ) : (
              <Demo kind={d.demo} />
            )}
          </section>
        )}

        {d.writeup && (
          <Link to={`${base}/research/${d.writeup}`} className="h3-sheet__more">
            <span>Read the write-up</span>
            <b>Question, method, result and what comes next</b>
            <ArrowUpRight size={20} strokeWidth={1.6} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  )
}
