import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { research } from '../../content/site'
import { useMotionPrefs } from '../../lib/motion'

/**
 * P14: sticky ToC with a sliding indicator, wrapped around the shared ResearchArticle.
 * The article's sections have no ids, so they're assigned here after mount (the list itself is static and SSR-safe).
 */
export function Toc({ slug }: { slug: string }) {
  const i = research.findIndex((r) => r.slug === slug)
  const r = research[i]
  const m = useMotionPrefs()
  const items = [
    { id: 'question', label: 'Question' },
    ...(r.demo ? [{ id: 'figure', label: 'Fig. 1, live' }] : []),
    { id: 'method', label: 'Method' },
    { id: 'result', label: 'Result' },
    { id: 'next', label: "What I'd do next" },
  ]
  const [active, setActive] = useState(items[0].id)

  useEffect(() => {
    const art = document.querySelector('.v1 .s-article')
    if (!art) return
    const secs = [...art.querySelectorAll<HTMLElement>(':scope > .s-sec')]
    const fig = art.querySelector<HTMLElement>(':scope > .s-figure')
    const ids = ['question', 'method', 'result', 'next']
    secs.slice(0, 4).forEach((s, j) => (s.id = ids[j]))
    if (fig) fig.id = 'figure'
    const els = items.map((x) => document.getElementById(x.id)).filter(Boolean) as HTMLElement[]
    const vis = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => vis.set(e.target.id, e.isIntersecting))
        const first = els.find((el) => vis.get(el.id))
        if (first) setActive(first.id)
      },
      { rootMargin: '-18% 0px -62% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return (
    <nav className="v1-toc" aria-label="On this page">
      <p className="v1-toc__k">
        Note No. {i + 1} <span>of {research.length}</span>
      </p>
      <ol>
        {items.map((x) => (
          <li key={x.id}>
            <a
              href={`#${x.id}`}
              aria-current={active === x.id ? 'location' : undefined}
              onClick={(e) => {
                const el = document.getElementById(x.id)
                if (!el) return
                e.preventDefault()
                el.scrollIntoView({ behavior: m.reduced ? 'auto' : 'smooth', block: 'start' })
                history.replaceState(null, '', `#${x.id}`)
                setActive(x.id)
              }}
            >
              {active === x.id && <motion.span layoutId="v1-toc-bar" className="v1-toc__bar" transition={m.spring(520)} />}
              {x.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
