import type { ComponentType } from 'react'
import { research, seo, person } from './content/site'
import { contentFlags } from './content/flags'

export type Page = { kind: 'home' } | { kind: 'research'; slug: string } | { kind: 'beri' } | { kind: 'notfound' }
export interface VariantProps {
  page: Page
  /** prefix for internal links: '' in production, '/lab/v1' in the lab */
  base: string
  /** Phase 3 gate composition for the main site ('a1'…'b3'); temporary, removed once Tanuj picks */
  gate?: string
}
type Loader = () => Promise<{ default: ComponentType<VariantProps> }>

export const variants: { id: string; name: string; pitch: string; load: Loader }[] = [
  { id: 'v4b', name: 'Narrative: the work', pitch: 'Reference: the work over time, scroll-pinned axis.', load: () => import('./variants/v4b') },
  { id: 'v6', name: 'Latent space', pitch: 'Reference: real activations as the scene.', load: () => import('./variants/v6') },
  { id: 'p2', name: 'SWE classic', pitch: 'Reference: crisp two-column index, scannable in seconds.', load: () => import('./variants/p2') },
  { id: 's1', name: 'Index', pitch: 'The work as a live index: a lens previews each demo, rows open into exhibits in place.', load: () => import('./variants/s1') },
  { id: 's2', name: 'Latent', pitch: 'v6, elevated: drag α and a real model rewrites the hero while its activation space bends.', load: () => import('./variants/s2') },
  { id: 's3', name: 'Board', pitch: 'A zoomable research board: pan, zoom, fly into a work and it comes alive.', load: () => import('./variants/s3') },
  { id: 's4', name: 'Signal', pitch: 'A dithered shader screen that tunes between works; a lens shows the full signal.', load: () => import('./variants/s4') },
  { id: 's5', name: 'Spec', pitch: 'Sticky captions, one lit exhibit at a time, and a HUMAN/MACHINE switch.', load: () => import('./variants/s5') },
]

// The production site. Not in `variants`, so the lab index and dock stay as they were.
const main = { id: 'main', name: 'Main', pitch: 'The site.', load: () => import('./variants/main') }
export const PROD_VARIANT = 'main'
// ponytail: temporary comparison pages (REQUIREMENTS §4 gates, plus per-section versions 2–4 from the review round).
// /gate/<slot><n> renders the main site with that one section swapped; delete with the losing versions.
export const SLOTS = ['header', 'work', 'more', 'exp', 'contact', 'article'] as const
export const GATES = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', ...SLOTS.filter((s) => s !== 'article').flatMap((s) => [1, 2, 3, 4].map((n) => `${s}${n}`))]
const ARTICLE_GATES = [1, 2, 3, 4].flatMap((n) => research.map((r) => `/gate/article${n}/research/${r.slug}`))

export type Resolved =
  | { kind: 'lab-index'; head: Head }
  | { kind: 'variant'; variant: string; base: string; page: Page; head: Head; load: Loader; gate?: string }

export interface Head {
  title: string
  description: string
  path: string
}

export function resolve(pathname: string): Resolved {
  const path = pathname.replace(/\/+$/, '') || '/'
  const g = path.match(/^\/gate\/([a-z]+\d)(\/research\/[a-z0-9-]+)?$/)
  if (g) {
    const page = pageFor(g[2] || '/')
    return { kind: 'variant', variant: 'main', base: '', page, load: main.load, gate: g[1], head: headFor(page, path) }
  }
  if (path === '/lab') return { kind: 'lab-index', head: { title: 'Design Lab — Tanuj Dargan', description: 'Variant switcher.', path } }
  const m = path.match(/^\/lab\/(v\d+[a-z]?|p\d+|s\d+)(\/.*)?$/)
  const id = m ? m[1] : PROD_VARIANT
  const rest = m ? m[2] || '/' : path
  const v = [...variants, main].find((x) => x.id === id) ?? main
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
  if (page.kind === 'beri') return { title: `Beri, a case study — ${person.name}`, description: 'Beri: a food app I’m building for iOS, and how its redesign was run.', path }
  if (page.kind === 'notfound') return { title: `Not found — ${person.name}`, description: seo.description, path }
  return { title: seo.title, description: seo.description, path }
}

/** Every path the prerender step writes to disk. */
export function allPaths(): string[] {
  const inner = ['/', '/beri', ...research.map((r) => `/research/${r.slug}`)]
  // Production only ships /beri when its content flag is on; the lab always has it for previews.
  const prod = inner.filter((p) => p !== '/beri' || contentFlags.beri)
  return [...prod, ...GATES.map((g) => `/gate/${g}`), ...ARTICLE_GATES, '/lab', ...variants.flatMap((v) => inner.map((p) => `/lab/${v.id}${p === '/' ? '' : p}`))]
}
