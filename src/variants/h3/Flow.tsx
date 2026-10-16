import { amazonMetrics } from './data'
import lossmask from '../../data/lossmask.json'

export interface FlowNode {
  t: string
  sub?: string
  /** what travels on the wire below this node */
  wire?: string
  side?: { t: string; sub?: string; wire: string }
}

/** A vertical pipeline whose wires carry labelled packets (CSS only: transform + opacity). `active` lights one node. */
export function Flow({ nodes, active = null, label }: { nodes: FlowNode[]; active?: number | null; label: string }) {
  let w = 0
  return (
    <ol className="h3-flow" aria-label={label} data-active={active === null ? undefined : ''}>
      {nodes.map((n, i) => {
        // packets run in reading order: into the node, out to its side store and back, then on down the wire
        const si = n.side ? w++ : -1
        const wi = n.wire ? w++ : -1
        return (
          <li key={i} className="h3-flow__item" data-on={active === i || undefined}>
            <div className="h3-flow__row">
              <div className="h3-node">
                <b>{n.t}</b>
                {n.sub && <span>{n.sub}</span>}
              </div>
              {n.side && (
                <>
                  <div className="h3-branch" style={{ ['--i' as string]: si }} aria-hidden="true">
                    <span className="h3-pkt h3-pkt--x" />
                  </div>
                  <div className="h3-node h3-node--side" style={{ ['--i' as string]: si }} title={n.side.wire}>
                    <b>{n.side.t}</b>
                    {n.side.sub && <span>{n.side.sub}</span>}
                  </div>
                </>
              )}
            </div>
            {n.wire && (
              <div className="h3-wire" style={{ ['--i' as string]: wi }}>
                <span className="h3-wire__line" aria-hidden="true">
                  <span className="h3-pkt" />
                </span>
                <span className="h3-wirelabel">{n.wire}</span>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export const planNodes: FlowNode[] = [
  { t: 'Planner', sub: 'multi-turn, in plain language', wire: 'plan query · what-if scenario' },
  {
    t: 'LLM planning assistant',
    sub: 'in Optimus',
    wire: 'scenario to re-optimize',
    side: { t: 'RAG store', sub: 'past labor plans, site configs', wire: 'historical labor plans and site configs' },
  },
  { t: 'Optimization engine', sub: 'no full solver re-run', wire: 're-optimized plan' },
  { t: 'Back to the planner', sub: 'recommendations · anomalies' },
]

export const oceanNodes: FlowNode[] = [
  { t: 'Ocean Networks Canada sensors', sub: 'plus satellite imagery', wire: 'surface observations' },
  { t: 'Multimodal model', sub: 'SOLIDS Lab, UVic', wire: 'predicted deep-water temperature' },
  { t: 'Validated with NRC Canada', sub: 'R² 0.936 against deep-water sensors' },
]

/** The Amazon object: the pipeline plus the three resume numbers, each with its definition. */
export function PlanWindow({ active = null }: { active?: number | null }) {
  return (
    <div className="h3-win h3-plan">
      <div className="h3-win__bar">
        <span className="h3-win__light" aria-hidden="true" />
        <span className="h3-win__name">Planning assistant</span>
        <span className="h3-win__meta">Amazon Robotics</span>
      </div>
      <Flow nodes={planNodes} active={active} label="How a planner’s question travels through the assistant (illustrative)" />
      <dl className="h3-metrics">
        {amazonMetrics.map((m) => (
          <div key={m.n}>
            <dt>{m.l}</dt>
            <dd>{m.n}</dd>
          </div>
        ))}
      </dl>
      <p className="h3-win__foot">
        <span className="h3-prov" data-p="ill">
          Illustrative flow
        </span>
        Numbers from the resume.
      </p>
    </div>
  )
}

/** The loss-masking printout: the real Qwen2.5 tokens, lit where the loss lands under the chosen regime. */
export function MaskStrip({ regime, compact = false }: { regime: 0 | 1 | 2; compact?: boolean }) {
  return (
    <div className="h3-strip-tokens" data-compact={compact || undefined} data-regime={regime}>
      {lossmask.segments.map((s) => {
        const w = s.role === 'assistant' || regime === 1 ? 1 : 0
        return (
          <p key={s.role} className="h3-seg" data-role={s.role}>
            <span className="h3-seg__role">
              {s.role} <i>· weight {w.toFixed(1)}</i>
            </span>
            {s.tokens.map((t, i) => (
              <span key={i} className="h3-tok" data-w={w || undefined}>
                {t}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
