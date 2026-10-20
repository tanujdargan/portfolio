import { createElement, Fragment, type CSSProperties } from 'react'

/**
 * SSR-safe split text for type motion. Screen readers get the plain string once; the visual copy is split into
 * words (each inside a clip mask, so a translate reads as a line/word reveal) or characters, each carrying --i
 * (its index) and, for chars, --w (its word index). Variants animate `.s-split__i` / `.s-split__c` in CSS.
 * LCP rule: start keyframes at opacity 0.01, never 0.
 */
export function Split({
  text,
  by = 'word',
  as = 'span',
  className,
  style,
  id,
  offset = 0,
}: {
  text: string
  by?: 'word' | 'char'
  as?: string
  className?: string
  style?: CSSProperties
  id?: string
  /** added to every --i, to chain several Splits into one stagger */
  offset?: number
}) {
  const words = text.split(' ')
  let c = offset
  const visual = words.map((w, wi) => {
    const inner =
      by === 'char'
        ? Array.from(w).map((ch, ci) => (
            <span key={ci} className="s-split__c" style={{ ['--i' as string]: c++, ['--w' as string]: wi + offset }}>
              {ch}
            </span>
          ))
        : w
    return (
      <Fragment key={wi}>
      <span className="s-split__w">
        {by === 'word' ? (
          <span className="s-split__i" style={{ ['--i' as string]: wi + offset }}>
            {inner}
          </span>
        ) : (
          inner
        )}
      </span>
      {wi < words.length - 1 ? ' ' : null}
      </Fragment>
    )
  })
  return createElement(
    as,
    { className: `s-split ${className ?? ''}`, style, id, 'data-by': by },
    <span className="sr-only">{text}</span>,
    <span aria-hidden="true" className="s-split__v">
      {visual}
    </span>,
  )
}
