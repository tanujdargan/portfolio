// Rolling digits: each digit is a 0–9 column translated on the compositor; other characters render as-is.
// Screen readers get the plain string once (the columns are aria-hidden).
const COL = '0123456789'.split('')

export function Roll({ text, label }: { text: string; label?: string }) {
  return (
    <span className="h1-roll">
      <span className="sr-only">{label ?? text}</span>
      <span aria-hidden="true" className="h1-roll__vis">
        {text.split('').map((ch, j, all) => {
          const i = all.length - j // key by place from the right, so 9.6 → 10.6 rolls the ones and adds a tens
          return /\d/.test(ch) ? (
            <span key={i} className="h1-roll__d" style={{ ['--d' as string]: +ch }}>
              <span className="h1-roll__col">
                {COL.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
              <span className="h1-roll__sizer">0</span>
            </span>
          ) : (
            <span key={i}>{ch === ' ' ? '\u00a0' : ch}</span>
          )
        })}
      </span>
    </span>
  )
}
