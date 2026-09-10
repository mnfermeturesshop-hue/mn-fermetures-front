import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { rateLimit, clientIp } from '@/lib/security/rateLimit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { escapeHtml } from '@/lib/security/escapeHtml';

interface ContactPayload {
  audience: 'pro' | 'particulier';
  company?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  turnstileToken?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Formulaire de contact du site vitrine (pro / particulier).
 * Anti-abus (rate-limit IP) + anti-robot (Turnstile) comme /api/pro-request.
 * Notifie l'équipe MN par email (CONTACT_BC_EMAIL, sinon le compte Gmail).
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`contact:${ip}`)) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez dans une minute.' }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<ContactPayload>;
  const audience = body.audience === 'particulier' ? 'particulier' : 'pro';
  const company = (body.company ?? '').trim();
  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const message = (body.message ?? '').trim();

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Merci de renseigner votre nom, votre email et un message.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message trop long (5000 caractères max).' }, { status: 400 });
  }
  if (!(await verifyTurnstile(body.turnstileToken ?? '', ip))) {
    return NextResponse.json({ error: 'Vérification anti-robot échouée. Réessayez.' }, { status: 400 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.CONTACT_BC_EMAIL ?? gmailUser ?? '';

  if (gmailUser && gmailPass && to) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
    const label = audience === 'pro' ? 'Professionnel' : 'Particulier';
    try {
      await transporter.sendMail({
        from: `MN Fermetures <${gmailUser}>`,
        to,
        replyTo: email,
        subject: `Contact ${label} — ${company || name}`,
        html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:24px 28px;border-radius:8px 8px 0 0;">
    <div style="font-size:20px;font-weight:700;color:#fff;">MN FERMETURES</div>
    <div style="font-size:13px;color:#93c5fd;margin-top:4px;">Nouveau message via le formulaire de contact (${escapeHtml(label)})</div>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:18px;">
      ${company ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Entreprise</td><td><strong>${escapeHtml(company)}</strong></td></tr>` : ''}
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Contact</td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Email</td><td><a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a></td></tr>
      ${phone ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Téléphone</td><td>${escapeHtml(phone)}</td></tr>` : ''}
    </table>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;white-space:pre-line;font-size:14px;color:#1f2937;">${escapeHtml(message)}</div>
  </div>
</div>`,
      });
    } catch (err) {
      console.error('[contact] Gmail SMTP error:', err);
    }
  } else {
    console.warn('[contact] SMTP non configuré — message reçu de', email, `(${audience})`);
  }

  return NextResponse.json({ ok: true });
}
