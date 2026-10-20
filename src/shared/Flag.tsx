import { useLabPrefs } from '../lib/labprefs'

/** Lab-only "unverified" badge for claims that are assumptions or illustrative. Toggle in the lab dock. */
export function Flag({ note }: { note: string }) {
  const { badges } = useLabPrefs()
  if (!badges) return null
  return (
    <span className="s-flag" title={`Unverified: ${note}`} aria-label={`Unverified: ${note}`}>
      unverified
    </span>
  )
}
