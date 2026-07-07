// Vercel Serverless Function: POST /api/contact
// Sends contact-form submissions via Resend's REST API (no npm dependency —
// uses the Node 18+ global fetch available on Vercel's runtime).
//
// Required environment variables (set these in the Vercel dashboard, never in code):
//   RESEND_API_KEY    - your Resend API key (starts with "re_")
//   CONTACT_TO_EMAIL  - where submissions are delivered (e.g. sales@orrisoverseas.com)
// Optional:
//   CONTACT_FROM_EMAIL - verified sender. Until you verify orrisoverseas.com in
//                        Resend, you can use "onboarding@resend.dev" for testing.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Vercel auto-parses JSON bodies, but be defensive.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const message = String(body.message || '').trim();
  const honeypot = String(body._gotcha || '').trim();
  const sourcePage = String(body.page || '').trim();

  // Honeypot: real users never fill this hidden field. Bots often do — drop silently.
  if (honeypot) return res.status(200).json({ ok: true });

  // Minimal validation.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk || !message) {
    return res.status(400).json({ ok: false, error: 'A valid email and a message are required.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey || !to) {
    // Misconfiguration — log server-side, return a generic error to the client.
    console.error('Contact form not configured: RESEND_API_KEY and/or CONTACT_TO_EMAIL missing.');
    return res.status(500).json({ ok: false, error: 'Contact form is not configured yet.' });
  }

  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const html =
    `<h2>New contact enquiry — orrisoverseas.com</h2>` +
    `<p><strong>Name:</strong> ${esc(name) || '(not provided)'}</p>` +
    `<p><strong>Email:</strong> ${esc(email)}</p>` +
    `<p><strong>Phone:</strong> ${esc(phone) || '(not provided)'}</p>` +
    (sourcePage ? `<p><strong>Page:</strong> ${esc(sourcePage)}</p>` : '') +
    `<p><strong>Message:</strong></p><p>${esc(message).replace(/\n/g, '<br>')}</p>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Orris Overseas Website <${from}>`,
        to: [to],
        reply_to: email,
        subject: `Website enquiry${name ? ' from ' + name : ''}`,
        html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error('Resend error:', resp.status, detail);
      return res.status(502).json({ ok: false, error: 'Could not send your message. Please try again later.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact send failed:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again later.' });
  }
};
