import { useRouter } from '../lib/router'

/** Lab-only marker for unverified content. Renders nothing in production paths. */
export function Flag({ note }: { note: string }) {
  const { path } = useRouter()
  if (!path.startsWith('/lab')) return null
  return (
    <span className="s-flag" title={`Unverified: ${note}`} aria-label={`Unverified: ${note}`}>
      ?
    </span>
  )
}
