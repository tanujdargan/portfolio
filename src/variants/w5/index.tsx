// W5 · Drive (third person). Round 4b, from Tanuj's request: a scenic drive from a city skyline at dusk into the
// mountains in a 911-style coupé, with a chase camera behind the car. World, car and route are shared with W4
// (src/shared/drive); the assets were modelled and baked in Blender (public/drive/src).
import type { VariantProps } from '../../routes'
import { Drive } from '../../shared/drive/Drive'
import { Article, Beri, NotFound } from '../../shared/drive/Article'
import '../../shared/drive/drive.css'

export default function Variant({ page, base }: VariantProps) {
  if (page.kind === 'research') return <Article slug={page.slug} base={base} />
  if (page.kind === 'beri') return <Beri base={base} />
  if (page.kind === 'notfound') return <NotFound base={base} />
  return <Drive base={base} view="tp" />
}
