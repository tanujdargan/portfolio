// Contact form → email via Resend's REST API (no SDK; one fetch).
// Env: RESEND_API_KEY (set by the Vercel Marketplace Resend integration).
// Optional: CONTACT_FROM (a sender on a domain verified in Resend; the default only delivers to the Resend account's
// own address) and CONTACT_TO.
// ponytail: no rate limit beyond the honeypot; add Vercel BotID or a firewall rule if spam shows up.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 })
  }
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const message = String(body.message ?? '').trim()

  // Honeypot: a hidden field people never fill. Pretend success so bots move on.
  if (body.company) return Response.json({ ok: true })
  if (!name || name.length > 100) return Response.json({ error: 'Please add your name.' }, { status: 400 })
  if (!EMAIL.test(email) || email.length > 200) return Response.json({ error: 'That email doesn’t look right.' }, { status: 400 })
  if (!message || message.length > 5000) return Response.json({ error: 'Please write a message (under 5,000 characters).' }, { status: 400 })

  const key = process.env.RESEND_API_KEY
  if (!key) return Response.json({ error: 'The form isn’t set up yet. Email tanujd@uvic.ca instead.' }, { status: 503 })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || 'Portfolio <onboarding@resend.dev>',
      to: [process.env.CONTACT_TO || 'tanujd@uvic.ca'],
      reply_to: email,
      subject: `Portfolio: message from ${name.replace(/[\r\n]+/g, ' ')}`,
      text: `${message}\n\n${name} <${email}>`,
    }),
  })
  if (!res.ok) {
    console.error('resend', res.status, await res.text())
    return Response.json({ error: 'Couldn’t send just now. Email tanujd@uvic.ca instead.' }, { status: 502 })
  }
  return Response.json({ ok: true })
}
