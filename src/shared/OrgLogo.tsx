/**
 * Official organisation marks, drawn in one ink (currentColor) so they sit in any variant's palette.
 * The SVGs live in /public/logos and render through a CSS mask: one cached file per mark, a few bytes of HTML per use,
 * nothing in the JS bundle. (Inlining them doubled page HTML and tripled the core chunk.)
 * Sources: Amazon (Wikimedia Commons, official wordmark), RBC Borealis (rbcborealis.com), UVic (uvic.ca shield),
 * MLH and Apache Airflow (simple-icons). Pear Care has no public SVG, so it gets a typographic mark.
 * `scale` balances optical size: wide wordmarks run shorter so every mark reads at the same weight.
 */
export type OrgKey = 'amazon' | 'rbc' | 'uvic' | 'mlh' | 'airflow' | 'pearcare'
const marks: Record<Exclude<OrgKey, 'pearcare'>, { file: string; ratio: number; scale: number; label: string }> = {
  amazon: { file: 'amazon', ratio: 603 / 182, scale: 1, label: 'Amazon' },
  rbc: { file: 'rbc-borealis', ratio: 275 / 24.3, scale: 0.62, label: 'RBC Borealis' },
  uvic: { file: 'uvic', ratio: 184 / 64, scale: 1.25, label: 'University of Victoria' },
  mlh: { file: 'mlh', ratio: 1, scale: 1.1, label: 'Major League Hacking' },
  airflow: { file: 'airflow', ratio: 1, scale: 1.1, label: 'Apache Airflow' },
}

export function OrgLogo({ org, className, height = 18 }: { org: OrgKey; className?: string; height?: number }) {
  if (org === 'pearcare')
    return (
      <span className={`s-logo s-logo--type ${className ?? ''}`} style={{ ['--h' as string]: `${height}px` }} role="img" aria-label="Pear Care">
        pear<b>care</b>
      </span>
    )
  const m = marks[org]
  const h = Math.round(height * m.scale)
  return (
    <span
      className={`s-logo ${className ?? ''}`}
      role="img"
      aria-label={m.label}
      style={{ ['--h' as string]: `${h}px`, width: `${Math.round(h * m.ratio)}px`, ['--src' as string]: `url(/logos/${m.file}.svg)` }}
    />
  )
}
