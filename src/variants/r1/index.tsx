/*
 * R1 "Index". Round 5. The work list is the first screen, in big type (Dennis Snellenberg's work index, Ravi Klaassens'
 * ruled lists and linear() springs). Hover previews a piece; a click opens it in place with the live demo.
 * Type: Instrument Sans, condensed for display, plus IBM Plex Mono for results. One red, on near-black.
 */
import type { VariantProps } from '../../routes'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import { Header } from './chrome'
import { Home } from './Home'
import './r1.css'

export default function R1({ page, base }: VariantProps) {
  return (
    <div className="r1" data-page={page.kind}>
      <a className="r1-skip" href="#r1-main">
        Skip to content
      </a>
      <Header base={base} />
      <main id="r1-main" tabIndex={-1}>
        {page.kind === 'home' && <Home base={base} />}
        {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
        {page.kind === 'beri' && <BeriCaseStudy base={base} />}
        {page.kind === 'notfound' && (
          <section className="r1-404">
            <p className="r1-label">404</p>
            <h1>Nothing here.</h1>
            <Link to={`${base}/`} className="r1-more">
              Back to the index <span aria-hidden="true">→</span>
            </Link>
          </section>
        )}
      </main>
    </div>
  )
}
