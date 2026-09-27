// The site as an index: every section, role, write-up and link is one "vector".
// Search is lexical scoring standing in for an embedding model; the geometry is illustrative and says so on the page.
import { research, earlier, communityAll, experience, engineering, beri, links, type Research } from '../../content/site'
import type { FlagKey, Flags } from '../../content/flags'
import { cells, groupCells, nearestCells, pointInCell, pointPos, pcg, lerp3, d2, NLIST, type V3 } from './geometry'

export type DocKind = 'write-up' | 'role' | 'section' | 'project' | 'community' | 'earlier' | 'link'
export interface Doc {
  id: string
  title: string
  kind: DocKind
  group: number // 0 interp · 1 retrieval+systems · 2 industry · 3 space+earth · 4 community+competitions · 5 products · -1 you
  to?: string // internal path relative to base ('/#work' or '/research/x')
  href?: string // external
  line: string
  words: string
  flag?: FlagKey
  unverified?: string
  cell: number
  pos: V3
}

export const groupNames = ['interpretability', 'retrieval + systems', 'industry', 'space + earth', 'community', 'products'] as const

const R = (slug: string) => research.find((r) => r.slug === slug) as Research
const exp = (org: string) => experience.find((e) => e.org.startsWith(org))!

type Raw = Omit<Doc, 'cell' | 'pos'>
const raw: Raw[] = [
  // research write-ups
  { id: 'steering', title: R('activation-steering').title, kind: 'write-up', group: 0, to: '/research/activation-steering', line: R('activation-steering').short, words: 'steering activation persona emotion vector direction interpretability joy distress certainty qwen residual stream alpha demo' },
  { id: 'lossmask', title: R('loss-masking-distress').title, kind: 'write-up', group: 0, to: '/research/loss-masking-distress', line: R('loss-masking-distress').short, words: 'loss masking sft fine-tuning model welfare shutdown distress apart research digital minds sprint probing valence representation' },
  { id: 'es', title: R('es-lora').title, kind: 'write-up', group: 0, to: '/research/es-lora', line: R('es-lora').short, words: 'evolution strategies es lora gsm8k qwen gradient-free fine-tuning math reward hugging face adapter', unverified: R('es-lora').unverified?.[0] },
  { id: 'retrieval', title: R('billion-vector-retrieval').title, kind: 'write-up', group: 1, to: '/research/billion-vector-retrieval', line: R('billion-vector-retrieval').short, words: 'billion vector retrieval search cuvs cagra ivf pq gpu gpus nvidia nvlink qps recall latency deia chester kubernetes ann nearest neighbour neighbor index' },
  { id: 'ocean', title: R('ocean-sensing').title, kind: 'write-up', group: 3, to: '/research/ocean-sensing', line: R('ocean-sensing').short, words: 'ocean sensing satellite imagery remote deep water temperature nrc solids multimodal popli climate', unverified: R('ocean-sensing').unverified?.[0] },
  // roles
  { id: 'amazon', title: 'Amazon Robotics', kind: 'role', group: 2, to: '/#w-amazon', line: exp('Amazon').line, words: 'amazon robotics sde intern internship llm planning assistant optimus rag fulfillment labor production return offer toronto agent' },
  { id: 'rbc', title: 'RBC Borealis', kind: 'role', group: 2, to: '/#w-rbc', line: exp('RBC').line, words: 'rbc borealis mentorship pytorch umap youth chronic illness clustering dashboard ml' },
  { id: 'cfar', title: 'MarmotSat · UVic CFAR', kind: 'role', group: 3, to: '/#w-cfar', line: exp('UVic Centre').line, words: 'marmotsat satellite space orbit firmware obc onboard computer ttc c yamcs hil ci spacex falcon cubesat aerospace cfar hardware' },
  { id: 'deia', title: 'DEIA Lab, UVic', kind: 'role', group: 1, to: '/#w-deia', line: exp('DEIA').line, words: 'deia lab uvic chester research cuvs cagra ivf gpu retrieval billion vector qps' },
  { id: 'pear', title: 'Pear Care', kind: 'role', group: 2, to: '/#w-pear', line: exp('Pear').line, words: 'pear care medical ai agents langgraph lora peft quantized gcp aws fastapi health llm' },
  { id: 'mlh', title: 'MLH Fellowship · Apache Airflow', kind: 'role', group: 2, to: '/#w-mlh', line: exp('MLH').line, words: 'mlh fellowship apache airflow docker debugging open source rbc vs code pycharm' },
  // products and builds
  { id: 'beri', title: 'Beri', kind: 'project', group: 5, to: '/beri', line: beri.oneLiner, words: 'beri ios swiftui food recipe social app co-founder founder startup supabase kotlin android design system', flag: 'beri' },
  { id: 'homelab', title: engineering[1].title, kind: 'project', group: 1, to: '/#build', href: engineering[1].href, line: engineering[1].detail, words: 'homelab proxmox nix nixos zfs vllm self-hosted gpu serving ci runners vlan zero trust infra' },
  { id: 'obc', title: engineering[0].title, kind: 'project', group: 3, to: '/#build', line: engineering[0].role, words: 'marmotsat onboard computer firmware c ttc yamcs hil satellite space' },
  // community
  ...communityAll.map<Raw>((c) => ({
    id: 'c-' + c.title.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    title: c.title,
    kind: 'community',
    group: 4,
    to: '/#community',
    href: c.href,
    line: `${c.role}. ${c.detail}`,
    words: `${c.title} ${c.role} ${c.detail} hackathon community events club leadership`.toLowerCase(),
    flag: c.flag,
  })),
  // earlier (demoted)
  ...earlier.filter((e) => !/Pear Care|Apache Airflow/.test(e.title)).map<Raw>((e) => ({
    id: 'e-' + e.title.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    title: e.title,
    kind: 'earlier',
    group: /Optimate|AIMO|Parameter/.test(e.title) ? 4 : /Drop|Wedding/.test(e.title) ? 5 : 1,
    to: '/#earlier',
    href: e.href,
    line: `${e.role}. ${e.detail}`,
    words: `${e.title} ${e.role} ${e.detail}`.toLowerCase() + (e.title === 'Optimate' ? ' hack the north prize yc' : e.title === 'AIMO Progress Prize 2' ? ' kaggle olympiad math competition' : ''),
    unverified: 'unverified' in e && e.unverified ? 'Parameter Golf found in local repo; confirm it\'s okay to list.' : undefined,
  })),
  // sections and links (the "you are here" cell)
  { id: 'contact', title: 'Contact', kind: 'section', group: -1, to: '/#contact', line: 'Email is fastest: tanujd@uvic.ca', words: 'contact email hire reach message mail talk intern job' },
  { id: 'resume', title: 'Resume (PDF)', kind: 'link', group: -1, href: links.resume.href, line: 'One page, August 2026.', words: 'resume cv pdf experience' },
  { id: 'github', title: 'GitHub', kind: 'link', group: -1, href: links.github.href, line: 'github.com/tanujdargan', words: 'github code repos open source' },
  { id: 'linkedin', title: 'LinkedIn', kind: 'link', group: -1, href: links.linkedin.href, line: 'linkedin.com/in/tanujdargan', words: 'linkedin profile' },
  { id: 'x', title: 'X', kind: 'link', group: -1, href: links.x.href, line: '@DarganTanuj', words: 'x twitter' },
  { id: 'sec-work', title: 'Work', kind: 'section', group: 2, to: '/#work', line: 'Six roles, newest first, one metric each.', words: 'work experience jobs roles industry internship' },
  { id: 'sec-research', title: 'Research', kind: 'section', group: 0, to: '/#research', line: 'Five write-ups: question, method, result, next.', words: 'research papers write-ups interpretability ml' },
  { id: 'sec-index', title: 'The plain index', kind: 'section', group: -1, to: '/#index', line: 'Every vector on this page, as a list of links.', words: 'index all everything list sitemap' },
]

// Place docs: each group's docs take that group's cells nearest its anchor, one doc per cell where possible.
export const docs: Doc[] = (() => {
  const used = new Map<number, number>()
  const byGroup = new Map<number, number[]>()
  return raw.map((d) => {
    let cell = 48
    if (d.group >= 0) {
      const list = byGroup.get(d.group) ?? groupCells(d.group)
      byGroup.set(d.group, list)
      const n = [...used.entries()].filter(([c]) => cells[c].g === d.group).length
      cell = list[n % list.length]
    }
    const k = used.get(cell) ?? 0
    used.set(cell, k + 1)
    // Sit on a real point of the cell so a flight lands on something the GPU drew.
    const p = pointPos(pointInCell(cell, 3 + k * 5))
    const C = cells[cell].c
    return { ...d, cell, pos: lerp3(C, p, cell === 48 ? 1.6 : 0.8) }
  })
})()

export const visibleDocs = (flags: Flags) => docs.filter((d) => !d.flag || flags[d.flag])

// ---------- scoring ----------
const SYN: Record<string, string> = {
  gpu: 'cuvs', gpus: 'cuvs', vector: 'retrieval', vectors: 'retrieval', search: 'retrieval', ann: 'retrieval', faiss: 'retrieval', rag: 'retrieval',
  space: 'satellite', orbit: 'satellite', cubesat: 'satellite', embedded: 'firmware', hardware: 'firmware',
  interp: 'interpretability', mech: 'interpretability', steer: 'steering', vectorsteering: 'steering', welfare: 'welfare', emotion: 'steering',
  hire: 'contact', email: 'contact', mail: 'contact', cv: 'resume', twitter: 'x',
  ios: 'beri', swift: 'swiftui', app: 'beri', startup: 'founder',
  aws: 'amazon', robotics: 'amazon', llm: 'llm', agents: 'agent', health: 'medical',
  hackathon: 'hackathon', kaggle: 'kaggle', ocean: 'ocean', climate: 'ocean',
}
const tok = (s: string) => s.toLowerCase().normalize('NFKD').split(/[^a-z0-9@+-]+/).filter(Boolean)

function lev1(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let e = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++e > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else {
      i++
      j++
    }
  }
  return e + (a.length - i) + (b.length - j) <= 1
}

const docTok = new Map<string, { title: string[]; body: string[] }>()
for (const d of docs) docTok.set(d.id, { title: tok(d.title), body: tok(`${d.words} ${d.line}`) })

function tokScore(q: string, ts: string[]) {
  let best = 0
  for (const t of ts) {
    if (t === q) return 1
    if (q.length >= 2 && t.startsWith(q)) best = Math.max(best, 0.55 + 0.4 * (q.length / t.length))
    else if (q.length >= 3 && t.includes(q)) best = Math.max(best, 0.5)
    else if (q.length >= 4 && lev1(q, t)) best = Math.max(best, 0.7)
  }
  return best
}

/** Similarity in [0, 1). 0 = no lexical overlap. */
export function score(query: string, d: Doc) {
  const qs = tok(query)
  if (!qs.length) return 0
  const T = docTok.get(d.id)!
  let s = 0
  for (const q of qs) {
    const alt = SYN[q]
    const one = (x: string) => Math.max(tokScore(x, T.title) * 1.25, tokScore(x, T.body))
    s += Math.min(1.25, Math.max(one(q), alt ? one(alt) * 0.92 : 0))
  }
  return Math.min(0.99, s / qs.length / 1.25)
}

// ---------- the retrieval plan (what the field animates) ----------
export interface Hit {
  doc: Doc
  sim: number
}
export interface Plan {
  query: string
  q: V3
  probes: number[]
  nprobe: number
  path: V3[] // greedy graph hops, entry → query
  side: [V3, V3][] // neighbours examined and rejected
  hits: Hit[] // what the ANN returned (top-k among probed lists)
  missed: Hit[] // relevant docs an exact scan finds that the probed lists don't hold
  relevant: number
  recall: number | null
  scannedFrac: number
  ms: number // measured: time to score and plan in this browser
}

export const K = 6

export function plan(query: string, nprobe: number, pool: Doc[]): Plan | null {
  const t0 = performance.now()
  const trimmed = query.trim()
  if (!trimmed) return null
  const scored = pool.map((doc) => ({ doc, sim: score(trimmed, doc) })).sort((a, b) => b.sim - a.sim)
  const relevantAll = scored.filter((h) => h.sim > 0.12)
  // Embed: the query lands next to its best match, pulled a little toward the runner-up.
  let q: V3
  if (relevantAll.length) {
    const a = relevantAll[0].doc.pos
    const b = relevantAll[1]?.doc.pos ?? a
    q = lerp3(a, b, 0.12)
  } else {
    let h = 2166136261
    for (const ch of trimmed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
    const i = pointInCell(pcg(h) % NLIST, pcg(h + 1) % 4000)
    q = pointPos(i)
  }
  q = [q[0] + 0.03, q[1] + 0.04, q[2] - 0.02]
  const order = nearestCells(q)
  const probes = order.slice(0, nprobe)
  const inProbe = new Set(probes)
  // ANN: rank by similarity among docs in probed lists; fill with the geometrically nearest reachable ones.
  const reach = scored.filter((h) => inProbe.has(h.doc.cell))
  const byDist = [...reach].sort((a, b) => b.sim - a.sim || d2(a.doc.pos, q) - d2(b.doc.pos, q))
  const hits = byDist.slice(0, K)
  if (hits.length < K) {
    const extra = scored
      .filter((h) => !inProbe.has(h.doc.cell))
      .sort((a, b) => d2(a.doc.pos, q) - d2(b.doc.pos, q))
      .slice(0, K - hits.length)
    hits.push(...extra)
  }
  const relevant = relevantAll.slice(0, K)
  const found = relevant.filter((r) => hits.some((h) => h.doc.id === r.doc.id))
  const missed = relevant.filter((r) => !hits.some((h) => h.doc.id === r.doc.id))
  // Greedy hops on the proximity graph: from a far entry point toward q, one hop per step.
  const far = order[order.length - 1 - (pcg(trimmed.length + 3) % 6)]
  let cur = pointPos(pointInCell(far, 1))
  const path: V3[] = [cur]
  const side: [V3, V3][] = []
  const H = 5
  for (let s = 1; s <= H; s++) {
    const want = lerp3(path[0], q, s / H)
    const c = nearestCells(want)[0]
    let best = cur
    let bd = Infinity
    for (let m = 0; m < 10; m++) {
      const p = pointPos(pointInCell(c, 7 + m * 13 + s))
      const dd = d2(p, want)
      if (dd < bd) {
        if (bd !== Infinity && side.length < 18) side.push([cur, best])
        bd = dd
        best = p
      } else if (m < 3) side.push([cur, p])
    }
    path.push(best)
    cur = best
  }
  path.push(q)
  const count = probes.length
  return {
    query: trimmed,
    q,
    probes,
    nprobe,
    path,
    side,
    hits,
    missed,
    relevant: relevant.length,
    recall: relevant.length ? found.length / relevant.length : null,
    scannedFrac: (count / NLIST) * (15 / 16),
    ms: performance.now() - t0,
  }
}

/** One-word suggestions, shown when the box is empty. */
export const suggestions = ['steering', 'amazon', 'satellite', 'retrieval', 'loss masking', 'contact']
