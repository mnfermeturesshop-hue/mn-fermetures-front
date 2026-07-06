import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { escapeHtml } from '@/lib/security/escapeHtml';

interface DevisRecord {
  user_id: string | null;
  devis_number: string;
  customer_name: string | null;
  company: string | null;
  email: string;
  total_ht: number;
  status: string;
  source: string;
  valid_until: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    console.warn('[devis/convert] GMAIL_USER ou GMAIL_APP_PASSWORD manquant — email non envoyé');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });
  try {
    await transporter.sendMail({ from: `MN Fermetures <${gmailUser}>`, to, subject, html });
  } catch (err) {
    console.error('[devis/convert] Gmail SMTP error:', err);
  }
}

const euro = (n: number) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

/**
 * Conversion d'un devis ERP en bon de commande : le client accepte le devis.
 * Le devis passe en `converted` et l'équipe MN est notifiée par email — le
 * traitement de la commande se fait dans l'ERP (le détail est dans le PDF).
 * Réservé au propriétaire du devis (session serveur).
 */
export async function POST(_req: NextRequest, { params }: { params: { number: string } }) {
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const admin = createAdminClient();
  const { data: devis, error } = await admin
    .from('devis')
    .select('user_id, devis_number, customer_name, company, email, total_ht, status, source, valid_until')
    .eq('devis_number', params.number)
    .single<DevisRecord>();

  if (error || !devis) {
    return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
  }
  if (devis.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }
  if (devis.status === 'converted') {
    return NextResponse.json({ error: 'Ce devis a déjà été converti.' }, { status: 409 });
  }
  if (new Date(devis.valid_until) < new Date()) {
    return NextResponse.json({ error: 'Ce devis a expiré — contactez votre commercial.' }, { status: 409 });
  }

  const { error: upErr } = await admin
    .from('devis')
    .update({ status: 'converted' })
    .eq('devis_number', params.number);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const clientLabel = [devis.customer_name, devis.company].filter(Boolean).join(' — ') || devis.email;
  const totalBlock = Number(devis.total_ht) > 0
    ? `<p style="margin:0 0 12px;">Montant du devis : <strong>${euro(Number(devis.total_ht))} HT</strong></p>`
    : '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mn-fermetures-front.vercel.app';
  const hqEmail = process.env.CONTACT_BC_EMAIL ?? process.env.GMAIL_USER ?? '';

  // 1. Notification équipe MN — la commande se traite dans l'ERP
  if (hqEmail) {
    await sendEmail(
      hqEmail,
      `✅ Devis accepté : ${devis.devis_number} — ${devis.company || devis.customer_name || devis.email}`,
      `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:24px 28px;border-radius:8px 8px 0 0;">
    <div style="font-size:20px;font-weight:700;color:#fff;">MN FERMETURES</div>
    <div style="font-size:13px;color:#93c5fd;margin-top:4px;">Devis accepté par le client — bon de commande à traiter</div>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 12px;">Le client <strong>${escapeHtml(clientLabel)}</strong>
      (<a href="mailto:${encodeURIComponent(devis.email)}">${escapeHtml(devis.email)}</a>)
      vient d'accepter le devis <strong style="font-family:monospace;">${escapeHtml(devis.devis_number)}</strong>.</p>
    ${totalBlock}
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Le détail figure dans le PDF du devis (ERP). Traiter la commande dans l'ERP.</p>
    <a href="${siteUrl}/admin/devis"
       style="background:#10314f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;display:inline-block;">
      Voir dans l'admin →
    </a>
  </div>
</div>`,
    );
  }

  // 2. Confirmation client
  await sendEmail(
    devis.email,
    `Votre commande sur devis ${devis.devis_number} — MN Fermetures`,
    `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:24px 28px;border-radius:8px 8px 0 0;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#fff;">MN FERMETURES</div>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 12px;">Bonjour${devis.customer_name ? ' ' + escapeHtml(devis.customer_name) : ''},</p>
    <p style="margin:0 0 12px;">Nous avons bien reçu votre <strong>bon de commande</strong> sur le devis
      <strong style="font-family:monospace;">${escapeHtml(devis.devis_number)}</strong>.</p>
    ${totalBlock}
    <p style="margin:0 0 16px;color:#4b5563;">Notre équipe commerciale la traite et revient vers vous sous <strong>24h ouvrées</strong>
      pour confirmer les délais de fabrication et de livraison.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">Une question ? 04 67 78 06 63 · Du lun. au ven. 8h–17h</p>
  </div>
</div>`,
  );

  return NextResponse.json({ ok: true });
}
