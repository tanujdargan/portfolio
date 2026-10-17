import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Demo } from '../../demos/Demo'
import type { WorkKey } from '../../content/work'

/** A Raycast keycap. `pressed` plays the press once (CSS); `live` follows a held key. */
export function Key({ children, pressed, wide, label }: { children: ReactNode; pressed?: boolean; wide?: boolean; label?: string }) {
  return (
    <kbd className="k2-key" data-pressed={pressed || undefined} data-wide={wide || undefined} aria-label={label}>
      {children}
    </kbd>
  )
}

/** The mark: a stack of glass layers with one lit, the hero object in 16 px. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="k2-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#k2-mg)" stroke="rgb(255 255 255 / .14)" />
      <path d="M7 6.5v11M10.3 5.5v13M13.6 6.5v11M16.9 7.5v9" stroke="rgb(255 255 255 / .5)" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13.6 6.5v11" stroke="#ff6a2b" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 13.2 20 10.8" stroke="#ffb27a" strokeWidth="1.1" strokeLinecap="round" />
      <defs>
        <linearGradient id="k2-mg" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#26282d" />
          <stop offset="1" stopColor="#111215" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** Window chrome shared by every feature: a title bar with traffic lights, a title, and a right slot. */
export function Win({
  title,
  icon,
  right,
  children,
  className = '',
  id,
  label,
}: {
  title: ReactNode
  icon?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  id?: string
  label?: string
}) {
  return (
    <div className={`k2-win ${className}`} id={id} role={label ? 'group' : undefined} aria-label={label}>
      <div className="k2-win__bar">
        <span className="k2-win__lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="k2-win__title">
          {icon}
          {title}
        </span>
        <span className="k2-win__right">{right}</span>
      </div>
      {children}
    </div>
  )
}

/** Provenance chip: what the window shows, said plainly. */
export function Prov({ children, tone = 'real' }: { children: ReactNode; tone?: 'real' | 'illus' }) {
  return (
    <span className="k2-prov" data-tone={tone}>
      <i aria-hidden="true" />
      {children}
    </span>
  )
}

/** Runs `cb(visible)` as the element enters and leaves the viewport; render loops use it to sleep off-screen. */
export function useVisible<T extends Element>(margin = '0px') {
  const ref = useRef<T>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return [ref, vis] as const
}

const demoTitle: Record<WorkKey, string> = {
  steering: 'Steering · real model outputs',
  lossmask: 'Loss masking · real tokens, exact weights',
  orbit: 'MarmotSat · live from its TLE',
  ocean: 'Ocean sensing · illustrative',
  es: 'ES-LoRA · illustrative',
  retrieval: 'Billion-vector search · illustrative',
}

/** The real demo, opened from a window: a modal <dialog> (focus trap and Esc for free). */
export function Sheet({ kind, onClose, children }: { kind: WorkKey | null; onClose: () => void; children?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (kind && !d.open) d.showModal()
    if (!kind && d.open) d.close()
  }, [kind])
  return (
    <dialog
      ref={ref}
      className="k2-sheet"
      aria-label={kind ? demoTitle[kind] : 'Demo'}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {kind && (
        <div className="k2-sheet__in">
          <div className="k2-sheet__bar">
            <span className="k2-win__lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="k2-sheet__title">{demoTitle[kind]}</span>
            <button className="k2-iconbtn" onClick={onClose} aria-label="Close demo">
              <X size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <div className="k2-sheet__body">
            <Demo kind={kind} finding rest={kind === 'steering' ? 0.6 : undefined} />
            {children}
          </div>
        </div>
      )}
    </dialog>
  )
}
