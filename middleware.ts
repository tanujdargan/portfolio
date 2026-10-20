// Vercel Routing Middleware: AI agents get the page's markdown twin, people get the HTML.
//
// A page request is rewritten to its twin (/ → /index.md, /research/x → /research/x.md, /beri → /beri.md) when
//   1. the Accept header prefers text/markdown over text/html (content negotiation, as Cloudflare's
//      "Markdown for Agents" and Vercel's docs do), or
//   2. the user agent is a known AI crawler or AI fetcher (AGENT_UA below).
// Search engines (Googlebot, Bingbot and friends) always get the HTML. The twins are generated at build time by
// scripts/agent-docs.mjs from the same content modules as the HTML, so both carry the same facts.
// Only the page routes in `config.matcher` invoke this; assets, /lab/* and everything else never do.
//
// No dependency on @vercel/functions: rewrite() and next() there only set these two headers on an empty Response.

export const config = {
  matcher: ['/', '/research/:slug', '/beri'],
  runtime: 'nodejs',
}

/** AI training crawlers, AI search indexers and user-triggered AI fetchers (checked Oct 2026 against the
 *  operators' docs where they publish them). Google-Extended and Applebot-Extended are robots.txt tokens rather
 *  than real user agents; they are listed so a client that does send them is still matched. */
export const AGENT_UA = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', // OpenAI
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'Claude-Web', 'anthropic-ai', // Anthropic (last two legacy)
  'PerplexityBot', 'Perplexity-User', // Perplexity
  'Google-Extended', 'Applebot-Extended', // robots tokens (see above)
  'Bytespider', // ByteDance
  'CCBot', // Common Crawl
  'meta-externalagent', 'meta-externalfetcher', // Meta
  'Amazonbot', // Amazon
  'cohere-ai', 'cohere-training-data-crawler', // Cohere
  'DuckAssistBot', // DuckDuckGo AI answers
  'MistralAI-User', 'MistralAI-Index', // Mistral
  'YouBot', // You.com
]
/** Classic search engines keep the HTML even if they match something above. */
export const SEARCH_UA = ['Googlebot', 'Google-InspectionTool', 'Bingbot', 'BingPreview', 'AdIdxBot', 'Applebot/', 'DuckDuckBot', 'YandexBot', 'Baiduspider', 'Slurp']

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const agentRe = new RegExp(AGENT_UA.map(esc).join('|'), 'i')
const searchRe = new RegExp(SEARCH_UA.map(esc).join('|'), 'i')

export const VARY = 'Accept, User-Agent'

/** q-value of the best match for `types` in an Accept header (0 if absent). */
function q(accept: string, types: string[]): number {
  let best = 0
  for (const part of accept.split(',')) {
    const [type, ...params] = part.trim().toLowerCase().split(';')
    if (!types.includes(type.trim())) continue
    const qp = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
    const v = qp ? Number(qp.slice(2)) : 1
    if (Number.isFinite(v) && v > best) best = v
  }
  return best
}

/** True when the client explicitly asks for markdown at least as strongly as HTML. Browsers never list
 *  text/markdown, so they never match; `*\/*` alone doesn't count. */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false
  const md = q(accept, ['text/markdown', 'text/x-markdown'])
  return md > 0 && md >= q(accept, ['text/html', 'application/xhtml+xml'])
}

export function isAgent(ua: string | null): boolean {
  if (!ua || searchRe.test(ua)) return false
  return agentRe.test(ua)
}

export function isSearchEngine(ua: string | null): boolean {
  return !!ua && searchRe.test(ua)
}

/** Markdown twin for a page path, or null if the path isn't a page with a twin. */
export function twinFor(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/') return '/index.md'
  if (p === '/beri') return '/beri.md'
  const m = p.match(/^\/research\/([a-z0-9-]+)$/)
  return m ? `/research/${m[1]}.md` : null
}

/** The rewrite target for this request, or null to serve the HTML. Exported for scripts/agent-docs.test.mjs. */
export function markdownTarget(request: Request): string | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null
  const ua = request.headers.get('user-agent')
  if (isSearchEngine(ua)) return null
  if (!prefersMarkdown(request.headers.get('accept')) && !isAgent(ua)) return null
  return twinFor(new URL(request.url).pathname)
}

export default function middleware(request: Request): Response {
  const url = new URL(request.url)
  const target = markdownTarget(request)
  if (target) {
    const canonical = `${url.origin}${url.pathname.replace(/\/+$/, '') || '/'}`
    return new Response(null, {
      headers: {
        'x-middleware-rewrite': new URL(target, url).toString(),
        'Content-Type': 'text/markdown; charset=utf-8',
        Vary: VARY,
        // The HTML page stays the canonical URL for search engines; the markdown is an alternate representation.
        Link: `<${canonical}>; rel="canonical"`,
        'X-Content-Source': 'markdown-twin',
      },
    })
  }
  // People (and search engines) get the HTML. Vary tells shared caches the response depends on these headers.
  return new Response(null, { headers: { 'x-middleware-next': '1', Vary: VARY } })
}
