import { useEffect, useRef, useState, type FocusEvent } from 'react'

// "One lit row": on a fine pointer, hover or focus lights a row and the rest dim; on touch, the row crossing the middle
// of the viewport lights. Rows register with `bind(i)`; the list spreads `list`.
export function useLit<T extends HTMLElement = HTMLLIElement>(n: number) {
  const [lit, setLit] = useState<number | null>(null)
  const refs = useRef<(T | null)[]>([])
  useEffect(() => {
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          const i = +((e.target as HTMLElement).dataset.i ?? -1)
          if (e.isIntersecting) setLit(i)
          else setLit((cur) => (cur === i ? null : cur))
        }
      },
      { rootMargin: '-46% 0px -46% 0px' },
    )
    refs.current.slice(0, n).forEach((r) => r && io.observe(r))
    return () => io.disconnect()
  }, [n])
  return {
    lit,
    list: {
      'data-has-lit': lit !== null || undefined,
      onPointerLeave: (e: React.PointerEvent) => e.pointerType === 'mouse' && setLit(null),
      onBlur: (e: FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setLit(null)
      },
    },
    bind: (i: number) => ({
      'data-i': i,
      'data-lit': lit === i || undefined,
      ref: (el: T | null) => {
        refs.current[i] = el
      },
      onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && setLit(i),
      onFocus: () => setLit(i),
    }),
  }
}
