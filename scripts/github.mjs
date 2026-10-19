// Build-time GitHub snapshot for S2's "On GitHub" block: the public contribution calendar (scraped from the same
// HTML github.com/<user> renders, no token needed) plus repo counts, stars and primary languages from the REST API.
// Runs before the build; a network failure keeps the last file, like scripts/tle.mjs.
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
const user = 'tanujdargan'
const out = 'src/data/github.json'

export function parseCalendar(html) {
  const days = new Map()
  for (const m of html.matchAll(/data-date="(\d{4}-\d\d-\d\d)" id="(contribution-day-component-[\d-]+)" data-level="(\d)"/g))
    days.set(m[2], { date: m[1], level: +m[3], count: 0 })
  for (const m of html.matchAll(/for="(contribution-day-component-[\d-]+)"[^>]*>(\d+|No) contribution/g)) {
    const d = days.get(m[1])
    if (d) d.count = m[2] === 'No' ? 0 : +m[2]
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function streaks(days) {
  let longest = 0, run = 0
  for (const d of days) { run = d.count ? run + 1 : 0; longest = Math.max(longest, run) }
  // Today may simply not have a contribution yet; the current streak counts back from yesterday in that case.
  let i = days.length - 1
  if (i >= 0 && !days[i].count) i--
  let current = 0
  for (; i >= 0 && days[i].count; i--) current++
  return { longest, current }
}

async function main() {
  const get = (url, accept) => fetch(url, { headers: { 'User-Agent': 'portfolio-build', Accept: accept }, signal: AbortSignal.timeout(15000) })
  try {
    const html = await (await get(`https://github.com/users/${user}/contributions`, 'text/html')).text()
    const days = parseCalendar(html)
    if (days.length < 300) throw new Error(`calendar parse found ${days.length} days`)
    const res = await get(`https://api.github.com/users/${user}/repos?per_page=100&type=owner`, 'application/vnd.github+json')
    if (!res.ok) throw new Error(`repos ${res.status}`)
    const repos = (await res.json()).filter((r) => !r.fork)
    const langs = {}
    for (const r of repos) if (r.language) langs[r.language] = (langs[r.language] || 0) + 1
    const top = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, n]) => ({ name, repos: n }))
    const data = {
      user, fetchedAt: new Date().toISOString(),
      total: days.reduce((s, d) => s + d.count, 0),
      ...streaks(days),
      repos: repos.length,
      stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
      languages: top,
      days: days.map((d) => [d.date, d.count, d.level]),
    }
    writeFileSync(out, JSON.stringify(data) + '\n')
    console.log('github:', data.total, 'contributions,', data.repos, 'repos, longest streak', data.longest)
  } catch (e) {
    if (!existsSync(out)) throw e
    console.warn('github: fetch failed, keeping cached', JSON.parse(readFileSync(out, 'utf8')).fetchedAt, String(e))
  }
}

if (process.argv[1]?.endsWith('github.mjs')) await main()
