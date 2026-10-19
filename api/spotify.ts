// Recently played + top tracks from Tanuj's Spotify, for S2's "On repeat" block.
// Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN (scopes user-read-recently-played user-top-read;
// get the refresh token once with `node scripts/spotify-token.mjs`). Missing env → 503 and the block hides itself.

interface SpotifyTrack {
  name: string
  external_urls: { spotify: string }
  artists: { name: string }[]
  album: { images: { url: string; width: number }[] }
}
const slim = (t: SpotifyTrack) => ({
  name: t.name,
  artists: t.artists.map((a) => a.name).join(', '),
  url: t.external_urls.spotify,
  // Smallest image that is still at least 64px wide (Spotify lists 640, 300, 64).
  art: [...t.album.images].sort((a, b) => a.width - b.width).find((i) => i.width >= 64)?.url,
})

export async function GET(): Promise<Response> {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env
  if (!id || !secret || !refresh) return Response.json({ error: 'not configured' }, { status: 503 })

  const tok = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  })
  if (!tok.ok) {
    console.error('spotify token', tok.status, await tok.text())
    return Response.json({ error: 'auth failed' }, { status: 502 })
  }
  const { access_token } = await tok.json()
  const get = (path: string) => fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${access_token}` } })
  const [recentRes, topRes] = await Promise.all([get('/me/player/recently-played?limit=8'), get('/me/top/tracks?time_range=short_term&limit=8')])
  if (!recentRes.ok || !topRes.ok) {
    console.error('spotify api', recentRes.status, topRes.status)
    return Response.json({ error: 'spotify failed' }, { status: 502 })
  }
  const recent = (await recentRes.json()).items as { track: SpotifyTrack; played_at: string }[]
  const top = (await topRes.json()).items as SpotifyTrack[]

  // The same song played twice in a row would show twice; keep the first of each.
  const seen = new Set<string>()
  const recentSlim = recent.filter((r) => !seen.has(r.track.external_urls.spotify) && seen.add(r.track.external_urls.spotify))
    .map((r) => ({ ...slim(r.track), playedAt: r.played_at }))

  return Response.json(
    { recent: recentSlim.slice(0, 6), top: top.slice(0, 6).map(slim) },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
  )
}
