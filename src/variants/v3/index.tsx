/*
 * v3 "Vector space": the work as points in a space you can fly through.
 * Patterns (PORTFOLIO_TASTE.md §4):
 *   P04 embedding field (the three.js scene: faint field + labelled nodes + the real joy steering cloud and arrow)
 *   P29 HUD overlay over the canvas (plain DOM, Martian Mono telemetry; no dither pass, no post-processing)
 *   P12 pause control (auto-rotate toggle; off under reduced motion)
 *   P01 steering demo on the home page (<Demo kind="steering" />)
 *   P19 one proof metric per node / row
 *   P27 copy-email morph
 *   P28 outline wordmark footer (static)
 * Tokens: ease-out, ease-drawer (sheet), ease-expo (hero entrance), springs from useMotionPrefs.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/martian-mono'
import { person, research, engineering, experience, earlier as earlierAll, beri, links, workLinkOrder } from '../../content/site'
import { useProof, useCommunity } from '../../content/useContent'
import { Show, useFlags } from '../../lib/labprefs'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { clusters, nodesFor, earlierOnly, fmt } from './nodes'
import { Space, locate } from './Space'
import './v3.css'

// metrics only; positions don't matter here, so the all-on set covers every id
const allNodes = nodesFor({ beri: true, vikelabs: true, cde: true })
const metricOf = (id: string) => allNodes.find((n) => n.id === id)?.metric
// resume roles told in Work (CFAR sits in Hardware, DEIA in Research)
const earlierLink = (org: string) => earlierAll.find((e) => org.includes(e.title))?.href
const roles = experience.filter((x) => !x.org.startsWith('UVic') && !x.org.startsWith('DEIA'))

function Top({ base }: { base: string }) {
  return (
    <header className="v3-top">
      <div className="v3-top__in">
        <Link to={`${base}/`} className="v3-top__name">
          <span className="v3-top__mark" aria-hidden="true" />
          Tanuj Dargan
        </Link>
        <nav aria-label="Sections" className="v3-top__nav">
          <Link to={`${base}/#space`}>Space</Link>
          <Link to={`${base}/#research`}>Research</Link>
          <Link to={`${base}/#work`}>Work</Link>
          <Link to={`${base}/#contact`}>Contact</Link>
        </nav>
        <Links className="v3-top__icons" mode="icon" size={16} only={workLinkOrder} />
      </div>
    </header>
  )
}

function Hero({ base }: { base: string }) {
  const proof = useProof()
  const toFor: Record<string, string | undefined> = { beri: `${base}/beri`, marmotsat: `${base}/#hardware`, research: `${base}/#research` }
  const to = proof.map((p) => toFor[p.key])
  return (
    <div className="v3-hero">
      <p className="v3-mono v3-in" style={{ ['--i' as string]: 0 }}>
        CS · UVic · class of {person.grad}
        <span className="v3-long"> · accelerated three-year track</span>
      </p>
      <h1 className="v3-name v3-in" style={{ ['--i' as string]: 1 }}>
        <span>Tanuj</span> <span>Dargan</span>
      </h1>
      <p className="v3-line v3-in" style={{ ['--i' as string]: 2 }}>
        I build ML systems and look for concepts as directions inside models.
      </p>
      <ol className="v3-proof" aria-label="Proof">
        {proof.map((p, i) => (
          <li key={p.key} className="v3-in" style={{ ['--i' as string]: 3 + i }}>
            <span className="v3-mono v3-proof__k" aria-hidden="true">
              0{i + 1}
            </span>
            <span>
              {to[i] ? (
                <Link to={to[i]!} className="v3-proof__l">
                  {p.label}
                </Link>
              ) : (
                <b className="v3-proof__l">{p.label}</b>
              )}{' '}
              <span className="v3-proof__d">{p.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <Links className="v3-links v3-in" mode="both" size={14} only={workLinkOrder} />
    </div>
  )
}

function SecHead({ id, code, title, note, cluster }: { id?: string; code: string; title: string; note?: string; cluster: number }) {
  return (
    <header className="v3-sec__h">
      <h2 id={id}>
        <span className="v3-mono v3-sec__code">{code}</span>
        <span className="v3-sec__t">{title}</span>
      </h2>
      {note && <span className="v3-mono v3-sec__note">{note}</span>}
      <button className="v3-btn v3-locate" onClick={() => locate(cluster)}>
        <span aria-hidden="true">◎</span> Locate in space
        <span className="v3-locate__pos" aria-hidden="true">
          {fmt(clusters[cluster].center)}
        </span>
      </button>
    </header>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  return (
    <button
      className="v3-copy"
      aria-live="polite"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="v3-led" data-on={copied || undefined} aria-hidden="true" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          initial={{ opacity: 0, y: 8 * m.k, filter: m.reduced ? 'none' : 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: m.reduced ? 'none' : 'blur(0px)' }}
          exit={{ opacity: 0, y: -8 * m.k }}
          transition={{ duration: m.dur(0.18), ease: [0.23, 1, 0.32, 1] }}
        >
          {copied ? 'Copied to clipboard' : person.email}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function Row({ k, title, meta, detail, metric, to, href, hrefLabel, flag, live, logo }: {
  k: string
  title: string
  meta: string
  detail: string
  metric?: string
  to?: string
  href?: string
  hrefLabel?: string
  flag?: string
  live?: boolean
  logo?: OrgKey
}) {
  return (
    <li className="v3-row">
      <span className="v3-mono v3-row__k">
        <span className="v3-dot" data-live={live || undefined} aria-hidden="true" />
        {k}
      </span>
      <div className="v3-row__main">
        {logo && <OrgLogo org={logo} height={logo === 'mlh' ? 24 : 17} className="v3-row__logo" />}
        <h3 className="v3-row__t">
          {to ? <Link to={to}>{title}</Link> : href ? <a href={href} target="_blank" rel="noopener">{title}</a> : title}
          {flag && <Flag note={flag} />}
        </h3>
        <p className="v3-row__meta">{meta}</p>
        <p className="v3-row__d">{detail}</p>
        {(to || href) && (
          <p className="v3-row__acts">
            {to && (
              <Link to={to} className="v3-inline">
                {to.includes('/beri') ? 'Case study' : 'Write-up'} <span aria-hidden="true">→</span>
              </Link>
            )}
            {href && (
              <a href={href} className="v3-inline" target="_blank" rel="noopener">
                {hrefLabel ?? href.replace('https://', '')} <span aria-hidden="true">↗</span>
              </a>
            )}
          </p>
        )}
      </div>
      {metric && <span className="v3-mono v3-row__m">{metric}</span>}
    </li>
  )
}

function Home({ base }: { base: string }) {
  const community = useCommunity()
  const flags = useFlags()
  return (
    <>
      <Space base={base} hero={<Hero base={base} />} />

      <div className="v3-doc">
        <p className="v3-mono v3-doc__intro">
          The same space, as a document <span aria-hidden="true">↓</span>
        </p>

        <section className="v3-sec" aria-labelledby="research">
          <SecHead id="research" code="C1 · C2" title="Research" note="5 write-ups" cluster={0} />
          <p className="v3-lede">
            I look for concepts as directions in a model's residual stream, then check whether pushing along them does what the label says. Before that: billion-vector
            search on GPUs and ocean-sensing models. Each write-up has the question, the method, the result and what I'd do next.
          </p>
          <div className="v3-fig">
            <Demo kind="steering" />
            <p className="v3-mono v3-fig__cap">
              The accent arrow in the space above is this direction: joy, layer 17, drawn from the same activations.
            </p>
          </div>
          <ol className="v3-rows">
            {research.map((r, i) => {
              return (
                <Row
                  key={r.slug}
                  k={`R${i + 1}`}
                  title={r.title}
                  meta={`${r.where} · ${r.when}`}
                  detail={r.short + '.'}
                  metric={metricOf(r.slug)}
                  to={`${base}/research/${r.slug}`}
                  flag={r.unverified?.[0]}
                  live={!!r.demo}
                />
              )
            })}
          </ol>
        </section>

        <section className="v3-sec" aria-labelledby="work">
          <SecHead id="work" code="C3" title="Work" note={flags.beri ? 'Amazon · Beri' : 'Amazon · RBC Borealis'} cluster={2} />
          <ol className="v3-rows">
            {roles.map((x, i) => {
              const link = earlierLink(x.org)
              return (
                <Row
                  key={x.org}
                  k={`W${i + 1}`}
                  title={x.org}
                  meta={`${x.role} · ${x.where} · ${x.when}`}
                  detail={x.line}
                  metric={x.metric}
                  logo={x.logo}
                  href={link}
                  hrefLabel={link?.replace('https://', '').replace(/\/$/, '')}
                />
              )
            })}
            <Show when="beri">
              <Row
                k={`W${roles.length + 1}`}
                title="Beri"
                meta={`Building · ${beri.stack.join(', ')}`}
                detail={`${beri.oneLiner} I build the app, the backend and the design system.`}
                metric="iOS"
                to={`${base}/beri`}
                href={beri.url}
                hrefLabel="getberi.com"
              />
            </Show>
          </ol>
        </section>

        <section className="v3-sec" aria-labelledby="hardware">
          <SecHead id="hardware" code="C4" title="Hardware" note="Satellite · homelab" cluster={3} />
          <ol className="v3-rows">
            {engineering.map((e, i) => (
              <Row
                key={e.title}
                k={`H${i + 1}`}
                title={e.title}
                meta={e.role}
                detail={e.detail}
                metric={metricOf(i === 0 ? 'satellite' : 'homelab')}
                logo={i === 0 ? 'uvic' : undefined}
                href={'href' in e ? e.href : undefined}
                hrefLabel="GitHub"
              />
            ))}
          </ol>
        </section>

        <section className="v3-sec" aria-labelledby="community">
          <SecHead id="community" code="C5" title="Community" note={community.map((c) => c.title).join(' · ')} cluster={4} />
          <ol className="v3-rows">
            {community.map((c, i) => (
              <Row key={c.title} k={`M${i + 1}`} title={c.title} meta={`${c.role} · ${c.when}`} detail={c.detail} href={'href' in c ? c.href : undefined} />
            ))}
          </ol>
        </section>

        <section className="v3-sec v3-sec--quiet" aria-labelledby="earlier">
          <SecHead id="earlier" code="C6" title="Earlier" note={`${earlierOnly.length} items`} cluster={5} />
          <ul className="v3-earlier">
            {earlierOnly.map((e) => (
              <li key={e.title}>
                <span className="v3-earlier__t">
                  {e.href ? (
                    <a href={e.href} target="_blank" rel="noopener">
                      {e.title} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    e.title
                  )}
                  {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in local repo; confirm it's okay to list." />}
                </span>
                <span className="v3-earlier__r">{e.role}</span>
                <span className="v3-earlier__d">{e.detail}</span>
                <span className="v3-mono v3-earlier__w">{e.when}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="contact" className="v3-sec v3-contact" aria-labelledby="contact-h">
          <header className="v3-sec__h">
            <h2 id="contact-h">
              <span className="v3-mono v3-sec__code">TX</span>
              <span className="v3-sec__t">Contact</span>
            </h2>
            <span className="v3-mono v3-sec__note">{person.location}</span>
          </header>
          <p className="v3-contact__line">Research programs, labs and founders: email is fastest.</p>
          <CopyEmail />
          <Links className="v3-links" mode="both" size={14} />
        </section>
      </div>
    </>
  )
}

export default function V3({ page, base }: VariantProps) {
  return (
    <div className="v3">
      <a href="#main" className="v3-skip">
        Skip to content
      </a>
      <Top base={base} />
      <main id="main" data-page={page.kind}>
        {page.kind === 'home' && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="v3-page">
            <ResearchArticle slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="v3-page">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="v3-nf">
            <p className="v3-mono">404 · no point at these coordinates</p>
            <h1 className="v3-name">Empty space.</h1>
            <p className="v3-line">
              <Link to={`${base}/`} className="v3-inline">
                Back to the map <span aria-hidden="true">→</span>
              </Link>
            </p>
          </section>
        )}
      </main>
      <footer className="v3-foot">
        <p className="v3-foot__mark" aria-hidden="true">
          Tanuj Dargan
        </p>
        <div className="v3-foot__row v3-mono">
          <span>© 2026 {person.name}</span>
          <span>Vite, React, three.js. The field is one draw call; the arrow is real activation data.</span>
        </div>
      </footer>
    </div>
  )
}
