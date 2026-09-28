import type { WorkKey } from '../../content/work'

/** Where each poster sits on the screen, so its accent (the point of the chart) clears the index and the OSD.
 *  desk: [dx, dy, scale], dx/dy as fractions of the screen (dy positive = down); phone: the poster x (0..1) to centre,
 *  since a phone shows ~40% of the poster's width and pans around it. Shared by the shader and the CSS fallback. */
export const place: Record<WorkKey, { desk: [number, number, number]; fx: number }> = {
  steering: { desk: [0.03, -0.03, 1], fx: 0.66 },
  orbit: { desk: [0.14, 0.05, 1], fx: 0.26 },
  lossmask: { desk: [0.1, -0.06, 0.74], fx: 0.4 },
  retrieval: { desk: [0.05, -0.02, 1], fx: 0.52 },
  es: { desk: [0.16, -0.08, 1], fx: 0.34 },
  ocean: { desk: [0.1, -0.03, 1], fx: 0.36 },
}
