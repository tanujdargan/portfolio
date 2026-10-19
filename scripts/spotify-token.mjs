// One-time helper: get a Spotify refresh token for api/spotify.ts.
// 1. Create an app at https://developer.spotify.com/dashboard with redirect URI http://127.0.0.1:8888/callback
// 2. SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-token.mjs
// 3. Open the printed URL, approve, and copy the refresh token into Vercel as SPOTIFY_REFRESH_TOKEN.
import { createServer } from 'node:http'
const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env
if (!id || !secret) throw new Error('set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET')
const redirect = 'http://127.0.0.1:8888/callback'
const auth = new URL('https://accounts.spotify.com/authorize')
auth.search = new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: redirect, scope: 'user-read-recently-played user-top-read' })
console.log('Open this URL:\n' + auth)

const server = createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code')
  if (!code) return res.end('no code')
  const tok = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  }).then((r) => r.json())
  res.end(tok.refresh_token ? 'Done. Back to the terminal.' : 'Failed: ' + JSON.stringify(tok))
  console.log(tok.refresh_token ? '\nSPOTIFY_REFRESH_TOKEN=' + tok.refresh_token : tok)
  server.close()
})
server.listen(8888, '127.0.0.1')
