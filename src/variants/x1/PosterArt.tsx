// A flat drawing of the hilltop: the SSR backdrop behind the proof card while the 3D world loads, and the whole view in
// poster mode (Save-Data, low memory, no WebGL). Pins sit in % of the same 16:9 box, so they line up at any size.
import type { StationId } from './world.lazy'

export const POSTER_PINS: Record<StationId, [number, number]> = {
  dish: [41, 60],
  cabin: [54.9, 66.2],
  dial: [48.6, 68.3],
  logbook: [45.7, 69.2],
  buoy: [61.6, 87.6],
  board: [59.4, 67.6],
}

// deterministic star field
const STARS = (() => {
  let s = 11
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 150 }, () => {
    const band = r() < 0.5
    const x = r() * 1600
    const y = band ? 40 + x * 0.22 + (r() - 0.5) * 120 : r() * 470
    return { x, y, r: 0.6 + Math.pow(r(), 4) * 1.6, o: 0.3 + r() * 0.6 }
  }).filter((p) => p.y < 480)
})()

export function PosterArt() {
  return (
    <svg className="x1-poster__svg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="x1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060a14" />
          <stop offset="0.75" stopColor="#111b30" />
          <stop offset="1" stopColor="#1a2740" />
        </linearGradient>
        <linearGradient id="x1-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13203a" />
          <stop offset="0.35" stopColor="#0a1220" />
          <stop offset="1" stopColor="#04070d" />
        </linearGradient>
        <radialGradient id="x1-warm" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb466" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb466" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="560" fill="url(#x1-sky)" />
      <g fill="#dfe8ff">
        {STARS.map((p, i) => (
          <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(2)} opacity={p.o.toFixed(2)} />
        ))}
      </g>
      <rect y="520" width="1600" height="380" fill="url(#x1-sea)" />
      {/* Olympic Mountains across the Strait */}
      <path d="M0 524 L90 505 L170 512 L260 488 L330 497 L420 470 L480 482 L560 455 L640 476 L720 462 L790 480 L880 450 L960 471 L1040 458 L1130 482 L1210 470 L1300 492 L1400 480 L1500 500 L1600 494 L1600 524 Z" fill="#141c2e" />
      <g fill="#ffc27a" opacity="0.8">
        {[180, 236, 300, 352, 470, 515, 590, 640, 702, 760, 1010, 1090, 1150].map((x, i) => (
          <circle key={x} cx={x} cy={520 + (i % 3)} r="1.4" />
        ))}
      </g>
      {/* the hill */}
      <path d="M0 760 C200 700 380 690 520 650 L560 642 L1000 642 L1040 660 C1090 720 1140 780 1220 820 L1300 900 L0 900 Z" fill="#111915" />
      <path d="M520 650 L560 642 L1000 642 L1040 660 L1010 652 L560 650 Z" fill="#1e2722" />
      {/* firs on the slopes */}
      <g fill="#0c130f">
        {[60, 130, 210, 280, 350, 420, 470, 1080, 1130].map((x, i) => {
          const y = x < 600 ? 770 - x * 0.18 : 700 + (x - 1040) * 1.1
          const h = 46 + (i % 3) * 14
          return <path key={x} d={`M${x} ${y - h} L${x + 16} ${y - h * 0.45} L${x + 9} ${y - h * 0.45} L${x + 22} ${y} L${x - 22} ${y} L${x - 9} ${y - h * 0.45} L${x - 16} ${y - h * 0.45} Z`} />
        })}
      </g>
      {/* dish */}
      <g fill="#b8bdc8">
        <rect x="638" y="590" width="9" height="52" />
        <path d="M600 548 Q648 600 712 560 L706 552 Q652 584 608 540 Z" />
        <path d="M606 544 L656 520 L708 556" stroke="#b8bdc8" strokeWidth="2" fill="none" />
        <circle cx="656" cy="520" r="4" />
      </g>
      {/* porch, radio, logbook */}
      <g>
        <rect x="700" y="600" width="104" height="5" fill="#1b1e25" />
        <rect x="703" y="604" width="4" height="38" fill="#2b221d" />
        <rect x="796" y="604" width="4" height="38" fill="#2b221d" />
        <rect x="712" y="622" width="78" height="4" fill="#3a2d25" />
        <rect x="752" y="608" width="34" height="14" fill="#353a44" />
        <circle cx="777" cy="615" r="4.5" fill="#d9d3c4" />
        <rect x="722" y="619" width="20" height="3" fill="#e9e1cc" />
        <circle cx="728" cy="612" r="7" fill="url(#x1-warm)" />
      </g>
      {/* cabin */}
      <g>
        <ellipse cx="868" cy="610" rx="90" ry="40" fill="url(#x1-warm)" />
        <rect x="810" y="580" width="118" height="62" fill="#2e241f" />
        <path d="M802 582 L869 548 L936 582 Z" fill="#191c22" />
        <rect x="858" y="596" width="40" height="24" fill="#ffad5e" />
        <rect x="864" y="606" width="14" height="9" fill="#cfe6ff" />
        <rect x="822" y="600" width="22" height="42" fill="#1b1512" />
        <circle cx="833" cy="594" r="2.5" fill="#ffc27a" />
      </g>
      {/* noticeboard */}
      <g>
        <rect x="934" y="606" width="3" height="36" fill="#3a2d25" />
        <rect x="966" y="606" width="3" height="36" fill="#3a2d25" />
        <rect x="928" y="596" width="47" height="28" fill="#6e5038" />
        <rect x="934" y="600" width="12" height="15" fill="#ece6d6" />
        <rect x="951" y="602" width="10" height="9" fill="#f1e4b8" />
        <rect x="963" y="600" width="8" height="12" fill="#dfe6ee" />
      </g>
      {/* mast */}
      <g stroke="#9ea4af" strokeWidth="1.6" fill="none">
        <path d="M988 642 L998 420 L1008 642" />
        {[600, 560, 520, 480, 445].map((y) => (
          <line key={y} x1={988 + (642 - y) * 0.045} x2={1008 - (642 - y) * 0.045} y1={y} y2={y} />
        ))}
      </g>
      <circle cx="998" cy="416" r="9" fill="#ff4a3a" opacity="0.35" />
      <circle cx="998" cy="416" r="3" fill="#ff5040" />
      {/* buoy */}
      <g>
        <circle cx="986" cy="776" r="16" fill="#ffd36a" opacity="0.22" />
        <path d="M978 800 L994 800 L990 782 L982 782 Z" fill="#c8503a" />
        <circle cx="986" cy="778" r="2.5" fill="#ffd36a" />
      </g>
    </svg>
  )
}
