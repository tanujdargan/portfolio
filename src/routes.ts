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
  { id: 'v4b', name: 'Narrative: the work', pitch: 'Reference: the work over time, scroll-pinned axis.', load: () => import('./variants/v4b') },
  { id: 'v6', name: 'Latent space', pitch: 'Reference: real activations as the scene.', load: () => import('./variants/v6') },
  { id: 'p2', name: 'SWE classic', pitch: 'Reference: crisp two-column index, scannable in seconds.', load: () => import('./variants/p2') },
  { id: 's1', name: 'Index', pitch: 'The work as a live index: a lens previews each demo, rows open into exhibits in place.', load: () => import('./variants/s1') },
  { id: 's2', name: 'Latent', pitch: 'v6, elevated: drag α and a real model rewrites the hero while its activation space bends.', load: () => import('./variants/s2') },
  { id: 's3', name: 'Board', pitch: 'A zoomable research board: pan, zoom, fly into a work and it comes alive.', load: () => import('./variants/s3') },
  { id: 's4', name: 'Signal', pitch: 'A dithered shader screen that tunes between works; a lens shows the full signal.', load: () => import('./variants/s4') },
  { id: 's5', name: 'Spec', pitch: 'Sticky captions, one lit exhibit at a time, and a HUMAN/MACHINE switch.', load: () => import('./variants/s5') },
  { id: 'k1', name: 'Craft', pitch: 'Round 4, from Tanuj’s picks: agency-grade motion (Dennis Snellenberg, Ravi Klaassens, Cassie Evans) with the work explained in Giga/Dovetail/Rox-style modules.', load: () => import('./variants/k1') },
  { id: 'k2', name: 'Lab product', pitch: 'Round 4, from Tanuj’s picks: an AI-company product site (Black Forest Labs, ElevenLabs, Raycast) where each piece of work is a live product window.', load: () => import('./variants/k2') },
  { id: 'w1', name: 'Room', pitch: 'Round 4, from Tanuj’s picks: a modelled, baked-light room (Henry Heffernan, Jesse Zhou); the monitor is the real site.', load: () => import('./variants/w1') },
  { id: 'w2', name: 'Playground', pitch: 'Round 4, from Tanuj’s picks: drive or walk a small world to each piece of work (Bruno Simon, Thibault, Messenger).', load: () => import('./variants/w2') },
  { id: 'w3', name: 'Descent', pitch: 'Round 4, from Tanuj’s picks: a scroll-driven cinematic 3D story through the work (igloo.inc).', load: () => import('./variants/w3') },
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
  if (path === '/lab') return { kind: 'lab-index', head: { title: 'Design Lab — Tanuj Dargan', description: 'Variant switcher.', path } }
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
  return [...prod, '/lab', ...variants.flatMap((v) => inner.map((p) => `/lab/${v.id}${p === '/' ? '' : p}`))]
}
