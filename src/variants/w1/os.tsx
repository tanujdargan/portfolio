// The monitor: its idle home screen (mapped onto the 3D screen) and the full portfolio OS you zoom into.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { thesis } from '../../content/curated'
import { person } from '../../content/site'
import { Link } from '../../lib/router'
import { APP_VIEW, APPS, Contact, type AppId } from './apps'
import type { SkyNow } from './sky.lazy'

function useClock() {
  const [t, setT] = useState<string | null>(null)
  useEffect(() => {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hour12: false })
    const tick = () => setT(f.format(new Date()).replace(/^24/, '00'))
    tick()
    const i = setInterval(tick, 15000)
    return () => clearInterval(i)
  }, [])
  return t
}

/** What the monitor shows from across the room. Decorative copy of the OS desktop; the real controls are in the panel. */
export function ScreenHome({ notFound, onOpen }: { notFound?: boolean; onOpen: (a: AppId) => void }) {
  const t = useClock()
  return (
    <div className="w1-sh" onClick={() => onOpen('about')}>
      <div className="w1-sh__bar">
        <span className="w1-sh__dot" />
        <b>{person.name}</b>
        <span className="w1-sh__sp" />
        <span>{t ?? ''}</span>
      </div>
      <div className="w1-sh__body">
        {notFound ? (
          <>
            <p className="w1-sh__kicker">404</p>
            <p className="w1-sh__name">Not on this desk.</p>
          </>
        ) : (
          <>
            <p className="w1-sh__kicker">Portfolio · {person.location}</p>
            <p className="w1-sh__name">{person.name}</p>
            <p className="w1-sh__line">{thesis}</p>
          </>
        )}
        <ul className="w1-sh__icons">
          {APPS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen(a.id)
                }}
              >
                <span className="w1-sh__ic" data-app={a.id}>
                  <a.icon size={34} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span>{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="w1-sh__hint">
          Click to open <CornerDownLeft size={20} aria-hidden="true" />
        </p>
      </div>
    </div>
  )
}

function SatChip({ sky }: { sky: SkyNow | null }) {
  if (!sky) return null
  const up = !!sky.pass && !sky.replay
  return (
    <span className="w1-os__sat" data-up={up || undefined}>
      <span className="w1-led" aria-hidden="true" />
      MarmotSat {sky.lat >= 0 ? `${sky.lat.toFixed(1)}°N` : `${(-sky.lat).toFixed(1)}°S`} {sky.lon >= 0 ? `${sky.lon.toFixed(1)}°E` : `${(-sky.lon).toFixed(1)}°W`}
    </span>
  )
}

export function OS({
  id,
  base,
  app,
  phase,
  onApp,
  onClose,
  sky,
  standalone,
  children,
  title,
}: {
  id?: string
  base: string
  app: AppId | null
  phase: 'closed' | 'zoom' | 'open' | 'closing'
  rect?: unknown
  onApp?: (a: AppId) => void
  onClose?: () => void
  sky: SkyNow | null
  standalone?: boolean
  children?: ReactNode
  title?: string
}) {
  const main = useRef<HTMLDivElement>(null)
  const t = useClock()
  const open = phase === 'open'
  const first = useRef(true)

  useEffect(() => {
    if (standalone) return
    if (!open) {
      first.current = true
      return
    }
    main.current?.scrollTo(0, 0)
    const h = main.current?.querySelector<HTMLElement>('h2, h1')
    if (h) {
      h.tabIndex = -1
      h.focus({ preventScroll: true })
    }
    first.current = false
  }, [app, open, standalone])

  useEffect(() => {
    if (!open || standalone) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const n = +e.key
      if (n >= 1 && n <= APPS.length) onApp?.(APPS[n - 1].id)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, standalone, onApp])

  const V = app ? APP_VIEW[app] : null
  const label = title ?? APPS.find((a) => a.id === app)?.label ?? ''
  return (
    <div
      id={id}
      className="w1-os"
      data-phase={phase}
      data-standalone={standalone || undefined}
      role={standalone ? undefined : 'dialog'}
      aria-modal={standalone ? undefined : open || undefined}
      aria-label={standalone ? undefined : `${person.name}’s screen`}
      aria-hidden={!standalone && !open ? true : undefined}
    >
      <div className="w1-os__bar">
        <span className="w1-sh__dot" aria-hidden="true" />
        <b className="w1-os__who">{person.name}</b>
        <span className="w1-os__app">{label}</span>
        <span className="w1-sh__sp" />
        <SatChip sky={sky} />
        <span className="w1-os__clock" aria-label={t ? `Victoria time ${t}` : undefined}>
          {t ?? ''}
        </span>
        {standalone ? (
          <Link className="w1-os__close" to={base || '/'}>
            Back to the room
          </Link>
        ) : (
          <a
            className="w1-os__close"
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onClose?.()
            }}
          >
            Back to the room <kbd>esc</kbd>
          </a>
        )}
      </div>
      <nav className="w1-os__side" aria-label="Apps">
        <ul>
          {APPS.map((a, i) => (
            <li key={a.id}>
              {standalone ? (
                <Link to={`${base}/#${a.id}`} className="w1-os__nav" aria-current={a.id === app ? 'page' : undefined}>
                  <a.icon size={17} strokeWidth={1.7} aria-hidden="true" />
                  <span>{a.label}</span>
                </Link>
              ) : (
                <button type="button" className="w1-os__nav" aria-current={a.id === app ? 'page' : undefined} onClick={() => onApp?.(a.id)}>
                  <a.icon size={17} strokeWidth={1.7} aria-hidden="true" />
                  <span>{a.label}</span>
                  <kbd aria-hidden="true">{i + 1}</kbd>
                </button>
              )}
            </li>
          ))}
        </ul>
        <Contact className="w1-links w1-links--side" />
      </nav>
      <div className="w1-os__main" ref={main}>
        {children ?? (V && (open || phase === 'closing' || phase === 'closed') ? <V base={base} open={(a) => onApp?.(a)} /> : null)}
      </div>
    </div>
  )
}
