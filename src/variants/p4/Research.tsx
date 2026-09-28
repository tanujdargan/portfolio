import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { research, beri } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Flag } from '../../shared/Flag'
import { Link } from '../../lib/router'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import { featured, more, also, type Item } from './copy'

export function Arrow({ out = false }: { out?: boolean }) {
  return (
    <svg className="p4-arr" data-out={out || undefined} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {out ? <path d="M4 10 10 4M5 4h5v5" /> : <path d="M2 7h10M8 3l4 4-4 4" />}
    </svg>
  )
}

const flagFor = (slug: string) => {
  const u = research.find((r) => r.slug === slug)?.unverified
  return u?.length ? <Flag note={u[0]} /> : null
}

function Head({ meta, title, hook, flag }: { meta: string; title: string; hook: string; flag?: ReactNode }) {
  return (
    <div className="p4-item__head">
      <p className="p4-meta">{meta}</p>
      <h3 className="p4-item__t">
        {title}
        {flag}
      </h3>
      <p className="p4-item__hook">{hook}</p>
    </div>
  )
}

export function WriteUp({ base, slug, label = 'Read the write-up' }: { base: string; slug: string; label?: string }) {
  return (
    <Link to={`${base}/research/${slug}`} className="p4-go">
      {label}
      <Arrow />
    </Link>
  )
}

/** A research item whose demo runs inline (it still lazy-mounts near the viewport). */
function Featured({ item, base }: { item: Item; base: string }) {
  return (
    <div className="p4-item p4-item--feat">
      <Head meta={item.meta} title={item.title} hook={item.hook} flag={flagFor(item.slug)} />
      <Demo kind={item.demo} />
      <WriteUp base={base} slug={item.slug} />
    </div>
  )
}

/**
 * A compact item whose demo mounts on tap. Opening uses the same layout animation as the experience rows, so the
 * page makes room by transform and the demo fades in; the Demo slot reserves its height as soon as it mounts.
 */
function OnTap({ meta, title, hook, flag, demo, label, children }: { meta: string; title: string; hook: string; flag?: ReactNode; demo: Item['demo']; label: string; children?: ReactNode }) {
  const m = useMotionPrefs()
  const [open, setOpen] = useState(false)
  const layout = m.spring(300)
  const id = `p4-demo-${demo}`
  return (
    <motion.div layout transition={{ layout }} className="p4-item p4-item--tap" data-open={open || undefined} style={{ borderRadius: 16 }}>
      <motion.div layout="position" transition={{ layout }} className="p4-tap__top">
        <Head meta={meta} title={title} hook={hook} flag={flag} />
        <div className="p4-tap__acts">
          <button type="button" className="p4-try" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
            <span className="p4-try__label">
              <span>{label}</span>
              <span aria-hidden="true">Hide</span>
            </span>
            <span className="p4-pm" aria-hidden="true" />
          </button>
          {children}
        </div>
      </motion.div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="demo"
            id={id}
            layout="position"
            className="p4-tap__demo"
            initial={{ opacity: 0, y: 10 * m.k }}
            animate={{ opacity: 1, y: 0, transition: { duration: m.dur(0.36), delay: m.dur(0.12), ease: [0.23, 1, 0.32, 1] } }}
            exit={{ opacity: 0, transition: { duration: m.dur(0.1) } }}
            transition={{ layout }}
          >
            <Demo kind={demo} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function Research({ base }: { base: string }) {
  return (
    <>
      {featured.map((it) => (
        <Featured key={it.slug} item={it} base={base} />
      ))}
      <div className="p4-list">
        {more.map((it) => (
          <OnTap key={it.slug} meta={it.meta} title={it.title} hook={it.hook} flag={flagFor(it.slug)} demo={it.demo} label="Try it">
            <WriteUp base={base} slug={it.slug} label="Write-up" />
          </OnTap>
        ))}
      </div>
    </>
  )
}

export function Projects({ base }: { base: string }) {
  return (
    <>
      <div className="p4-list">
        <OnTap meta="UVic CfAR · launched Jul 2026" title="MarmotSat, in orbit" hook="A CubeSat launched on a SpaceX Falcon 9. I led its onboard-computer firmware." demo="orbit" label="Track it live" />
        <Show when="beri">
          <div className="p4-item p4-item--tap">
            <div className="p4-tap__top">
              <Head meta="iOS · 2025 –" title="Beri" hook={beri.oneLiner.split('. ')[0] + '.'} />
              <div className="p4-tap__acts">
                <Link to={`${base}/beri`} className="p4-go">
                  Case study
                  <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </Show>
      </div>
      <div className="p4-also">
        <h3 className="p4-meta p4-also__h">Also</h3>
        <ul className="p4-also__list">
          {also.map((a) => (
            <li key={a.title}>
              {a.href ? (
                <a href={a.href} target="_blank" rel="noopener" className="p4-also__a">
                  <span className="p4-also__t">{a.title}</span>
                  <span className="p4-also__l">{a.line}</span>
                  <Arrow out />
                </a>
              ) : (
                <span className="p4-also__a">
                  <span className="p4-also__t">{a.title}</span>
                  <span className="p4-also__l">{a.line}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
