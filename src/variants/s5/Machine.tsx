// MACHINE: a plain-text, monospace, key/value mirror of the site for agents (after basement.studio's MACHINE mode).
// Same facts as the human view, nothing extra. Its header is an ASCII ground track of MarmotSat, propagated live with
// SGP4 from the current TLE: the one piece of decoration here is real data.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { works } from '../../content/work'
import { roles } from '../../content/work'
import { person, links, linkOrder, earlier, beri, research } from '../../content/site'
import { Show } from '../../lib/labprefs'
import { Link } from '../../lib/router'
import type { Page } from '../../routes'
import { spec, TLE_URL, pad2 } from './data'
import { LAND_N, LAND_W } from './land'
import { useTel, utc, lat, lon, km, type Tel } from './telemetry'

const DEG = 180 / Math.PI
const LEAD = 13 // key column width, in characters
const dots = (k: string) => `${k} ${'.'.repeat(Math.max(2, LEAD - k.length - 1))}`
const bare = (href: string) => href.replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '')

function KV({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="s5m-kv">
      <span className="s5m-k">{dots(k)}</span>
      <span className="s5m-v">{children}</span>
    </div>
  )
}

function Rule({ id, label, n }: { id?: string; label: string; n?: number }) {
  return (
    <h2 className="s5m-rule" id={id} tabIndex={-1}>
      <span>
        ── /{label}
        {n !== undefined ? ` [${pad2(n)}]` : ''}{' '}
      </span>
      <span className="s5m-rule__fill" aria-hidden="true">
        {'─'.repeat(120)}
      </span>
    </h2>
  )
}

/** Equirectangular ASCII map: land from the 1-bit mask, the last half orbit (·), the next half (•), the satellite (@). */
function AsciiMap({ t }: { t: Tel }) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(max-width: 720px)')
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const L = narrow ? LAND_N : LAND_W
  const bucket = Math.floor(t.now / 5000) // the track only needs refreshing every few seconds
  const track = useMemo(() => {
    if (!t.sat) return null
    const half = t.sat.periodMin / 2
    const pts = t.sat.track(t.now, -half, half, 240)
    return pts.map((p, i) => ({ lon: Math.atan2(p[1], p[0]) * DEG, lat: Math.asin(Math.max(-1, Math.min(1, p[2]))) * DEG, future: i > 120 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.sat, bucket, narrow])

  const rows = L.rows.length
  const cols = L.cols
  const cell = (la: number, lo: number) => [Math.min(rows - 1, Math.max(0, Math.floor(((90 - la) / 180) * rows))), Math.min(cols - 1, Math.max(0, Math.floor(((lo + 180) / 360) * cols)))]
  // 0 sea/land glyphs, 1 past track, 2 next track, 3 satellite + label, 4 Victoria
  const ch: string[][] = L.rows.map((r) => Array.from(r, (d) => (d === '0' ? ' ' : d < '3' ? '.' : d < '7' ? ':' : '#')))
  const cl: number[][] = L.rows.map((r) => Array.from(r, () => 0))
  const put = (r: number, c: number, s: string, k: number) => {
    for (let i = 0; i < s.length && c + i < cols; i++) {
      ch[r][c + i] = s[i]
      cl[r][c + i] = k
    }
  }
  if (track) for (const p of track) {
    const [r, c] = cell(p.lat, p.lon)
    if (cl[r][c] === 0) put(r, c, p.future ? '•' : '·', p.future ? 2 : 1)
  }
  const [vr, vc] = cell(48.43, -123.37)
  put(vr, vc, '+', 4)
  if (vc + 5 < cols) put(vr, vc + 2, 'VIC', 4)
  if (t.st) {
    const [sr, sc] = cell(t.st.lat, t.st.lon)
    put(sr, sc, '@', 3)
    const label = narrow ? 'MSAT' : 'MARMOTSAT'
    if (sc + label.length + 3 < cols) put(sr, sc + 2, label, 3)
    else put(sr, Math.max(0, sc - label.length - 1), label, 3)
  }
  return (
    <pre className="s5m-map" aria-hidden="true" data-quiet>
      {ch.map((row, r) => {
        const segs: ReactNode[] = []
        let run = ''
        let k = cl[r][0]
        row.forEach((c, i) => {
          if (cl[r][i] !== k) {
            segs.push(<span key={i} className={`s5m-c${k}`}>{run}</span>)
            run = ''
            k = cl[r][i]
          }
          run += c
        })
        segs.push(<span key="e" className={`s5m-c${k}`}>{run}</span>)
        return <div key={r}>{segs}</div>
      })}
    </pre>
  )
}

function Telemetry() {
  const t = useTel()
  const s = t.st
  const age = t.tle ? (t.now - t.tle.fetchedAt) / 3600e3 : 0
  const src = t.src === 'pending' ? 'BUILD SNAPSHOT (FETCHING CELESTRAK)' : t.src === 'celestrak' ? 'CELESTRAK, JUST NOW' : t.src === 'session' ? 'CELESTRAK, CACHED < 2 H' : 'BUILD SNAPSHOT'
  return (
    <section className="s5m-block" aria-labelledby="m-tel">
      <Rule id="m-tel" label="TELEMETRY" />
      <AsciiMap t={t} />
      <KV k="OBJECT">MARMOTSAT · NORAD 69912 · CUBESAT, UVIC CFAR</KV>
      <KV k="UTC">{t.now ? utc(t.now) : '--:--:--'}</KV>
      <KV k="SUB-SAT PT">{s ? `${lat(s.lat)} ${lon(s.lon)}` : '—'}</KV>
      <KV k="ALTITUDE">{s ? `${km(s.alt)} · ${s.speed.toFixed(2)} KM/S` : '—'}</KV>
      <KV k="LIGHT">{s ? (s.sunlit ? 'SUNLIT' : 'IN EARTH SHADOW') : '—'}</KV>
      <KV k="FROM VIC">{s ? `EL ${s.el >= 0 ? '+' : '−'}${Math.abs(s.el).toFixed(1)}° · AZ ${s.az.toFixed(0)}° · ${s.el >= 10 ? 'OVERHEAD NOW' : 'BELOW MASK'}` : '—'}</KV>
      <KV k="METHOD">
        SGP4, IN THIS BROWSER · TLE {src}
        {t.tle ? ` · EPOCH AGE ${age < 48 ? `${age.toFixed(1)} H` : `${(age / 24).toFixed(1)} D`}` : ''} ·{' '}
        <a href={TLE_URL} target="_blank" rel="noopener">
          RAW TLE
        </a>
      </KV>
    </section>
  )
}

function Home({ base }: { base: string }) {
  return (
    <>
      <section className="s5m-block" aria-labelledby="m-ident">
        <Rule id="m-ident" label="IDENT" />
        <KV k="NAME">{person.name.toUpperCase()}</KV>
        <KV k="FOCUS">ML SYSTEMS · INTERPRETABILITY</KV>
        <KV k="SCHOOL">UNIVERSITY OF VICTORIA · B.S. COMPUTER SCIENCE · {person.gradMonth.toUpperCase()}</KV>
        <KV k="BASED">{person.location.toUpperCase()}</KV>
        <KV k="EMAIL">
          <a href={links.email.href}>{person.email}</a>
        </KV>
      </section>

      <section className="s5m-block" aria-labelledby="m-work">
        <Rule id="m-work" label="WORK" n={works.length} />
        {works.map((w) => {
          const s = spec[w.key]
          return (
            <article key={w.key} className="s5m-item" aria-label={w.title}>
              <h3 className="s5m-h">
                <span className="s5m-n">{w.n}</span> {w.title.toUpperCase()}
              </h3>
              <KV k="HOOK">{w.hook}</KV>
              <KV k="WHERE">
                {s.where.toUpperCase()} · {s.when.toUpperCase()}
              </KV>
              <KV k="DATA">
                {s.data.toUpperCase()} · {w.tag.toUpperCase()}
              </KV>
              <KV k="RESULT">{w.key === 'orbit' ? 'IN ORBIT · NORAD 69912' : s.result.toUpperCase()}</KV>
              <KV k="READ">
                {w.slug ? (
                  <Link to={`${base}/research/${w.slug}`}>{`${base}/research/${w.slug}`}</Link>
                ) : (
                  <a href={TLE_URL} target="_blank" rel="noopener">
                    {bare(TLE_URL)}
                  </a>
                )}
              </KV>
            </article>
          )
        })}
      </section>

      <section className="s5m-block" aria-labelledby="m-exp">
        <Rule id="m-exp" label="EXPERIENCE" n={roles.length} />
        {roles.map((r) => (
          <article key={r.org} className="s5m-item" aria-label={`${r.role}, ${r.org}`}>
            <h3 className="s5m-h">
              <span className="s5m-n">{r.when.toUpperCase()}</span> {r.org.toUpperCase()} · {r.role.toUpperCase()}
            </h3>
            <KV k="LINE">{r.line}</KV>
            <KV k="METRIC">{r.metric.toUpperCase()}</KV>
            <KV k="WHERE">{r.where.toUpperCase()}</KV>
            {r.bullets.map((b, i) => (
              <KV key={i} k={`DETAIL ${i + 1}`}>
                {b}
              </KV>
            ))}
          </article>
        ))}
      </section>

      <section className="s5m-block" aria-labelledby="m-earlier">
        <Rule id="m-earlier" label="EARLIER" n={earlier.length} />
        <Show when="beri">
          <KV k="BERI">
            {beri.oneLiner}{' '}
            <Link to={`${base}/beri`}>{`${base}/beri`}</Link>
          </KV>
        </Show>
        {earlier.map((e) => (
          <KV key={e.title} k={e.when}>
            {e.title.toUpperCase()} · {e.role}. {e.detail}{' '}
            {e.href && (
              <a href={e.href} target="_blank" rel="noopener">
                {bare(e.href)}
              </a>
            )}
          </KV>
        ))}
      </section>
    </>
  )
}

function Article({ slug, base }: { slug: string; base: string }) {
  const r = research.find((x) => x.slug === slug)!
  return (
    <>
      <section className="s5m-block" aria-labelledby="m-doc">
        <Rule id="m-doc" label={`RESEARCH/${slug.toUpperCase()}`} />
        <h1 className="s5m-h s5m-h--doc">{r.title.toUpperCase()}</h1>
        <KV k="WHERE">{r.where.toUpperCase()}</KV>
        <KV k="WHEN">{r.when.toUpperCase()}</KV>
        <KV k="TAGS">{r.tags.join(', ').toUpperCase()}</KV>
        <KV k="QUESTION">{r.question}</KV>
        {r.method.map((m, i) => (
          <KV key={m} k={`METHOD ${i + 1}`}>
            {m}
          </KV>
        ))}
        {r.result.map((m, i) => (
          <KV key={m} k={`RESULT ${i + 1}`}>
            {m}
          </KV>
        ))}
        {r.next.map((m, i) => (
          <KV key={m} k={`NEXT ${i + 1}`}>
            {m}
          </KV>
        ))}
        {r.links?.map((l) => (
          <KV key={l.href} k="LINK">
            <a href={l.href} target="_blank" rel="noopener">
              {l.label.toUpperCase()} · {bare(l.href)}
            </a>
          </KV>
        ))}
        <KV k="BACK">
          <Link to={`${base}/`}>{`${base}/`}</Link>
        </KV>
      </section>
    </>
  )
}

export function Machine({ page, base, id }: { page: Page; base: string; id: string }) {
  const t = useTel()
  const path = page.kind === 'research' ? `/research/${page.slug}` : page.kind === 'beri' ? '/beri' : page.kind === 'notfound' ? '/404' : '/'
  const jump = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const el = document.getElementById(to)
    el?.scrollIntoView({ block: 'start' })
    el?.focus({ preventScroll: true })
  }
  return (
    <main id={id} className="s5m" tabIndex={-1} aria-label="Machine-readable view">
      <header className="s5m-head">
        <p className="s5m-title">
          TANUJDARGAN.COM :: MACHINE-READABLE INDEX <span className="s5m-dim">{path.toUpperCase()}</span>
        </p>
        <p className="s5m-dim"># PLAIN-TEXT MIRROR OF THIS SITE FOR AGENTS, CRAWLERS, AND PEOPLE WHO PREFER IT RAW. SAME FACTS AS THE HUMAN VIEW.</p>
        <nav className="s5m-nav" aria-label="Machine index">
          {page.kind === 'home' ? (
            <>
              <a href="#m-tel" onClick={jump('m-tel')}>/TELEMETRY</a>
              <a href="#m-work" onClick={jump('m-work')}>/WORK</a>
              <a href="#m-exp" onClick={jump('m-exp')}>/EXPERIENCE</a>
              <a href="#m-earlier" onClick={jump('m-earlier')}>/EARLIER</a>
              <a href="#m-links" onClick={jump('m-links')}>/LINKS</a>
            </>
          ) : (
            <Link to={`${base}/`}>/HOME</Link>
          )}
        </nav>
      </header>

      {page.kind === 'home' && <Telemetry />}
      {page.kind === 'home' && <Home base={base} />}
      {page.kind === 'research' && <Article slug={page.slug} base={base} />}
      {page.kind === 'beri' && (
        <section className="s5m-block" aria-labelledby="m-beri">
          <Rule id="m-beri" label="BERI" />
          <KV k="WHAT">{beri.oneLiner}</KV>
          <KV k="ROLE">{beri.role}</KV>
          <KV k="STACK">{beri.stack.join(', ').toUpperCase()}</KV>
          <KV k="URL">
            <a href={beri.url} target="_blank" rel="noopener">
              {bare(beri.url)}
            </a>
          </KV>
        </section>
      )}
      {page.kind === 'notfound' && (
        <section className="s5m-block" aria-labelledby="m-404">
          <Rule id="m-404" label="404" />
          <KV k="STATUS">NO ROUTE AT THIS ADDRESS.</KV>
          <KV k="TRY">
            <Link to={`${base}/`}>{`${base}/`}</Link>
          </KV>
        </section>
      )}

      <section className="s5m-block" aria-labelledby="m-links">
        <Rule id="m-links" label="LINKS" />
        {linkOrder.map((k) => (
          <KV key={k} k={links[k].label.toUpperCase()}>
            <a href={links[k].href} {...(k === 'email' ? {} : { target: '_blank', rel: 'noopener' })}>
              {k === 'resume' ? 'resume.pdf' : bare(links[k].href)}
            </a>
          </KV>
        ))}
      </section>
      <p className="s5m-eof">
        ── EOF{t.now ? ` · ${new Date(t.now).toISOString().slice(0, 19)}Z` : ''} ──<span className="s5m-caret" aria-hidden="true" />
      </p>
    </main>
  )
}
