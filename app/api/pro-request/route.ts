import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, clientIp } from '@/lib/security/rateLimit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { escapeHtml } from '@/lib/security/escapeHtml';
import { CGV_VERSION } from '@/lib/config';

const KBIS_MAX_BYTES = 10 * 1024 * 1024;
const KBIS_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`pro-request:${ip}`)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une minute.' },
      { status: 429 }
    );
  }

  // FormData (le Kbis est un fichier) — les champs texte restent identiques
  const formData = await req.formData();
  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === 'string' ? v : '';
  };
  const company = str('company');
  const siret = str('siret');
  const name = str('name');
  const email = str('email');
  const phone = str('phone');
  const password = str('password');
  const turnstileToken = str('turnstileToken');
  const cgvAccepted = str('cgvAccepted');
  const kbisFile = formData.get('kbis') as File | null;

  if (!company.trim() || !siret.trim() || !name.trim() || !email.trim()) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
  }
  if (!/^\d{14}$/.test(siret.trim())) {
    return NextResponse.json({ error: 'Le SIRET doit comporter 14 chiffres.' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }, { status: 400 });
  }
  // Clickwrap CGV : acceptation obligatoire, preuve stockée en base
  if (cgvAccepted !== 'true') {
    return NextResponse.json({ error: 'Vous devez accepter les conditions générales de vente.' }, { status: 400 });
  }
  // Kbis optionnel : type + taille vérifiés côté serveur
  if (kbisFile && kbisFile.size > 0) {
    if (!KBIS_TYPES[kbisFile.type]) {
      return NextResponse.json({ error: 'Le Kbis doit être un PDF ou une image (JPG/PNG).' }, { status: 400 });
    }
    if (kbisFile.size > KBIS_MAX_BYTES) {
      return NextResponse.json({ error: 'Le Kbis ne doit pas dépasser 10 Mo.' }, { status: 400 });
    }
  }
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: 'Vérification anti-robot échouée. Réessayez.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Upload du Kbis dans le bucket privé (avant création du compte)
  let kbisPath: string | null = null;
  if (kbisFile && kbisFile.size > 0) {
    kbisPath = `${siret.trim()}-${Date.now()}.${KBIS_TYPES[kbisFile.type]}`;
    const bytes = await kbisFile.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from('kbis-documents')
      .upload(kbisPath, bytes, { contentType: kbisFile.type, upsert: true });
    if (upErr) {
      console.error('[pro-request] Kbis upload error:', upErr.message);
      // Ne bloque pas l'inscription : le Kbis est optionnel
      kbisPath = null;
    }
  }

  // Crée l'utilisateur avec son mot de passe, email confirmé d'emblée
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), company: company.trim() },
  });

  if (createErr) {
    const msg = createErr.message.toLowerCase().includes('already registered')
      ? 'Un compte existe déjà avec cet email.'
      : createErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = created.user.id;

  // Profil en attente d'approbation
  await supabase.from('profiles').update({
    name: name.trim(),
    role: 'pending',
    company: company.trim(),
    phone: phone.trim() || null,
  }).eq('id', userId);

  // Enregistre la demande avec le lien vers l'utilisateur créé
  // + preuve d'acceptation des CGV (clickwrap : date, version, IP) + Kbis
  const baseRequest = {
    company: company.trim(),
    siret: siret.trim(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim() || null,
    user_id: userId,
  };
  const { error: insertErr } = await supabase.from('pro_requests').insert({
    ...baseRequest,
    cgv_accepted_at: new Date().toISOString(),
    cgv_version: CGV_VERSION,
    cgv_ip: ip,
    kbis_path: kbisPath,
  });
  if (insertErr) {
    // Migration 20260707_pro_requests_cgv_kbis pas encore jouée —
    // fallback sans les colonnes CGV/Kbis pour ne pas perdre la demande
    console.error('[pro-request] insert error (fallback sans CGV/Kbis):', insertErr.message);
    await supabase.from('pro_requests').insert(baseRequest);
  }

  // Notifie l'admin
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mn-fermetures-front.vercel.app';
  if (gmailUser && gmailPass) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
    await transporter.sendMail({
      from: `MN Fermetures <${gmailUser}>`,
      to: gmailUser,
      subject: `Nouvelle inscription PRO — ${company.trim()}`,
      html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:28px 32px;border-radius:8px 8px 0 0;">
    <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;">MN FERMETURES</div>
    <div style="font-size:13px;color:#93c5fd;margin-top:4px;">Nouvelle inscription professionnelle</div>
  </div>
  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 16px;">Une nouvelle inscription pro est en attente d'approbation :</p>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Entreprise</td><td><strong>${escapeHtml(company)}</strong></td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">SIRET</td><td style="font-family:monospace;">${escapeHtml(siret)}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Contact</td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Email</td><td>${escapeHtml(email)}</td></tr>
      ${phone ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Téléphone</td><td>${escapeHtml(phone)}</td></tr>` : ''}
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">CGV</td><td>✓ Acceptées (v${escapeHtml(CGV_VERSION)})</td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Kbis</td><td>${kbisPath ? '✓ Fourni (téléchargeable dans l\'admin)' : '— Non fourni'}</td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${siteUrl}/admin/pro-requests"
         style="background:#10314f;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:15px;display:inline-block;">
        Approuver dans l'admin →
      </a>
    </div>
  </div>
</div>`,
    }).catch((err) => console.error('[pro-request] Gmail error:', err));
  }

  return NextResponse.json({ success: true });
}
