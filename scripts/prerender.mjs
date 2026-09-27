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

// Vite's own stylesheet links in the template get inlined per route instead.
const templateCss = [...template.matchAll(/<link rel="stylesheet"[^>]*href="\/([^"]+\.css)">/g)].map((m) => m[1])
// The HTML is complete without JS, so hydration can wait for the first frame. Starting the ~100 KB of JS
// after paint keeps it off the LCP critical path on slow networks (mobile LCP −0.3 s measured).
const entry = template.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)[1]
const deferredEntry = `<script>requestAnimationFrame(()=>setTimeout(()=>{const s=document.createElement('script');s.type='module';s.crossOrigin='';s.src='${entry}';document.head.appendChild(s)}))</script>`
const baseTemplate = template
  .replace(/\s*<link rel="stylesheet"[^>]*href="\/[^"]+\.css">/g, '')
  .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, deferredEntry)
// Font preloads cost more than they save on slow 4G here (swap + fallback metrics are close); keep 0 unless measured otherwise.
const PRELOAD_FONTS = +(process.env.PRELOAD_FONTS ?? 0)
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
    // All CSS for the route is small (<15 KB), so inline it: no render-blocking round trips before first paint.
    `<style>${[...new Set([...templateCss, ...assets.css])].map((c) => readFileSync(path.join(dist, c), 'utf8')).join('\n')}</style>`,
    ...[...fonts].slice(0, PRELOAD_FONTS).map((f) => `<link rel="preload" as="font" type="font/woff2" href="${f}" crossorigin>`),
    p.startsWith('/lab') ? '<meta name="robots" content="noindex">' : '',
  ].join('\n    ')
  const out = baseTemplate
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
const pub = allPaths().filter((p) => !p.startsWith('/lab'))
writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pub.map((p) => `  <url><loc>https://tanujdargan.com${p}</loc></url>`).join('\n')}\n</urlset>\n`)
rmSync(path.resolve('dist-ssr'), { recursive: true, force: true })
console.log(`prerendered ${allPaths().length} routes`)
