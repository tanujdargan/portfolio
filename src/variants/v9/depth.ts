// Depth is time. Pure helpers, no DOM, safe for SSR.
// The surface is now (late Sep 2026); every 100 m down is one year earlier. Hack@JBCNOsh (2022) sits on the seabed.

export const NOW = 2026.74
export const M_PER_YEAR = 100
export const FLOOR_M = Math.round((NOW - 2022) * M_PER_YEAR) // 474

export const metresFor = (year: number) => Math.max(0, Math.round((NOW - year) * M_PER_YEAR))
export const yearAt = (m: number) => NOW - m / M_PER_YEAR

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "Sep 2026" for a depth in metres. */
export function whenAt(m: number) {
  const y = yearAt(m)
  const yr = Math.floor(y + 1e-6)
  const mo = Math.min(11, Math.max(0, Math.floor((y - yr) * 12)))
  return `${MONTHS[mo]} ${yr}`
}

/** Year bands on the gauge: [label, top m, bottom m]. */
export const bands = [2026, 2025, 2024, 2023, 2022].map((y) => ({
  y,
  top: Math.max(0, metresFor(y + 1)),
  bottom: metresFor(y),
}))

// Illustrative coastal temperature profile for the sensor figure. NOT lab data; labelled as such in the UI.
export const SENSOR_Z = [0, 10, 20, 30, 45, 60, 80, 100, 125, 150, 175, 200]
const truth = (z: number) => 7.1 + 4.9 * Math.exp(-z / 34) + 0.3 * Math.exp(-((z - 55) ** 2) / 320)
export const predicted = (z: number) => truth(z) + 0.16 * Math.sin(z / 23 + 1.1)
export const sensorAt = (z: number) => truth(z) + 0.26 * Math.sin(z * 1.7 + 0.4) * Math.cos(z * 0.31 + 0.2)
