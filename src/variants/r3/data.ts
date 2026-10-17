// R3 "Palette": every row in the command palette. Facts come from content/curated.ts and content/site.ts; this file
// only shortens them (row ≤ 12 words) and adds palette keys (group, icon, keywords for the fuzzy filter).
import { selected, more, roles, amazonMetrics, type Mark } from '../../content/curated'
import { links, linkOrder, person, type LinkKey } from '../../content/site'
import type { WorkKey } from '../../content/work'

export type Group = 'Work' | 'More' | 'Experience' | 'Links'
export const groups: Group[] = ['Work', 'More', 'Experience', 'Links']

interface Base {
  id: string
  group: Group
  title: string
  /** small grey text after the title */
  sub: string
  /** right-aligned, mono */
  right: string
  keys: string
}
export interface WorkRow extends Base {
  kind: 'work'
  mark?: Mark
  icon?: 'steer'
  demo?: WorkKey
  slug?: string
  finding: string
  where: string
  when: string
  long: string
  accent: string
}
export interface MoreRow extends Base {
  kind: 'more'
  icon: 'db' | 'dna' | 'trophy' | 'medal' | 'apple'
  line: string
  href?: string
  ext?: boolean
}
export interface RoleRow extends Base {
  kind: 'role'
  mark: Mark
  role: string
  org: string
  when: string
  bullets: string[]
}
export interface LinkRow extends Base {
  kind: 'link'
  k: LinkKey
  href: string
}
export type Row = WorkRow | MoreRow | RoleRow | LinkRow

const cur = Object.fromEntries(selected.map((s) => [s.id, s]))

// Order: what he shipped first, then the research.
const work: { id: string; title: string; sub: string; right: string; accent: string; icon?: 'steer'; keys: string }[] = [
  { id: 'amazon', title: 'LLM planning assistant', sub: 'Amazon Robotics', right: '180+ sites · return offer', accent: '#ffb35c', keys: 'rag production optimus intern sde' },
  { id: 'orbit', title: 'MarmotSat flight firmware', sub: 'UVic CfAR', right: 'In orbit · NORAD 69912', accent: '#5cc8ff', keys: 'satellite space cubesat c firmware falcon' },
  { id: 'lossmask', title: 'Loss masking & shutdown distress', sub: 'Apart Research', right: 'Calm text ≠ calm inside', accent: '#b69cff', keys: 'welfare sft interpretability digital minds' },
  { id: 'steering', title: 'Steering along emotion directions', sub: 'Independent', right: 'Joy flips −8.0 → +9.6', accent: '#ff8a4c', icon: 'steer', keys: 'activation steering interpretability qwen vectors' },
  { id: 'ocean', title: 'Deep-water temperature from satellites', sub: 'SOLIDS Lab, UVic', right: 'R² 0.936', accent: '#3fc6d4', keys: 'ocean multimodal nrc' },
]

export const workRows: WorkRow[] = work.map((w) => {
  const c = cur[w.id]
  return {
    kind: 'work', group: 'Work', id: w.id, title: w.title, sub: w.sub, right: w.right, accent: w.accent, icon: w.icon,
    keys: w.keys, mark: c.mark, demo: c.demo, slug: c.slug, finding: c.finding, where: c.where, when: c.when, long: c.title,
  }
})

const moreMeta: { icon: MoreRow['icon']; title: string; right: string; keys: string }[] = [
  { icon: 'db', title: 'Billion-vector search on GPUs', right: '1–4M QPS', keys: 'retrieval cuvs deia' },
  { icon: 'dna', title: 'Fine-tuning without gradients', right: 'ES · LoRA', keys: 'evolution strategies qwen gsm8k' },
  { icon: 'trophy', title: 'Optimate, Hack the North', right: '2 prizes', keys: 'hackathon yc federato' },
  { icon: 'medal', title: 'AIMO Progress Prize 2', right: 'Silver · top 10%', keys: 'kaggle olympiad maths' },
  { icon: 'apple', title: 'Beri', right: 'iOS', keys: 'food app swift' },
]
export const moreRows: MoreRow[] = more.map((m, i) => ({
  kind: 'more', group: 'More', id: `more-${i}`, sub: '', ...moreMeta[i], line: m.line, href: m.href, ext: m.ext,
}))

export const roleRows: RoleRow[] = roles.map((r, i) => ({
  kind: 'role', group: 'Experience', id: `role-${i}`, title: r.org, sub: r.role, right: r.when, keys: r.line,
  mark: r.mark, role: r.role, org: r.org, when: r.when, bullets: r.bullets,
}))

const linkSub: Record<LinkKey, string> = {
  resume: 'PDF', github: 'tanujdargan', linkedin: 'tanujdargan', x: '@DarganTanuj', email: person.email,
}
export const linkRows: LinkRow[] = linkOrder.map((k) => ({
  kind: 'link', group: 'Links', id: `link-${k}`, k, title: links[k].label, sub: linkSub[k],
  right: k === 'email' ? 'Copy' : 'Open', href: links[k].href, keys: 'contact cv',
}))

export const rows: Row[] = [...workRows, ...moreRows, ...roleRows, ...linkRows]
export { amazonMetrics }

/** Fuzzy match: a substring scores highest (more at a word start); otherwise the query's letters in order, each
 *  starting a word or following the previous letter (so "mf" finds "MarmotSat firmware", but "stee" doesn't find
 *  everything). Returns a score, or -1. */
export function fuzzy(q: string, text: string): number {
  const t = text.toLowerCase()
  if (!q) return 0
  const direct = t.indexOf(q)
  if (direct >= 0) return 100 - direct * 0.1 + (direct === 0 || /[\s(&·,-]/.test(t[direct - 1]) ? 30 : 0)
  let score = 0
  let ti = 0
  for (const ch of q.replace(/\s+/g, '')) {
    let at = -1
    if (t[ti] === ch) at = ti
    else
      for (let j = ti; j < t.length; j++)
        if (t[j] === ch && (j === 0 || /[\s(&·,-]/.test(t[j - 1]))) {
          at = j
          break
        }
    if (at < 0) return -1
    score += at === ti ? 3 : 2
    ti = at + 1
  }
  return score
}

export function filterRows(query: string): Row[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  const scored = rows
    .map((r) => {
      const main = fuzzy(q, `${r.title} ${r.sub}`)
      const extra = `${r.right} ${r.keys} ${r.group}`.toLowerCase().includes(q) ? 40 : -1
      return { r, s: Math.max(main, extra) }
    })
    .filter((x) => x.s >= 0)
  // keep group order, best first inside each group
  return groups.flatMap((g) => scored.filter((x) => x.r.group === g).sort((a, b) => b.s - a.s).map((x) => x.r))
}
