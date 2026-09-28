import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { DemoKey } from '../content/site'
import './demos.css'

type P = { compact?: boolean; hero?: boolean }
const impl: Record<Exclude<DemoKey, null>, React.LazyExoticComponent<React.ComponentType<P>>> = {
  steering: lazy(() => import('./SteeringDemo')),
  lossmask: lazy(() => import('./LossMaskDemo')),
  es: lazy(() => import('./ESDemo')),
  retrieval: lazy(() => import('./RetrievalDemo')),
  ocean: lazy(() => import('./OceanDemo')),
  orbit: lazy(() => import('./OrbitDemo')),
}

// Reserved heights keep layout stable while the chunk loads (CLS = 0).
const minH: Record<Exclude<DemoKey, null>, string> = {
  steering: 'var(--demo-h-steering, 560px)',
  lossmask: 'var(--demo-h-lossmask, 380px)',
  es: 'var(--demo-h-es, 460px)',
  retrieval: 'var(--demo-h-retrieval, 460px)',
  ocean: 'var(--demo-h-ocean, 520px)',
  orbit: 'var(--demo-h-orbit, 560px)',
}

/** Loads a demo only when it's about to scroll into view. */
export function Demo({ kind, compact = false, hero = false }: { kind: Exclude<DemoKey, null>; compact?: boolean; hero?: boolean }) {
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
          <C compact={compact} hero={hero} />
        </Suspense>
      )}
    </div>
  )
}
