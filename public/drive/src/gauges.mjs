// The five-dial cluster faces, drawn as SVG and rasterised with Playwright into one 1536x1024 atlas (3x2 cells of 512).
// Cells: 0 tach, 1 speed, 2 oil temp, 3 oil pressure, 4 fuel. The tach and speed needles are geometry (they move);
// the three small gauges have their needle painted in. No marque, no badge.
// Run: node public/drive/src/gauges.mjs   (playwright from ~/dev/portfolio-tools)
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(path.join(process.env.HOME, 'dev/portfolio-tools/'))
const { chromium } = require('playwright')

const A0 = -135, A1 = 135 // sweep, degrees clockwise from 12 o'clock
const pol = (r, deg) => [256 + r * Math.sin((deg * Math.PI) / 180), 256 - r * Math.cos((deg * Math.PI) / 180)]

function dial({ min, max, major, minor, labels, red, title, unit, needle, big }) {
  let s = ''
  s += `<defs><radialGradient id="g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#16181d"/><stop offset="1" stop-color="#07080a"/></radialGradient></defs>`
  s += `<circle cx="256" cy="256" r="254" fill="url(#g)"/>`
  s += `<circle cx="256" cy="256" r="250" fill="none" stroke="#2a2d33" stroke-width="4"/>`
  const ang = (v) => A0 + ((v - min) / (max - min)) * (A1 - A0)
  if (red) {
    const [a, b] = [ang(red[0]), ang(red[1])]
    const r = 214
    const [x0, y0] = pol(r, a), [x1, y1] = pol(r, b)
    s += `<path d="M${x0} ${y0} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x1} ${y1}" fill="none" stroke="#e0362b" stroke-width="18"/>`
  }
  for (let v = min; v <= max + 1e-6; v += minor) {
    const isMaj = Math.abs(((v - min) / major) - Math.round((v - min) / major)) < 1e-6
    const a = ang(v)
    const [x0, y0] = pol(isMaj ? 196 : 210, a), [x1, y1] = pol(232, a)
    s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${red && v >= red[0] ? '#ff5a4a' : '#ece8df'}" stroke-width="${isMaj ? 7 : 3}" stroke-linecap="round"/>`
  }
  labels.forEach(([v, t]) => {
    const [x, y] = pol(big ? 160 : 150, ang(v))
    s += `<text x="${x}" y="${y}" font-size="${big ? 46 : 52}" text-anchor="middle" dominant-baseline="central" fill="#f2efe8">${t}</text>`
  })
  s += `<text x="256" y="${big ? 352 : 340}" font-size="${big ? 30 : 34}" letter-spacing="2" text-anchor="middle" fill="#9aa0aa">${title}</text>`
  if (unit) s += `<text x="256" y="${big ? 392 : 380}" font-size="24" letter-spacing="2" text-anchor="middle" fill="#6d727b">${unit}</text>`
  if (needle !== undefined) {
    const a = ang(needle)
    const [x1, y1] = pol(200, a), [x0, y0] = pol(-34, a)
    s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#ff6a1a" stroke-width="12" stroke-linecap="round"/>`
  }
  s += `<circle cx="256" cy="256" r="30" fill="#1b1d22" stroke="#3a3d44" stroke-width="3"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${s}</svg>`
}

const cells = [
  dial({ min: 0, max: 9, major: 1, minor: 0.5, labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => [v, String(v)]), red: [7.5, 9], title: '1/min', unit: 'x1000', big: true }),
  dial({ min: 0, max: 320, major: 40, minor: 20, labels: [0, 40, 80, 120, 160, 200, 240, 280, 320].map((v) => [v, String(v)]), title: 'km/h', big: true }),
  dial({ min: 60, max: 150, major: 30, minor: 10, labels: [[60, '60'], [90, '90'], [120, '120'], [150, '150']], red: [130, 150], title: 'OIL °C', needle: 92 }),
  dial({ min: 0, max: 10, major: 2, minor: 1, labels: [[0, '0'], [2, '2'], [4, '4'], [6, '6'], [8, '8'], [10, '10']], title: 'OIL bar', needle: 4.6 }),
  dial({ min: 0, max: 4, major: 2, minor: 1, labels: [[0, 'E'], [2, '½'], [4, 'F']], red: [0, 0.6], title: 'FUEL', needle: 3.2 }),
]

const html = `<!doctype html><html><head><style>
@font-face{font-family:G;src:url('file://${path.resolve('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')}') format('woff2');font-weight:100 900}
body{margin:0;background:#000;width:1536px;height:1024px;display:grid;grid-template-columns:repeat(3,512px);grid-auto-rows:512px;font-family:G,Helvetica,sans-serif;font-weight:560}
svg text{font-family:G,Helvetica,sans-serif}
</style></head><body>${cells.join('')}</body></html>`

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1536, height: 1024 } })
await p.setContent(html)
await p.waitForTimeout(300)
const out = process.argv[2] || '/tmp/drive-blender/gauges.png'
writeFileSync(out, await p.screenshot({ type: 'png' }))
await b.close()
console.log('wrote', out)
