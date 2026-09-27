import { useEffect } from 'react'
import { useRouter, Link } from '../lib/router'
import { LEVELS, useMotionPrefs, type MotionLevel } from '../lib/motion'
import { variants, type Page } from '../routes'
import './lab.css'

export function suffix(page: Page) {
  return page.kind === 'research' ? `/research/${page.slug}` : page.kind === 'beri' ? '/beri' : ''
}

export default function LabDock({ variant, page }: { variant: string; page: Page }) {
  const { navigate } = useRouter()
  const m = useMotionPrefs()
  const to = (id: string) => `/lab/${id}${suffix(page)}`
  const i = variants.findIndex((v) => v.id === variant)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      if (e.key === ']') navigate(to(variants[(i + 1) % variants.length].id))
      if (e.key === '[') navigate(to(variants[(i - 1 + variants.length) % variants.length].id))
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  return (
    <div className="lab-dock" role="region" aria-label="Design lab controls">
      <Link to="/lab" className="lab-dock__home" aria-label="All variants">
        Lab
      </Link>
      <div className="lab-dock__seg lab-dock__wide" role="group" aria-label="Variant">
        {variants.map((v) => (
          <Link key={v.id} to={to(v.id)} aria-current={v.id === variant ? 'page' : undefined} title={v.name}>
            {v.id.toUpperCase()}
          </Link>
        ))}
      </div>
      <div className="lab-dock__seg lab-dock__wide" role="group" aria-label="Motion intensity">
        {LEVELS.map((l) => (
          <button key={l} aria-pressed={m.level === l} onClick={() => m.setLevel(l)}>
            {l[0].toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>
      {/* Native pickers on phones: iOS wheels beat any custom menu here. */}
      <label className="lab-dock__narrow">
        <span className="sr-only">Variant</span>
        <select value={variant} onChange={(e) => navigate(to(e.target.value))}>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id.toUpperCase()} {v.name}
            </option>
          ))}
        </select>
      </label>
      <label className="lab-dock__narrow">
        <span className="sr-only">Motion</span>
        <select value={m.level} onChange={(e) => m.setLevel(e.target.value as MotionLevel)}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {m.reduced && <span className="lab-dock__note">Reduced motion on</span>}
    </div>
  )
}
