import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import type { VariantProps } from '../../routes'
import { Link } from '../../lib/router'
import { Top, Foot } from './Chrome'
import { Home } from './Home'
import { Article } from './Article'
import './h4.css'

// H4 · Mission control, done honestly. The home page is a calm operations view: a bento of panels, each live or
// real and titled by its outcome. The only things that move are data.
export default function H4({ page, base }: VariantProps) {
  return (
    <div className="h4">
      <a className="h4-skip" href="#h4-main">
        Skip to content
      </a>
      <Top base={base} />
      <main id="h4-main" className="h4-wrap" tabIndex={-1}>
        {page.kind === 'home' && <Home base={base} />}
        {page.kind === 'research' && <Article slug={page.slug} base={base} />}
        {page.kind === 'beri' && (
          <section className="h4-simple">
            <h1>Beri</h1>
            <p>A food app I’m building for iOS. The details live on its own site.</p>
            <div className="h4-acts">
              <a className="h4-btn h4-btn--solid" href="https://getberi.com" target="_blank" rel="noopener">
                getberi.com <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              <Link to={base || '/'} className="h4-btn">
                <ArrowLeft size={16} aria-hidden="true" /> Back to the overview
              </Link>
            </div>
          </section>
        )}
        {page.kind === 'notfound' && (
          <section className="h4-simple">
            <h1>Nothing at this address</h1>
            <p>The page may have moved. Everything is one step from the overview.</p>
            <div className="h4-acts">
              <Link to={base || '/'} className="h4-btn h4-btn--solid">
                <ArrowLeft size={16} aria-hidden="true" /> Back to the overview
              </Link>
            </div>
          </section>
        )}
        <Foot />
      </main>
    </div>
  )
}
