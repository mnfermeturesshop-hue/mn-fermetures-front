import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { unsubscribeSig } from '@/lib/security/unsubscribe';

/**
 * Désinscription des emails commerciaux en un clic (lien signé dans les
 * mailings — pas de connexion requise, signature HMAC non forgeable).
 * Ne concerne pas les emails transactionnels (commandes, devis, rappels).
 */
export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid') ?? '';
  const sig = req.nextUrl.searchParams.get('sig') ?? '';

  const expected = unsubscribeSig(uid);
  const valid =
    uid.length > 0 &&
    sig.length === expected.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(expected));

  if (!valid) {
    return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ email_optout: true })
    .eq('id', uid);
  if (error) {
    return NextResponse.json({ error: 'Erreur — contactez-nous au 04 67 78 06 63' }, { status: 500 });
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Désinscription — MN Fermetures</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <div style="max-width:480px;margin:60px auto;background:#fff;border-radius:12px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="width:56px;height:56px;border-radius:50%;background:#dcfce7;line-height:56px;font-size:26px;margin:0 auto 16px;">✓</div>
    <h1 style="font-size:20px;color:#10314f;margin:0 0 10px;">Désinscription confirmée</h1>
    <p style="font-size:14px;color:#4b5563;margin:0 0 6px;">Vous ne recevrez plus nos emails commerciaux.</p>
    <p style="font-size:12px;color:#9ca3af;margin:0;">Les emails liés à vos commandes et devis continuent de vous être envoyés normalement.</p>
  </div>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
