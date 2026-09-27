// The vector space: every project and role in site.ts becomes a node inside a domain cluster.
// Pure data, no three.js, so the static HTML (HUD, node list, sheet) renders without WebGL.
import { research, engineering, communityAll, earlier, experience, beri } from '../../content/site'
import type { FlagKey, Flags } from '../../content/flags'

export type Vec3 = [number, number, number]

export interface Cluster {
  id: string
  name: string
  code: string
  center: Vec3
  spread: number
  /** faint field points belonging to this cluster */
  count: number
  /** camera distance when focused */
  dist: number
}

export interface SpaceNode {
  id: string
  cluster: number
  title: string
  label: string
  role: string
  meta: string
  body: string[]
  metric?: string
  /** has a runnable demo on this site: the one accent colour */
  live?: boolean
  /** internal path after base */
  to?: string
  toLabel?: string
  href?: string
  hrefLabel?: string
  flag?: string
  /** content flag that must be on for this node to exist */
  show?: FlagKey
  pos: Vec3
}

export const clusters: Cluster[] = [
  { id: 'interp', name: 'Interpretability', code: 'C1', center: [0, 0.4, 0], spread: 1.9, count: 900, dist: 8.5 },
  { id: 'systems', name: 'ML systems', code: 'C2', center: [8.6, -1.4, -2.6], spread: 2.1, count: 780, dist: 9.5 },
  { id: 'work', name: 'Work', code: 'C3', center: [-7.6, 2.3, -3.4], spread: 2.2, count: 620, dist: 9 },
  { id: 'hardware', name: 'Hardware', code: 'C4', center: [4.2, 5, 6.2], spread: 1.6, count: 520, dist: 8 },
  { id: 'community', name: 'Community', code: 'C5', center: [-5.2, -3.4, 5.6], spread: 1.7, count: 520, dist: 8.5 },
  { id: 'earlier', name: 'Earlier', code: 'C6', center: [-0.6, -5.8, -8.2], spread: 2.8, count: 700, dist: 12 },
]

const r = (slug: string) => research.find((x) => x.slug === slug)!

/** Earlier work minus the roles that now sit in the Work cluster (Pear Care, Airflow), so nothing appears twice. */
export const earlierOnly = earlier.filter((e) => !experience.some((x) => x.org.includes(e.title)))

type Draft = Omit<SpaceNode, 'pos'>

const drafts: Draft[] = [
  // C1 interpretability
  (() => {
    const x = r('activation-steering')
    return {
      id: x.slug,
      cluster: 0,
      title: x.title,
      label: 'Emotion & persona vectors',
      role: 'Research',
      meta: `${x.where} · ${x.when}`,
      body: [x.question, 'On Qwen2.5-1.5B-Instruct, joy steering is a switch, not a dial: between +0.3 and +0.6‖h‖ the read-back projection jumps from −8.0 to +9.6.'],
      metric: '−8.0 → +9.6',
      live: true,
      to: `/research/${x.slug}`,
      toLabel: 'Read the write-up',
      flag: x.unverified?.[0],
    }
  })(),
  (() => {
    const x = r('loss-masking-distress')
    return {
      id: x.slug,
      cluster: 0,
      title: x.title,
      label: 'Loss masking & shutdown',
      role: 'Research sprint',
      meta: `${x.where} · ${x.when}`,
      body: [x.question, x.result[0]],
      metric: 'λp sweep · LoRA SFT',
      live: true,
      to: `/research/${x.slug}`,
      toLabel: 'Read the write-up',
      flag: x.unverified?.[0],
    }
  })(),
  // C2 ML systems
  (() => {
    const x = r('billion-vector-retrieval')
    return {
      id: x.slug,
      cluster: 1,
      title: x.title,
      label: 'Billion-vector retrieval',
      role: 'Undergraduate researcher',
      meta: `${x.where} · ${x.when}`,
      body: [x.question, x.result[0], x.result[1]],
      metric: '1–4M QPS',
      live: true,
      to: `/research/${x.slug}`,
      toLabel: 'Read the write-up',
      flag: x.unverified?.[0],
    }
  })(),
  (() => {
    const x = r('es-lora')
    return {
      id: x.slug,
      cluster: 1,
      title: x.title,
      label: 'ES-LoRA, no gradients',
      role: 'Research',
      meta: `${x.where} · ${x.when}`,
      body: [x.question, x.method[1]],
      metric: '45 perturbations × 15 steps',
      live: true,
      to: `/research/${x.slug}`,
      toLabel: 'Read the write-up',
      flag: x.unverified?.[0],
    }
  })(),
  (() => {
    const x = r('ocean-sensing')
    return {
      id: x.slug,
      cluster: 1,
      title: x.title,
      label: 'Ocean sensing',
      role: 'Undergraduate researcher',
      meta: `${x.where} · ${x.when}`,
      body: [x.question, x.result[0]],
      metric: 'R² = 0.936',
      to: `/research/${x.slug}`,
      toLabel: 'Read the write-up',
      flag: x.unverified?.[0],
    }
  })(),
  // C3 work: resume roles not already told by another cluster (CFAR is hardware, DEIA is ML systems), plus Beri when shown
  ...experience
    .filter((x) => !x.org.startsWith('UVic') && !x.org.startsWith('DEIA'))
    .map((x): Draft => {
      const link = earlier.find((e) => x.org.includes(e.title))?.href
      return {
        id: x.org.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        cluster: 2,
        title: x.org,
        label: x.org.replace('MLH Fellowship · ', ''),
        role: x.role,
        meta: `${x.where} · ${x.when}`,
        // Amazon's first bullet restates its line; its number is the metric
        body: [x.line, ...x.bullets.slice(x.org.startsWith('Amazon') ? 1 : 0)],
        metric: x.metric,
        href: link,
        hrefLabel: link?.replace('https://', '').replace(/\/$/, ''),
      }
    }),
  {
    id: 'beri',
    cluster: 2,
    title: 'Beri',
    label: 'Beri',
    role: 'Co-founder',
    meta: 'getberi.com · iOS',
    body: [beri.oneLiner, beri.role],
    metric: beri.stack.slice(0, 2).join(' · '),
    to: '/beri',
    toLabel: 'Beri case study',
    href: beri.url,
    hrefLabel: 'getberi.com',
    show: 'beri',
  },
  // C4 hardware
  {
    id: 'satellite',
    cluster: 3,
    title: engineering[0].title,
    label: 'Satellite OBC',
    role: engineering[0].role,
    meta: engineering[0].tags.join(' · '),
    body: [engineering[0].detail],
    metric: 'In orbit',
  },
  {
    id: 'homelab',
    cluster: 3,
    title: engineering[1].title,
    label: 'Homelab',
    role: engineering[1].role,
    meta: engineering[1].tags.join(' · '),
    body: [engineering[1].detail],
    metric: '15+ services',
    href: engineering[1].href,
    hrefLabel: 'nixos config on GitHub',
  },
  // C5 community
  ...communityAll.map(
    (c): Draft => ({
      id: c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      cluster: 4,
      title: c.title,
      label: c.title,
      role: c.role,
      meta: c.when,
      body: [c.detail],
      metric: c.title === 'Hack@JBCNOsh' ? '450+ people' : c.role,
      href: 'href' in c ? c.href : undefined,
      hrefLabel: 'href' in c && c.href ? c.href.replace('https://', '') : undefined,
      show: c.flag,
    }),
  ),
  // C6 earlier
  ...earlierOnly.map(
    (e): Draft => ({
      id: e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      cluster: 5,
      title: e.title,
      label: e.title,
      role: e.role,
      meta: e.when,
      body: [e.detail],
      href: 'href' in e ? e.href : undefined,
      hrefLabel: 'href' in e && e.href ? e.href.replace('https://', '').replace(/\/$/, '') : undefined,
      flag: 'unverified' in e && e.unverified ? "Parameter Golf found in local repo; confirm it's okay to list." : undefined,
    }),
  ),
]

// Deterministic placement: nodes sit on a jittered Fibonacci shell around their cluster centre.
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function place(list: Draft[]): SpaceNode[] {
  const rand = rng(7)
  return list.map((d, i) => {
    const siblings = list.filter((x) => x.cluster === d.cluster)
    const k = siblings.indexOf(d)
    const n = siblings.length
    const c = clusters[d.cluster]
    // interpretability keeps its nodes off the steering plane so the arrow reads clearly
    const golden = Math.PI * (3 - Math.sqrt(5))
    const y = n === 1 ? 0 : 1 - (2 * (k + 0.5)) / n
    const rad = Math.sqrt(1 - y * y)
    const th = golden * (k + i * 0.37)
    const R = c.spread * (0.72 + rand() * 0.28)
    return {
      ...d,
      pos: [c.center[0] + Math.cos(th) * rad * R, c.center[1] + y * R * 0.8, c.center[2] + Math.sin(th) * rad * R] as Vec3,
    }
  })
}

/** The nodes for a set of content flags. Hidden content never becomes a point, so clusters reflow around it. */
export const nodesFor = (flags: Flags): SpaceNode[] => place(drafts.filter((d) => !d.show || flags[d.show]))
/** Stable key for memoising on flags. */
export const flagKey = (flags: Flags) => (Object.keys(flags) as FlagKey[]).filter((k) => flags[k]).join(',')

export const nodesIn = (list: SpaceNode[], ci: number) => list.map((n, i) => ({ n, i })).filter((x) => x.n.cluster === ci)

export const fieldCount = clusters.reduce((s, c) => s + c.count, 0) + 1100 + 40

export const fmt = (v: Vec3) => v.map((x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1)).join(' ')
