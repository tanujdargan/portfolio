// Writes static HTML for every route after the client and SSR builds.
// Text exists before JS runs (SEO, LCP). Each page links its variant's CSS and preloads its fonts,
// so there's no flash of unstyled text or layout shift on hydration.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const dist = path.resolve('dist')
const template = readFileSync(path.join(dist, 'index.html'), 'utf8')
const manifest = JSON.parse(readFileSync(path.join(dist, '.vite/manifest.json'), 'utf8'))
const { render, allPaths } = await import(pathToFileURL(path.resolve('dist-ssr/entry-server.js')).href)

function collect(key, seen = new Set()) {
  const e = manifest[key]
  if (!e || seen.has(key)) return { css: [], js: [] }
  seen.add(key)
  const out = { css: [...(e.css ?? [])], js: [e.file] }
  for (const i of e.imports ?? []) {
    const sub = collect(i, seen)
    out.css.push(...sub.css)
    out.js.push(...sub.js)
  }
  return out
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

for (const p of allPaths()) {
  const { html, head, variant } = await render(p)
  const key = variant && Object.keys(manifest).find((k) => manifest[k].name === `variant-${variant}`)
  const assets = key ? collect(key) : { css: [], js: [] }
  const fonts = new Set()
  for (const c of assets.css) {
    const css = readFileSync(path.join(dist, c), 'utf8')
    for (const m of css.matchAll(/url\((\/assets\/[^)]*-latin-(?:wght-)?(?:\d+-)?normal-[^)]*\.woff2)\)/g)) fonts.add(m[1])
  }
  const url = `https://tanujdargan.com${p === '/' ? '/' : p}`
  const inject = [
    ...[...new Set(assets.css)].filter((c) => !template.includes(c)).map((c) => `<link rel="stylesheet" crossorigin href="/${c}">`),
    ...[...fonts].slice(0, 4).map((f) => `<link rel="preload" as="font" type="font/woff2" href="${f}" crossorigin>`),
    ...[...new Set(assets.js)].filter((j) => !template.includes(j)).map((j) => `<link rel="modulepreload" crossorigin href="/${j}">`),
    p.startsWith('/lab') ? '<meta name="robots" content="noindex">' : '',
  ].join('\n    ')
  const out = template
    .replace(/<title>.*?<\/title>/, `<title>${esc(head.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(head.description)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(head.title)}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace('<!--app-head-->', inject)
    .replace('<!--app-->', html)
  // '/lab/v1' → dist/lab/v1.html (served extensionless by Vercel cleanUrls and vite preview)
  const file = p === '/' ? path.join(dist, 'index.html') : path.join(dist, `${p}.html`)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, out)
}
rmSync(path.resolve('dist-ssr'), { recursive: true, force: true })
console.log(`prerendered ${allPaths().length} routes`)
