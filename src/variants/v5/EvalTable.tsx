import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'

type Kind = 'Competition' | 'Research' | 'Industry' | 'Community'
interface Row {
  id: string
  task: string
  setting: string
  kind: Kind
  metric: string
  result: string
  year: number
  yearLabel: string
  href?: string
  internal?: boolean
}

// Every number here is from src/content/site.ts.
const rows: Row[] = [
  {
    id: 'htn',
    task: 'Hack the North 2025',
    setting: 'Optimate, AI underwriting dashboard',
    kind: 'Competition',
    metric: 'Placement',
    result: 'Winner · YC Unicorn Prize · Federato Best RiskOps',
    year: 2025,
    yearLabel: '2025',
    href: 'https://github.com/jruttan1/Optimate',
  },
  {
    id: 'aimo',
    task: 'AIMO Progress Prize 2',
    setting: 'Kaggle · multi-stage LLM pipeline, olympiad maths',
    kind: 'Competition',
    metric: 'Rank',
    result: 'Silver · top 10% of 2,200 · 54% accuracy',
    year: 2025,
    yearLabel: '2025',
  },
  {
    id: 'solids',
    task: 'Satellite → deep-water temperature',
    setting: 'SOLIDS Lab, UVic · with NRC Canada',
    kind: 'Research',
    metric: 'R²',
    result: '0.936',
    year: 2025,
    yearLabel: '2025–',
    href: '/research/ocean-sensing',
    internal: true,
  },
  {
    id: 'deia',
    task: 'Billion-vector GPU retrieval',
    setting: 'DEIA Lab, UVic · cuVS on 8+ GPUs, 2 TB',
    kind: 'Research',
    metric: 'Throughput',
    result: '1–4M QPS · <250 ms · 90–95% recall',
    year: 2025,
    yearLabel: '2025–',
    href: '/research/billion-vector-retrieval',
    internal: true,
  },
  {
    id: 'amzn',
    task: 'Amazon Robotics AI internship',
    setting: 'SDE intern · ML tooling for planning agents',
    kind: 'Industry',
    metric: 'Outcome',
    result: 'Return offer',
    year: 2026,
    yearLabel: '2026',
  },
  {
    id: 'pear',
    task: 'Pear Care triage agents',
    setting: 'Quantized LoRA deployments',
    kind: 'Industry',
    metric: 'Memory · F1',
    result: '−40% memory · 95%+ F1',
    year: 2025,
    yearLabel: '2025',
    href: 'https://pearcare.ai',
  },
  {
    id: 'jbcn',
    task: 'Hack@JBCNOsh',
    setting: 'Founder · high-school hackathon, Mumbai',
    kind: 'Community',
    metric: 'Participants',
    result: '450+',
    year: 2022,
    yearLabel: '2022',
  },
]

type Key = 'task' | 'kind' | 'metric' | 'year'
const cols: { key: Key; label: string }[] = [
  { key: 'task', label: 'Eval' },
  { key: 'kind', label: 'Type' },
  { key: 'metric', label: 'Metric' },
  { key: 'year', label: 'Year' },
]

export function EvalTable({ base }: { base: string }) {
  const m = useMotionPrefs()
  const [sort, setSort] = useState<{ key: Key | null; dir: 1 | -1 }>({
    key: null,
    dir: 1,
  })
  const sorted = sort.key
    ? [...rows].sort((a, b) => {
        const k = sort.key!
        const va = a[k]
        const vb = b[k]
        const c = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb))
        return c * sort.dir || rows.indexOf(a) - rows.indexOf(b)
      })
    : rows
  const click = (key: Key) =>
    setSort((s) =>
      s.key !== key
        ? { key, dir: key === 'year' ? -1 : 1 }
        : s.dir === (key === 'year' ? -1 : 1)
          ? { key, dir: (s.dir * -1) as 1 | -1 }
          : { key: null, dir: 1 },
    )
  const ariaSort = (key: Key) => (sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none')

  const th = (key: Key, label: string, cls: string) => (
    <th role="columnheader" className={cls} aria-sort={ariaSort(key)} key={key}>
      <button className="v5-sort" onClick={() => click(key)} data-on={sort.key === key || undefined}>
        {label}
        <span className="v5-sort__i" aria-hidden="true" data-dir={sort.key === key ? sort.dir : 0}>
          {sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )

  return (
    <div className="v5-evals">
      <table role="table" className="v5-table">
        <caption className="sr-only">Evaluations. Column headers sort the table.</caption>
        <thead role="rowgroup">
          <tr role="row">
            {th('task', cols[0].label, 'v5-t-task')}
            {th('kind', cols[1].label, 'v5-t-kind')}
            {th('metric', cols[2].label, 'v5-t-metric')}
            <th role="columnheader" className="v5-t-result">
              Result
            </th>
            {th('year', cols[3].label, 'v5-t-year')}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {sorted.map((r) => (
            <motion.tr role="row" key={r.id} layout="position" transition={m.spring(380)}>
              <td role="cell" className="v5-t-task">
                {r.href ? (
                  r.internal ? (
                    <Link to={`${base}${r.href}`} className="v5-a">
                      {r.task}
                    </Link>
                  ) : (
                    <a href={r.href} target="_blank" rel="noopener" className="v5-a">
                      {r.task} <span aria-hidden="true">↗</span>
                    </a>
                  )
                ) : (
                  <span className="v5-t-name">{r.task}</span>
                )}
                <span className="v5-t-setting">{r.setting}</span>
              </td>
              <td role="cell" className="v5-t-kind">
                <span className="v5-kind" data-kind={r.kind}>
                  {r.kind}
                </span>
              </td>
              <td role="cell" className="v5-t-metric">
                {r.metric}
              </td>
              <td role="cell" className="v5-t-result">
                {r.result.split(' · ').map((x, i) => (
                  <span key={x}>
                    {i > 0 && ' · '}
                    <span className="v5-seg">{x}</span>
                  </span>
                ))}
              </td>
              <td role="cell" className="v5-t-year">
                {r.yearLabel}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
