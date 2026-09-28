import type { ComponentType } from 'react'
import { research, seo, person } from './content/site'
import { contentFlags } from './content/flags'

export type Page = { kind: 'home' } | { kind: 'research'; slug: string } | { kind: 'beri' } | { kind: 'notfound' }
export interface VariantProps {
  page: Page
  /** prefix for internal links: '' in production, '/lab/v1' in the lab */
  base: string
}
type Loader = () => Promise<{ default: ComponentType<VariantProps> }>

export const variants: { id: string; name: string; pitch: string; load: Loader }[] = [
  // Convergence round: syntheses of v4b, v6 and v9, finished to a ship-today bar. Listed first.
  { id: 'c1', name: 'Dusk', pitch: 'The Toronto timelapse scrubs golden hour into night as you scroll from now to 2022.', load: () => import('./variants/c1') },
  { id: 'c2', name: 'Instrument', pitch: 'Research-first and calm: real instruments at full measure, a dated index with logos.', load: () => import('./variants/c2') },
  { id: 'c3', name: 'City of points', pitch: 'The skyline at night dissolves into the embedding space of the work.', load: () => import('./variants/c3') },
  { id: 'c4', name: 'Field notes', pitch: 'A single-column notebook of the work, with photographs as the chapter plates.', load: () => import('./variants/c4') },
  { id: 'v0', name: 'Refined', pitch: 'The current structure, fixed.', load: () => import('./variants/v0') },
  { id: 'v1', name: 'Research lab', pitch: 'Demos and write-ups first. Editorial type on dark.', load: () => import('./variants/v1') },
  { id: 'v2', name: 'Design engineer', pitch: 'Small, exact, and alive under the cursor.', load: () => import('./variants/v2') },
  { id: 'v3', name: 'Vector space', pitch: 'The work as points in a space you can fly through.', load: () => import('./variants/v3') },
  { id: 'v4', name: 'Narrative', pitch: 'Dehradun to now, told through the work.', load: () => import('./variants/v4') },
  { id: 'v5', name: 'Model card', pitch: 'Tanuj, documented like a model release.', load: () => import('./variants/v5') },
  { id: 'v4b', name: 'Narrative: the work', pitch: 'The same scroll story, told only through projects and research over time.', load: () => import('./variants/v4b') },
  { id: 'v6', name: 'Latent space', pitch: 'Fly through the embedding space of the work; steering vectors bend it.', load: () => import('./variants/v6') },
  { id: 'v7', name: 'Mission control', pitch: 'MarmotSat telemetry: the work as spacecraft subsystems, live.', load: () => import('./variants/v7') },
  { id: 'v8', name: 'Billion vectors', pitch: 'A GPU-scale particle index; retrieval is the navigation.', load: () => import('./variants/v8') },
  { id: 'v9', name: 'Depth', pitch: 'A generative ocean where depth is time and the work surfaces as you dive.', load: () => import('./variants/v9') },
]

// The variant served at "/" until Phase 5 picks one.
export const PROD_VARIANT = 'v0'

export type Resolved =
  | { kind: 'lab-index'; head: Head }
  | { kind: 'variant'; variant: string; base: string; page: Page; head: Head; load: Loader }

export interface Head {
  title: string
  description: string
  path: string
}

export function resolve(pathname: string): Resolved {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/lab') return { kind: 'lab-index', head: { title: 'Design Lab — Tanuj Dargan', description: 'Variant switcher.', path } }
  const m = path.match(/^\/lab\/(v\d+[a-z]?|c\d+)(\/.*)?$/)
  const id = m ? m[1] : PROD_VARIANT
  const rest = m ? m[2] || '/' : path
  const v = variants.find((x) => x.id === id) ?? variants[0]
  const base = m ? `/lab/${v.id}` : ''
  const page = pageFor(rest)
  return { kind: 'variant', variant: v.id, base, page, load: v.load, head: headFor(page, path) }
}

function pageFor(rest: string): Page {
  if (rest === '/') return { kind: 'home' }
  if (rest === '/beri') return { kind: 'beri' }
  const r = rest.match(/^\/research\/([a-z0-9-]+)$/)
  if (r && research.some((x) => x.slug === r[1])) return { kind: 'research', slug: r[1] }
  return { kind: 'notfound' }
}

function headFor(page: Page, path: string): Head {
  if (page.kind === 'research') {
    const r = research.find((x) => x.slug === page.slug)!
    return { title: `${r.title} — ${person.name}`, description: r.question, path }
  }
  if (page.kind === 'beri') return { title: `Beri, a case study — ${person.name}`, description: 'Co-founding Beri: a native iOS food app, and how its redesign was run.', path }
  if (page.kind === 'notfound') return { title: `Not found — ${person.name}`, description: seo.description, path }
  return { title: seo.title, description: seo.description, path }
}

/** Every path the prerender step writes to disk. */
export function allPaths(): string[] {
  const inner = ['/', '/beri', ...research.map((r) => `/research/${r.slug}`)]
  // Production only ships /beri when its content flag is on; the lab always has it for previews.
  const prod = inner.filter((p) => p !== '/beri' || contentFlags.beri)
  return [...prod, '/lab', ...variants.flatMap((v) => inner.map((p) => `/lab/${v.id}${p === '/' ? '' : p}`))]
}
