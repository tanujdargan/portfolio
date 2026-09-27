import type { ReactNode } from 'react'
import { chapters as src, community, earlier, engineering, research, beri, person } from '../../content/site'
import { Link } from '../../lib/router'
import { Demo } from '../../demos/Demo'

// Every sentence below is built from src/content/site.ts. Dehradun and Gurgaon have no verified
// years or details, so they stay one line long and carry a <Flag>.

export interface Fig {
  v: string
  cap: string
}
export interface Step {
  id: string
  fig?: Fig
  body: ReactNode
}
export interface Chapter {
  id: string
  num: string
  place: string
  when: string
  unverified?: boolean
  steps: Step[]
  more?: { label: string; items: ReactNode[] }
}

const r = (slug: string) => research.find((x) => x.slug === slug)!
const deia = r('billion-vector-retrieval')
const solids = r('ocean-sensing')
const steer = r('activation-steering')
const loss = r('loss-masking-distress')
const es = r('es-lora')
const hack = community.find((c) => c.title === 'Hack@JBCNOsh')!
const vike = community.find((c) => c.title === 'VikeLabs')!
const cde = community.find((c) => c.title === 'CDE 2026')!
const e = (t: string) => earlier.find((x) => x.title === t)!
const optimate = e('Optimate')
const pear = e('Pear Care')
const airflow = e('Apache Airflow')
const sat = engineering[0]

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="v4-a" href={href} target="_blank" rel="noopener">
      {children} <span aria-hidden="true">↗</span>
    </a>
  )
}
function In({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="v4-a" to={to}>
      {children} <span aria-hidden="true">→</span>
    </Link>
  )
}

export function buildChapters(base: string): Chapter[] {
  return [
    {
      id: 'dehradun',
      num: '01',
      place: src[0].place,
      when: src[0].when,
      unverified: true,
      steps: [{ id: 'd0', body: <p>{src[0].line}</p> }],
    },
    {
      id: 'gurgaon',
      num: '02',
      place: src[1].place,
      when: src[1].when,
      unverified: true,
      steps: [{ id: 'g0', body: <p>{src[1].line}</p> }],
    },
    {
      id: 'mumbai',
      num: '03',
      place: src[2].place,
      when: src[2].when,
      steps: [
        {
          id: 'm0',
          fig: { v: '2 cities', cap: 'hackathons in Bengaluru and Kolkata' },
          body: <p>Kaggle notebooks, and hackathons in Bengaluru and Kolkata.</p>,
        },
        {
          id: 'm1',
          fig: { v: '450+', cap: `participants at ${hack.title}, ${hack.when}` },
          body: (
            <p>
              In {hack.when} I started my high school's own hackathon, <b>{hack.title}</b>. More than 450 people came.
            </p>
          ),
        },
      ],
    },
    {
      id: 'victoria',
      num: '04',
      place: src[3].place,
      when: src[3].when,
      steps: [
        {
          id: 'v0',
          fig: { v: '3 years', cap: `for the CS degree · class of ${person.grad}` },
          body: (
            <p>
              <b>{person.school}</b>, Computer Science on the accelerated three-year track. I graduate in {person.grad}.
            </p>
          ),
        },
        {
          id: 'v1',
          fig: { v: '30 → 4', cap: 'minutes of manual testing, before and after the rig' },
          body: (
            <p>
              <b>Firmware lead</b> for the onboard computer of UVic's 1U CubeSat (CFAR): C on STM32, telemetry encoded into YAMCS mission control. I built a
              hardware-in-the-loop rig on a Pi 4 that checks 80+ checksum rules on every commit.
            </p>
          ),
        },
        {
          id: 'v2',
          fig: { v: '1–4M', cap: 'queries per second, billion-vector scale' },
          body: (
            <>
              <p>
                <b>DEIA Lab</b>, with Prof. Sean Chester. Billion-vector search on GPUs: cuVS with CAGRA and IVF indices, across 8+ GPUs and more than 2 TB of
                index. 90–95% recall at under 250 ms.
              </p>
              <p className="v4-dim">The index below reads only the nearest lists. Drag nprobe and watch recall trade against work.</p>
              <div className="v4-demo">
                <Demo kind="retrieval" compact />
              </div>
              <p>
                <In to={`${base}/research/${deia.slug}`}>Read the retrieval write-up</In>
              </p>
            </>
          ),
        },
        {
          id: 'v3',
          fig: { v: 'R² 0.936', cap: 'satellite → deep-water temperature' },
          body: (
            <p>
              <b>SOLIDS Lab</b>, with Dr. Navneet Popli and NRC Canada. A multimodal model reads satellite imagery and Ocean Networks Canada sensors and predicts
              deep-water temperature. <In to={`${base}/research/${solids.slug}`}>Write-up</In>
            </p>
          ),
        },
        {
          id: 'v4',
          fig: { v: '2 prizes', cap: 'Hack the North 2025' },
          body: (
            <p>
              <b>Hack the North 2025.</b> Optimate, an AI underwriting dashboard, won the YC Unicorn Prize and Federato's Best RiskOps.{' '}
              <Out href={optimate.href!}>Repo</Out>
            </p>
          ),
        },
        {
          id: 'v5',
          fig: { v: '−40%', cap: 'memory, holding 95%+ F1 on triage' },
          body: (
            <p>
              <b>Pear Care</b>, lead AI developer on medical-AI agents. Quantized LoRA deployments cut memory by 40% at 95%+ F1 on internal triage benchmarks.{' '}
              <Out href={pear.href!}>pearcare.ai</Out>
            </p>
          ),
        },
        {
          id: 'v6',
          fig: { v: 'Airflow', cap: 'scheduler fix, as an MLH fellow with RBC' },
          body: (
            <p>
              <b>MLH fellow with RBC.</b> A fix for Apache Airflow's scheduler so missed past DAG runs show up. <Out href={airflow.href!}>apache/airflow</Out>
            </p>
          ),
        },
        {
          id: 'v7',
          fig: { v: 'CDE 2026', cap: 'VP Communications' },
          body: (
            <p>
              <b>Around the lab:</b> {vike.role} at VikeLabs, which builds software for local non-profits, and {cde.role} for CDE 2026, the Conference on
              Diversity in Engineering, hosted at UVic.
            </p>
          ),
        },
      ],
      more: {
        label: 'How the Victoria work was done',
        items: [
          <>
            <b>Retrieval.</b> {deia.method[1]} {deia.result[1]}
          </>,
          <>
            <b>Ocean sensing.</b> {solids.method[1]} {solids.result[0]}
          </>,
          <>
            <b>Satellite.</b> {sat.detail.split('. ').slice(1).join('. ')}
          </>,
          <>
            <b>Hack the North.</b> {optimate.role}: {optimate.detail}
          </>,
        ],
      },
    },
    {
      id: 'toronto',
      num: '05',
      place: src[4].place,
      when: src[4].when,
      steps: [
        {
          id: 't0',
          fig: { v: 'Return offer', cap: 'Amazon Robotics AI, summer 2026' },
          body: (
            <p>
              <b>Amazon Robotics AI.</b> SDE intern for summer 2026, building ML tooling for planning agents. It ended with a return offer.
            </p>
          ),
        },
        {
          id: 't1',
          fig: { v: 'Beri', cap: beri.stack.slice(0, 3).join(' · ') },
          body: (
            <p>
              <b>Beri</b>, which I co-founded. {beri.oneLiner} I work on iOS, the backend and the design system.{' '}
              <In to={`${base}/beri`}>The case study</In> · <Out href={beri.url}>getberi.com</Out>
            </p>
          ),
        },
        {
          id: 't2',
          fig: { v: '−8.0 → +9.6', cap: 'joy read-back, α from +0.3 to +0.6‖h‖' },
          body: (
            <>
              <p>
                <b>Research, alongside.</b> Find a concept as a direction in the residual stream, then check whether pushing along it does what the label says.
                Drag α: these are real Qwen2.5-1.5B outputs.
              </p>
              <div className="v4-demo">
                <Demo kind="steering" compact />
              </div>
              <p>
                <In to={`${base}/research/${steer.slug}`}>Read the steering write-up</In>
              </p>
            </>
          ),
        },
        {
          id: 't3',
          fig: { v: loss.when, cap: loss.where },
          body: (
            <p>
              Two more from 2026. Loss masking and shutdown distress at {loss.where} ({loss.when}):{' '}
              <In to={`${base}/research/${loss.slug}`}>write-up</In>. And fine-tuning Qwen2.5-1.5B with evolution strategies instead of gradients ({es.when}):{' '}
              <In to={`${base}/research/${es.slug}`}>write-up</In>.
            </p>
          ),
        },
      ],
      more: {
        label: 'What the steering run found',
        items: steer.result.map((x) => <>{x}</>),
      },
    },
  ]
}
