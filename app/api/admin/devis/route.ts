import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';

/** Liste de tous les devis (site + ERP) pour l'admin. */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('devis')
    .select('id, devis_number, customer_name, company, email, total_ht, status, source, pdf_path, created_at, valid_until')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

/**
 * Import d'un devis ERP : un PDF rattaché à un client pro, c'est tout.
 * Le numéro de devis est déduit du nom du fichier (il figure dans le PDF
 * généré par l'ERP) ; le total HT est optionnel (affichage espace client).
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const userId = formData.get('userId') as string | null;
  const totalHTRaw = formData.get('totalHT') as string | null;
  const validUntil = formData.get('validUntil') as string | null;

  if (!file)   return NextResponse.json({ error: 'PDF du devis requis.' }, { status: 400 });
  if (!userId) return NextResponse.json({ error: 'Client requis.' }, { status: 400 });

  // N° de devis = nom du fichier ERP sans extension (ex. "DEV-2026-0042.pdf")
  const baseName = (file.name || '').replace(/\.pdf$/i, '').trim();
  const devisNumber = (baseName.replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 60))
    || `DEVIS-${Date.now()}`;

  const supabase = createAdminClient();

  // Coordonnées du client destinataire (profil + email auth)
  const [{ data: profile }, { data: userData }] = await Promise.all([
    supabase.from('profiles').select('name, company').eq('id', userId).single(),
    supabase.auth.admin.getUserById(userId),
  ]);
  if (!userData?.user) {
    return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
  }

  // 1. Upload du PDF dans le bucket privé
  const pdfPath = `${devisNumber}.pdf`;
  const bytes = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from('devis-documents')
    .upload(pdfPath, bytes, { contentType: 'application/pdf', upsert: true });
  if (upErr) return NextResponse.json({ error: `Upload PDF : ${upErr.message}` }, { status: 400 });

  // 2. Insertion du devis (sans lignes — le détail est dans le PDF)
  const totalHT = Math.max(0, parseFloat((totalHTRaw ?? '0').replace(',', '.')) || 0);
  const { error } = await supabase.from('devis').insert({
    devis_number:  devisNumber,
    user_id:       userId,
    email:         userData.user.email ?? '',
    customer_name: profile?.name ?? null,
    company:       profile?.company ?? null,
    lines:         [],
    total_ht:      totalHT,
    total_ttc:     Math.round(totalHT * 1.2 * 100) / 100,
    frais_ht:      0,
    status:        'draft',
    source:        'erp',
    pdf_path:      pdfPath,
    ...(validUntil ? { valid_until: validUntil } : {}),
  });

  if (error) {
    const msg = error.message.includes('duplicate')
      ? `Le devis ${devisNumber} existe déjà (fichier déjà importé ?).`
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, devisNumber });
}
