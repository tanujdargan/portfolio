/*
 * R3 "Palette". Round 5, from Tanuj's Raycast pick.
 * The page is an already-open command palette: every piece of work is a row with its result, the preview pane
 * follows the selection, Enter opens. Mobile is the same list without the pane; a tap expands a row in place.
 * Type: Instrument Sans for the UI, Mona Sans (wide) for the name, JetBrains Mono for results and keycaps.
 */
import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { VariantProps } from '../../routes'
import { person } from '../../content/site'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link, useRouter } from '../../lib/router'
import { Palette, Key } from './Palette'
import './r3.css'

function Top() {
  return (
    <header className="r3-top">
      <h1 className="r3-top__name">
        <span className="r3-top__mark" aria-hidden="true">
          T
        </span>
        {person.name}
      </h1>
      <p className="r3-top__line">CS at UVic. I ship production ML and research interpretability.</p>
    </header>
  )
}

function Sub({ base, children }: { base: string; children: React.ReactNode }) {
  const { navigate } = useRouter()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === 'Escape' && !t.closest('input, textarea, select, [role="slider"]')) navigate(`${base}/`)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [base, navigate])
  return (
    <div className="r3-sub">
      <nav className="r3-sub__nav" aria-label="Back">
        <Link to={`${base}/`} className="r3-sub__back">
          <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
          All work
          <Key wide>esc</Key>
        </Link>
        <span className="r3-sub__name">{person.name}</span>
      </nav>
      <div className="r3-sub__body">{children}</div>
    </div>
  )
}

export default function R3({ page, base }: VariantProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="r3" data-page={page.kind}>
        <div className="r3-field" aria-hidden="true">
          <span className="r3-field__glow" />
          <span className="r3-field__beams" />
        </div>
        {page.kind === 'home' && (
          <main className="r3-home">
            <Top />
            <Palette base={base} />
          </main>
        )}
        {page.kind === 'research' && (
          <Sub base={base}>
            <main>
              <ResearchArticle slug={page.slug} base={base} />
            </main>
          </Sub>
        )}
        {page.kind === 'beri' && (
          <Sub base={base}>
            <main>
              <BeriCaseStudy base={base} />
            </main>
          </Sub>
        )}
        {page.kind === 'notfound' && (
          <Sub base={base}>
            <main className="r3-404">
              <p className="r3-404__code">404</p>
              <h1>No results for this page.</h1>
              <p>
                <Link to={`${base}/`}>Back to the palette</Link>
              </p>
            </main>
          </Sub>
        )}
      </div>
    </MotionConfig>
  )
}
