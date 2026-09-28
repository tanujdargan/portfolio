import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { links, linkOrder, person } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Flag } from '../../shared/Flag'

/**
 * The hero's one row of actions. Same data and icons as the shared <Links>, with our own markup so each link can
 * carry its micro-interaction: the icon nudges toward where the link goes, Resume rolls to "PDF ↗", and Email
 * (on a desktop pointer) copies the address and morphs to "Copied". Phones keep mailto: they always have a mail app.
 * All motion is CSS, scaled by --k/--t and swapped for crossfades under reduced motion (p4.css).
 */
export function useCopyEmail() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const copy = async (e: React.MouseEvent, always = false) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (!always && !matchMedia('(hover: hover) and (pointer: fine)').matches) return
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(person.email)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      location.href = links.email.href
    }
  }
  return { copied, copy }
}

export function Actions({ className = '' }: { className?: string }) {
  const { copied, copy } = useCopyEmail()
  return (
    <>
      <ul className={`p4-acts ${className}`}>
        {linkOrder.map((k) => {
          const l = links[k]
          const ext = !l.href.startsWith('mailto:')
          const email = k === 'email'
          return (
            <li key={k}>
              <a
                href={l.href}
                className="p4-act"
                data-k={k}
                data-copied={email && copied ? '' : undefined}
                {...(ext ? { target: '_blank', rel: 'noopener' } : {})}
                aria-label={k === 'resume' ? 'Resume (PDF, opens in a new tab)' : email ? `Email ${person.email}` : l.label}
                title={email ? `Copy ${person.email}` : undefined}
                onClick={email ? (e) => copy(e) : undefined}
              >
                <span className="p4-act__icon">
                  <LinkIcon k={k} size={17} />
                  {email && <Check size={17} strokeWidth={1.8} aria-hidden="true" />}
                </span>
                <span className="p4-act__label">
                  <span>{l.label}</span>
                  {k === 'resume' && <span aria-hidden="true">PDF ↗</span>}
                  {email && <span aria-hidden="true">Copied</span>}
                </span>
                {email && (
                  <span className="p4-tip" aria-hidden="true">
                    {person.email}
                  </span>
                )}
              </a>
              {l.unverified && <Flag note="Link not verified." />}
            </li>
          )
        })}
      </ul>
      <span className="p4-sr" role="status" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </>
  )
}
