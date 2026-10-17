// The six roadside signs, one 1024x512 cell each in a 2048x1536 atlas (2 columns x 3 rows), rasterised with
// Playwright. Every claim on them comes from src/content/curated.ts. Cell order: dock, pad, log, model, pier, board.
// Run: node public/drive/src/signs.mjs [out.png]   (playwright from ~/dev/portfolio-tools)
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(path.join(process.env.HOME, 'dev/portfolio-tools/'))
const { chromium } = require('playwright')

const font = (p) => readFileSync(path.resolve('node_modules', p)).toString('base64')
const SANS = font('@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2')
const MONO = font('@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2')

const cells = [
  { k: 'dock', c: '#ffa066', kicker: 'Amazon Robotics · SDE intern', title: 'An LLM planning assistant, in production', line: 'Built into Optimus for 180+ fulfillment sites in North America and Europe.', foot: 'May–Aug 2026 · Return offer', style: 'billboard' },
  { k: 'pad', c: '#7fe7ff', kicker: 'UVic Centre for Aerospace Research', title: 'MarmotSat, in orbit', line: 'I led the onboard-computer firmware in C. Testing cut from 180 minutes to 15.', foot: 'Launched July 2026 · NORAD 69912', style: 'road', arrow: 'left' },
  { k: 'log', c: '#ff9cbf', kicker: 'Apart Research · Aug 2026', title: 'Loss masking', line: 'decides whether a model voices shutdown distress', foot: 'Output-based welfare signals are unreliable', style: 'plaque' },
  { k: 'model', c: '#ffd27a', kicker: 'Interpretability · 2026', title: 'Steering a language model', line: 'Joy steering is a switch, not a dial: the read-back jumps from −8.0 to +9.6.', foot: 'Qwen2.5-1.5B-Instruct', style: 'road', arrow: 'curve' },
  { k: 'pier', c: '#6fe0cf', kicker: 'SOLIDS Lab, UVic · 2025', title: 'Ocean temperature from satellites', line: 'A multimodal model on Ocean Networks Canada sensors and satellite imagery.', foot: 'R² 0.936 against deep-water sensors', style: 'board' },
  { k: 'board', c: '#f3d9b0', kicker: 'Overlook', title: 'Tanuj Dargan', line: 'I ship production ML systems and study what language models represent inside.', foot: 'Experience · Resume · Email · LinkedIn', style: 'board' },
]

const arrow = (a, c) =>
  a === 'left'
    ? `<svg class="ar" viewBox="0 0 100 100"><path d="M62 18 L28 50 L62 82" fill="none" stroke="${c}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg class="ar" viewBox="0 0 100 100"><path d="M70 86 V54 C70 30 52 22 34 22 H22 M36 8 L20 22 L36 36" fill="none" stroke="${c}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const html = `<!doctype html><html><head><style>
@font-face{font-family:S;src:url(data:font/woff2;base64,${SANS}) format('woff2');font-weight:100 900}
@font-face{font-family:M;src:url(data:font/woff2;base64,${MONO}) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:2048px;height:1536px;display:grid;grid-template-columns:repeat(2,1024px);grid-auto-rows:512px;background:#000;font-family:S,sans-serif;color:#f5f0e7}
.c{position:relative;overflow:hidden;padding:54px 64px;display:flex;flex-direction:column;gap:18px}
.k{font-family:M,monospace;font-size:26px;letter-spacing:.06em;text-transform:uppercase;color:var(--c)}
.t{font-size:74px;font-weight:640;line-height:1.02;letter-spacing:-.02em;max-width:880px}
.l{font-size:31px;line-height:1.3;color:#d8d2e6;max-width:860px}
.f{margin-top:auto;font-family:M,monospace;font-size:24px;color:#a9a3bd;display:flex;gap:16px;align-items:center}
.f::before{content:'';width:46px;height:6px;border-radius:3px;background:var(--c)}
.billboard{background:radial-gradient(120% 140% at 85% 0%,#2b2147 0%,#151227 55%,#0c0b18 100%)}
.billboard::after{content:'';position:absolute;right:-60px;top:-60px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,var(--c) 0%,transparent 65%);opacity:.32}
.billboard .t{font-size:66px;max-width:820px}
.road{background:#141a24;border:14px solid #e9e4d8;border-radius:34px;padding:44px 56px}
.road .t{font-size:64px;max-width:720px}
.plaque{background:linear-gradient(180deg,#1b1a1f,#0f0e12);align-items:center;justify-content:center;text-align:center;border:10px solid #3b3833}
.plaque .t{font-size:118px;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.plaque .l{font-size:38px;max-width:900px}
.plaque .f{margin-top:12px}
.board{background:linear-gradient(160deg,#1d2230,#10131c);border-left:22px solid var(--c)}
.ar{position:absolute;right:52px;top:44px;width:150px;height:150px}
</style></head><body>${cells
  .map(
    (x) => `<div class="c ${x.style}" style="--c:${x.c}">${x.arrow ? arrow(x.arrow, x.c) : ''}<p class="k">${x.kicker}</p><p class="t">${x.title}</p><p class="l">${x.line}</p><p class="f">${x.foot}</p></div>`,
  )
  .join('')}</body></html>`

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 2048, height: 1536 } })
await p.setContent(html)
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(200)
const out = process.argv[2] || '/tmp/drive-blender/signs.png'
writeFileSync(out, await p.screenshot({ type: 'png' }))
await b.close()
console.log('wrote', out)
