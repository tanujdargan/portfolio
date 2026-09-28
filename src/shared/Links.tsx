import { FileText, Github, Linkedin, Mail } from 'lucide-react'
import { links, linkOrder, type LinkKey } from '../content/site'
import { Flag } from './Flag'

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58l11.09 14.47Z" />
    </svg>
  )
}

export const LinkIcon = ({ k, size = 16 }: { k: LinkKey; size?: number }) => {
  const p = { size, strokeWidth: 1.6, 'aria-hidden': true }
  if (k === 'resume') return <FileText {...p} />
  if (k === 'email') return <Mail {...p} />
  if (k === 'github') return <Github {...p} />
  if (k === 'linkedin') return <Linkedin {...p} />
  if (k === 'youtube' || k === 'unsplash')
    return (
      <span
        className="s-icon"
        style={{ width: size - 2, height: size - 2, ['--src' as string]: `url(/logos/${k}.svg)` }}
        aria-hidden="true"
      />
    )
  return <XIcon size={size - 1} />
}

/** The five always-one-tap links. `mode` picks label text; styling is the variant's job via className. */
export function Links({
  className,
  mode = 'label',
  size = 16,
  only,
}: {
  className?: string
  mode?: 'label' | 'icon' | 'short' | 'both'
  size?: number
  /** subset/order of links, e.g. workLinkOrder for tight headers */
  only?: LinkKey[]
}) {
  return (
    <ul className={className}>
      {(only ?? linkOrder).map((k) => {
        const l = links[k]
        const ext = !l.href.startsWith('mailto:')
        return (
          <li key={k} data-link={k}>
            <a href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={mode === 'icon' ? l.label : undefined}>
              {(mode === 'icon' || mode === 'both') && <LinkIcon k={k} size={size} />}
              {mode === 'label' || mode === 'both' ? <span>{l.label}</span> : mode === 'short' ? <span>{l.short}</span> : null}
            </a>
            {l.unverified && <Flag note="X handle guessed; not found on GitHub, old site or resume." />}
          </li>
        )
      })}
    </ul>
  )
}
