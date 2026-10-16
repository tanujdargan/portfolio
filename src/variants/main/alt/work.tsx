import { useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { Figure, Logo, Spec } from '../Home'
import { selected, type Item } from '../content'
import { prefetchDemo } from '../../../content/work'
import { Link } from '../../../lib/router'
import './work.css'

// Versions 2–4 of this section for the review round. Version 1 is the current one in Home/index/Article.
// Reached at /gate/work2 … /gate/work4.
export type Props = { depth: 'live' | 'open' | 'preview'; steeringInHero: boolean }

const isRef = (it: Item, steeringInHero: boolean) => it.id === 'steering' && steeringInHero

const WriteUp = ({ it, className = 'm-link' }: { it: Item; className?: string }) =>
  it.slug ? (
    <Link to={`/research/${it.slug}`} className={className}>
      Write-up →
    </Link>
  ) : null

/** Steering lives in the hero (§7.7), so wherever its figure would go there's a pointer back up. */
const ToHero = ({ cls, label = 'The live steering demo is at the top of the page' }: { cls: string; label?: string }) => (
  <a href="#thesis" className={cls}>
    <ArrowUp size={16} strokeWidth={1.75} aria-hidden="true" />
    <span>{label}</span>
  </a>
)

// ---------- 2 · Side by side: text left, figure right; an opened demo takes the full width ----------

function Work2({ depth, steeringInHero }: Props) {
  return (
    <section className="m-wrap m-sec m-wk2" id="work" aria-labelledby="work-h">
      <h2 id="work-h" className="m-h2">
        Selected work
      </h2>
      <ol className="m-wk2-list">
        {selected.map((it) =>
          isRef(it, steeringInHero) ? (
            // A pointer, not a second copy: one line of finding and two links, no spec and no figure.
            <li key={it.id} className="m-wk2-item m-wk2-ref">
              <h3 className="m-h3">{it.title}</h3>
              <div>
                <p className="m-wk2-finding">{it.finding}</p>
                <p className="m-wk2-links">
                  <ToHero cls="m-link m-wk2-more" label="Live demo at the top" />
                  <WriteUp it={it} className="m-link m-wk2-more" />
                </p>
              </div>
            </li>
          ) : (
            <li key={it.id} className="m-wk2-item">
              <div className="m-wk2-text">
                <div className="m-wk2-head">
                  {it.mark && <Logo m={it.mark} w={36} h={28} />}
                  <h3 className="m-h3">{it.title}</h3>
                </div>
                <p className="m-wk2-finding">{it.finding}</p>
                <Spec it={it} />
                <WriteUp it={it} className="m-link m-wk2-more" />
              </div>
              <div className="m-wk2-fig">
                <Figure it={it} depth={depth} />
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  )
}

// ---------- 3 · One at a time: the five titles are a tab list, the chosen work fills the panel ----------

function Work3({ depth, steeringInHero }: Props) {
  const [sel, setSel] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const go = (i: number) => {
    const n = (i + selected.length) % selected.length
    setSel(n)
    tabs.current[n]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    const k = e.key
    if (k === 'ArrowDown' || k === 'ArrowRight') go(sel + 1)
    else if (k === 'ArrowUp' || k === 'ArrowLeft') go(sel - 1)
    else if (k === 'Home') go(0)
    else if (k === 'End') go(selected.length - 1)
    else return
    e.preventDefault()
  }
  return (
    <section className="m-wrap m-sec m-wk3" id="work" aria-labelledby="work-h">
      <h2 id="work-h" className="m-h2">
        Selected work
      </h2>
      <div className="m-wk3-grid">
        <div className="m-wk3-tabs" role="tablist" aria-orientation="vertical" aria-labelledby="work-h" onKeyDown={onKey}>
          {selected.map((it, i) => (
            <button
              key={it.id}
              ref={(el) => {
                tabs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`wk3-t-${it.id}`}
              aria-selected={sel === i}
              aria-controls={`wk3-p-${it.id}`}
              tabIndex={sel === i ? 0 : -1}
              className="m-wk3-tab"
              onClick={() => setSel(i)}
              onPointerEnter={() => it.demo && !isRef(it, steeringInHero) && prefetchDemo[it.demo]()}
            >
              <span className="m-wk3-mark" aria-hidden="true">
                {it.mark ? <Logo m={it.mark} w={28} h={22} /> : <span className="m-wk3-num">{i + 1}</span>}
              </span>
              <span className="m-wk3-title">{it.title}</span>
            </button>
          ))}
        </div>
        {selected.map((it, i) => (
          // Every panel is in the static HTML; inactive ones are hidden but keep their state (an opened demo stays open).
          <div
            key={it.id}
            role="tabpanel"
            id={`wk3-p-${it.id}`}
            aria-labelledby={`wk3-t-${it.id}`}
            hidden={sel !== i}
            className="m-wk3-panel"
            tabIndex={0}
          >
            <p className="m-wk3-finding">{it.finding}</p>
            <div className="m-wk3-meta">
              <Spec it={it} />
              <WriteUp it={it} className="m-link m-wk3-more" />
            </div>
            {isRef(it, steeringInHero) ? <ToHero cls="m-wk3-tohero" /> : <Figure it={it} depth={depth} />}
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- 4 · Paper figures: a lead figure, then a 2×2 plate; the finding is the caption ----------

function Work4({ depth, steeringInHero }: Props) {
  return (
    <section className="m-wrap m-sec m-wk4" id="work" aria-labelledby="work-h">
      <h2 id="work-h" className="m-h2">
        Selected work
      </h2>
      <ol className="m-wk4-plate">
        {selected.map((it, i) => (
          <li key={it.id} className="m-wk4-card" data-lead={i === 0 || undefined}>
            <div className="m-wk4-head">
              {it.mark && <Logo m={it.mark} w={32} h={24} />}
              <h3 className="m-wk4-title">{it.title}</h3>
            </div>
            <figure className="m-wk4-figure">
              {isRef(it, steeringInHero) ? <ToHero cls="m-wk4-tohero" /> : <Figure it={it} depth={depth} />}
              <figcaption className="m-wk4-cap">
                <span className="m-wk4-n">Figure {i + 1}.</span> {it.finding}
              </figcaption>
            </figure>
            <div className="m-wk4-foot">
              <Spec it={it} />
              <WriteUp it={it} className="m-link m-wk4-more" />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export const versions: Record<string, ComponentType<Props>> = { '2': Work2, '3': Work3, '4': Work4 }
