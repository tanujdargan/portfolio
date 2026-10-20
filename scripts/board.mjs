// Builds the design board twice from one template:
//   portfolio-design-board.html          (repo root, media from public/board)
//   public/portfolio-design-board.html   (deployed, media from /board)
// Inputs: scripts/board-notes.json, audit/lighthouse.json, audit/density-<id>.json, public/board/<id>-* captures.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'

const notes = JSON.parse(readFileSync('scripts/board-notes.json', 'utf8'))
const lh = existsSync('audit/lighthouse.json') ? JSON.parse(readFileSync('audit/lighthouse.json', 'utf8')) : {}
const density = (id) => (existsSync(`audit/density-${id}.json`) ? JSON.parse(readFileSync(`audit/density-${id}.json`, 'utf8')).views : null)

const frames = (id) => readdirSync('public/board').filter((f) => f.startsWith(`${id}-sig-`) && f.endsWith('.jpg')).sort()
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const score = (n) => `<b class="sc ${n >= 90 ? 'g' : n >= 50 ? 'o' : 'r'}">${n}</b>`
const lhRow = (label, r) =>
  r
    ? `<tr><td>${label}</td><td>${score(r.perf)}</td><td>${score(r.a11y)}</td><td>${score(r.bp)}</td><td>${score(r.seo)}</td><td>${(r.lcp / 1000).toFixed(2)} s</td><td>${r.cls}</td><td>${r.tbt} ms</td></tr>`
    : `<tr><td>${label}</td><td colspan="7" class="dim">not measured</td></tr>`
const lhTable = (rows) =>
  `<table class="t"><thead><tr><th>Lighthouse</th><th>Perf</th><th>A11y</th><th>BP</th><th>SEO</th><th>LCP</th><th>CLS</th><th>TBT</th></tr></thead><tbody>${rows.join('')}</tbody></table>`

// Density per DIAGNOSIS_V2 targets. The first window carries the lab dock (≈17 links desktop, 3 mobile): subtracted.
const DOCK = { mobile: 3, desktop: 17 }
function densityTable(d) {
  if (!d) return '<p class="dim">Density not measured.</p>'
  const row = (tag) => {
    const v = d[tag]
    // Elements outside the demos (a demo's token spans and table cells are its content, not page chrome).
    const w = v.windows.map((x, i) => ({ ...x, elements: (x.outsideDemo ?? x.elements) - (i === 0 ? DOCK[tag] : 0) }))
    const maxEl = Math.max(...w.map((x) => x.elements))
    const maxF = Math.max(...w.map((x) => x.focal))
    const ok = (c) => (c ? 'g' : 'r')
    return `<tr><td>${tag}</td><td class="${ok(v.height <= 8000 || tag === 'desktop')}">${v.height.toLocaleString()} px</td><td class="${ok((v.copyWords ?? v.totalWords) <= 700)}">${v.copyWords ?? v.totalWords}</td><td>${v.demoWords ?? '–'}</td><td class="${ok(maxEl <= 25)}">${maxEl}</td><td class="${ok(maxF <= 2)}">${maxF}</td><td class="${ok(v.longCards === 0)}">${v.longCards}</td></tr>`
  }
  const secs = d.mobile.sections.map((s) => `<span><b>${esc(s.id)}</b> ${s.words}</span>`).join('')
  return `<table class="t"><thead><tr><th>Density</th><th>Page height</th><th>Copy words (≤700)</th><th>Words inside demos</th><th>Max elements / screen, outside demos (≤25)</th><th>Max focal / screen (≤2)</th><th>Cards &gt;25 words (0)</th></tr></thead><tbody>${row('mobile')}${row('desktop')}</tbody></table>
  <p class="secs"><span class="dim">Words per section (mobile):</span> ${secs}</p>`
}

function page(media, liveBase) {
  const img = (f) => `${media}/${f}`
  const has = (f) => existsSync(`public/board/${f}`)
  const variant = (v) => `
  <section class="v" id="${v.id}">
    <header class="v__h">
      <div><span class="id">${v.id.toUpperCase()}</span><span class="tag tag--${v.verdict}">${esc(v.verdict)}</span><h2>${esc(v.name)}</h2></div>
      <a class="open" href="${liveBase}/lab/${v.id}" target="_blank">Open live ↗</a>
    </header>
    <p class="why">${esc(v.idea)}</p>
    <dl class="facts">
      <div><dt>Type and palette</dt><dd>${esc(v.type)}</dd></div>
      ${v.interactions ? `<div><dt>Interactions</dt><dd>${esc(v.interactions)}</dd></div>` : ''}
      <div style="grid-column:1/-1"><dt>Critique against STUDIO_TASTE.md</dt><dd><ul class="flat">${v.critique.map((c) => `<li>${c}</li>`).join('')}</ul></dd></div>
      ${v.fixed?.length ? `<div style="grid-column:1/-1"><dt>Fixed after the critique</dt><dd><ul class="flat">${v.fixed.map((c) => `<li>${c}</li>`).join('')}</ul></dd></div>` : ''}
      ${v.issues ? `<div style="grid-column:1/-1"><dt>Known issues</dt><dd>${esc(v.issues)}</dd></div>` : ''}
    </dl>
    ${v.signature ? `<div class="sig"><h4>Signature interaction</h4><p>${v.signature}</p>
      <div class="shots">
        ${has(`${v.id}-sig-desktop.mp4`) ? `<figure class="d"><video src="${img(`${v.id}-sig-desktop.mp4`)}" muted loop playsinline autoplay preload="none" controls></video><figcaption>Signature, desktop (scripted recording)</figcaption></figure>` : ''}
        ${has(`${v.id}-sig-mobile.mp4`) ? `<figure class="m"><video src="${img(`${v.id}-sig-mobile.mp4`)}" muted loop playsinline autoplay preload="none" controls></video><figcaption>Signature, phone</figcaption></figure>` : ''}
      </div>
      <div class="frames">${frames(v.id).map((f) => `<figure><img loading="lazy" src="${img(f)}" alt=""><figcaption>${esc(f.replace(/^.*-sig-/, '').replace('.jpg', '').replace(/-\d+-/, ' · '))}</figcaption></figure>`).join('')}</div></div>` : ''}
    ${v.transitions ? `<dl class="facts"><div><dt>Transitions and type motion</dt><dd>${v.transitions}</dd></div>${v.references ? `<div><dt>Studio references it drew on</dt><dd>${v.references}</dd></div>` : ''}</dl>` : ''}
    ${densityTable(density(v.id))}
    ${lhTable([lhRow('Mobile', lh[`/lab/${v.id}`]?.mobile), lhRow('Desktop', lh[`/lab/${v.id}`]?.desktop), lhRow('Write-up, mobile', lh[`/lab/${v.id}/research/activation-steering`]?.mobile)])}
    <div class="shots">
      <figure class="d"><img loading="lazy" src="${img(`${v.id}-desktop-fold.jpg`)}" alt=""><figcaption>Desktop fold · 1440</figcaption></figure>
      <figure class="m"><img loading="lazy" src="${img(`${v.id}-mobile-fold.jpg`)}" alt=""><figcaption>iPhone 15 visible area</figcaption></figure>
      ${has(`${v.id}-desktop.mp4`) ? `<figure class="d"><video src="${img(`${v.id}-desktop.mp4`)}" muted loop playsinline autoplay preload="none"></video><figcaption>Desktop scroll</figcaption></figure>` : ''}
      ${has(`${v.id}-mobile.mp4`) ? `<figure class="m"><video src="${img(`${v.id}-mobile.mp4`)}" muted loop playsinline autoplay preload="none"></video><figcaption>Mobile scroll</figcaption></figure>` : ''}
    </div>
    <details><summary>Full-page screenshots</summary>
      <div class="full"><img loading="lazy" src="${img(`${v.id}-desktop-full.jpg`)}" alt=""><img loading="lazy" src="${img(`${v.id}-mobile-full.jpg`)}" alt=""></div>
    </details>
  </section>`
  const list = (items) => `<ul class="flat">${items.map((c) => `<li>${c}</li>`).join('')}</ul>`
  const current = notes.variants.filter((v) => v.verdict !== 'reference')
  const refs = notes.variants.filter((v) => v.verdict === 'reference')

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Portfolio design board — tanujdargan.com</title>
<style>
:root{color-scheme:dark;--bg:#0c0c0b;--b2:#151514;--fg:#ededec;--f2:#a1a09a;--f3:#8b8a84;--ln:rgb(255 255 255/.09);--ac:#b9adff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{width:min(100% - 40px,1240px);margin:auto;padding:56px 0 120px}a{color:var(--fg)}
h1{font-size:40px;letter-spacing:-.03em;font-weight:600;margin:0}h2{margin:4px 0 0;font-size:26px;letter-spacing:-.02em;font-weight:600}
h3{font:600 12px/1.4 ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--f3);margin:56px 0 14px}
.lead{max-width:760px;color:var(--f2);font-size:17px}.dim{color:var(--f3)}
.box{margin-top:28px;padding:20px 22px;border-radius:14px;background:var(--b2);box-shadow:inset 0 0 0 1px var(--ln)}
.box ol{margin:8px 0 0;padding-left:20px}.box li{margin:6px 0}.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px}@media(max-width:800px){.cols{grid-template-columns:1fr}}
nav.toc{display:flex;flex-wrap:wrap;gap:6px;margin-top:24px}nav.toc a{padding:6px 12px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--ln);text-decoration:none;font-size:13px}
.v{margin-top:72px;padding-top:28px;border-top:1px solid var(--ln)}.v__h{display:flex;justify-content:space-between;align-items:end;gap:16px}
.id{font:600 12px ui-monospace,monospace;color:var(--ac)}.open{padding:10px 16px;border-radius:999px;background:var(--fg);color:var(--bg);text-decoration:none;font-weight:600;font-size:14px;white-space:nowrap}
.tag{display:inline-block;margin-left:8px;padding:2px 7px;border-radius:999px;font:600 10px ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;vertical-align:middle;background:#26262a;color:var(--f2)}
.tag--keep{background:#12351f;color:#7ee2a0}.tag--drop{background:#3d1512;color:#ff8a7a}.tag--reference{background:#2a1f45;color:#c9b8ff}
.why{max-width:780px;font-size:17px;margin:14px 0 0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px 28px;margin:20px 0}.facts dt{font:600 11px ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--f3)}.facts dd{margin:4px 0 0;color:var(--f2)}
table.t{border-collapse:collapse;font:13px ui-monospace,monospace;margin:8px 0 14px}table.t td,table.t th{padding:6px 12px;border-bottom:1px solid var(--ln);text-align:left}table.t th{color:var(--f3);font-weight:500}
table.t td.g{color:#7ee2a0}table.t td.r{color:#ff8a7a}
.secs{font:12.5px ui-monospace,monospace;display:flex;flex-wrap:wrap;gap:6px 16px;margin:0 0 18px}.secs b{font-weight:500;color:var(--fg)}
.sc{display:inline-block;min-width:34px;padding:2px 6px;border-radius:6px;text-align:center}.sc.g{background:#12351f;color:#7ee2a0}.sc.o{background:#3a2c0e;color:#f3c46b}.sc.r{background:#3d1512;color:#ff8a7a}
.shots{display:grid;grid-template-columns:2.1fr 1fr 2.1fr 1fr;gap:12px;align-items:start}@media(max-width:900px){.shots{grid-template-columns:1fr 1fr}}
figure{margin:0}figure img,figure video{width:100%;display:block;border-radius:10px;box-shadow:0 0 0 1px var(--ln);background:#000}
.shots .m img,.shots .m video{aspect-ratio:393/659;object-fit:cover;object-position:top}.shots .d img,.shots .d video{aspect-ratio:1440/900;object-fit:cover;object-position:top}
figcaption{font:12px ui-monospace,monospace;color:var(--f3);margin-top:6px}
details{margin-top:14px}summary{cursor:pointer;color:var(--f2)}.full{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px;align-items:start}.full img{width:100%;border-radius:8px}
ul.flat{padding-left:18px;margin:6px 0}ul.flat li{margin:6px 0;color:var(--f2)}ul.flat b{color:var(--fg);font-weight:600}
.logos{display:flex;gap:14px;align-items:center;margin-top:10px}.logos img{width:40px;height:40px;border-radius:9px}
h4{font:600 12px ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--ac);margin:26px 0 8px}.sig p{max-width:820px;color:var(--fg)}
.frames{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:12px}.frames img{width:100%;border-radius:8px;box-shadow:0 0 0 1px var(--ln)}
code{font:13px ui-monospace,monospace;background:var(--b2);padding:2px 6px;border-radius:5px}
</style></head><body><main>
<h1>Portfolio design board</h1>
<p class="lead">${esc(notes.intro)} Generated ${notes.date}.</p>
<section class="box"><b>Changelog: studio round (${esc(notes.date)})</b>
  <div class="cols"><div><h3 style="margin-top:14px">Deleted</h3>${list(notes.changelog.deleted)}</div><div><h3 style="margin-top:14px">Added</h3>${list(notes.changelog.added)}</div></div>
</section>
<div class="box"><b>Look at these first</b><ol>${notes.lookFirst.map((l) => `<li>${l}</li>`).join('')}</ol>
<p class="dim" style="margin:12px 0 0">Lab: <a href="${liveBase}/lab">${liveBase || ''}/lab</a>. The dock at the bottom switches variant and motion intensity (Subtle / Default / Expressive); <code>[</code> and <code>]</code> cycle variants. Write-ups live at <code>/lab/&lt;id&gt;/research/…</code>.</p></div>
<nav class="toc">${notes.variants.map((v) => `<a href="#${v.id}">${v.id.toUpperCase()} ${esc(v.name)}</a>`).join('')}<a href="#research">Research</a><a href="#shared">Logos and demos</a><a href="#assumptions">Assumptions</a></nav>
<h3 style="margin-top:64px">This round: S1–S5</h3>
${current.map(variant).join('')}
<h3 style="margin-top:96px">References the owner kept (unchanged)</h3>
${refs.map(variant).join('')}
<section id="research"><h3>Research behind this round</h3>${list(notes.research)}</section>
<section id="shared"><h3>Logos and the demo shell (shared by every variant)</h3>
<div class="logos">${['amazon', 'rbc', 'uvic', 'cfar', 'mlh'].map((l) => `<img src="${liveBase}/logos/tile-${l}.svg" alt="${l}">`).join('')}</div>
${list(notes.shared)}</section>
<section id="assumptions"><h3>Assumptions and decisions</h3>${list(notes.assumptions)}</section>
</main></body></html>`
}

writeFileSync('public/portfolio-design-board.html', page('/board', ''))
writeFileSync('portfolio-design-board.html', page('public/board', notes.previewUrl || 'http://localhost:4173'))
console.log('board written:', notes.variants.length, 'variants')
