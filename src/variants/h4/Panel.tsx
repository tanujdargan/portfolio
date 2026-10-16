import type { ReactNode } from 'react'
import { ArrowUpRight, X } from 'lucide-react'

export type Prov = 'live' | 'real' | 'ill'
export function Badge({ k, children }: { k: Prov; children: ReactNode }) {
  return (
    <span className="h4-prov" data-k={k}>
      <i aria-hidden="true" />
      {children}
    </span>
  )
}

export interface PanelProps {
  id: string
  meta: ReactNode
  title: string
  finding?: ReactNode
  /** the live preview, shown at rest */
  children: ReactNode
  foot?: ReactNode
  /** the full demo, mounted only when the panel is open */
  full: ReactNode
  open: boolean
  lit?: boolean
  openLabel: string
  onToggle: (id: string) => void
  layout: { c: number; r: number; o: number }
  i: number
}

/** One panel of the bento. Opening it swaps the preview for the full demo in place; the bento FLIPs the move. */
export function Panel({ id, meta, title, finding, children, foot, full, open, lit, openLabel, onToggle, layout, i }: PanelProps) {
  return (
    <article
      id={`h4-${id}`}
      className="h4-panel h4-in"
      data-panel={id}
      data-open={open || undefined}
      data-lit={lit || undefined}
      aria-labelledby={`h4-${id}-t`}
      style={{ ['--c' as string]: layout.c, ['--r' as string]: layout.r, ['--o' as string]: layout.o, ['--i' as string]: i }}
    >
      <header className="h4-panel__head">
        <div className="h4-meta">{meta}</div>
        <button
          type="button"
          className="h4-open"
          aria-expanded={open}
          aria-controls={`h4-${id}-x`}
          onClick={() => onToggle(id)}
          data-toggle={id}
        >
          {open ? (
            <>
              Close <X size={15} strokeWidth={1.8} aria-hidden="true" />
            </>
          ) : (
            <>
              {openLabel} <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />
            </>
          )}
          <span className="h4-sr">: {title}</span>
        </button>
        <h2 className="h4-title" id={`h4-${id}-t`}>
          {title}
        </h2>
        {finding && <p className="h4-finding">{finding}</p>}
      </header>
      <div id={`h4-${id}-x`} className="h4-panel__x" style={{ display: 'contents' }}>
        {open ? (
          <div className="h4-panel__full">{full}</div>
        ) : (
          <>
            <div className="h4-panel__body">{children}</div>
            {foot && <div className="h4-panel__foot">{foot}</div>}
          </>
        )}
      </div>
    </article>
  )
}
