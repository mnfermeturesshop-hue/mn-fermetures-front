import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, clientIp } from '@/lib/security/rateLimit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { escapeHtml } from '@/lib/security/escapeHtml';
import { B2C_ENABLED } from '@/lib/config';

function validatePassword(pw: string): string | null {
  if (pw.length < 8)        return 'Le mot de passe doit faire au moins 8 caractères.';
  if (!/[A-Z]/.test(pw))   return 'Le mot de passe doit contenir au moins une majuscule.';
  if (!/[0-9]/.test(pw))   return 'Le mot de passe doit contenir au moins un chiffre.';
  return null;
}

async function sendWelcomeEmail(to: string, firstName: string) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user, pass },
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <tr><td style="background:#1e3a5f;padding:28px 32px;text-align:center;">
      <p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:.04em;">MN FERMETURES</p>
      <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Volets roulants · Motorisations · Pièces détachées</p>
    </td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 16px;color:#1e3a5f;font-size:22px;">Bienvenue, ${escapeHtml(firstName)} !</h1>
      <p style="margin:0 0 12px;">Votre compte MN Fermetures a bien été créé.</p>
      <p style="margin:0 0 20px;">Pour l'activer, cliquez sur le lien de confirmation que vous venez de recevoir. Une fois vérifié, vous aurez accès à votre espace client.</p>
      <div style="padding:16px;background:#f0f4f8;border-radius:8px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-weight:700;color:#1e3a5f;">Depuis votre espace client :</p>
        <ul style="margin:0;padding-left:20px;line-height:1.8;">
          <li>Suivi de vos commandes en temps réel</li>
          <li>Téléchargement de vos factures PDF</li>
          <li>Enregistrement de vos adresses de livraison</li>
        </ul>
      </div>
      <p style="margin:0;color:#6b7280;font-size:13px;">Si vous n'avez pas créé ce compte, ignorez simplement cet email.</p>
    </td></tr>
    <tr><td style="padding:16px 32px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#6b7280;font-size:13px;">MN Fermetures · 04 67 78 06 63 · contact@mmfermetures.fr</p>
    </td></tr>
  </table>
</body></html>`;

  try {
    await transporter.sendMail({
      from: `MN Fermetures <${user}>`,
      to,
      subject: `Bienvenue chez MN Fermetures, ${firstName} !`,
      html,
    });
  } catch (err) {
    console.error('[register] Gmail SMTP error:', err);
  }
}

export async function POST(req: NextRequest) {
  // Offre B2B uniquement : la création de compte particulier est désactivée
  if (!B2C_ENABLED) {
    return NextResponse.json(
      { error: 'La création de compte particulier est désactivée. Les professionnels peuvent ouvrir un compte via l\'espace pro.' },
      { status: 403 }
    );
  }

  const ip = clientIp(req);

  if (!rateLimit(`register:${ip}`)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans une minute.' },
      { status: 429 }
    );
  }

  const body = await req.json() as {
    firstName?: string; lastName?: string;
    email?: string; password?: string;
    turnstileToken?: string;
  };
  const { firstName = '', lastName = '', email = '', password = '', turnstileToken = '' } = body;

  if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
    return NextResponse.json({ error: 'Tous les champs sont obligatoires.' }, { status: 400 });
  }

  const pwError = validatePassword(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: 'Vérification anti-bot échouée. Réessayez.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: 'Service non configuré.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnon);
  const name = `${firstName.trim()} ${lastName.trim()}`;

  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { name } },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('user already exists')) {
      return NextResponse.json({ error: 'Cette adresse email est déjà utilisée.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  sendWelcomeEmail(email.trim().toLowerCase(), firstName.trim()).catch(console.error);

  return NextResponse.json({ success: true, needsVerification: true });
}
