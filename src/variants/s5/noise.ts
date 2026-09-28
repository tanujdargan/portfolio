// Glyph-noise engine for the HUMAN / MACHINE switch. It works on live DOM text nodes, not on React state, so it can
// scramble *every* visible string on the page (demo labels included) in one pass and put each one back exactly.
//   out: each character flips from its real glyph to noise at its own moment (a wave from an origin point)
//   in:  every character starts as noise and resolves at its own moment (a wave, or a top-down teletype sweep)
// If React rewrites a node mid-run (a ticking clock), the new string becomes the target, so nothing is left stale.
const G = '01<>/\\{}[]#%&*+=~^?!;:$@'
const noise = () => G[(Math.random() * G.length) | 0]

interface Item {
  n: Text
  orig: string
  last: string
  t0: number
  at: number[]
}

/** Text nodes under `root` whose element is on screen (± margin). Skips whitespace, <script>/<style>, [data-quiet]. */
export function visibleText(root: Element, margin = 0): Text[] {
  const out: Text[] = []
  const vh = innerHeight
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT
      const el = n.parentElement
      if (!el || el.closest('script,style,[data-quiet],.sr-only')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const seen = new Map<Element, boolean>()
  for (let n = w.nextNode() as Text | null; n && out.length < 1400; n = w.nextNode() as Text | null) {
    const el = n.parentElement!
    let ok = seen.get(el)
    if (ok === undefined) {
      const r = el.getBoundingClientRect()
      ok = r.width > 0 && r.height > 0 && r.bottom > -margin && r.top < vh + margin
      seen.set(el, ok)
    }
    if (ok) out.push(n)
  }
  return out
}

export interface RunOpts {
  mode: 'out' | 'in'
  /** wave origin in viewport px; delay grows with distance from it */
  origin?: { x: number; y: number }
  /** max extra delay across the wave (ms) */
  spread?: number
  /** per-node duration (ms) */
  dur?: number
  /** 'wave': random per-char moments inside dur. 'type': left-to-right sweep, one line after another, top to bottom */
  style?: 'wave' | 'type'
}

export interface Run {
  done: Promise<void>
  /** stop now and write every original string back */
  restore: () => void
}

export function scramble(nodes: Text[], o: RunOpts): Run {
  const spread = o.spread ?? 260
  const dur = o.dur ?? 320
  const ox = o.origin?.x ?? innerWidth / 2
  const oy = o.origin?.y ?? innerHeight
  const maxD = Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy)) || 1
  const items: Item[] = nodes.map((n) => {
    const r = n.parentElement!.getBoundingClientRect()
    const s = n.nodeValue!
    let t0: number
    let at: number[]
    if (o.style === 'type') {
      // teletype: rows print top to bottom; inside a row, characters land left to right, 4 ms apart
      t0 = Math.max(0, r.top / innerHeight) * spread + Math.max(0, r.left - 0) * 0.08
      at = Array.from(s, (_, i) => i * 4 + Math.random() * 40)
    } else {
      const d = Math.hypot(r.left + r.width / 2 - ox, r.top + r.height / 2 - oy)
      t0 = (d / maxD) * spread
      at = Array.from(s, (_, i) => (i / Math.max(1, s.length)) * 0.5 * dur + Math.random() * 0.5 * dur)
    }
    return { n, orig: s, last: s, t0, at }
  })
  const end = Math.max(0, ...items.map((it) => it.t0 + Math.max(0, ...it.at))) + 40
  let raf = 0
  let stopped = false
  let resolve!: () => void
  const done = new Promise<void>((r) => (resolve = r))
  const start = performance.now()
  let last = -1e9

  const write = (it: Item, s: string) => {
    if (it.n.nodeValue !== it.last) it.orig = it.n.nodeValue ?? it.orig // React changed it: that's the new target
    if (s !== it.n.nodeValue) it.n.nodeValue = s
    it.last = s
  }
  const frame = (now: number) => {
    const e = now - start
    if (now - last >= 45 || e >= end) {
      last = now
      for (const it of items) {
        const t = e - it.t0
        let s = ''
        for (let i = 0; i < it.orig.length; i++) {
          const ch = it.orig[i]
          if (ch === ' ' || ch === '\n' || ch === ' ') s += ch
          else if (o.mode === 'out') s += t >= it.at[i] ? noise() : ch
          else s += t >= it.at[i] ? ch : noise()
        }
        write(it, s)
      }
    }
    if (e < end && !stopped) raf = requestAnimationFrame(frame)
    else {
      if (o.mode === 'in') for (const it of items) write(it, it.orig)
      resolve()
    }
  }
  // 'in' starts fully scrambled on the very first frame, so a view-transition snapshot never shows the real text
  if (o.mode === 'in') for (const it of items) write(it, Array.from(it.orig, (c) => (c.trim() ? noise() : c)).join(''))
  raf = requestAnimationFrame(frame)

  return {
    done,
    restore: () => {
      stopped = true
      cancelAnimationFrame(raf)
      for (const it of items) {
        if (it.n.nodeValue === it.last) it.n.nodeValue = it.orig
      }
      resolve()
    },
  }
}
