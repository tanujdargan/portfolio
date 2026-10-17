import { useRef, type ReactNode, type PointerEvent } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { links, type LinkKey } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { hero } from './data'

const fine = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches

/** Pulls toward the pointer while it's over the element, springs back on leave. Off for touch and reduced motion. */
export function Magnetic({ children, strength = 0.32, className }: { children: ReactNode; strength?: number; className?: string }) {
  const { reduced } = useMotionPrefs()
  const ref = useRef<HTMLSpanElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 14, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 220, damping: 14, mass: 0.6 })
  const move = (e: PointerEvent) => {
    if (reduced || !fine()) return
    const r = ref.current!.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const leave = () => {
    x.set(0)
    y.set(0)
  }
  return (
    <motion.span ref={ref} className={`r1-mag ${className ?? ''}`} style={{ x: sx, y: sy }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </motion.span>
  )
}

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']

export function Socials({ className = 'r1-socials' }: { className?: string }) {
  return (
    <ul className={className}>
      {socials.map((k) => {
        const l = links[k]
        const ext = !l.href.startsWith('mailto:')
        return (
          <li key={k}>
            <a href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={l.label} title={l.label}>
              <LinkIcon k={k} size={17} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}

export function Header({ base }: { base: string }) {
  return (
    <header className="r1-header">
      <Link to={`${base}/`} className="r1-name r1-in" style={{ ['--d' as string]: 0 }}>
        {hero.name}
      </Link>
      <div className="r1-header__end r1-in" style={{ ['--d' as string]: 1 }}>
        <Magnetic>
          <a className="r1-resume" href={links.resume.href} target="_blank" rel="noopener">
            Resume <span aria-hidden="true">↗</span>
          </a>
        </Magnetic>
        <Socials />
      </div>
    </header>
  )
}
