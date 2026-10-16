import type { ComponentType } from 'react'
import { ChevronDown } from 'lucide-react'
import { roles, education } from '../content'
import { Logo } from '../Home'
import './exp.css'

// Versions 2–4 of this section for the review round. Version 1 is the current one in Home/index/Article.
// Reached at /gate/exp2 … /gate/exp4.
export type Props = {}

type Role = (typeof roles)[number]

const Bullets = ({ r, cls }: { r: Role; cls: string }) => (
  <ul className={cls}>
    {r.bullets.map((b) => (
      <li key={b}>{b}</li>
    ))}
  </ul>
)

// v2 · Cards: a grid of role cards, logo on top, every one-liner visible, details per card.
function ExpCards() {
  return (
    <section className="m-wrap m-sec" id="experience" aria-labelledby="exp-h">
      <h2 id="exp-h" className="m-h2">
        Experience
      </h2>
      <ul className="m-ex2-grid">
        {roles.map((r) => (
          <li key={r.org} className="m-ex2-card">
            <div className="m-ex2-top">
              <Logo m={r.mark} w={48} h={36} />
              <span className="m-ex2-when">{r.when}</span>
            </div>
            <h3 className="m-ex2-org">{r.org}</h3>
            <p className="m-ex2-role">{r.role}</p>
            <p className="m-ex2-line">{r.line}</p>
            <details className="m-ex2-d">
              <summary aria-label={`Details: ${r.org}`}>
                <span>Details</span>
                <ChevronDown className="m-ex2-chev" size={16} aria-hidden="true" />
              </summary>
              <Bullets r={r} cls="m-ex2-b" />
            </details>
          </li>
        ))}
        <li className="m-ex2-card m-ex2-edu">
          <Logo m="uvic" w={48} h={36} />
          <p>
            <b>{education.school}</b> · {education.degree}, {education.when}. {education.note}.
          </p>
        </li>
      </ul>
    </section>
  )
}

// v3 · Ledger: a compact table (org · role · dates); the one-liner and bullets open per row.
function ExpLedger() {
  return (
    <section className="m-wrap m-sec" id="experience" aria-labelledby="exp-h">
      <h2 id="exp-h" className="m-h2">
        Experience
      </h2>
      <div className="m-ex3-head" aria-hidden="true">
        <span />
        <span>Organisation</span>
        <span>Role</span>
        <span>Dates</span>
        <span />
      </div>
      <ul className="m-ex3-list">
        {roles.map((r) => (
          <li key={r.org}>
            <details className="m-ex3-row">
              <summary>
                <Logo m={r.mark} w={52} h={28} />
                <b className="m-ex3-org">{r.org}</b>
                <span className="m-ex3-role">{r.role}</span>
                <span className="m-ex3-when">{r.when}</span>
                <ChevronDown className="m-ex3-chev" size={18} aria-hidden="true" />
              </summary>
              <div className="m-ex3-body">
                <p className="m-ex3-line">{r.line}</p>
                <Bullets r={r} cls="m-ex3-b" />
              </div>
            </details>
          </li>
        ))}
        <li className="m-ex3-edu">
          <Logo m="uvic" w={52} h={28} />
          <b className="m-ex3-org">{education.school}</b>
          <span className="m-ex3-role">
            {education.degree}. {education.note}.
          </span>
          <span className="m-ex3-when">{education.when}</span>
          <span />
        </li>
      </ul>
    </section>
  )
}

// v4 · Two tracks: industry and research side by side, each reverse chronological.
const tracks: { name: string; orgs: string[] }[] = [
  { name: 'Industry', orgs: ['Amazon Robotics', 'Pear Care', 'MLH · Apache Airflow'] },
  { name: 'Research', orgs: ['RBC Borealis', 'DEIA Lab, UVic', 'UVic CfAR'] },
]

function ExpTracks() {
  return (
    <section className="m-wrap m-sec" id="experience" aria-labelledby="exp-h">
      <h2 id="exp-h" className="m-h2">
        Experience
      </h2>
      <div className="m-ex4-cols">
        {tracks.map((t) => (
          <div key={t.name} className="m-ex4-col">
            <h3 className="m-ex4-h">{t.name}</h3>
            <ul className="m-ex4-list">
              {roles
                .filter((r) => t.orgs.includes(r.org))
                .map((r) => (
                  <li key={r.org}>
                    <details className="m-ex4-role">
                      <summary>
                        <Logo m={r.mark} w={52} h={30} />
                        <span className="m-ex4-main">
                          <span className="m-ex4-t">
                            <b>{r.org}</b>
                            <span className="m-ex4-when">{r.when}</span>
                          </span>
                          <span className="m-ex4-r">{r.role}</span>
                          <span className="m-ex4-l">{r.line}</span>
                        </span>
                        <ChevronDown className="m-ex4-chev" size={18} aria-hidden="true" />
                      </summary>
                      <Bullets r={r} cls="m-ex4-b" />
                    </details>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="m-ex4-edu">
        <Logo m="uvic" w={52} h={30} />
        <span>
          <b>{education.school}</b> · {education.degree}, {education.when}. {education.note}.
        </span>
      </p>
    </section>
  )
}

export const versions: Record<string, ComponentType<Props>> = { '2': ExpCards, '3': ExpLedger, '4': ExpTracks }
