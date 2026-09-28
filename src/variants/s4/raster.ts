// Poster SVG → texture bytes for the screen. Two passes per work, packed into one RGBA8 texture:
//   R = the grey layer (axes, data, labels), luminance-coded by class (fg 1.0, fg2 0.7, fg3 0.45)
//   G = the accent layer (the work's own highlighted strokes)
// The shader adds glow from the mip chain, dithers, and colours G with the work's accent. Browser-only (Image,
// canvas); never imported at module scope by anything that runs at SSR.
import posterCss from '../../shared/posters.css?raw'
import { posters, VB } from '../../shared/posters/data'
import type { WorkKey } from '../../content/work'
import { GREY_OFF, ACC_ONLY } from './passes'

let fontFace: Promise<string> | null = null
let land: Promise<string> | null = null
/** The orbit poster masks its land dots with /orbit/land.png; an SVG-as-image can't fetch it, so inline it. */
function landUrl() {
  land ??= fetch('/orbit/land.png')
    .then((r) => (r.ok ? r.blob() : Promise.reject()))
    .then((b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(b) }))
    .catch(() => '')
  return land
}
/** Martian Mono, embedded as a data URL, so the labels inside the SVG-as-image use the HUD face (images can't fetch). */
function font() {
  fontFace ??= fetch('/s4/martian.woff2')
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
    .then((b) => {
      let s = ''
      const u = new Uint8Array(b)
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
      return `@font-face{font-family:'s4m';src:url(data:font/woff2;base64,${btoa(s)}) format('woff2');font-weight:100 900;font-stretch:75% 125%}`
    })
    .catch(() => '')
  return fontFace
}

function svgFor(k: WorkKey, pass: 'grey' | 'acc', w: number, h: number, face: string, landHref: string) {
  // The poster is drawn into the middle of a padded frame: the border stays black, so CLAMP_TO_EDGE reads as empty
  // signal, and the glow never gets cut at the texture edge.
  const px = VB.w * PAD
  const py = VB.h * PAD
  const vars =
    pass === 'grey'
      ? '--accent:transparent;--p-fg:#fff;--p-fg2:#d2d2d2;--p-fg3:#a2a2a2;--p-bg:#000;--line-2:#5a5a5a'
      : '--accent:#fff;--p-fg:#000;--p-fg2:#000;--p-fg3:#000;--p-bg:#000;--line-2:transparent'
  const extra = pass === 'grey' ? `${GREY_OFF}{display:none}` : `${ACC_ONLY}{display:none}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${-px} ${-py} ${VB.w + 2 * px} ${VB.h + 2 * py}"><style>${face}${posterCss}.s-poster{${vars};--font-mono:'s4m',ui-monospace,Menlo,monospace;width:auto;height:auto;aspect-ratio:auto}${extra}</style><rect x="${-px}" y="${-py}" width="${VB.w + 2 * px}" height="${VB.h + 2 * py}" fill="#000"/><g class="s-poster">${landHref ? posters[k].replace('/orbit/land.png', landHref) : posters[k]}</g></svg>`
}

function draw(svg: string, ctx: CanvasRenderingContext2D, w: number, h: number) {
  return new Promise<Uint8ClampedArray>((res, rej) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    img.onload = () => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      res(ctx.getImageData(0, 0, w, h).data)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      rej(new Error('poster raster failed'))
    }
    img.src = url
  })
}

/** Padding around the poster, as a fraction of its size (texture space). The shader maps with the same number. */
export const PAD = 0.08

export async function rasterPoster(k: WorkKey, w: number): Promise<{ data: Uint8Array; w: number; h: number }> {
  const h = Math.round((w * (VB.h * (1 + 2 * PAD))) / (VB.w * (1 + 2 * PAD)))
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  const [face, lh] = await Promise.all([font(), k === 'orbit' ? landUrl() : Promise.resolve('')])
  const g = await draw(svgFor(k, 'grey', w, h, face, lh), ctx, w, h)
  const a = await draw(svgFor(k, 'acc', w, h, face, lh), ctx, w, h)
  const out = new Uint8Array(w * h * 4)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = g[i]
    out[i + 1] = Math.max(a[i], a[i + 1], a[i + 2])
    out[i + 2] = 0
    out[i + 3] = 255
  }
  return { data: out, w, h }
}
