// R1 "Index" copy. Facts come from src/content/curated.ts (which traces to public/resume.pdf); this file only shortens
// them. Budget: hero ≤ 25 words; each row (org + title + result + year) ≤ 12 words before interaction.
import { selected, type Item, type Mark } from '../../content/curated'
import type { WorkKey } from '../../content/work'

export const hero = {
  name: 'Tanuj Dargan',
  line: 'CS at UVic. I ship production ML and do interpretability research.',
}

export interface Row {
  id: string
  org: string
  mark?: Mark
  title: string
  result: string
  year: string
  /** live demo opened in place; Amazon has none and gets the numbers card */
  demo?: WorkKey
  slug?: string
  finding: string
  where: string
  when: string
  demoOpts?: { rest?: number; finding?: boolean }
}

const src = (id: string): Item => selected.find((s) => s.id === id)!
const row = (id: string, r: Pick<Row, 'org' | 'title' | 'result' | 'year'> & { demoOpts?: Row['demoOpts'] }): Row => {
  const s = src(id)
  return { id, mark: s.mark, demo: s.demo, slug: s.slug, finding: s.finding, where: s.where, when: s.when, ...r }
}

// Industry first, then hardware, then research: what he's done reads in one glance.
export const rows: Row[] = [
  row('amazon', { org: 'Amazon Robotics', title: 'LLM planning assistant', result: '180+ sites · return offer', year: '2026' }),
  row('orbit', { org: 'UVic CfAR', title: 'MarmotSat firmware', result: 'In orbit · NORAD 69912', year: '2026' }),
  row('lossmask', { org: 'Apart Research', title: 'Loss masking & distress', result: 'Sounds calm, reads negative', year: '2026', demoOpts: { finding: true } }),
  row('steering', { org: 'Independent', title: 'Emotion steering', result: 'A switch, not a dial', year: '2026', demoOpts: { rest: 0.6 } }),
  row('ocean', { org: 'SOLIDS Lab, UVic', title: 'Deep-water temperature', result: 'R² 0.936', year: '2025' }),
]
