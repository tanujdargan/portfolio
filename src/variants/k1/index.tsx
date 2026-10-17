/*
 * K1 "Craft". Round 4, built from Tanuj's picks.
 * Frame: Dennis Snellenberg (curved curtain transitions, magnetic buttons, the work list with a hover media follower, the
 * curved footer edge and the blue "Get in touch" circle), Ravi Klaassens (linear() springs, corner-square grid, ruled
 * lists, the big footer wordmark) and Cassie Evans (one hand-drawn loop, a small satellite with personality).
 * Inside it, each piece of work is explained by a cluster-1 module: Giga playback (loss masking), Waabi spec card and
 * Wild scattered → aligned (steering), Dovetail lit step + pipeline (Amazon), Rox exploded layers (MarmotSat),
 * Chronicle two-tone sentences + card rail (hero and experience).
 * Type: Inter (optical sizes, so display sizes get Inter Display) + Geist Mono. Colour: Dennis' #1c1d20 family, one blue.
 */
import { useState } from 'react'
import type { VariantProps } from '../../routes'
import { useLenis } from '../../lib/lenis'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { CurtainProvider, Header, Menu, Contact, SatGlyph } from './chrome'
import { Home } from './Home'
import { Writeup } from './Writeup'
import { CLink } from './bits'
import './k1.css'

function NotFound({ base }: { base: string }) {
  return (
    <section className="k1-404">
      <div className="k1-404__sat" aria-hidden="true">
        <SatGlyph />
      </div>
      <p className="k1-label">404</p>
      <h1 className="k1-404__h">This page drifted out of orbit.</h1>
      <CLink to={`${base}/`} label="Home" className="k1-btn k1-btn--solid">
        <span className="k1-btn__fill" aria-hidden="true" />
        <span className="k1-mag__in">Back to the work</span>
      </CLink>
    </section>
  )
}

export default function K1({ page, base }: VariantProps) {
  useLenis(true, { lerp: 0.085 })
  const [menu, setMenu] = useState(false)
  return (
    <CurtainProvider>
      <div className="k1" data-page={page.kind}>
        <a className="k1-skip" href="#k1-main">
          Skip to content
        </a>
        <Header base={base} home={page.kind === 'home'} onMenu={() => setMenu(true)} />
        <main id="k1-main" tabIndex={-1} className="k1-main">
          {page.kind === 'home' && <Home base={base} />}
          {page.kind === 'research' && <Writeup key={page.slug} slug={page.slug} base={base} />}
          {page.kind === 'beri' && (
            <div className="k1-beri">
              <BeriCaseStudy base={base} />
            </div>
          )}
          {page.kind === 'notfound' && <NotFound base={base} />}
        </main>
        <Contact />
        <Menu base={base} home={page.kind === 'home'} open={menu} setOpen={setMenu} />
      </div>
    </CurtainProvider>
  )
}
