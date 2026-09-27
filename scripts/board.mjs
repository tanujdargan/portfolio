// Builds the design board twice from one template:
//   portfolio-design-board.html          (repo root, media from public/board, refs from references/portfolio)
//   public/portfolio-design-board.html   (deployed, media from /board)
// Inputs: scripts/board-notes.json, audit/lighthouse*.json, public/board/* captures, references/portfolio/index.json
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'

const notes = JSON.parse(readFileSync('scripts/board-notes.json', 'utf8'))
const lh = existsSync('audit/lighthouse.json') ? JSON.parse(readFileSync('audit/lighthouse.json', 'utf8')) : {}
const lhCur = existsSync('audit/lighthouse-current.json') ? JSON.parse(readFileSync('audit/lighthouse-current.json', 'utf8')) : {}
const refs = JSON.parse(readFileSync('references/portfolio/index.json', 'utf8'))
const refList = Array.isArray(refs) ? refs : refs.items ?? Object.values(refs)
mkdirSync('public/board/refs', { recursive: true })
const usedRefs = refList.filter((r) => notes.refs.some((n) => r.file?.startsWith(n)))
for (const r of usedRefs) copyFileSync(`references/portfolio/${r.file}`, `public/board/refs/${r.file}`)

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const score = (n) => `<b class="sc ${n >= 90 ? 'g' : n >= 50 ? 'o' : 'r'}">${n}</b>`
const lhRow = (label, r) =>
  r
    ? `<tr><td>${label}</td><td>${score(r.perf)}</td><td>${score(r.a11y)}</td><td>${score(r.bp)}</td><td>${score(r.seo)}</td><td>${(r.lcp / 1000).toFixed(2)} s</td><td>${r.cls}</td><td>${r.tbt} ms</td></tr>`
    : `<tr><td>${label}</td><td colspan="7" class="dim">not measured</td></tr>`
const lhTable = (rows) =>
  `<table class="lh"><thead><tr><th></th><th>Perf</th><th>A11y</th><th>BP</th><th>SEO</th><th>LCP</th><th>CLS</th><th>TBT</th></tr></thead><tbody>${rows.join('')}</tbody></table>`

function page(media, refDir, liveBase) {
  const img = (f) => `${media}/${f}`
  const variants = notes.variants
    .map(
      (v) => `
  <section class="v" id="${v.id}">
    <header class="v__h">
      <div><span class="id">${v.id.toUpperCase()}</span><h2>${esc(v.name)}</h2></div>
      <a class="open" href="${liveBase}/lab/${v.id}" target="_blank">Open live ↗</a>
    </header>
    <p class="why">${esc(v.rationale)}</p>
    <dl class="facts">
      <div><dt>Type</dt><dd>${esc(v.type)}</dd></div>
      <div><dt>Interactive moments</dt><dd>${v.moments.map(esc).join(' · ')}</dd></div>
      <div><dt>Patterns</dt><dd>${esc(v.patterns)}</dd></div>
      ${v.issues ? `<div><dt>Known issues</dt><dd>${esc(v.issues)}</dd></div>` : ''}
    </dl>
    ${lhTable([lhRow('Mobile', lh[`/lab/${v.id}`]?.mobile), lhRow('Desktop', lh[`/lab/${v.id}`]?.desktop), lhRow('Write-up, mobile', lh[`/lab/${v.id}/research/activation-steering`]?.mobile)])}
    <div class="shots">
      <figure class="d"><img loading="lazy" src="${img(`${v.id}-desktop-fold.jpg`)}" alt=""><figcaption>Desktop fold · 1440</figcaption></figure>
      <figure class="m"><img loading="lazy" src="${img(`${v.id}-mobile-fold.jpg`)}" alt=""><figcaption>iPhone 15 visible area (393×659)</figcaption></figure>
      <figure class="d"><video src="${img(`${v.id}-desktop.mp4`)}" muted loop playsinline autoplay preload="none"></video><figcaption>Desktop scroll, looping</figcaption></figure>
      <figure class="m"><video src="${img(`${v.id}-mobile.mp4`)}" muted loop playsinline autoplay preload="none"></video><figcaption>Mobile scroll</figcaption></figure>
    </div>
    <details><summary>Full-page screenshots</summary>
      <div class="full"><img loading="lazy" src="${img(`${v.id}-desktop-full.jpg`)}" alt=""><img loading="lazy" src="${img(`${v.id}-mobile-full.jpg`)}" alt=""></div>
    </details>
  </section>`,
    )
    .join('')

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Portfolio design board — tanujdargan.com</title>
<style>
:root{color-scheme:dark;--bg:#0c0c0b;--b2:#151514;--fg:#ededec;--f2:#a1a09a;--f3:#8b8a84;--ln:rgb(255 255 255/.09);--ac:#b9adff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{width:min(100% - 40px,1240px);margin:auto;padding:56px 0 120px}a{color:var(--fg)}
h1{font-size:40px;letter-spacing:-.03em;font-weight:600;margin:0}h2{margin:4px 0 0;font-size:26px;letter-spacing:-.02em;font-weight:600}
h3{font:600 12px/1.4 ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--f3);margin:48px 0 14px}
.lead{max-width:760px;color:var(--f2);font-size:17px}.dim{color:var(--f3)}
.first{margin-top:28px;padding:20px 22px;border-radius:14px;background:var(--b2);box-shadow:inset 0 0 0 1px var(--ln)}
.first ol{margin:8px 0 0;padding-left:20px}.first li{margin:6px 0}
nav.toc{display:flex;flex-wrap:wrap;gap:6px;margin-top:24px}nav.toc a{padding:6px 12px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--ln);text-decoration:none;font-size:13px}
.v{margin-top:72px;padding-top:28px;border-top:1px solid var(--ln)}.v__h{display:flex;justify-content:space-between;align-items:end;gap:16px}
.id{font:600 12px ui-monospace,monospace;color:var(--ac)}.open{padding:10px 16px;border-radius:999px;background:var(--fg);color:var(--bg);text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap}
.why{max-width:780px;font-size:17px;margin:14px 0 0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px 28px;margin:20px 0}.facts dt{font:600 11px ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--f3)}.facts dd{margin:4px 0 0;color:var(--f2)}
table.lh{border-collapse:collapse;font:13px ui-monospace,monospace;margin:8px 0 20px}table.lh td,table.lh th{padding:6px 12px;border-bottom:1px solid var(--ln);text-align:left}table.lh th{color:var(--f3);font-weight:500}
.sc{display:inline-block;min-width:34px;padding:2px 6px;border-radius:6px;text-align:center}.sc.g{background:#12351f;color:#7ee2a0}.sc.o{background:#3a2c0e;color:#f3c46b}.sc.r{background:#3d1512;color:#ff8a7a}
.shots{display:grid;grid-template-columns:2.1fr 1fr 2.1fr 1fr;gap:12px;align-items:start}@media(max-width:900px){.shots{grid-template-columns:1fr 1fr}}
figure{margin:0}figure img,figure video{width:100%;display:block;border-radius:10px;box-shadow:0 0 0 1px var(--ln);background:#000}
.shots .m img,.shots .m video{aspect-ratio:393/659;object-fit:cover;object-position:top}.shots .d img,.shots .d video{aspect-ratio:1440/900;object-fit:cover;object-position:top}
figcaption{font:12px ui-monospace,monospace;color:var(--f3);margin-top:6px}
details{margin-top:14px}summary{cursor:pointer;color:var(--f2)}.full{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px;align-items:start}.full img{width:100%;border-radius:8px}
ul.flat{padding-left:18px}ul.flat li{margin:6px 0;color:var(--f2)}ul.flat b{color:var(--fg);font-weight:600}
.refs{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}.refs figure img{aspect-ratio:16/10;object-fit:cover;object-position:top}
.base{display:grid;grid-template-columns:2.1fr 1fr 2fr;gap:12px;align-items:start}
code{font:13px ui-monospace,monospace;background:var(--b2);padding:2px 6px;border-radius:5px}
</style></head><body><main>
<h1>Portfolio design board</h1>
<p class="lead">tanujdargan.com redesign. ${notes.variants.length} full-site variants built on the same content, all live in the Design Lab. Every variant is dark, prerendered to static HTML, and runs the same four in-browser research demos. Generated ${notes.date}.</p>
<div class="first"><b>Look at these first</b><ol>${notes.lookFirst.map((l) => `<li>${l}</li>`).join('')}</ol>
<p class="dim" style="margin:12px 0 0">Lab: <a href="${liveBase}/lab">${liveBase || ''}/lab</a>. The dock at the bottom switches variant and motion intensity (Subtle / Default / Expressive). <code>[</code> and <code>]</code> cycle variants. Every page has a write-up at <code>/lab/vN/research/…</code> and the Beri case study at <code>/lab/vN/beri</code>.</p></div>
<nav class="toc">${notes.variants.map((v) => `<a href="#${v.id}">${v.id.toUpperCase()} ${esc(v.name)}</a>`).join('')}<a href="#baseline">Current site</a><a href="#demos">Demos</a><a href="#flags">Unverified</a><a href="#decisions">Decisions</a><a href="#refs">References</a></nav>
${variants}
<section class="v" id="baseline"><h2>Baseline: the current site</h2><p class="why">${esc(notes.baseline)}</p>
${lhTable([lhRow('Mobile', lhCur['/']?.mobile), lhRow('Desktop', lhCur['/']?.desktop)])}
<div class="base"><figure><img loading="lazy" src="${img('current-desktop-fold.jpg')}" alt=""><figcaption>Desktop fold</figcaption></figure><figure><img loading="lazy" src="${img('current-mobile-fold.jpg')}" alt=""><figcaption>Mobile fold: code card above the name</figcaption></figure><figure><video src="${img('current-desktop.mp4')}" muted loop playsinline autoplay preload="none"></video><figcaption>Desktop scroll</figcaption></figure></div></section>
<section id="demos"><h3>Research demos (shared by every variant)</h3><ul class="flat">${notes.demos.map((d) => `<li>${d}</li>`).join('')}</ul></section>
<section id="flags"><h3>Unverified, needs Tanuj (shown as yellow ? markers in the lab only)</h3><ul class="flat">${notes.flags.map((d) => `<li>${d}</li>`).join('')}</ul></section>
<section id="decisions"><h3>Decisions and assumptions</h3><ul class="flat">${notes.decisions.map((d) => `<li>${d}</li>`).join('')}</ul></section>
<section id="refs"><h3>References used (${usedRefs.length} of ${refList.length}; all in <code>references/portfolio/</code>, analysis in PORTFOLIO_TASTE.md)</h3>
<div class="refs">${usedRefs.map((r) => `<figure><a href="${r.url || '#'}" target="_blank"><img loading="lazy" src="${refDir}/${r.file}" alt=""></a><figcaption>${esc(r.source || '')}: ${esc((r.note || '').slice(0, 80))}</figcaption></figure>`).join('')}</div></section>
</main></body></html>`
}

writeFileSync('public/portfolio-design-board.html', page('/board', '/board/refs', ''))
writeFileSync('portfolio-design-board.html', page('public/board', 'references/portfolio', notes.previewUrl || 'http://localhost:4173'))
console.log('board written:', notes.variants.length, 'variants,', usedRefs.length, 'refs')
