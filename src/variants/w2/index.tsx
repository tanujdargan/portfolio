// W2 · Playground. Round 4, from Tanuj's picks: Bruno Simon (a drivable toy and stations), Thibault Introvigne
// (joystick on touch, an always-visible About) and Messenger (a small stylised world). A night island modelled and
// baked in Blender (public/w2/src), driven with custom arcade physics; every station is also one tap away in the rail.
import type { VariantProps } from '../../routes'
import { Home } from './Home'
import { Article, Beri, NotFound } from './Article'
import './w2.css'

export default function Variant({ page, base }: VariantProps) {
  if (page.kind === 'research') return <Article slug={page.slug} base={base} />
  if (page.kind === 'beri') return <Beri base={base} />
  if (page.kind === 'notfound') return <NotFound base={base} />
  return <Home base={base} />
}
