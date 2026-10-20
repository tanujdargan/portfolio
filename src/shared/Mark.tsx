import type { Mark } from '../content/curated'
import './mark.css'


// Native aspect of each mark (viewBox w/h), so width/height attributes reserve the box before the SVG arrives.
const ratio: Record<Exclude<Mark, 'pearcare'>, number> = { amazon: 251 / 260, cfar: 926 / 280, mlh: 310.6 / 106.5, rbc: 39.5 / 52, uvic: 1, apart: 1 }
const markLabel: Record<Mark, string> = {
  amazon: 'Amazon', cfar: 'UVic Centre for Aerospace Research', mlh: 'Major League Hacking', rbc: 'RBC', uvic: 'University of Victoria',
  apart: 'Apart Research', pearcare: 'Pear Care',
}
/** Full-colour mark on the surface, fitted into a w×h slot. Marks with dark ink ship a file per theme; CSS shows one
 *  and the hidden lazy <img> is never fetched. */
export function Logo({ m, w = 48, h = 32 }: { m: Mark; w?: number; h?: number }) {
  if (m === 'pearcare')
    return (
      <span className="m-logo m-logo--type" style={{ width: w, height: h }} role="img" aria-label={markLabel[m]}>
        pear<b>care</b>
      </span>
    )
  const r = ratio[m]
  const [iw, ih] = r > w / h ? [w, Math.round(w / r)] : [Math.round(h * r), h]
  const file = m === 'uvic' ? 'tile-uvic' : `mark-${m}`
  const inked = m === 'amazon' || m === 'cfar' || m === 'mlh'
  const img = (src: string, cls: string, alt: string) => (
    <img className={cls} src={src} width={iw} height={ih} alt={alt} loading="lazy" decoding="async" />
  )
  return (
    <span className="m-logo" style={{ width: w, height: h }}>
      {inked ? (
        <>
          {img(`/logos/${file}.svg`, 'm-ink-l', markLabel[m])}
          {img(`/logos/${file}-d.svg`, 'm-ink-d', markLabel[m])}
        </>
      ) : (
        img(`/logos/${file}.svg`, m === 'uvic' || m === 'apart' ? 'm-tile' : '', markLabel[m])
      )}
    </span>
  )
}

export { markLabel }
