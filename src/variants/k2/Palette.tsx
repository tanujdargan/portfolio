import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, Briefcase, CornerDownLeft, FileText, FlaskConical, Github, Hash, Linkedin, Mail, Satellite, Search, UtensilsCrossed } from 'lucide-react'
import { useRouter } from '../../lib/router'
import { links, research } from '../../content/site'
import { Key } from './bits'

type Act = { to: string; kind: 'route' | 'ext' | 'mail' | 'pdf' }
interface Item {
  id: string
  group: 'Work' | 'Research' | 'Contact' | 'Jump to'
  label: string
  sub: string
  icon: ReactNode
  act: Act
  words?: string
}

const ic = { size: 16, strokeWidth: 1.7, 'aria-hidden': true } as const

/** Everything the palette can reach. Hash targets live on the home page; `home` prefixes them off-home. */
export function paletteItems(base: string): Item[] {
  const home = `${base}/`
  const r = (slug: string) => `${base}/research/${slug}`
  const R = (slug: string) => research.find((x) => x.slug === slug)!
  return [
    { id: 'amazon', group: 'Work', label: 'LLM planning assistant at Amazon', sub: 'In production at 180+ sites · return offer', icon: <Briefcase {...ic} />, act: { to: `${home}#amazon`, kind: 'route' }, words: 'amazon robotics optimus rag' },
    { id: 'marmotsat', group: 'Work', label: 'MarmotSat flight firmware', sub: 'In orbit · NORAD 69912', icon: <Satellite {...ic} />, act: { to: `${home}#marmotsat`, kind: 'route' }, words: 'satellite cubesat cfar firmware orbit' },
    { id: 'lossmask', group: 'Work', label: 'Loss masking and shutdown distress', sub: 'Apart Research · Aug 2026', icon: <FlaskConical {...ic} />, act: { to: `${home}#lossmask`, kind: 'route' }, words: 'apart model welfare sft' },
    { id: 'steering', group: 'Work', label: 'Activation steering', sub: 'Replicated on Qwen2.5-1.5B-Instruct', icon: <FlaskConical {...ic} />, act: { to: `${home}#steering`, kind: 'route' }, words: 'interpretability emotion vectors joy' },
    ...['loss-masking-distress', 'activation-steering', 'billion-vector-retrieval', 'es-lora', 'ocean-sensing'].map((s) => ({
      id: `r-${s}`,
      group: 'Research' as const,
      label: R(s).title,
      sub: `${R(s).where} · ${R(s).when}`,
      icon: <FileText {...ic} />,
      act: { to: r(s), kind: 'route' as const },
      words: R(s).tags.join(' '),
    })),
    { id: 'beri', group: 'Research', label: 'Beri', sub: 'A food app I’m building for iOS', icon: <UtensilsCrossed {...ic} />, act: { to: `${base}/beri`, kind: 'route' }, words: 'ios app food' },
    { id: 'resume', group: 'Contact', label: 'Resume (PDF)', sub: 'Opens the PDF', icon: <FileText {...ic} />, act: { to: links.resume.href, kind: 'pdf' }, words: 'cv' },
    { id: 'email', group: 'Contact', label: 'Email', sub: 'tanujd@uvic.ca', icon: <Mail {...ic} />, act: { to: links.email.href, kind: 'mail' }, words: 'contact mail' },
    { id: 'linkedin', group: 'Contact', label: 'LinkedIn', sub: 'linkedin.com/in/tanujdargan', icon: <Linkedin {...ic} />, act: { to: links.linkedin.href, kind: 'ext' } },
    { id: 'github', group: 'Contact', label: 'GitHub', sub: 'github.com/tanujdargan', icon: <Github {...ic} />, act: { to: links.github.href, kind: 'ext' } },
    { id: 'x', group: 'Contact', label: 'X', sub: '@DarganTanuj', icon: <ArrowUpRight {...ic} />, act: { to: links.x.href, kind: 'ext' }, words: 'twitter' },
    { id: 'experience', group: 'Jump to', label: 'Experience', sub: 'Six roles, newest first', icon: <Hash {...ic} />, act: { to: `${home}#experience`, kind: 'route' }, words: 'roles jobs' },
    { id: 'more', group: 'Jump to', label: 'More work', sub: 'Search, fine-tuning, sensing, prizes', icon: <Hash {...ic} />, act: { to: `${home}#more`, kind: 'route' } },
    { id: 'education', group: 'Jump to', label: 'Education', sub: 'University of Victoria · April 2027', icon: <Hash {...ic} />, act: { to: `${home}#experience`, kind: 'route' }, words: 'uvic school degree' },
  ]
}

export function Palette({ open, onClose, base, onHome }: { open: boolean; onClose: () => void; base: string; onHome: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const { navigate } = useRouter()
  const [q, setQ] = useState('')
  const [act, setAct] = useState(0)
  const all = useMemo(() => paletteItems(base), [base])
  const items = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return all
    return all.filter((i) => `${i.label} ${i.sub} ${i.words ?? ''} ${i.group}`.toLowerCase().includes(t))
  }, [q, all])

  useEffect(() => {
    const d = ref.current!
    if (open && !d.open) {
      setQ('')
      setAct(0)
      d.showModal()
      input.current?.focus()
    }
    if (!open && d.open) d.close()
  }, [open])
  useEffect(() => setAct(0), [q])
  useEffect(() => {
    list.current?.querySelector(`[data-i="${act}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [act])

  const run = (i: Item) => {
    onClose()
    const { to, kind } = i.act
    if (kind === 'mail') location.href = to
    else if (kind === 'ext' || kind === 'pdf') window.open(to, '_blank', 'noopener')
    else if (onHome && to.includes('#')) {
      const id = to.split('#')[1]
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
        history.replaceState(null, '', `#${id}`)
      }
    } else navigate(to)
  }

  const groups = ['Work', 'Research', 'Contact', 'Jump to'] as const
  let n = -1
  return (
    <dialog
      ref={ref}
      className="k2-pal"
      aria-label="Command palette"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="k2-pal__in">
        <div className="k2-pal__search">
          <Search size={18} strokeWidth={1.7} aria-hidden="true" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search work, research, resume, contact…"
            role="combobox"
            aria-expanded="true"
            aria-controls="k2-pal-list"
            aria-activedescendant={items[act] ? `k2-pal-${items[act].id}` : undefined}
            aria-autocomplete="list"
            aria-label="Search"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setAct((a) => Math.min(items.length - 1, a + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setAct((a) => Math.max(0, a - 1))
              } else if (e.key === 'Home') setAct(0)
              else if (e.key === 'End') setAct(items.length - 1)
              else if (e.key === 'Enter' && items[act]) {
                e.preventDefault()
                run(items[act])
              }
            }}
          />
          <button className="k2-pal__esc" onClick={onClose} aria-label="Close palette">
            <Key>esc</Key>
          </button>
        </div>
        <div className="k2-pal__list" id="k2-pal-list" role="listbox" aria-label="Results" ref={list}>
          {items.length === 0 && <p className="k2-pal__none">No results for “{q}”</p>}
          {groups.map((g) => {
            const gi = items.filter((i) => i.group === g)
            if (!gi.length) return null
            return (
              <div key={g} role="group" aria-label={g}>
                <p className="k2-pal__group" aria-hidden="true">
                  {g}
                </p>
                {gi.map((i) => {
                  n++
                  const k = n
                  return (
                    <div
                      key={i.id}
                      id={`k2-pal-${i.id}`}
                      data-i={k}
                      role="option"
                      aria-selected={k === act}
                      className="k2-pal__item"
                      onMouseMove={() => k !== act && setAct(k)}
                      onClick={() => run(i)}
                    >
                      <span className="k2-pal__ic">{i.icon}</span>
                      <span className="k2-pal__label">{i.label}</span>
                      <span className="k2-pal__sub">{i.sub}</span>
                      <span className="k2-pal__type">{i.act.kind === 'route' ? (i.group === 'Research' ? 'Page' : 'Section') : i.act.kind === 'mail' ? 'Email' : 'Link'}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="k2-pal__foot" aria-hidden="true">
          <span className="k2-pal__brand">Tanuj Dargan</span>
          <span>
            Open <Key>
              <CornerDownLeft size={12} strokeWidth={2} />
            </Key>
          </span>
          <span>
            Move <Key>↑</Key>
            <Key>↓</Key>
          </span>
        </div>
      </div>
    </dialog>
  )
}
