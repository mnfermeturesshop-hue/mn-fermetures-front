import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' }, { status: 500 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('pro_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' }, { status: 500 });
  }
  try {
    const { id, action } = await req.json() as { id: string; action: 'approve' | 'reject' | 'resend' };
    if (!id || !action) return NextResponse.json({ error: 'id et action requis' }, { status: 400 });

    const supabase = createAdminClient();

    if (action === 'reject') {
      await supabase.from('pro_requests').update({ status: 'rejected' }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'resend') {
      const { data: proReq, error: fetchErr } = await supabase
        .from('pro_requests')
        .select('email, name, company')
        .eq('id', id)
        .single();
      if (fetchErr || !proReq) {
        return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mn-fermetures-front.vercel.app';
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: proReq.email,
        options: { redirectTo: `${siteUrl}/auth/callback?next=/pro/definir-mot-de-passe` },
      });
      if (linkErr || !linkData?.properties?.action_link) {
        return NextResponse.json({ error: linkErr?.message ?? 'Impossible de générer le lien' }, { status: 400 });
      }

      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      if (gmailUser && gmailPass) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com', port: 465, secure: true,
          auth: { user: gmailUser, pass: gmailPass },
        });
        await transporter.sendMail({
          from: `MN Fermetures <${gmailUser}>`,
          to: proReq.email,
          subject: 'Votre accès espace professionnel MN Fermetures',
          html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:28px 32px;border-radius:8px 8px 0 0;">
    <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;">MN FERMETURES</div>
    <div style="font-size:13px;color:#93c5fd;margin-top:4px;">Espace professionnel</div>
  </div>
  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 16px;">Bonjour ${proReq.name},</p>
    <p style="margin:0 0 24px;color:#4b5563;">
      Votre compte professionnel <strong>MN Fermetures</strong> est prêt.
      Cliquez sur le bouton ci-dessous pour accéder à votre espace et définir votre mot de passe.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${linkData.properties.action_link}"
         style="background:#10314f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:600;font-size:15px;display:inline-block;">
        Accéder à mon espace pro
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
      Ce lien est valable 24h. Si vous n'avez pas demandé cet accès, ignorez cet email.
    </p>
  </div>
</div>`,
        });
      }

      return NextResponse.json({ ok: true });
    }

    // Récupère la demande
    const { data: proReq, error: fetchErr } = await supabase
      .from('pro_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !proReq) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    // Crée le compte Supabase Auth et envoie l'invitation par email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mn-fermetures-front.vercel.app';
    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      proReq.email,
      {
        data: { role: 'b2b', name: proReq.name },
        redirectTo: `${siteUrl}/auth/callback?next=/pro/definir-mot-de-passe`,
      }
    );
    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    // Met à jour le profil créé automatiquement par le trigger avec les infos pro
    if (invited?.user?.id) {
      await supabase.from('profiles').update({
        name: proReq.name,
        role: 'b2b',
        company: proReq.company,
      }).eq('id', invited.user.id);
    }

    // Marque la demande comme approuvée
    await supabase.from('pro_requests').update({ status: 'approved' }).eq('id', id);

    return NextResponse.json({ ok: true, userId: invited?.user?.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
