// Self-check for api/contact.ts: node scripts/contact-check.mjs (Node 23+ strips the TS types).
import assert from 'node:assert'
const { POST } = await import('../api/contact.ts')
const req = (b) => new Request('http://x/api/contact', { method: 'POST', body: typeof b === 'string' ? b : JSON.stringify(b) })
const good = { name: 'A', email: 'a@b.co', message: 'hi' }
assert.equal((await POST(req('nope'))).status, 400)
assert.equal((await POST(req({ ...good, email: 'bad' }))).status, 400)
assert.equal((await POST(req({ ...good, message: '' }))).status, 400)
assert.equal((await POST(req({ ...good, company: 'spam' }))).status, 200)
delete process.env.RESEND_API_KEY
assert.equal((await POST(req(good))).status, 503)
let sent; globalThis.fetch = async (u, o) => { sent = JSON.parse(o.body); return new Response('{}', { status: 200 }) }
process.env.RESEND_API_KEY = 'k'
assert.equal((await POST(req({ ...good, name: 'Eve\r\nBcc: x' }))).status, 200)
assert.ok(!/[\r\n]/.test(sent.subject)); assert.equal(sent.reply_to, 'a@b.co')
console.log('ok')
