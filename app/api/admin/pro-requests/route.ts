import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';
import { escapeHtml } from '@/lib/security/escapeHtml';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
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

async function sendWelcomeEmail(name: string, email: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mn-fermetures-front.vercel.app';
  if (!gmailUser || !gmailPass) return;
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });
  await transporter.sendMail({
    from: `MN Fermetures <${gmailUser}>`,
    to: email,
    subject: 'Votre compte professionnel MN Fermetures est activé',
    html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
  <div style="background:#10314f;padding:28px 32px;border-radius:8px 8px 0 0;">
    <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;">MN FERMETURES</div>
    <div style="font-size:13px;color:#93c5fd;margin-top:4px;">Espace professionnel</div>
  </div>
  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 16px;">Bonjour ${escapeHtml(name)},</p>
    <p style="margin:0 0 24px;color:#4b5563;">
      Votre compte professionnel <strong>MN Fermetures</strong> vient d'être activé par notre équipe.
      Vous pouvez dès maintenant vous connecter avec votre email et le mot de passe que vous avez défini lors de votre inscription.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${siteUrl}/pro"
         style="background:#10314f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:600;font-size:15px;display:inline-block;">
        Accéder à mon espace pro
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
      Vous bénéficiez désormais de vos tarifs préférentiels et pouvez passer des bons de commande directement en ligne.
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
      Une question ? Appelez-nous au 04 67 78 06 63 · Lun–Ven 8h–17h
    </p>
  </div>
</div>`,
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const { id, action } = await req.json() as { id: string; action: 'approve' | 'reject' };
    if (!id || !action) return NextResponse.json({ error: 'id et action requis' }, { status: 400 });

    const supabase = createAdminClient();

    const { data: proReq, error: fetchErr } = await supabase
      .from('pro_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !proReq) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    if (action === 'reject') {
      await supabase.from('pro_requests').update({ status: 'rejected' }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    // approve — active le compte en mettant le rôle b2b
    if (!proReq.user_id) {
      return NextResponse.json(
        { error: 'Aucun compte associé à cette demande. L\'utilisateur doit se réinscrire.' },
        { status: 400 }
      );
    }

    await supabase.from('profiles').update({ role: 'b2b' }).eq('id', proReq.user_id);
    await supabase.from('pro_requests').update({ status: 'approved' }).eq('id', id);

    await sendWelcomeEmail(proReq.name, proReq.email).catch((err) =>
      console.error('[pro-requests] welcome email error:', err)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
