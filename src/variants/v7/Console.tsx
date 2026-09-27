import { useEffect, useId, useMemo, useRef, useState } from 'react'

export interface Line {
  id: number
  kind: 'in' | 'ack' | 'nak' | 'out'
  text: string
}
export interface Suggestion {
  cmd: string
  hint: string
}

/**
 * YAMCS-style command line. One input: inline in the bar on wide screens, a sheet under the bar on phones.
 * Combobox semantics: arrows move through suggestions, Tab completes, Enter sends.
 */
export function Console({
  exec,
  suggestions,
  lines,
  open,
  setOpen,
}: {
  exec: (cmd: string) => void
  suggestions: Suggestion[]
  lines: Line[]
  open: boolean
  setOpen: (o: boolean) => void
}) {
  const [q, setQ] = useState('')
  const [act, setAct] = useState(-1)
  const [hist, setHist] = useState<string[]>([])
  const [hi, setHi] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLOListElement>(null)
  const id = useId()

  const list = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^\//, '')
    const f = t ? suggestions.filter((s) => s.cmd.slice(1).startsWith(t) || s.cmd.includes(t) || s.hint.toLowerCase().includes(t)) : suggestions
    return f.slice(0, 7)
  }, [q, suggestions])

  // global: "/" or ⌘K / Ctrl+K focuses the console; Escape closes it
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => input.current?.focus())
      }
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [setOpen])

  // close on outside pointer
  useEffect(() => {
    if (!open) return
    const on = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('[data-v7-con-toggle]')) setOpen(false)
    }
    addEventListener('pointerdown', on)
    return () => removeEventListener('pointerdown', on)
  }, [open, setOpen])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, open])

  useEffect(() => {
    if (open && matchMedia('(max-width: 759px)').matches) requestAnimationFrame(() => input.current?.focus())
  }, [open])

  const send = (cmd: string) => {
    const c = cmd.trim()
    if (!c) return
    exec(c)
    setHist((h) => [...h.filter((x) => x !== c), c].slice(-20))
    setHi(-1)
    setQ('')
    setAct(-1)
  }

  return (
    <div className="v7-con" ref={root} data-open={open || undefined}>
      <label htmlFor={`${id}-in`} className="v7-sr">
        Command line. Type help for commands.
      </label>
      <div className="v7-con__field">
        <span className="v7-con__prompt" aria-hidden="true">
          ›
        </span>
        <input
          id={`${id}-in`}
          ref={input}
          className="v7-con__in"
          value={q}
          placeholder="/tlm amazon · /open research steering"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="send"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && act >= 0 ? `${id}-o${act}` : undefined}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value)
            setAct(-1)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              input.current?.blur()
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setAct((a) => Math.min(list.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              if (act <= 0 && hist.length) {
                const n = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1)
                setHi(n)
                setQ(hist[n])
                setAct(-1)
              } else setAct((a) => Math.max(-1, a - 1))
            } else if (e.key === 'Tab' && list.length && q) {
              e.preventDefault()
              setQ(list[Math.max(0, act)].cmd + ' ')
              setAct(-1)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              send(act >= 0 && list[act] ? list[act].cmd : q)
            }
          }}
        />
        <kbd className="v7-con__kbd" aria-hidden="true">
          /
        </kbd>
      </div>
      {open && (
        <div className="v7-con__panel">
          {lines.length > 0 && (
            <ol className="v7-con__log" ref={logRef} aria-live="polite" aria-label="Console output">
              {lines.map((l) => (
                <li key={l.id} data-kind={l.kind}>
                  {l.kind === 'in' ? '› ' : l.kind === 'ack' ? 'ACK ' : l.kind === 'nak' ? 'NAK ' : '    '}
                  {l.text}
                </li>
              ))}
            </ol>
          )}
          <ul className="v7-con__list" id={`${id}-list`} role="listbox" aria-label="Commands">
            {list.map((s, i) => (
              <li
                key={s.cmd}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={i === act}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => send(s.cmd)}
              >
                <code>{s.cmd}</code>
                <span>{s.hint}</span>
              </li>
            ))}
            {!list.length && <li className="v7-con__none">No match. Enter sends it anyway; try help.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
