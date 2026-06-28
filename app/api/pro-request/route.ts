import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    company?: string; siret?: string;
    name?: string; email?: string; phone?: string;
  };
  const { company = '', siret = '', name = '', email = '', phone = '' } = body;

  if (!company.trim() || !siret.trim() || !name.trim() || !email.trim()) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 });
  }

  // Sauvegarde en base
  const supabase = createAdminClient();
  const { error } = await supabase.from('pro_requests').insert({
    company: company.trim(),
    siret: siret.trim(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim() || null,
  });

  if (error) {
    console.error('[pro-request] Supabase insert error:', error);
  }

  // Notification admin
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

    const html = `<p style="font-family:sans-serif;">Nouvelle demande de compte professionnel :</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:6px 12px 6px 0;color:#6b7280;">Entreprise</td><td style="font-weight:600;">${company}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#6b7280;">SIRET</td><td style="font-family:monospace;">${siret}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#6b7280;">Contact</td><td>${name}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#6b7280;">Email</td><td>${email}</td></tr>
  ${phone ? `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;">Téléphone</td><td>${phone}</td></tr>` : ''}
</table>`;

    try {
      await transporter.sendMail({
        from: `MN Fermetures <${gmailUser}>`,
        to: gmailUser,
        subject: `Nouvelle demande compte pro — ${company}`,
        html,
      });
    } catch (err) {
      console.error('[pro-request] Gmail error:', err);
    }
  }

  return NextResponse.json({ success: true });
}
