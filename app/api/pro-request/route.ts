import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    company?: string; siret?: string;
    name?: string; email?: string; phone?: string; password?: string;
  };
  const { company = '', siret = '', name = '', email = '', phone = '', password = '' } = body;

  if (!company.trim() || !siret.trim() || !name.trim() || !email.trim()) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }, { status: 400 });
  }

  const supabase = createAdminClient();

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
  await supabase.from('pro_requests').insert({
    company: company.trim(),
    siret: siret.trim(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim() || null,
    user_id: userId,
  });

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
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Entreprise</td><td><strong>${company}</strong></td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">SIRET</td><td style="font-family:monospace;">${siret}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Contact</td><td>${name}</td></tr>
      <tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Email</td><td>${email}</td></tr>
      ${phone ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;">Téléphone</td><td>${phone}</td></tr>` : ''}
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
