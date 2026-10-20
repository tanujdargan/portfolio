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
  { id: 's2', name: 'Story', pitch: 'Round 11: S1 read like a resume, top to bottom: a short about, then one timeline with big logos (jobs, then research) with demos inline, then outside work.', load: () => import('./variants/s2') },
  { id: 's1', name: 'Long form', pitch: 'Round 10: roomy, scrollable; each project gets its own section with the live demo beside it, then a long "outside work" part.', load: () => import('./variants/s1') },
  { id: 'q1', name: 'Still', pitch: 'Round 9: one quiet column of plain text; the name comes into focus, then project rows open in place on hover.', load: () => import('./variants/q1') },
  { id: 'q2', name: 'Settle', pitch: 'Round 9: the name settles from mid-screen into a quiet column; hover shows a result, click opens the live demo.', load: () => import('./variants/q2') },
  { id: 'n1', name: 'Resolve', pitch: 'Round 8: the name decodes out of noise, then a calm site; project rows expand on hover to show the live demo.', load: () => import('./variants/n1') },
  { id: 'n2', name: 'Lift', pitch: 'Round 8: the name fills the screen, then shrinks into the header; hovering a project floats its live demo beside the list.', load: () => import('./variants/n2') },
  { id: 'n3', name: 'Reveal', pitch: 'Round 8: a short shutter-and-count opening, then large project cards whose picture turns into the live demo on hover.', load: () => import('./variants/n3') },
  { id: 'main', name: 'Document', pitch: 'Phase 3 baseline: proof line + live steering demo, previews that open in place, one typeface, light/dark.', load: () => import('./variants/main') },
]

// The variant served at "/" until Tanuj picks one.
export const PROD_VARIANT = 'main'

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
  if (path === '/lab') return { kind: 'lab-index', head: { title: 'Design Lab · Tanuj Dargan', description: 'Variant switcher.', path } }
  const m = path.match(/^\/lab\/(main|[a-z]\d+[a-z]?)(\/.*)?$/)
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
    return { title: `${r.title} · ${person.name}`, description: r.question, path }
  }
  if (page.kind === 'beri') return { title: `Beri, a case study · ${person.name}`, description: 'Beri: a food app I’m building for iOS, and how its redesign was run.', path }
  if (page.kind === 'notfound') return { title: `Not found · ${person.name}`, description: seo.description, path }
  return { title: seo.title, description: seo.description, path }
}

/** Every path the prerender step writes to disk. */
export function allPaths(): string[] {
  const inner = ['/', '/beri', ...research.map((r) => `/research/${r.slug}`)]
  // Production only ships /beri when its content flag is on; the lab always has it for previews.
  const prod = inner.filter((p) => p !== '/beri' || contentFlags.beri)
  return [...prod, '/lab', ...variants.flatMap((v) => inner.map((p) => `/lab/${v.id}${p === '/' ? '' : p}`))]
}
