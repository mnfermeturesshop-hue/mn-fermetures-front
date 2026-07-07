import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommercialClientIds } from '@/lib/auth/guards';
import { rateLimit } from '@/lib/security/rateLimit';
import { escapeHtml } from '@/lib/security/escapeHtml';

/**
 * Fils de commentaires rattachés aux devis et bons de commande.
 * Accès (vérifié CÔTÉ SERVEUR, service_role) :
 *  - client   : uniquement les documents dont il est propriétaire ;
 *  - commercial : uniquement les documents de SES clients assignés ;
 *  - admin    : tous.
 * Chaque commentaire notifie l'autre partie par email (best-effort).
 */

type TargetType = 'devis' | 'order';

interface Access {
  ok: true;
  userId: string;
  role: 'client' | 'commercial' | 'admin';
  authorName: string;
  clientUserId: string | null;
  clientEmail: string | null;
}
type AccessErr = { ok: false; response: NextResponse };

async function resolveAccess(type: TargetType, number: string): Promise<Access | AccessErr> {
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }

  const admin = createAdminClient();

  // Document ciblé → propriétaire + email client (pour les notifications)
  const doc = type === 'devis'
    ? await admin.from('devis').select('user_id, email').eq('devis_number', number).single()
    : await admin.from('orders').select('user_id, email').eq('order_number', number).single();
  if (doc.error || !doc.data) {
    return { ok: false, response: NextResponse.json({ error: 'Document introuvable' }, { status: 404 }) };
  }
  const clientUserId = (doc.data.user_id as string | null) ?? null;
  const clientEmail = (doc.data.email as string | null) ?? null;

  // Rôle + nom du connecté
  const { data: profile } = await admin
    .from('profiles')
    .select('role, name, company')
    .eq('id', user.id)
    .single();

  const profileRole = profile?.role ?? 'b2c';
  if (profileRole === 'admin') {
    return { ok: true, userId: user.id, role: 'admin', authorName: profile?.name || 'MN Fermetures', clientUserId, clientEmail };
  }
  if (profileRole === 'commercial') {
    const ids = await getCommercialClientIds(user.id);
    if (!clientUserId || !ids.has(clientUserId)) {
      return { ok: false, response: NextResponse.json({ error: 'Ce document ne concerne pas vos clients.' }, { status: 403 }) };
    }
    return { ok: true, userId: user.id, role: 'commercial', authorName: profile?.name || 'Votre commercial', clientUserId, clientEmail };
  }
  // Client : propriétaire uniquement
  if (clientUserId !== user.id) {
    return { ok: false, response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
  }
  return {
    ok: true,
    userId: user.id,
    role: 'client',
    authorName: profile?.company || profile?.name || 'Client',
    clientUserId,
    clientEmail,
  };
}

function parseTarget(type: string | null, number: string | null): { type: TargetType; number: string } | null {
  if ((type !== 'devis' && type !== 'order') || !number?.trim()) return null;
  return { type, number: number.trim() };
}

export async function GET(req: NextRequest) {
  const target = parseTarget(req.nextUrl.searchParams.get('type'), req.nextUrl.searchParams.get('number'));
  if (!target) return NextResponse.json({ error: 'type et number requis' }, { status: 400 });

  const access = await resolveAccess(target.type, target.number);
  if (!access.ok) return access.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('document_comments')
    .select('id, author_id, author_role, author_name, body, created_at')
    .eq('target_type', target.type)
    .eq('target_number', target.number)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json((data ?? []).map((c) => ({
    id: c.id,
    authorRole: c.author_role,
    authorName: c.author_name,
    body: c.body,
    createdAt: c.created_at,
    mine: c.author_id === access.userId,
  })));
}

async function sendEmail(to: string, subject: string, html: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass || !to) return;
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });
  try {
    await transporter.sendMail({ from: `MN Fermetures <${gmailUser}>`, to, subject, html });
  } catch (err) {
    console.error('[comments] Gmail SMTP error:', err);
  }
}

export async function POST(req: NextRequest) {
  const payload = await req.json() as { type?: string; number?: string; body?: string };
  const target = parseTarget(payload.type ?? null, payload.number ?? null);
  if (!target) return NextResponse.json({ error: 'type et number requis' }, { status: 400 });

  const body = (payload.body ?? '').trim();
  if (!body) return NextResponse.json({ error: 'Message vide.' }, { status: 400 });
  if (body.length > 2000) return NextResponse.json({ error: 'Message trop long (2000 caractères max).' }, { status: 400 });

  const access = await resolveAccess(target.type, target.number);
  if (!access.ok) return access.response;

  if (!rateLimit(`comment:${access.userId}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Trop de messages. Patientez une minute.' }, { status: 429 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('document_comments').insert({
    target_type: target.type,
    target_number: target.number,
    author_id: access.userId,
    author_role: access.role,
    author_name: access.authorName,
    body,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // ── Notification de l'autre partie (best-effort) ──
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mn-fermetures-front.vercel.app';
  const docLabel = target.type === 'devis' ? 'devis' : 'commande';
  let to = '';
  let link = '';
  if (access.role === 'client') {
    // → commercial assigné du client, sinon boîte équipe
    if (access.clientUserId) {
      const { data: clientProfile } = await admin
        .from('profiles')
        .select('commercial_id')
        .eq('id', access.clientUserId)
        .single();
      if (clientProfile?.commercial_id) {
        const { data: u } = await admin.auth.admin.getUserById(clientProfile.commercial_id);
        to = u?.user?.email ?? '';
      }
    }
    if (!to) to = process.env.CONTACT_BC_EMAIL ?? process.env.GMAIL_USER ?? '';
    link = `${siteUrl}/admin/${target.type === 'devis' ? 'devis' : 'commandes'}`;
  } else {
    // staff → client
    to = access.clientEmail ?? '';
    link = `${siteUrl}/compte`;
  }

  await sendEmail(
    to,
    `💬 Nouveau commentaire — ${docLabel} ${target.number}`,
    `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:22px 28px;border-radius:8px 8px 0 0;">
    <div style="font-size:19px;font-weight:700;color:#fff;">MN FERMETURES</div>
    <div style="font-size:13px;color:#93c5fd;margin-top:4px;">Nouveau commentaire sur ${docLabel} ${escapeHtml(target.number)}</div>
  </div>
  <div style="background:#fff;padding:26px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">
      De : <strong style="color:#1f2937;">${escapeHtml(access.authorName)}</strong>
      ${access.role !== 'client' ? ' · MN Fermetures' : ''}
    </p>
    <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(body)}</div>
    <div style="text-align:center;margin-top:22px;">
      <a href="${link}" style="background:#10314f;color:#fff;text-decoration:none;padding:12px 26px;border-radius:6px;font-weight:600;font-size:14px;display:inline-block;">
        Répondre depuis mon espace →
      </a>
    </div>
  </div>
</div>`,
  );

  return NextResponse.json({ ok: true });
}
