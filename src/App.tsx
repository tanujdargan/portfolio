import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { flushSync } from 'react-dom'
import { Analytics } from '@vercel/analytics/react'
import { RouterCtx } from './lib/router'
import { MotionProvider } from './lib/motion'
import { LabPrefsProvider } from './lib/labprefs'
import { resolve, type Resolved, type VariantProps } from './routes'
import './base.css'

export interface Loaded {
  path: string
  r: Resolved
  C: ComponentType<VariantProps> | null
}

export async function load(path: string): Promise<Loaded> {
  const r = resolve(path)
  const C = (await r.load()).default
  return { path, r, C }
}

export default function App({ initial }: { initial: Loaded }) {
  const [state, setState] = useState(initial)

  const go = useCallback(async (to: string, push: boolean) => {
    const url = new URL(to, location.href)
    const next = await load(url.pathname)
    const commit = () => {
      flushSync(() => setState(next))
      if (push) history.pushState(null, '', url.pathname + url.search + url.hash)
      if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView()
      else if (push) window.scrollTo(0, 0)
      document.title = next.r.head.title
      document.querySelector('meta[name="description"]')?.setAttribute('content', next.r.head.description)
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
    if (doc.startViewTransition && !reduced) doc.startViewTransition(commit)
    else commit()
  }, [])

  useEffect(() => {
    const onPop = () => go(location.pathname + location.hash, false)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [go])

  const { r, C, path } = state
  return (
    <RouterCtx.Provider value={{ path, navigate: (to) => go(to, true) }}>
      <MotionProvider>
        <LabPrefsProvider>
          {C && <C page={r.page} base={r.base} />}
          <Analytics />
        </LabPrefsProvider>
      </MotionProvider>
    </RouterCtx.Provider>
  )
}
