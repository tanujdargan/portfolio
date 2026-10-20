// Build-time TLE cache for the live tracker's fallback. Runs before the build; a network failure keeps the last file.
// MarmotSat = NORAD 69912 (SatNOGS norad_follow_id; SatNOGS' own placeholder id is 98272).
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
const out = 'src/data/tle.json'
const url = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=69912&FORMAT=TLE'
try {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  const [name, l1, l2] = (await res.text()).trim().split('\n').map((s) => s.trim())
  if (!l1?.startsWith('1 69912') || !l2?.startsWith('2 69912')) throw new Error('unexpected TLE response')
  writeFileSync(out, JSON.stringify({ name, norad: 69912, l1, l2, source: url, fetchedAt: new Date().toISOString() }, null, 1) + '\n')
  console.log('tle: cached', name, 'epoch', l1.slice(18, 32))
} catch (e) {
  if (!existsSync(out)) throw e
  console.warn('tle: fetch failed, keeping cached', JSON.parse(readFileSync(out, 'utf8')).fetchedAt, String(e))
}
