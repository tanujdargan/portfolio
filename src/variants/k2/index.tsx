import { useCallback, useEffect, useState } from 'react'
import { FileText, Search } from 'lucide-react'
import type { VariantProps } from '../../routes'
import { Link } from '../../lib/router'
import { links } from '../../content/site'
import type { WorkKey } from '../../content/work'
import { BrandMark, Key, Sheet } from './bits'
import { Palette } from './Palette'
import { Hero } from './Hero'
import { Experience, Features } from './Features'
import { BeriPage, Contact, Footer, More, NotFound, ResearchPage } from './Pages'
import './k2.css'

// K2 · "Lab product": Tanuj presented the way a frontier AI company presents its product (Black Forest Labs,
// ElevenLabs, Raycast). Each piece of work is a live product window (Dovetail, Rox, Waabi, Giga, Chronicle patterns).

function Nav({ base, home, onPalette }: { base: string; home: boolean; onPalette: () => void }) {
  const h = (id: string) => (home ? `#${id}` : `${base}/#${id}`)
  const items = [
    { id: 'features', label: 'Work' },
    { id: 'more', label: 'Research' },
    { id: 'experience', label: 'Experience' },
    { id: 'contact', label: 'Contact' },
  ]
  return (
    <header className="k2-nav">
      <div className="k2-nav__bar">
        <Link to={`${base}/`} className="k2-brand" aria-label="Tanuj Dargan, home">
          <BrandMark />
          <span>Tanuj Dargan</span>
        </Link>
        <nav className="k2-nav__links" aria-label="Sections">
          {items.map((x) =>
            home ? (
              <a key={x.id} href={h(x.id)}>
                {x.label}
              </a>
            ) : (
              <Link key={x.id} to={h(x.id)}>
                {x.label}
              </Link>
            ),
          )}
        </nav>
        <div className="k2-nav__end">
          <button className="k2-search" onClick={onPalette} aria-label="Search work, resume and contact" aria-keyshortcuts="Meta+K Control+K">
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="k2-search__t">Search</span>
            <span className="k2-search__k" aria-hidden="true">
              <Key>⌘</Key>
              <Key>K</Key>
            </span>
          </button>
          <a className="k2-btn k2-btn--light k2-btn--nav" href={links.resume.href} target="_blank" rel="noopener">
            <FileText size={15} strokeWidth={1.8} aria-hidden="true" />
            Resume
          </a>
        </div>
      </div>
    </header>
  )
}

export default function K2({ page, base }: VariantProps) {
  const [pal, setPal] = useState(false)
  const [sheet, setSheet] = useState<WorkKey | null>(null)
  const openPal = useCallback(() => setPal(true), [])
  const home = page.kind === 'home'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPal((p) => !p)
      } else if (e.key === '/' && !typing && !pal) {
        e.preventDefault()
        setPal(true)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [pal])

  return (
    <div className="k2" data-page={page.kind}>
      <a className="k2-skip" href="#k2-main">
        Skip to content
      </a>
      <Nav base={base} home={home} onPalette={openPal} />
      <main id="k2-main" tabIndex={-1}>
        {home && (
          <>
            <Hero onPalette={openPal} />
            <Features base={base} open={setSheet} />
            <More base={base} />
            <Experience />
            <Contact onPalette={openPal} />
          </>
        )}
        {page.kind === 'research' && <ResearchPage key={page.slug} slug={page.slug} base={base} />}
        {page.kind === 'beri' && <BeriPage base={base} />}
        {page.kind === 'notfound' && <NotFound base={base} onPalette={openPal} />}
      </main>
      <Footer base={base} />
      <Palette open={pal} onClose={() => setPal(false)} base={base} onHome={home} />
      <Sheet kind={sheet} onClose={() => setSheet(null)} />
    </div>
  )
}
