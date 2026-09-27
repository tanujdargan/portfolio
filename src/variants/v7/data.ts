// v7's mapping of site.ts onto spacecraft subsystems. Every value below is read from, or quoted from, site.ts.
import { beri, earlier, engineering, experience, research, type Community } from '../../content/site'
import type { DemoKey } from '../../content/site'

export interface Readout {
  /** telemetry mnemonic */
  m: string
  v: string
  u?: string
  /** unverified note (renders a Flag) */
  flag?: string
}
export interface Item {
  title: string
  meta: string
  body: string[]
  /** internal path (no base) */
  to?: string
  href?: string
  hrefLabel?: string
  flag?: string
}
export interface Sub {
  id: string
  code: string
  name: string
  maps: string
  summary: string
  readouts: Readout[]
  items: Item[]
  demo?: Exclude<DemoKey, null>
  aliases: string[]
}

const exp = (org: string) => experience.find((e) => e.org.startsWith(org))!
const res = (slug: string) => research.find((r) => r.slug === slug)!
const amazon = exp('Amazon'), rbc = exp('RBC'), cfar = exp('UVic Centre'), deia = exp('DEIA'), pear = exp('Pear'), mlh = exp('MLH')
const steer = res('activation-steering'), loss = res('loss-masking-distress'), es = res('es-lora'), bvr = res('billion-vector-retrieval'), ocean = res('ocean-sensing')

const role = (e: typeof amazon): Item => ({ title: e.org, meta: `${e.role} · ${e.when} · ${e.where}`, body: e.bullets })

export function subsystems(opts: { beri: boolean; community: Community[] }): Sub[] {
  const list: Sub[] = [
    {
      id: 'eps',
      code: 'EPS',
      name: 'Power',
      maps: 'Industry',
      summary: 'Where the work runs in production and pays for itself.',
      readouts: [
        { m: 'OPTIMUS.SITES', v: '180+', u: 'sites' },
        { m: 'SAVINGS.PROJ', v: '$136.2M', u: '/yr' },
        { m: 'TIME.TO.INSIGHT', v: '−60%+' },
        { m: 'AMZN.OFFER', v: 'RETURN' },
        { m: 'RBC.RECORDS', v: '1,500+' },
        { m: 'PEAR.MEM', v: '−40%' },
      ],
      items: [role(amazon), role(rbc), role(pear), role(mlh)],
      aliases: ['eps', 'power', 'industry', 'amazon', 'robotics', 'optimus', 'rbc', 'borealis', 'pear', 'pearcare', 'airflow', 'mlh', 'work', 'experience'],
    },
    {
      id: 'obc',
      code: 'OBC',
      name: 'Onboard computer',
      maps: 'Firmware',
      summary: cfar.line,
      readouts: [
        { m: 'HIL.TEST', v: '180→15', u: 'min' },
        { m: 'CHECKSUM.RULES', v: '80+', u: '/commit' },
        { m: 'YAMCS.SAVED', v: '20+', u: 'h/release' },
        { m: 'VEHICLE', v: 'FALCON 9' },
        { m: 'STATUS', v: 'IN ORBIT' },
        { m: 'HOMELAB.SVCS', v: '15+' },
      ],
      items: [
        { ...role(cfar), title: 'MarmotSat · UVic Centre for Aerospace Research' },
        { title: engineering[1].title, meta: engineering[1].role, body: [engineering[1].detail], href: engineering[1].href, hrefLabel: 'nixos config on GitHub' },
      ],
      aliases: ['obc', 'firmware', 'marmotsat', 'cfar', 'satellite', 'sat', 'yamcs', 'hil', 'homelab', 'nix'],
    },
    {
      id: 'ttc',
      code: 'TTC',
      name: 'Data link',
      maps: 'Retrieval',
      summary: deia.line,
      readouts: [
        { m: 'QUERY.RATE', v: '1–4M', u: 'QPS' },
        { m: 'RECALL', v: '90–95%' },
        { m: 'LATENCY', v: '<250', u: 'ms' },
        { m: 'GPU.COUNT', v: '8+' },
        { m: 'INDEX.SIZE', v: '2', u: 'TB' },
        { m: 'SCALING', v: '4.3×' },
      ],
      items: [{ ...role(deia), to: `/research/${bvr.slug}` }],
      demo: 'retrieval',
      aliases: ['ttc', 'retrieval', 'deia', 'cuvs', 'vectors', 'gpu', 'search'],
    },
    {
      id: 'adcs',
      code: 'ADCS',
      name: 'Attitude control',
      maps: 'Steering',
      summary: 'Find a concept as a direction in the residual stream, push along it, and check the model turns the way the label says.',
      readouts: [
        { m: 'MODEL', v: 'Qwen2.5-1.5B' },
        { m: 'JOY.SWITCH', v: '+0.3→+0.6', u: '‖h‖', flag: steer.flags?.result?.[0] },
        { m: 'READBACK', v: '−8.0→+9.6', flag: steer.flags?.result?.[0] },
        { m: 'LAYER', v: 'MID ⅓', u: 'by d′' },
      ],
      items: [{ title: steer.title, meta: `${steer.where} · ${steer.when}`, body: [steer.result[0], steer.result[1]], to: `/research/${steer.slug}`, flag: steer.unverified?.[0] }],
      aliases: ['adcs', 'steering', 'steer', 'attitude', 'vectors', 'persona', 'emotion', 'interpretability'],
    },
    {
      id: 'payload',
      code: 'PAYLOAD',
      name: 'Science',
      maps: 'Research',
      summary: 'Model welfare, gradient-free fine-tuning, and ocean sensing.',
      readouts: [
        { m: 'SPRINT', v: 'APART', u: 'Aug 2026' },
        { m: 'ES.POP', v: '45', u: 'keep 8' },
        { m: 'ES.SIGMA', v: '1e-3' },
        { m: 'OCEAN.R2', v: '0.936', flag: ocean.unverified?.[0] },
      ],
      items: [
        { title: loss.title, meta: `${loss.where} · ${loss.when}`, body: [loss.result[0], loss.result[1]], to: `/research/${loss.slug}` },
        { title: es.title, meta: `${es.where} · ${es.when}`, body: [es.method[1], es.result[0]], to: `/research/${es.slug}`, flag: es.unverified?.[0] },
        { title: ocean.title, meta: `${ocean.where} · ${ocean.when}`, body: ocean.result, to: `/research/${ocean.slug}`, flag: ocean.unverified?.[0] },
      ],
      demo: 'lossmask',
      aliases: ['payload', 'science', 'research', 'lossmask', 'loss', 'masking', 'welfare', 'apart', 'es', 'es-lora', 'eslora', 'lora', 'ocean', 'solids'],
    },
  ]
  if (opts.beri)
    list.push({
      id: 'rideshare',
      code: 'RIDESHARE',
      name: 'Beri',
      maps: 'Product',
      summary: beri.oneLiner,
      readouts: [
        { m: 'ROLE', v: 'CO-FOUNDER' },
        { m: 'IOS', v: 'SwiftUI' },
        { m: 'BACKEND', v: 'Supabase' },
        { m: 'ANDROID', v: 'Kotlin' },
      ],
      items: [{ title: 'Beri', meta: beri.role, body: [beri.oneLiner, `Stack: ${beri.stack.join(', ')}.`], to: '/beri', href: beri.url, hrefLabel: 'getberi.com' }],
      aliases: ['rideshare', 'beri', 'ios', 'app'],
    })
  list.push(
    {
      id: 'heritage',
      code: 'HERITAGE',
      name: 'Flight heritage',
      maps: 'Earlier work',
      summary: 'Earlier builds, competitions and open-source fixes.',
      readouts: [
        { m: 'AIMO.RANK', v: 'TOP 10%', u: 'of 2,200' },
        { m: 'AIMO.ACC', v: '54%' },
        { m: 'HTN.PRIZES', v: '2', u: 'of 300+ teams' },
        { m: 'HIVE.STARS', v: '7.7k' },
      ],
      items: earlier.map((e) => ({
        title: e.title,
        meta: `${e.role} · ${e.when}`,
        body: [e.detail],
        href: e.href,
        hrefLabel: e.href ? e.href.replace(/^https?:\/\//, '') : undefined,
        flag: 'unverified' in e && e.unverified ? 'Parameter Golf found in local repo; confirm it is okay to list.' : undefined,
      })),
      aliases: ['heritage', 'earlier', 'archive', 'aimo', 'kaggle', 'hackthenorth', 'optimate', 'drop', 'hive', 'parameter', 'golf'],
    },
    {
      id: 'ground',
      code: 'GROUND',
      name: 'Ground segment',
      maps: 'Community',
      summary: 'The people side: events and teams.',
      readouts: [{ m: 'HACK.FOUNDED', v: '2022' }, { m: 'HACK.PEOPLE', v: '450+' }, ...(opts.community.length > 1 ? [{ m: 'ROLES', v: String(opts.community.length) }] : [])],
      items: opts.community.map((c) => ({ title: c.title, meta: `${c.role} · ${c.when}`, body: [c.detail], href: c.href, hrefLabel: c.href?.replace(/^https?:\/\//, '') })),
      aliases: ['ground', 'community', 'hackathon', 'jbcn', 'vikelabs', 'cde'],
    },
  )
  return list
}

export const researchAliases: Record<string, string> = {
  steering: 'activation-steering',
  'activation-steering': 'activation-steering',
  steer: 'activation-steering',
  lossmask: 'loss-masking-distress',
  'loss-masking': 'loss-masking-distress',
  'loss-masking-distress': 'loss-masking-distress',
  loss: 'loss-masking-distress',
  welfare: 'loss-masking-distress',
  es: 'es-lora',
  'es-lora': 'es-lora',
  eslora: 'es-lora',
  retrieval: 'billion-vector-retrieval',
  'billion-vector-retrieval': 'billion-vector-retrieval',
  deia: 'billion-vector-retrieval',
  vectors: 'billion-vector-retrieval',
  ocean: 'ocean-sensing',
  'ocean-sensing': 'ocean-sensing',
}
