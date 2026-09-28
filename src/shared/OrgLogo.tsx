import amazon from './logos/amazon.svg?raw'
import rbc from './logos/rbc-borealis.svg?raw'
import uvic from './logos/uvic.svg?raw'
import mlh from './logos/mlh.svg?raw'
import airflow from './logos/airflow.svg?raw'

/**
 * Official organisation marks, reduced to one ink (currentColor) so they sit in any variant's palette.
 * Sources: Amazon (Wikimedia Commons, official wordmark), RBC Borealis (rbcborealis.com), UVic (uvic.ca shield),
 * MLH and Apache Airflow (simple-icons). Pear Care has no public SVG, so it gets a typographic mark.
 * `scale` balances optical size: wide wordmarks run shorter so every mark reads at the same weight.
 */
export type OrgKey = 'amazon' | 'rbc' | 'uvic' | 'mlh' | 'airflow' | 'pearcare'
const marks: Record<Exclude<OrgKey, 'pearcare'>, { svg: string; scale: number; label: string }> = {
  amazon: { svg: amazon, scale: 1, label: 'Amazon' },
  rbc: { svg: rbc, scale: 0.62, label: 'RBC Borealis' },
  uvic: { svg: uvic, scale: 1.25, label: 'University of Victoria' },
  mlh: { svg: mlh, scale: 1.1, label: 'Major League Hacking' },
  airflow: { svg: airflow, scale: 1.1, label: 'Apache Airflow' },
}

export function OrgLogo({ org, className, height = 18 }: { org: OrgKey; className?: string; height?: number }) {
  if (org === 'pearcare')
    return (
      <span className={`s-logo s-logo--type ${className ?? ''}`} style={{ ['--h' as string]: `${height}px` }} role="img" aria-label="Pear Care">
        pear<b>care</b>
      </span>
    )
  const m = marks[org]
  return (
    <span
      className={`s-logo ${className ?? ''}`}
      style={{ ['--h' as string]: `${Math.round(height * m.scale)}px` }}
      role="img"
      aria-label={m.label}
      dangerouslySetInnerHTML={{ __html: m.svg }}
    />
  )
}
