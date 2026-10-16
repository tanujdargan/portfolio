// Writes the agent-facing docs after the prerender: dist/llms.txt, dist/llms-full.txt, dist/index.md,
// dist/research/<slug>.md and dist/beri.md. Facts come from the same modules the HTML is rendered from
// (src/content/site.ts, src/variants/main/content.ts, src/content/flags.ts), bundled here with esbuild, so the
// markdown cannot drift from the site. The few resume-only facts the site doesn't carry are in RESUME below.
// middleware.ts serves these files to AI agents (Accept: text/markdown, or a known agent user agent).
import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')

const bundle = await build({
  stdin: {
    contents: `
      export { person, links, research, experience, beri } from './src/content/site'
      export { thesis, context, proofs, selected, amazonMetrics, more, education } from './src/variants/main/content'
      export { contentFlags } from './src/content/flags'
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
})
const C = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
const { person, links, research, experience, beri, thesis, context, proofs, selected, amazonMetrics, more, education, contentFlags } = C

const SITE = person.site.replace(/\/$/, '')
const abs = (href) => (href.startsWith('http') ? href : `${SITE}${href}`)
const RESUME_URL = abs(links.resume.href)

// public/resume.pdf (Aug 19 2026): facts the site's content modules don't carry. Phone number deliberately omitted.
const RESUME = {
  date: 'Aug 19 2026',
  coursework: 'Quantum Computing, Computer Architecture, Numerical Analysis, Communications & Networks',
  optimate: 'Sep 2025. AI underwriting dashboard (Next.js, Cohere LLMs, AWS DynamoDB). Won 2 prizes out of 300+ teams: YC Unicorn Prize and Federato Best RiskOps. The Federato CEO validated 40% faster review cycles and 15% fewer underwriting errors versus manual workflows.',
  aimo: 'Kaggle, Nov 2024 – Mar 2025. Silver medal, top 10% of 2,200 teams, 54% accuracy (finishing score 27). Multi-stage LLM pipelines with fine-tuned open-weight models, NeMo-Skills reasoning strategies and in-context-learning ablations.',
}

// Per-write-up framing the HTML carries in its copy and demos.
const NOTES = {
  'activation-steering': 'Scope: the results below come from a replication of the method on Qwen2.5-1.5B-Instruct, run for this site. They are not the numbers from his main steering project.',
  'ocean-sensing': 'Scope: the interactive ocean demo on the web page is illustrative. The only measured result is R² = 0.936.',
  'es-lora': 'Status: the LoRA adapter is published on Hugging Face. Accuracy numbers are not published yet.',
}
const whereFix = { steering: 'Method replicated on Qwen2.5-1.5B-Instruct for this site' }

// Plain apostrophes; and the HTML's "(the demo above)" has no demo above it in markdown.
const md = (s) => s.replace(/’/g, "'").replace('run for this page (the demo above)', 'run for this site (the live demo is on the web page)')
const updated = new Date().toISOString().slice(0, 10)
const front = (title, description, url) =>
  `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\ncanonical: ${url}\nresume: ${RESUME_URL}\nupdated: ${updated}\n---\n\n`

const contactLines = [
  `- Email: ${person.email}`,
  `- Resume (PDF, ${RESUME.date}): ${RESUME_URL}`,
  `- GitHub: ${links.github.href}`,
  `- LinkedIn: ${links.linkedin.href}`,
  `- X: ${links.x.href}`,
  `- Website: ${SITE}/`,
]

// ---------- research/<slug>.md ----------
function researchDoc(r, { frontmatter = true } = {}) {
  const url = `${SITE}/research/${r.slug}`
  const out = []
  if (frontmatter) out.push(front(`${r.title} — ${person.name}`, r.question, url).trimEnd(), '')
  out.push(`# ${r.title}`, '')
  out.push(`- Author: ${person.name} (${SITE}/)`)
  out.push(`- Where: ${r.slug === 'activation-steering' ? whereFix.steering : r.where}`)
  out.push(`- When: ${r.when}`)
  out.push(`- Tags: ${r.tags.join(', ')}`)
  out.push(`- Web page (with live demo): ${url}`)
  if (NOTES[r.slug]) out.push('', `> ${NOTES[r.slug]}`)
  out.push('', '## Question', '', r.question, '', '## Method', '', ...r.method.map((m) => `- ${m}`))
  out.push('', '## Results', '', ...r.result.map((m) => `- ${m}`))
  if (r.next?.length) out.push('', '## Next', '', ...r.next.map((m) => `- ${m}`))
  if (r.links?.length) out.push('', '## Links', '', ...r.links.map((l) => `- [${l.label}](${abs(l.href)})`))
  out.push('', '---', '', `Profile: ${SITE}/index.md · Resume: ${RESUME_URL} · All write-ups: ${SITE}/llms.txt`)
  return md(out.join('\n')) + '\n'
}

// ---------- index.md ----------
function profileDoc({ frontmatter = true } = {}) {
  const out = []
  const desc = `${thesis} ${context}`
  if (frontmatter) out.push(front(`${person.name} — ML systems and interpretability`, desc, `${SITE}/`).trimEnd(), '')
  out.push(`# ${person.name}`, '')
  out.push(`> ${thesis} ${context}`, '')
  out.push(`Based in ${person.location.replace(' · ', ' and ')}. Resume (PDF, ${RESUME.date}, source of truth): ${RESUME_URL}`)

  out.push('', '## At a glance', '')
  for (const p of proofs) out.push(`- **${p.org}**: ${p.line}`)

  out.push('', '## Selected work', '')
  for (const s of selected) {
    const where = whereFix[s.id] ?? s.where
    out.push(`### ${s.title}`, '')
    out.push(`- Where: ${where}`, `- When: ${s.when}`, `- Result: ${s.result}`)
    out.push(`- Finding: ${s.finding}`)
    if (s.id === 'amazon') out.push(`- Metrics: ${amazonMetrics.map((m) => `${m.n} ${m.l}`).join('; ')}`)
    if (s.id === 'ocean') out.push('- Note: the ocean demo on the site is illustrative; only R² 0.936 is a measured result.')
    if (s.id === 'steering') out.push('- Note: these numbers come from a replication run for this site, not from his main project.')
    if (s.slug) out.push(`- Write-up: ${SITE}/research/${s.slug}.md (web: ${SITE}/research/${s.slug})`)
    out.push('')
  }

  out.push('## Experience', '')
  for (const e of experience) {
    out.push(`### ${e.role}, ${e.org}`, '', `- When: ${e.when}`, `- Where: ${e.where}`, `- Summary: ${e.line}`, ...e.bullets.map((b) => `- ${b}`), '')
  }

  out.push('## Education', '')
  out.push(`- ${education.school}: ${education.degree}. Graduating ${education.when}. ${education.note}.`)
  out.push(`- Relevant coursework: ${RESUME.coursework}`)

  out.push('', '## More work', '')
  for (const m of more) {
    let line = m.line
    if (m.title.startsWith('Optimate')) line = RESUME.optimate
    if (m.title.startsWith('AIMO')) line = RESUME.aimo
    const href = m.href ? ` ${m.href.startsWith('/research/') ? `${abs(m.href)}.md` : abs(m.href)}` : ''
    out.push(`- **${m.title}**: ${line}${href}`)
  }

  out.push('', '## Research write-ups', '')
  for (const r of research) out.push(`- [${r.title}](${SITE}/research/${r.slug}.md): ${r.short} (${r.when})`)

  out.push('', '## Contact and links', '', ...contactLines)
  out.push('', '---', '', `Machine-readable index: ${SITE}/llms.txt · Everything in one file: ${SITE}/llms-full.txt`)
  return md(out.join('\n')) + '\n'
}

// ---------- beri.md ----------
function beriDoc() {
  const url = `${SITE}/beri`
  const out = [
    front(`Beri — ${person.name}`, beri.oneLiner, url).trimEnd(),
    '',
    '# Beri',
    '',
    `> ${beri.oneLiner}`,
    '',
    `- ${beri.role}`,
    `- Stack: ${beri.stack.join(', ')}`,
    `- Site: ${beri.url}`,
    `- Web page: ${url}`,
    '',
    '---',
    '',
    `Profile: ${SITE}/index.md · Resume: ${RESUME_URL}`,
  ]
  return md(out.join('\n')) + '\n'
}

// ---------- llms.txt ----------
function llmsTxt() {
  const out = [
    `# ${person.name}`,
    '',
    `> ${thesis} ${context} SDE intern at Amazon Robotics (LLM planning assistant in production across 180+ fulfillment sites, return offer), MarmotSat onboard-computer firmware lead (in orbit), and interpretability research.`,
    '',
    `Every page on ${SITE} has a markdown twin: append .md (the home page is /index.md), or request the page with \`Accept: text/markdown\`. The resume PDF is the source of truth.`,
    '',
    '## Profile',
    '',
    `- [Full profile](${SITE}/index.md): who he is, proof points, selected work with findings, experience, education, more work, contact`,
    `- [Resume (PDF, ${RESUME.date})](${RESUME_URL}): one page, source of truth`,
    '',
    '## Research write-ups',
    '',
    ...research.map((r) => `- [${r.title}](${SITE}/research/${r.slug}.md): ${r.short}. ${r.slug === 'activation-steering' ? whereFix.steering : r.where.replace(' · ', ', ')}, ${r.when}`),
    '',
    '## Optional',
    '',
    `- [Everything in one file](${SITE}/llms-full.txt): profile plus every write-up`,
    ...(contentFlags.beri ? [`- [Beri](${SITE}/beri.md): ${beri.oneLiner}`] : []),
    `- [GitHub](${links.github.href})`,
    `- [LinkedIn](${links.linkedin.href})`,
    `- [X](${links.x.href})`,
  ]
  return md(out.join('\n')) + '\n'
}

function llmsFull() {
  const parts = [profileDoc({ frontmatter: false }), ...research.map((r) => researchDoc(r, { frontmatter: false }).replace(/^# /m, `# Write-up: `))]
  if (contentFlags.beri) parts.push(beriDoc().replace(/^---[\s\S]*?---\n\n/, ''))
  return parts.join('\n\n')
}

// ---------- write + guard ----------
const files = {
  'llms.txt': llmsTxt(),
  'llms-full.txt': llmsFull(),
  'index.md': profileDoc(),
  ...Object.fromEntries(research.map((r) => [`research/${r.slug}.md`, researchDoc(r)])),
  ...(contentFlags.beri ? { 'beri.md': beriDoc() } : {}),
}
// Things the site deliberately leaves out (REQUIREMENTS.md §3). Fail the build rather than leak them.
const banned = [/homelab/i, /parameter golf/i, /\bhive\b/i, /\bDrop\b/, /wedding studio/i, /jbcnosh/i, /founder/i, /\d{3}-\d{3}-\d{4}/]
for (const [name, text] of Object.entries(files)) {
  const hit = banned.find((re) => re.test(text))
  if (hit) throw new Error(`agent-docs: ${name} matches excluded pattern ${hit}`)
  const file = path.join(dist, name)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, text)
}
// index.html (the shared template) links /index.md as the markdown alternate; point each prerendered page at its own twin.
const ALT = '<link rel="alternate" type="text/markdown" href="/index.md"'
const pages = [...research.map((r) => [`research/${r.slug}.html`, `/research/${r.slug}.md`]), ...(contentFlags.beri ? [['beri.html', '/beri.md']] : [])]
for (const [html, twin] of pages) {
  const file = path.join(dist, html)
  if (!existsSync(file)) continue
  const text = readFileSync(file, 'utf8')
  if (text.includes(ALT)) writeFileSync(file, text.replace(ALT, ALT.replace('/index.md', twin)))
}
console.log(`agent docs: ${Object.keys(files).join(', ')}`)
