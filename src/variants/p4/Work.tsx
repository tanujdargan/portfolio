import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { experience } from '../../content/site'
import { OrgTile } from '../../shared/OrgLogo'
import { useMotionPrefs } from '../../lib/motion'
import { work } from './copy'

/**
 * Experience: tile, org, role · dates, one line. The whole row is the disclosure.
 * - Opening is a Framer layout (FLIP) animation: the row grows by transform, rows and sections below slide by
 *   transform, and the detail fades in once there's room. One row open at a time keeps the list calm.
 * - On a mouse, one highlight glides between rows (shared layoutId) instead of each row lighting up on its own.
 * Springs come from useMotionPrefs(), so Subtle is quick and flat, Expressive has a little overshoot, and reduced
 * motion (MotionConfig "user") drops the transforms and keeps the fades.
 */
export function Work() {
  const m = useMotionPrefs()
  const [open, setOpen] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const layout = m.spring(340)
  return (
    <ul className="p4-exp" onPointerLeave={() => setHover(null)}>
      {experience.map((e) => {
        const c = work[e.logo]
        if (!c) return null
        const isOpen = open === e.logo
        const id = `p4-exp-${e.logo}`
        return (
          <motion.li
            key={e.logo}
            layout
            transition={{ layout }}
            className="p4-exp__item"
            data-open={isOpen || undefined}
            style={{ borderRadius: 16 }}
            onPointerEnter={(ev) => ev.pointerType === 'mouse' && setHover(e.logo)}
          >
            <AnimatePresence>
              {hover === e.logo && (
                <motion.span
                  layoutId="p4-exp-hl"
                  className="p4-exp__hl"
                  style={{ borderRadius: 16 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ layout, opacity: { duration: m.dur(0.16) } }}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
            <motion.button
              layout="position"
              transition={{ layout }}
              type="button"
              className="p4-exp__btn"
              aria-expanded={isOpen}
              aria-controls={id}
              onClick={() => setOpen(isOpen ? null : e.logo)}
            >
              <OrgTile org={e.logo} size={40} className="p4-exp__tile" />
              <span className="p4-exp__main">
                <span className="p4-exp__org">{c.org}</span>
                <span className="p4-exp__meta">
                  <span>{c.role} ·</span> <span>{e.when}</span>
                </span>
                <span className="p4-exp__line">{c.line}</span>
              </span>
              <span className="p4-pm" aria-hidden="true" />
            </motion.button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="panel"
                  id={id}
                  layout="position"
                  className="p4-exp__panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: m.dur(0.28), delay: m.dur(0.1) } }}
                  exit={{ opacity: 0, transition: { duration: m.dur(0.1) } }}
                  transition={{ layout }}
                >
                  <ul className="p4-exp__bullets">
                    {e.bullets.map((b, i) => (
                      <motion.li
                        key={b}
                        initial={{ opacity: 0, y: 6 * m.k }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: m.dur(0.34), delay: m.dur(0.12 + 0.05 * i), ease: [0.23, 1, 0.32, 1] }}
                      >
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                  <p className="p4-exp__foot">
                    <span className="p4-exp__metric">{e.metric}</span>
                    <span>{e.where}</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        )
      })}
    </ul>
  )
}
