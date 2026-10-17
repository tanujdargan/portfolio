/*
 * R2 "Bento". Round 5. Every piece of work is a live tile on the first screen: poke the tiny visual, or open the tile
 * (shared-element morph) for the finding, the full demo and the write-up.
 * References: Raycast (pointer-lit borders, glossy dark), ElevenLabs (soft colour orbs), Black Forest Labs (mono labels).
 * Type: Mona Sans, set expanded and heavy for the name and results, plus JetBrains Mono for labels. Dark only.
 */
import type { VariantProps } from '../../routes'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import { Home } from './Home'
import './r2.css'

function Back({ base }: { base: string }) {
  return (
    <nav className="r2-bar" aria-label="Site">
      <Link to={`${base}/`} className="r2-bar__home">
        Tanuj Dargan
      </Link>
      <Link to={`${base}/`} className="r2-btn r2-btn--ghost">
        ← All work
      </Link>
    </nav>
  )
}

export default function R2({ page, base }: VariantProps) {
  return (
    <div className="r2" data-page={page.kind} data-lab={base ? '' : undefined}>
      <a className="r2-skip" href="#r2-main">
        Skip to content
      </a>
      {page.kind !== 'home' && <Back base={base} />}
      <main id="r2-main">
        {page.kind === 'home' && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="r2-page">
            <ResearchArticle key={page.slug} slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="r2-page">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="r2-page r2-404">
            <h1 className="r2-name">Nothing here.</h1>
            <p>
              That page doesn’t exist. <Link to={`${base}/`}>Back to the work</Link>.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
