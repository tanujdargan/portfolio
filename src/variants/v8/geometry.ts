// The index geometry, shared by the GPU shader (gl.ts) and the CPU (search plans, labels, the 2-D fallback).
// Every point is a pure function of its id: pcg(id) → cell, gaussian offset. Nothing is uploaded per point.

export const NLIST = 64
export const GROUPS = 6

/** PCG hash, bit-identical to the GLSL version in gl.ts. */
export function pcg(v: number) {
  const s = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0
  return ((w >>> 22) ^ w) >>> 0
}
const u01 = (h: number) => Math.fround(h) / 4294967296

export type V3 = [number, number, number]

/** Group anchors: a loose ring, like districts of one city. */
export const anchors: V3[] = Array.from({ length: GROUPS }, (_, g) => {
  const a = (g / GROUPS) * Math.PI * 2 + 0.4
  const r = 2.25 + (g % 2) * 0.35
  return [Math.cos(a) * r, (g % 3 - 1) * 0.38, Math.sin(a) * r]
})

function gauss(h: number): [number, number] {
  const a = pcg(h)
  const b = pcg(a)
  const r = Math.sqrt(-2 * Math.log(Math.max(u01(a), 1e-7)))
  return [r * Math.cos(6.2831853 * u01(b)), r * Math.sin(6.2831853 * u01(b))]
}

/** Cell centres (xyz) + sigma (w), and per-cell anisotropy. Cells 0..47 sit around the six anchors; 48..63 are scattered. */
export const cells: { c: V3; s: number; a: V3; g: number }[] = Array.from({ length: NLIST }, (_, i) => {
  const [g0, g1] = gauss(i * 97 + 11)
  const [g2, g3] = gauss(i * 97 + 53)
  const h = pcg(i + 7001)
  let c: V3
  let g = -1
  if (i === 48) c = [0, 0, 0] // the "you are here" cell: contact, resume, profiles
  else if (i < 48) {
    g = i % GROUPS
    const A = anchors[g]
    c = [A[0] + g0 * 0.5, A[1] + g1 * 0.24, A[2] + g2 * 0.5]
  } else {
    const a = u01(h) * Math.PI * 2
    const r = 1.2 + u01(pcg(h)) * 2.2
    c = [Math.cos(a) * r, g3 * 0.45, Math.sin(a) * r]
  }
  const s = 0.07 + u01(pcg(h + 1)) * 0.2
  const a: V3 = [0.55 + u01(pcg(h + 2)) * 1.1, 0.4 + u01(pcg(h + 3)) * 0.7, 0.55 + u01(pcg(h + 4)) * 1.1]
  return { c, s, a, g }
})

/** Position of point `i`, mirroring the vertex shader (without drift). Returns null for background dust. */
export function pointPos(i: number): V3 {
  const a = pcg((i ^ 0x9e3779b9) >>> 0)
  const b = pcg(a)
  const c = pcg(b)
  const d = pcg(c)
  if ((a & 15) === 0) return [(u01(b) * 2 - 1) * 3.6, (u01(c) * 2 - 1) * 1.3, (u01(d) * 2 - 1) * 3.6]
  const r1 = Math.sqrt(-2 * Math.log(Math.max(u01(a), 1e-7)))
  const t1 = 6.2831853 * u01(b)
  const r2 = Math.sqrt(-2 * Math.log(Math.max(u01(c), 1e-7)))
  const t2 = 6.2831853 * u01(d)
  const C = cells[i % NLIST]
  return [C.c[0] + r1 * Math.cos(t1) * C.s * C.a[0], C.c[1] + r1 * Math.sin(t1) * C.s * C.a[1], C.c[2] + r2 * Math.cos(t2) * C.s * C.a[2]]
}
export const isDust = (i: number) => (pcg((i ^ 0x9e3779b9) >>> 0) & 15) === 0

export const d2 = (a: V3, b: V3) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Cells of a group, nearest to its anchor first. */
export function groupCells(g: number) {
  return cells
    .map((c, i) => ({ i, c }))
    .filter((x) => x.c.g === g)
    .sort((x, y) => d2(x.c.c, anchors[g]) - d2(y.c.c, anchors[g]))
    .map((x) => x.i)
}

/** Cells sorted by distance of their centre to p (the IVF coarse quantiser). */
export function nearestCells(p: V3) {
  return cells
    .map((c, i) => ({ i, d: d2(c.c, p) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.i)
}

/** A point id inside cell `c` that isn't dust. `m` picks which one. */
export function pointInCell(c: number, m: number) {
  let i = c + NLIST * m
  while (isDust(i)) i += NLIST
  return i
}
