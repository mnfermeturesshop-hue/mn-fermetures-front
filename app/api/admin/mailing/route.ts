import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStaff, getCommercialClientIds } from '@/lib/auth/guards';
import { rateLimit } from '@/lib/security/rateLimit';
import { escapeHtml } from '@/lib/security/escapeHtml';
import { unsubscribeSig } from '@/lib/security/unsubscribe';

/**
 * Mailings commerciaux — un commercial n'écrit qu'à SES clients assignés,
 * l'admin à tous les clients pro. Envoi via le Gmail MN (Reply-To = email de
 * l'expéditeur pour que les réponses arrivent chez le commercial), exclusion
 * automatique des désinscrits, lien de désinscription signé (HMAC),
 * historique en base. Volumes B2B faibles (limite Gmail ~500/jour).
 */

/** Historique des envois — commercial : les siens ; admin : tous. */
export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  let query = admin
    .from('mailings')
    .select('id, sender_id, sender_name, subject, recipients_count, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (guard.role === 'commercial') query = query.eq('sender_id', guard.userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;

  const { subject = '', message = '', recipientIds = [] } = await req.json() as {
    subject?: string; message?: string; recipientIds?: string[];
  };

  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();
  if (!cleanSubject || cleanSubject.length > 150) {
    return NextResponse.json({ error: 'Objet requis (150 caractères max).' }, { status: 400 });
  }
  if (!cleanMessage || cleanMessage.length > 5000) {
    return NextResponse.json({ error: 'Message requis (5000 caractères max).' }, { status: 400 });
  }
  if (!Array.isArray(recipientIds) || recipientIds.length === 0 || recipientIds.length > 200) {
    return NextResponse.json({ error: 'Sélectionnez entre 1 et 200 destinataires.' }, { status: 400 });
  }
  if (!rateLimit(`mailing:${guard.userId}`, 3, 10 * 60_000)) {
    return NextResponse.json({ error: 'Limite atteinte : 3 mailings par 10 minutes.' }, { status: 429 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Envoi d\'emails non configuré (GMAIL_USER).' }, { status: 500 });
  }

  const admin = createAdminClient();

  // ── Périmètre : le commercial n'écrit qu'à SES clients ──
  const uniqueIds = [...new Set(recipientIds)];
  if (guard.role === 'commercial') {
    const allowed = await getCommercialClientIds(guard.userId);
    if (uniqueIds.some((id) => !allowed.has(id))) {
      return NextResponse.json({ error: 'Certains destinataires ne sont pas vos clients.' }, { status: 403 });
    }
  }

  // Profils destinataires : clients b2b uniquement + exclusion des désinscrits
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, company, email_optout')
    .in('id', uniqueIds)
    .eq('role', 'b2b');
  const targets = (profiles ?? []).filter((p) => !p.email_optout);
  const skippedOptout = uniqueIds.length - targets.length;
  if (targets.length === 0) {
    return NextResponse.json({ error: 'Aucun destinataire valide (désinscrits ou non-clients).' }, { status: 400 });
  }

  // Emails des destinataires + identité de l'expéditeur
  const [{ data: { users } }, { data: senderProfile }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('profiles').select('name').eq('id', guard.userId).single(),
  ]);
  const emailById = new Map(users.map((u) => [u.id, u.email ?? '']));
  const senderName = senderProfile?.name || 'L\'équipe MN Fermetures';

  const serverClient = createClient();
  const { data: { user: sessionUser } } = await serverClient.auth.getUser();
  const replyTo = sessionUser?.email ?? gmailUser;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mn-fermetures-front.vercel.app';
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });

  let sent = 0;
  let failed = 0;
  for (const p of targets) {
    const to = emailById.get(p.id);
    if (!to) { failed++; continue; }

    // Personnalisation {nom} / {entreprise}, puis échappement et sauts de ligne
    const personalized = cleanMessage
      .replaceAll('{nom}', p.name ?? '')
      .replaceAll('{entreprise}', p.company || p.name || '');
    const bodyHtml = escapeHtml(personalized).replace(/\n/g, '<br>');
    const unsubUrl = `${siteUrl}/api/mailing/unsubscribe?uid=${p.id}&sig=${unsubscribeSig(p.id)}`;

    try {
      await transporter.sendMail({
        from: `MN Fermetures <${gmailUser}>`,
        replyTo,
        to,
        subject: cleanSubject,
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:22px 28px;border-radius:8px 8px 0 0;">
    <div style="font-size:19px;font-weight:700;color:#fff;">MN FERMETURES</div>
  </div>
  <div style="background:#fff;padding:26px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <div style="font-size:14px;line-height:1.7;">${bodyHtml}</div>
    <p style="margin:22px 0 0;font-size:13px;color:#4b5563;">${escapeHtml(senderName)}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0 12px;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">
      Vous recevez cet email de votre ${guard.role === 'commercial' ? 'commercial' : 'fournisseur'} MN Fermetures
      · 04 67 78 06 63 ·
      <a href="${unsubUrl}" style="color:#9ca3af;">Ne plus recevoir ces emails</a>
    </p>
  </div>
</div>`,
      });
      sent++;
    } catch (err) {
      console.error('[mailing] envoi échoué:', err);
      failed++;
    }
  }

  // Historique
  await admin.from('mailings').insert({
    sender_id: guard.userId,
    sender_name: senderName,
    subject: cleanSubject,
    body: cleanMessage,
    recipients_count: sent,
  });

  return NextResponse.json({ sent, skippedOptout, failed });
}
