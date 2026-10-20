import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { DemoKey } from '../content/site'
import './demos.css'

// unlearn is S2-only, so it stays out of DemoKey (which drives posters and work pages).
type Kind = Exclude<DemoKey, null> | 'unlearn'
type P = { compact?: boolean; hero?: boolean; rest?: number; finding?: boolean }
const impl: Record<Kind, React.LazyExoticComponent<React.ComponentType<P>>> = {
  steering: lazy(() => import('./SteeringDemo')),
  lossmask: lazy(() => import('./LossMaskDemo')),
  es: lazy(() => import('./ESDemo')),
  retrieval: lazy(() => import('./RetrievalDemo')),
  ocean: lazy(() => import('./OceanDemo')),
  orbit: lazy(() => import('./OrbitDemo')),
  unlearn: lazy(() => import('./UnlearnDemo')),
}

// Reserved heights keep layout stable while the chunk loads (CLS = 0).
const minH: Record<Kind, string> = {
  steering: 'var(--demo-h-steering, 560px)',
  lossmask: 'var(--demo-h-lossmask, 380px)',
  es: 'var(--demo-h-es, 460px)',
  retrieval: 'var(--demo-h-retrieval, 460px)',
  ocean: 'var(--demo-h-ocean, 520px)',
  orbit: 'var(--demo-h-orbit, 640px)',
  unlearn: 'var(--demo-h-unlearn, 520px)',
}

/** Loads a demo only when it's about to scroll into view. */
export function Demo({ kind, compact = false, hero = false, ...opts }: { kind: Kind; compact?: boolean; hero?: boolean } & Pick<P, 'rest' | 'finding'>) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])
  const C = impl[kind]
  return (
    <div ref={ref} className="demo-slot" style={{ minHeight: minH[kind] }} data-compact={compact || undefined}>
      {near && (
        <Suspense fallback={<div className="demo-loading" aria-hidden="true" />}>
          <C compact={compact} hero={hero} {...opts} />
        </Suspense>
      )}
    </div>
  )
}
