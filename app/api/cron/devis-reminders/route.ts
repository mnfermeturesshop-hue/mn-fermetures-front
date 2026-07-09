import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { escapeHtml } from '@/lib/security/escapeHtml';

export const dynamic = 'force-dynamic';

const euro = (n: number) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

interface ReminderDevis {
  devis_number: string;
  email: string;
  customer_name: string | null;
  total_ht: number;
  valid_until: string;
}

/**
 * Cron quotidien (vercel.json) : envoie les rappels de devis arrivés à
 * échéance (opt-in client, programmés à J+15 via /api/devis/[number]/reminder).
 * Protégé par CRON_SECRET — Vercel Cron l'envoie automatiquement en
 * Authorization: Bearer. Idempotent : un devis rappelé est marqué
 * reminder_sent_at et ne repart jamais deux fois.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Devis à rappeler : échéance atteinte, jamais envoyé, toujours actifs
  // (un devis converti ou expiré entre-temps n'est pas rappelé)
  const { data: dueList, error } = await admin
    .from('devis')
    .select('devis_number, email, customer_name, total_ht, valid_until')
    .lte('reminder_at', nowIso)
    .is('reminder_sent_at', null)
    .eq('status', 'draft')
    .gt('valid_until', nowIso);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mn-fermetures-front.vercel.app';

  let sent = 0;
  for (const d of (dueList ?? []) as ReminderDevis[]) {
    if (gmailUser && gmailPass && d.email) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: gmailUser, pass: gmailPass },
      });
      const validDate = new Date(d.valid_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      try {
        await transporter.sendMail({
          from: `MN Fermetures <${gmailUser}>`,
          to: d.email,
          subject: `⏰ Rappel — votre devis ${d.devis_number} vous attend`,
          html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:22px 28px;border-radius:8px 8px 0 0;">
    <div style="font-size:19px;font-weight:700;color:#fff;">MN FERMETURES</div>
    <div style="font-size:13px;color:#93c5fd;margin-top:4px;">Rappel programmé sur votre devis</div>
  </div>
  <div style="background:#fff;padding:26px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 12px;">Bonjour${d.customer_name ? ' ' + escapeHtml(d.customer_name) : ''},</p>
    <p style="margin:0 0 12px;">Vous aviez programmé un rappel sur votre devis
      <strong style="font-family:monospace;">${escapeHtml(d.devis_number)}</strong>
      ${Number(d.total_ht) > 0 ? `(<strong>${euro(Number(d.total_ht))} HT</strong>)` : ''} —
      il est valable jusqu'au <strong>${validDate}</strong>.</p>
    <p style="margin:0 0 18px;color:#4b5563;">C'est le moment de le transformer en bon de commande,
      ou de relancer votre client final avant son expiration.</p>
    <div style="text-align:center;">
      <a href="${siteUrl}/compte" style="background:#10314f;color:#fff;text-decoration:none;padding:12px 26px;border-radius:6px;font-weight:600;font-size:14px;display:inline-block;">
        Voir mon devis →
      </a>
    </div>
    <p style="margin:18px 0 0;font-size:12px;color:#9ca3af;">Une question ? 04 67 78 06 63 · Du lun. au ven. 8h–17h</p>
  </div>
</div>`,
        });
      } catch (err) {
        console.error(`[cron/devis-reminders] envoi ${d.devis_number}:`, err);
        continue; // ne pas marquer envoyé → retentera demain
      }
    }

    const { error: upErr } = await admin
      .from('devis')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('devis_number', d.devis_number);
    if (!upErr) sent++;
  }

  return NextResponse.json({ sent, due: (dueList ?? []).length });
}
