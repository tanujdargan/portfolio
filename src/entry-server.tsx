import { renderToString } from 'react-dom/server'
import App, { load } from './App'
import { allPaths } from './routes'

export { allPaths }

export async function render(path: string) {
  const initial = await load(path)
  const html = renderToString(<App initial={initial} />)
  return { html, head: initial.r.head, variant: initial.r.kind === 'variant' ? initial.r.variant : null }
}
