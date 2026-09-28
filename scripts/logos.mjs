// Builds the full-colour organisation tiles in public/logos/tile-*.svg from the official artwork in docs/logos
// (sources and crops logged in docs/logos/SOURCES.md). Every tile is the same 40×40 rounded square, so marks line up
// at one size whatever their native shape; each is vector, so it's crisp at 2×/3×. Run: node scripts/logos.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const src = (f) => readFileSync(`docs/logos/${f}`, 'utf8').replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->/g, '')
const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

// box: the part of the source drawn (its viewBox, or a crop of it); pad: inset inside the 40-unit tile.
const tiles = {
  amazon: { file: 'amazon-icon.svg', box: '2.167 .438 251.038 259.969', bg: '#fff', pad: 8 },
  rbc: { file: 'rbc-shield.svg', box: '0 0 39.5 52', bg: '#fff', pad: 6 },
  uvic: { file: 'uvic-shield-horz-white.svg', box: '0 0 51.3 64', bg: '#005493', pad: 7 },
  // "CFAR" and its orange rule, cropped from the wordmark: the full "UVIC CFAR" at 4.7:1 is illegible in a square.
  cfar: { file: 'cfar-traced.svg', box: '872 70 926 280', bg: '#fff', pad: 5 },
  // The three letter blocks without the "Major League Hacking" line, which is unreadable at tile size.
  mlh: { file: 'mlh-logo-color.svg', box: '0 0 310.6 106.5', bg: '#fff', pad: 5 },
}

for (const [id, t] of Object.entries(tiles)) {
  // A nested <svg> clips to its viewport, not its viewBox, so size the viewport to the crop's aspect (else a wide
  // crop shows its neighbours above and below).
  const [, , bw, bh] = t.box.split(' ').map(Number)
  const k = (40 - 2 * t.pad) / Math.max(bw, bh)
  const [w, h] = [bw * k, bh * k].map((v) => +v.toFixed(2))
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
    `<rect width="40" height="40" rx="9" style="fill:${t.bg}"/>` +
    `<svg x="${+((40 - w) / 2).toFixed(2)}" y="${+((40 - h) / 2).toFixed(2)}" width="${w}" height="${h}" viewBox="${t.box}">${inner(src(t.file))}</svg></svg>`
  writeFileSync(`public/logos/tile-${id}.svg`, svg.replace(/\s+/g, ' ').replace(/> </g, '><'))
}
console.log('tiles:', Object.keys(tiles).join(', '))
