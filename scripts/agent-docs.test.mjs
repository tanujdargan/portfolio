// Checks middleware.ts with constructed Requests. Run: node scripts/agent-docs.test.mjs (Node 23.6+ strips TS types).
import assert from 'node:assert/strict'
import middleware, { markdownTarget } from '../middleware.ts'

const BASE = 'https://tanujdargan.com'
const req = (path, headers = {}, method = 'GET') => new Request(BASE + path, { method, headers })
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'
const BROWSER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'

const cases = [
  // [description, request, expected target]
  ['browser on /', req('/', { 'user-agent': CHROME, accept: BROWSER_ACCEPT }), null],
  ['browser on write-up', req('/research/es-lora', { 'user-agent': CHROME, accept: BROWSER_ACCEPT }), null],
  ['Accept: text/markdown on /', req('/', { accept: 'text/markdown' }), '/index.md'],
  ['Accept md first, html tie', req('/research/ocean-sensing', { accept: 'text/markdown, text/html, */*' }), '/research/ocean-sensing.md'],
  ['Accept html preferred over md', req('/', { accept: 'text/html, text/markdown;q=0.5' }), null],
  ['Accept md q=0', req('/', { accept: 'text/markdown;q=0, text/html' }), null],
  ['*/* alone', req('/', { accept: '*/*' }), null],
  ['ClaudeBot on /', req('/', { 'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)' }), '/index.md'],
  ['Claude-User', req('/beri', { 'user-agent': 'Claude-User/1.0' }), '/beri.md'],
  ['ChatGPT-User', req('/research/activation-steering', { 'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot' }), '/research/activation-steering.md'],
  ['GPTBot', req('/', { 'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot' }), '/index.md'],
  ['PerplexityBot', req('/', { 'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)' }), '/index.md'],
  ['MistralAI-User', req('/', { 'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; MistralAI-User/1.0; +https://docs.mistral.ai/robots)' }), '/index.md'],
  ['meta-externalagent lower/upper', req('/', { 'user-agent': 'Meta-ExternalAgent/1.1' }), '/index.md'],
  ['trailing slash', req('/research/es-lora/', { 'user-agent': 'ClaudeBot' }), '/research/es-lora.md'],
  ['Googlebot keeps HTML', req('/', { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }), null],
  ['Googlebot keeps HTML even with md Accept', req('/', { 'user-agent': 'Googlebot/2.1', accept: 'text/markdown' }), null],
  ['Bingbot keeps HTML', req('/', { 'user-agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' }), null],
  ['Applebot keeps HTML', req('/', { 'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 (Applebot/0.1)' }), null],
  ['POST ignored', req('/', { 'user-agent': 'ClaudeBot' }, 'POST'), null],
  ['HEAD rewritten', req('/', { 'user-agent': 'ClaudeBot' }, 'HEAD'), '/index.md'],
  ['asset untouched', req('/assets/index-abc.js', { 'user-agent': 'ClaudeBot' }), null],
  ['lab untouched', req('/lab/main', { 'user-agent': 'ClaudeBot' }), null],
  ['resume untouched', req('/resume.pdf', { accept: 'text/markdown' }), null],
  ['nested research untouched', req('/research/a/b', { 'user-agent': 'ClaudeBot' }), null],
]

let fail = 0
for (const [name, r, want] of cases) {
  const got = markdownTarget(r)
  const ok = got === want
  if (!ok) fail++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got}${ok ? '' : ` (want ${want})`}`)
}

// Response shape
const md = middleware(req('/', { accept: 'text/markdown' }))
assert.equal(md.headers.get('x-middleware-rewrite'), `${BASE}/index.md`)
assert.equal(md.headers.get('content-type'), 'text/markdown; charset=utf-8')
assert.equal(md.headers.get('vary'), 'Accept, User-Agent')
assert.equal(md.headers.get('link'), `<${BASE}/>; rel="canonical"`)
assert.equal(md.headers.get('x-middleware-next'), null)
const html = middleware(req('/', { 'user-agent': CHROME, accept: BROWSER_ACCEPT }))
assert.equal(html.headers.get('x-middleware-next'), '1')
assert.equal(html.headers.get('x-middleware-rewrite'), null)
assert.equal(html.headers.get('vary'), 'Accept, User-Agent')
const rs = middleware(req('/research/es-lora/', { 'user-agent': 'ClaudeBot' }))
assert.equal(rs.headers.get('link'), `<${BASE}/research/es-lora>; rel="canonical"`)
console.log('ok   response headers')

if (fail) {
  console.error(`${fail} case(s) failed`)
  process.exit(1)
}
console.log(`all ${cases.length} cases passed`)
