import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import type { VariantProps } from '../../routes'
import { links, person, beri } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Link } from '../../lib/router'
import { Home } from './Home'
import { Article } from './Article'
import { pick } from './Home'
import { versions as headerV } from './alt/header'
import { versions as articleV } from './alt/article'
import './main.css'

export function Socials({ big = false }: { big?: boolean }) {
  return (
    <ul className="m-socials" data-big={big || undefined}>
      {(['github', 'linkedin', 'x', 'email'] as const).map((k) => {
        const l = links[k]
        const ext = !l.href.startsWith('mailto:')
        return (
          <li key={k}>
            <a href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={l.label} title={l.label}>
              <LinkIcon k={k} size={big ? 18 : 17} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}

export const ResumeButton = ({ big = false }: { big?: boolean }) => (
  <a className="m-resume" data-big={big || undefined} href={links.resume.href} target="_blank" rel="noopener">
    <LinkIcon k="resume" size={16} />
    Resume
  </a>
)

/** Light/dark follows the system until the visitor picks one; index.html applies a saved pick before first paint. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null)
  useEffect(() => {
    const t = document.documentElement.dataset.theme
    setDark(t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])
  return (
    <button
      type="button"
      className="m-icon-btn m-theme"
      aria-label="Dark theme"
      aria-pressed={dark ?? undefined}
      onClick={() => {
        const next = !dark
        setDark(next)
        document.documentElement.dataset.theme = next ? 'dark' : 'light'
        try {
          localStorage.setItem('theme', next ? 'dark' : 'light')
        } catch {
          /* private mode: the choice lasts for this page */
        }
      }}
    >
      <Sun size={17} strokeWidth={1.6} aria-hidden="true" className="m-theme__sun" />
      <Moon size={17} strokeWidth={1.6} aria-hidden="true" className="m-theme__moon" />
    </button>
  )
}

export function Header({ home }: { home: boolean }) {
  const at = (id: string) => (home ? `#${id}` : `/#${id}`)
  return (
    <header className="m-header">
      <div className="m-wrap m-header__in">
        <Link to="/" className="m-wordmark">
          {person.name}
        </Link>
        <nav className="m-nav" aria-label="Sections">
          <a href={at('work')}>Work</a>
          <a href={at('experience')}>Experience</a>
          <a href={at('contact')}>Contact</a>
        </nav>
        <div className="m-header__end">
          <ResumeButton />
          <div className="m-header__socials">
            <Socials />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="m-footer">
      <div className="m-wrap m-footer__in">
        <span>© 2026 {person.name}</span>
        <span>Demos run in your browser. Labels say what’s real.</span>
      </div>
    </footer>
  )
}

export default function Main({ page, gate }: VariantProps) {
  return (
    <div className="m">
      <a className="m-skip" href="#main">
        Skip to content
      </a>
      {(() => {
        const H = headerV[pick(gate, 'header') ?? ''] ?? Header
        return <H home={page.kind === 'home'} />
      })()}
      <main id="main">
        {page.kind === 'home' && <Home gate={gate} />}
        {page.kind === 'research' &&
          (() => {
            const A = articleV[pick(gate, 'article') ?? ''] ?? Article
            return <A slug={page.slug} />
          })()}
        {page.kind === 'beri' && (
          <section className="m-wrap m-plain">
            <h1 className="m-h1">Beri</h1>
            <p className="m-lede">{beri.oneLiner}</p>
            <p>
              <a className="m-link" href={beri.url} target="_blank" rel="noopener">
                getberi.com ↗
              </a>
            </p>
          </section>
        )}
        {page.kind === 'notfound' && (
          <section className="m-wrap m-plain">
            <h1 className="m-h1">Nothing here</h1>
            <p className="m-lede">
              That page doesn’t exist. <Link to="/" className="m-link">Back to the work</Link>.
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
