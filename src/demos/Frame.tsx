import type { ReactNode } from 'react'
import { Flag } from '../shared/Flag'

export type Provenance = 'real' | 'illustrative' | 'exact'
const label: Record<Provenance, string> = { real: 'Real model outputs', illustrative: 'Illustrative simulation', exact: 'Exact definition' }

export function Frame({
  title,
  provenance,
  caption,
  children,
  controls,
}: {
  title: string
  provenance: Provenance[]
  caption: ReactNode
  children: ReactNode
  controls?: ReactNode
}) {
  return (
    <figure className="demo">
      <div className="demo__head">
        <span className="demo__title">
          {title}
          {provenance.includes('illustrative') && <Flag note="Illustrative simulation: not real data from the project. See RESEARCH_CLAIMS.md." />}
        </span>
        <span className="demo__badges">
          {provenance.map((p) => (
            <span key={p} className="demo__badge" data-p={p}>
              {label[p]}
            </span>
          ))}
        </span>
      </div>
      {controls && <div className="demo__controls">{controls}</div>}
      <div className="demo__body">{children}</div>
      <figcaption className="demo__caption">{caption}</figcaption>
    </figure>
  )
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="demo-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Read a CSS custom property from an element, with a fallback. */
export const cssVar = (el: Element, name: string, fb: string) => getComputedStyle(el).getPropertyValue(name).trim() || fb
