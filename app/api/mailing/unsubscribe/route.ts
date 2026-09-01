import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { unsubscribeSig } from '@/lib/security/unsubscribe';

/**
 * Désinscription des emails commerciaux (lien signé HMAC, sans connexion).
 *
 * ⚠️ Anti-scanner : la désinscription ne se fait QUE sur POST (clic humain sur le
 * bouton). Le GET n'affiche qu'une page de CONFIRMATION et ne modifie rien — sinon
 * les messageries / antivirus / filtres anti-phishing qui pré-chargent les liens des
 * emails désinscriraient le contact sans action de sa part.
 * Ne concerne pas les emails transactionnels (commandes, devis, rappels).
 */
function verify(req: NextRequest): string | null {
  const uid = req.nextUrl.searchParams.get('uid') ?? '';
  const sig = req.nextUrl.searchParams.get('sig') ?? '';
  const expected = unsubscribeSig(uid);
  const ok = uid.length > 0 && sig.length === expected.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  return ok ? uid : null;
}

const page = (title: string, icon: string, iconBg: string, body: string, form = '') => new NextResponse(
  `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — MN Fermetures</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
  <div style="max-width:480px;margin:60px auto;background:#fff;border-radius:12px;padding:40px 32px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="width:56px;height:56px;border-radius:50%;background:${iconBg};line-height:56px;font-size:26px;margin:0 auto 16px;">${icon}</div>
    <h1 style="font-size:20px;color:#10314f;margin:0 0 10px;">${title}</h1>
    ${body}
    ${form}
  </div>
</body></html>`,
  { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
);

// GET = page de confirmation UNIQUEMENT (aucune modification — sûr face aux scanners).
export async function GET(req: NextRequest) {
  const uid = verify(req);
  if (!uid) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
  const qs = req.nextUrl.search; // ?uid=…&sig=…
  return page(
    'Confirmer la désinscription', '✉️', '#e0e7ff',
    `<p style="font-size:14px;color:#4b5563;margin:0 0 20px;">Confirmez que vous ne souhaitez plus recevoir nos emails commerciaux. Les emails liés à vos commandes et devis continueront de vous parvenir.</p>`,
    `<form method="POST" action="/api/mailing/unsubscribe${qs}">
       <button type="submit" style="background:#10314f;color:#fff;border:none;border-radius:8px;padding:12px 26px;font-size:14px;font-weight:600;cursor:pointer;">Confirmer ma désinscription</button>
     </form>`,
  );
}

// POST = désinscription effective (déclenchée par le bouton, donc par un humain).
export async function POST(req: NextRequest) {
  const uid = verify(req);
  if (!uid) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ email_optout: true }).eq('id', uid);
  if (error) return NextResponse.json({ error: 'Erreur — contactez-nous au 04 67 78 06 63' }, { status: 500 });
  return page(
    'Désinscription confirmée', '✓', '#dcfce7',
    `<p style="font-size:14px;color:#4b5563;margin:0 0 6px;">Vous ne recevrez plus nos emails commerciaux.</p>
     <p style="font-size:12px;color:#9ca3af;margin:0;">Les emails liés à vos commandes et devis continuent de vous être envoyés normalement.</p>`,
  );
}
