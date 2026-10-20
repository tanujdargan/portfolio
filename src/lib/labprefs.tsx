import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { contentFlags, type FlagKey, type Flags } from '../content/flags'
import { useRouter } from './router'

// Lab-only overrides: content flags and the "unverified" badge layer. Production always uses contentFlags.
interface LabPrefs {
  flags: Flags
  setFlag: (k: FlagKey, v: boolean) => void
  badges: boolean
  setBadges: (v: boolean) => void
}
const Ctx = createContext<LabPrefs>({ flags: contentFlags, setFlag: () => {}, badges: false, setBadges: () => {} })

export function LabPrefsProvider({ children }: { children: ReactNode }) {
  const { path } = useRouter()
  const inLab = path.startsWith('/lab')
  const [over, setOver] = useState<Partial<Flags>>({})
  const [badges, setBadgesState] = useState(false)

  // Read overrides after mount so SSR and hydration both render the defaults.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('show')
    const saved = JSON.parse(localStorage.getItem('lab-flags') || '{}') as Partial<Flags>
    if (q !== null) for (const k of Object.keys(contentFlags) as FlagKey[]) saved[k] = q.split(',').includes(k)
    setOver(saved)
    setBadgesState(localStorage.getItem('lab-badges') === '1') // off unless turned on in the lab
  }, [])

  const value = useMemo<LabPrefs>(() => {
    const flags = inLab ? { ...contentFlags, ...over } : contentFlags
    return {
      flags,
      setFlag: (k, v) => {
        const next = { ...over, [k]: v }
        localStorage.setItem('lab-flags', JSON.stringify(next))
        setOver(next)
      },
      badges: inLab && badges,
      setBadges: (v) => {
        localStorage.setItem('lab-badges', v ? '1' : '0')
        setBadgesState(v)
      },
    }
  }, [over, badges, inLab])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useLabPrefs = () => useContext(Ctx)
export const useFlags = () => useContext(Ctx).flags

/** Renders children only when the content flag is on. */
export function Show({ when, children }: { when: FlagKey; children: ReactNode }) {
  return useFlags()[when] ? <>{children}</> : null
}
