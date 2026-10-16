// What each station's sheet says. Facts come only from src/content (curated.ts, site.ts).
import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Demo } from '../../demos/Demo'
import { Logo } from '../../shared/Mark'
import { LinkIcon } from '../../shared/Links'
import { Link } from '../../lib/router'
import { amazonMetrics, education, more, roles, selected } from '../../content/curated'
import { links, person } from '../../content/site'
import type { StationId } from './world.lazy'

export const item = (id: string) => selected.find((s) => s.id === id)!

export interface StationMeta {
  id: StationId
  key: string
  /** the object in the world */
  object: string
  /** what it holds, in plain words */
  label: string
}
export const STATIONS: StationMeta[] = [
  { id: 'dish', key: '1', object: 'Dish', label: 'MarmotSat, in orbit' },
  { id: 'cabin', key: '2', object: 'Cabin monitor', label: 'Amazon, in production' },
  { id: 'dial', key: '3', object: 'Radio dial', label: 'Steer a model' },
  { id: 'logbook', key: '4', object: 'Logbook', label: 'Loss-masking finding' },
  { id: 'buoy', key: '5', object: 'Tide buoy', label: 'Ocean temperature' },
  { id: 'board', key: '6', object: 'Noticeboard', label: 'Experience, contact' },
]

function Spec({ id }: { id: string }) {
  const it = item(id)
  return (
    <dl className="x1-spec">
      <div>
        <dt>Where</dt>
        <dd>{it.where}</dd>
      </div>
      <div>
        <dt>When</dt>
        <dd>{it.when}</dd>
      </div>
      <div>
        <dt>Result</dt>
        <dd>{it.result}</dd>
      </div>
    </dl>
  )
}

export function Head({ id, mark, kicker, title, children }: { id: string; mark?: Parameters<typeof Logo>[0]['m']; kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="x1-sheet__head">
      <p className="x1-kicker">
        {mark && <Logo m={mark} w={22} h={22} />}
        <span>{kicker}</span>
      </p>
      <h2 id={`x1-h-${id}`} tabIndex={-1}>
        {title}
      </h2>
      {children}
    </header>
  )
}

const WriteUp = ({ base, slug }: { base: string; slug: string }) => (
  <Link className="x1-more" to={`${base}/research/${slug}`}>
    Read the write-up <ArrowUpRight size={16} aria-hidden="true" />
  </Link>
)

export function DishSheet({ live }: { live: ReactNode }) {
  const it = item('orbit')
  return (
    <>
      <Head id="dish" mark="cfar" kicker="UVic Centre for Aerospace Research" title={it.title}>
        <p className="x1-lede">{it.finding}</p>
      </Head>
      {live}
      <Spec id="orbit" />
      <div className="x1-demo">
        <Demo kind="orbit" />
      </div>
    </>
  )
}

export function CabinSheet() {
  const it = item('amazon')
  const r = roles[0]
  return (
    <>
      <Head id="cabin" mark="amazon" kicker={`Amazon Robotics · ${r.role} · ${r.when}`} title={it.title}>
        <p className="x1-lede">{it.finding}</p>
      </Head>
      <ul className="x1-metrics" aria-label="Results from the resume">
        {amazonMetrics.map((m) => (
          <li key={m.l}>
            <b>{m.n}</b>
            <span>{m.l}</span>
          </li>
        ))}
      </ul>
      <ul className="x1-bullets">
        {r.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="x1-note">Numbers are from the resume. Internal work, so there are no screenshots here. {it.result}.</p>
    </>
  )
}

export function DialSheet({ base, steer }: { base: string; steer: ReactNode }) {
  const it = item('steering')
  return (
    <>
      <Head id="dial" kicker="Replication · Qwen2.5-1.5B-Instruct" title={it.title}>
        <p className="x1-lede">{it.finding}</p>
        <p className="x1-tag">
          <span className="x1-prov">Real model outputs</span> Method replicated on Qwen2.5-1.5B-Instruct for this page, not my main project. Turn the dial; the cabin
          light follows the read-back.
        </p>
      </Head>
      {steer}
      <WriteUp base={base} slug="activation-steering" />
    </>
  )
}

export function LogbookSheet({ base }: { base: string }) {
  const it = item('lossmask')
  return (
    <>
      <Head id="logbook" mark="apart" kicker="Apart Research · Digital Minds sprint" title={it.title}>
        <p className="x1-lede">{it.finding}</p>
      </Head>
      <Spec id="lossmask" />
      <div className="x1-demo">
        <Demo kind="lossmask" finding />
      </div>
      <p className="x1-note">The conversation is illustrative; the tokens and the loss weights on them are exact.</p>
      <WriteUp base={base} slug="loss-masking-distress" />
    </>
  )
}

export function BuoySheet({ base }: { base: string }) {
  const it = item('ocean')
  return (
    <>
      <Head id="buoy" mark="uvic" kicker="SOLIDS Lab, UVic · 2025" title={it.title}>
        <p className="x1-lede">{it.finding}</p>
        <p className="x1-tag">
          <span className="x1-prov x1-prov--ill">Illustrative</span> The probe below is a drawing of the idea. The real result is R² 0.936 against deep-water sensors.
        </p>
      </Head>
      <div className="x1-demo">
        <Demo kind="ocean" />
      </div>
      <WriteUp base={base} slug="ocean-sensing" />
    </>
  )
}

export function Contact({ compact = false }: { compact?: boolean }) {
  const ks = ['email', 'linkedin', 'github', 'x'] as const
  return (
    <div className={compact ? 'x1-contact x1-contact--compact' : 'x1-contact'}>
      <a className="x1-btn x1-btn--primary" href={links.resume.href} target="_blank" rel="noopener">
        <LinkIcon k="resume" size={16} />
        <span>Resume (PDF)</span>
      </a>
      {ks.map((k) => {
        const l = links[k]
        const ext = !l.href.startsWith('mailto:')
        return (
          <a key={k} className="x1-btn" href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={compact ? (k === 'email' ? `Email ${person.email}` : l.label) : undefined}>
            <LinkIcon k={k} size={16} />
            {!compact && <span>{k === 'email' ? person.email : l.label}</span>}
          </a>
        )
      })}
    </div>
  )
}

export function BoardSheet({ base }: { base: string }) {
  return (
    <>
      <Head id="board" kicker="Noticeboard" title="Experience, more work and contact" />
      <section className="x1-block" aria-labelledby="x1-exp">
        <h3 id="x1-exp">Experience</h3>
        <ul className="x1-roles">
          {roles.map((r) => (
            <li key={r.org}>
              <details>
                <summary>
                  <Logo m={r.mark} w={36} h={28} />
                  <span className="x1-roles__main">
                    <span className="x1-roles__top">
                      <b>{r.org}</b>
                      <span>{r.when}</span>
                    </span>
                    <span className="x1-roles__role">{r.role}</span>
                    <span className="x1-roles__line">{r.line}</span>
                  </span>
                </summary>
                <ul className="x1-bullets">
                  {r.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </section>
      <section className="x1-block" aria-labelledby="x1-morew">
        <h3 id="x1-morew">More work</h3>
        <ul className="x1-list">
          {more.map((m) => {
            const body = (
              <>
                <b>{m.title}</b>
                <span>{m.line}</span>
              </>
            )
            return (
              <li key={m.title}>
                {m.href && m.ext ? (
                  <a href={m.href} target="_blank" rel="noopener">
                    {body}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                ) : m.href ? (
                  <Link to={base + m.href}>
                    {body}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                ) : (
                  <div>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <section className="x1-block" aria-labelledby="x1-edu">
        <h3 id="x1-edu">Education</h3>
        <p className="x1-edu">
          <Logo m="uvic" w={28} h={28} />
          <span>
            <b>{education.school}</b>
            <span>
              {education.degree}. Graduating {education.when}. {education.note}.
            </span>
          </span>
        </p>
      </section>
      <section className="x1-block" aria-labelledby="x1-contact">
        <h3 id="x1-contact">Contact</h3>
        <Contact />
      </section>
    </>
  )
}
