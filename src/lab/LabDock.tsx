import { useEffect } from 'react'
import { useRouter, Link } from '../lib/router'
import { LEVELS, useMotionPrefs, type MotionLevel } from '../lib/motion'
import { variants, type Page } from '../routes'
import { useLabPrefs } from '../lib/labprefs'
import { flagLabels, type FlagKey } from '../content/flags'
import './lab.css'

export function suffix(page: Page) {
  return page.kind === 'research' ? `/research/${page.slug}` : page.kind === 'beri' ? '/beri' : ''
}

export default function LabDock({ variant, page }: { variant: string; page: Page }) {
  const { navigate } = useRouter()
  const m = useMotionPrefs()
  const prefs = useLabPrefs()
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
      <Link to="/lab" className="lab-dock__home" title="All variants">
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
      {/* Content flags + unverified badges. <details> keeps it native and keyboard-friendly on every device. */}
      <details className="lab-dock__pop">
        <summary>Content</summary>
        <div className="lab-dock__menu" role="group" aria-label="Content flags">
          <p>Hidden by default · src/content/flags.ts</p>
          {(Object.keys(flagLabels) as FlagKey[]).map((k) => (
            <label key={k}>
              <input type="checkbox" checked={prefs.flags[k]} onChange={(e) => prefs.setFlag(k, e.target.checked)} />
              {flagLabels[k]}
            </label>
          ))}
          <hr />
          <label>
            <input type="checkbox" checked={prefs.badges} onChange={(e) => prefs.setBadges(e.target.checked)} />
            <span className="s-flag" style={{ marginLeft: 0 }}>unverified</span> badges
          </label>
        </div>
      </details>
      {m.reduced && <span className="lab-dock__note">Reduced motion on</span>}
    </div>
  )
}
