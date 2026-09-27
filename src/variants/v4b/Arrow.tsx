/** Neither face ships arrow glyphs in its latin subset, so arrows are drawn. */
export function Arrow({ down = false, out = false }: { down?: boolean; out?: boolean }) {
  return (
    <svg className="v4b-arrow" width="0.9em" height="0.9em" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: down ? 'rotate(90deg)' : out ? 'rotate(-45deg)' : undefined }}>
      <path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
