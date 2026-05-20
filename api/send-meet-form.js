// api/send-meet-form.js
// Vercel serverless function — receives the form POST and forwards via Resend.
//
// Env vars required (set in Vercel dashboard → Settings → Environment Variables):
//   RESEND_API_KEY      — your Resend API key (re_...)
//   LEADS_TO_EMAIL      — where to deliver leads, e.g. "hello@cmgt.org"
//   LEADS_FROM_EMAIL    — verified sender on Resend, e.g. "CMGT Landing <hello@cmgt.org>"

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Basic field length cap to keep abuse manageable.
const MAX = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

// Tiny HTML-escape so submitted values can't break the email markup.
function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default async function handler(req, res) {
  // CORS — only needed if you serve the form from a different origin than the
  // API. If the form is on the same Vercel project, you can delete this block.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  // Vercel parses JSON automatically when Content-Type is application/json,
  // but guard for the rare case it arrives as a string.
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const name  = MAX(body?.name,  120);
  const email = MAX(body?.email, 200);
  const phone = MAX(body?.phone, 40);
  const role  = MAX(body?.role,  60);
  const org   = MAX(body?.org,   200);
  const notes = MAX(body?.notes, 4000);
  const source = MAX(body?.source, 80) || 'meet-cmgt-landing';

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email.' });
  }

  try {
    const result = await resend.emails.send({
      from: process.env.LEADS_FROM_EMAIL || 'CMGT Landing <hello@cmgt.org>',
      to:   [process.env.LEADS_TO_EMAIL || 'hello@cmgt.org'],
      replyTo: email,
      subject: `Meet CMGT lead — ${name}${org ? ` (${org})` : ''}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1E1E77;max-width:560px;">
          <h2 style="margin:0 0 8px;font-size:20px;">New lead from /meet-cmgt</h2>
          <p style="margin:0 0 18px;color:#666;font-size:13px;">
            Source: ${esc(source)}
          </p>
          <table style="border-collapse:collapse;font-size:14px;color:#1E1E77;">
            <tr><td style="padding:6px 12px 6px 0;color:#888;">Name</td><td style="padding:6px 0;"><b>${esc(name)}</b></td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888;">Role</td><td style="padding:6px 0;">${esc(role) || '—'}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888;">Email</td><td style="padding:6px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888;">Phone</td><td style="padding:6px 0;">${esc(phone) || '—'}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888;">Community</td><td style="padding:6px 0;">${esc(org) || '—'}</td></tr>
          </table>
          ${notes ? `<div style="margin-top:18px;padding:14px 16px;background:#F3F8FF;border-left:3px solid #4ACF6C;border-radius:4px;white-space:pre-wrap;font-size:14px;">${esc(notes)}</div>` : ''}
          <p style="margin-top:24px;color:#999;font-size:12px;">
            Reply directly to this email to respond to ${esc(name)}.
          </p>
        </div>
      `,
      text: [
        `New lead from /meet-cmgt`,
        ``,
        `Name:      ${name}`,
        `Role:      ${role || '—'}`,
        `Email:     ${email}`,
        `Phone:     ${phone || '—'}`,
        `Community: ${org || '—'}`,
        ``,
        notes ? `Notes:\n${notes}` : '',
      ].join('\n'),
    });

    if (result.error) {
      console.error('[resend] error:', result.error);
      return res.status(502).json({ error: 'Email service rejected the request.' });
    }

    // Send confirmation email to the submitter.
    await resend.emails.send({
      from: process.env.LEADS_FROM_EMAIL || 'CMGT <notifications@cmgt.org>',
      to:   [email],
      replyTo: process.env.LEADS_TO_EMAIL || 'contact@cmgt.org',
      subject: `We got your message, ${name.split(' ')[0]} — talk soon.`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1E1E77;max-width:560px;">
          <img src="https://meet.cmgt.org/assets/logo-full-color.svg" alt="CMGT" style="height:36px;margin-bottom:28px;">
          <h2 style="margin:0 0 12px;font-size:22px;color:#1E1E77;">Thanks — talk soon.</h2>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
            Hi ${esc(name.split(' ')[0])}, we got your message and one of our Community Association Managers
            will reach out within one business day.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333;">
            No pitch, no pressure — promise. In the meantime, if you have any questions
            you can reply directly to this email or call us at
            <a href="tel:5045551234" style="color:#1E1E77;">(504) 555-1234</a>.
          </p>
          <div style="border-top:1px solid #eee;padding-top:20px;margin-top:8px;">
            <p style="margin:0;font-size:13px;color:#999;">
              CMGT · Denham Springs, LA · <a href="https://cmgt.org" style="color:#999;">cmgt.org</a>
            </p>
            <p style="margin:6px 0 0;font-size:12px;color:#bbb;">Commit. Communicate. Care.</p>
          </div>
        </div>
      `,
      text: [
        `Thanks — talk soon.`,
        ``,
        `Hi ${name.split(' ')[0]}, we got your message and one of our Community Association Managers will reach out within one business day.`,
        ``,
        `No pitch, no pressure — promise. If you have any questions, reply to this email or call us at (504) 555-1234.`,
        ``,
        `CMGT · cmgt.org · Commit. Communicate. Care.`,
      ].join('\n'),
    });

    return res.status(200).json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error('[send-meet-form] unexpected error:', err);
    return res.status(500).json({ error: 'Internal error sending email.' });
  }
}
