// Renders public/og.png (1200x630) from HTML. The dots are the real joy-vector activation cloud from src/data/steering.json.
// Run: node scripts/og.mjs   (needs playwright; uses ~/dev/portfolio-tools/node_modules if not installed here)
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(path.join(process.env.HOME, 'dev/portfolio-tools/'))
const { chromium } = require('playwright')

const root = path.resolve('.')
const d = JSON.parse(readFileSync('src/data/steering.json', 'utf8')).concepts.joy
const pts = [...d.cloud.pos.map((p) => [...p, 1]), ...d.cloud.neg.map((p) => [...p, 0])]
const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
const sx = (x) => 30 + ((x - x0) / (x1 - x0)) * 400, sy = (y) => 330 - ((y - y0) / (y1 - y0)) * 300
const traj = d.outputs[0].map((o) => `${sx(o.xy[0]).toFixed(1)},${sy(o.xy[1]).toFixed(1)}`).join(' ')
const dots = pts.map(([x, y, pos]) => `<circle cx="${sx(x)}" cy="${sy(y)}" r="5" fill="${pos ? '#b9adff' : '#5b5a56'}" opacity="${pos ? 0.8 : 0.9}"/>`).join('')
const font = (p) => `file://${root}/node_modules/${p}`
const html = `<!doctype html><html><head><style>
@font-face{font-family:G;src:url(${font('@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')});font-weight:100 900}
@font-face{font-family:M;src:url(${font('@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2')});font-weight:100 900}
@font-face{font-family:N;src:url(${font('@fontsource-variable/newsreader/files/newsreader-latin-opsz-italic.woff2')});font-style:italic}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#0c0c0b;color:#ededec;font-family:G;position:relative;overflow:hidden}
.l{position:absolute;left:72px;top:64px;width:600px}.k{font:400 20px/1.4 M;color:#6d6c67}
h1{margin-top:26px;font-size:92px;line-height:.95;letter-spacing:-.04em;font-weight:500}
p{margin-top:24px;font-size:34px;line-height:1.2;letter-spacing:-.02em;color:#a1a09a;max-width:560px}p em{font-family:N;color:#ededec}
ul{position:absolute;left:72px;bottom:64px;display:flex;gap:10px;list-style:none;padding:0}
li{font:400 19px/1 M;padding:14px 18px;border-radius:999px;box-shadow:inset 0 0 0 1.5px rgb(255 255 255/.12);color:#ededec}
svg{position:absolute;right:56px;top:120px}.cap{position:absolute;right:72px;top:470px;font:400 16px/1.4 M;color:#6d6c67;text-align:right}
</style></head><body>
<div class="l"><div class="k">tanujdargan.com</div><h1>Tanuj Dargan</h1><p>I build ML systems and study what happens <em>inside</em> models.</p></div>
<svg width="460" height="360" viewBox="0 0 460 360"><line x1="${sx(0)}" x2="${sx(0)}" y1="20" y2="340" stroke="rgb(255 255 255/.1)"/>${dots}
<polyline points="${traj}" fill="none" stroke="#a1a09a" stroke-width="1.5" stroke-dasharray="3 5"/>
<circle cx="${sx(d.outputs[0][6].xy[0])}" cy="${sy(d.outputs[0][6].xy[1])}" r="10" fill="#ededec" stroke="#0c0c0b" stroke-width="3"/></svg>
<div class="cap">joy vector · layer ${d.layer} · Qwen2.5-1.5B<br/>real activations</div>
<ul><li>Amazon Robotics AI · return offer</li><li>Co-founder, Beri</li><li>Activation steering</li></ul>
</body></html>`
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
const tmp = path.join(root, 'scripts/.og.html')
writeFileSync(tmp, html)
await p.goto('file://' + tmp, { waitUntil: 'load' })
await p.evaluate(() => document.fonts.ready)
await p.screenshot({ path: 'public/og.png' })
await b.close()
rmSync(tmp)
console.log('wrote public/og.png')
