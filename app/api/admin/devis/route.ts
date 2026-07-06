import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';
import type { CartLine } from '@/lib/catalog/types';

interface DevisLineInput {
  name: string;
  reference?: string;
  detail?: string;
  quantity: number;
  unitPriceHT: number;
}

interface DevisPayload {
  devisNumber: string;
  userId: string;          // client pro destinataire
  lines: DevisLineInput[];
  fraisHT?: number;
  validUntil?: string;     // ISO date
}

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
 * Création d'un devis ERP : PDF (optionnel) + lignes saisies par l'admin,
 * rattaché à un client pro. Les lignes sont stampées `pricing.kind='devis'`
 * pour que la conversion en bon de commande reprenne les prix négociés
 * stockés en base (vérifiés côté serveur, cf. verifyCartLines).
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const rawPayload = formData.get('payload');
  if (typeof rawPayload !== 'string') {
    return NextResponse.json({ error: 'payload requis' }, { status: 400 });
  }

  let payload: DevisPayload;
  try {
    payload = JSON.parse(rawPayload) as DevisPayload;
  } catch {
    return NextResponse.json({ error: 'payload JSON invalide' }, { status: 400 });
  }

  const devisNumber = String(payload.devisNumber ?? '').trim();
  if (!devisNumber) return NextResponse.json({ error: 'Numéro de devis requis.' }, { status: 400 });
  if (!payload.userId) return NextResponse.json({ error: 'Client requis.' }, { status: 400 });
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    return NextResponse.json({ error: 'Au moins une ligne est requise.' }, { status: 400 });
  }
  for (const l of payload.lines) {
    if (!l.name?.trim()) return NextResponse.json({ error: 'Chaque ligne doit avoir une désignation.' }, { status: 400 });
    if (!Number.isFinite(l.quantity) || l.quantity < 1) return NextResponse.json({ error: 'Quantité invalide.' }, { status: 400 });
    if (!Number.isFinite(l.unitPriceHT) || l.unitPriceHT < 0) return NextResponse.json({ error: 'Prix unitaire invalide.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Coordonnées du client destinataire (profil + email auth)
  const [{ data: profile }, { data: userData }] = await Promise.all([
    supabase.from('profiles').select('name, company').eq('id', payload.userId).single(),
    supabase.auth.admin.getUserById(payload.userId),
  ]);
  if (!userData?.user) {
    return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 });
  }

  // 1. Upload du PDF (optionnel) dans le bucket privé
  let pdfPath: string | null = null;
  if (file) {
    pdfPath = `${devisNumber}.pdf`;
    const bytes = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from('devis-documents')
      .upload(pdfPath, bytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) return NextResponse.json({ error: `Upload PDF : ${upErr.message}` }, { status: 400 });
  }

  // 2. Lignes stampées pour la conversion en BC (prix négociés, source base)
  const lines: CartLine[] = payload.lines.map((l, i) => ({
    key: `devis-${devisNumber}-${i}`,
    name: l.name.trim(),
    detail: l.detail?.trim() || undefined,
    reference: l.reference?.trim() || undefined,
    unitPriceHT: Math.round(l.unitPriceHT * 100) / 100,
    quantity: Math.floor(l.quantity),
    uom: 'unite',
    pricing: { kind: 'devis', devisNumber, line: i },
  }));

  const fraisHT = Number.isFinite(payload.fraisHT) ? Math.max(0, Number(payload.fraisHT)) : 0;
  const productsHT = lines.reduce((s, l) => s + l.unitPriceHT * l.quantity, 0);
  const totalHT = Math.round((productsHT + fraisHT) * 100) / 100;
  const totalTTC = Math.round(totalHT * 1.2 * 100) / 100;

  // 3. Insertion du devis
  const { error } = await supabase.from('devis').insert({
    devis_number:  devisNumber,
    user_id:       payload.userId,
    email:         userData.user.email ?? '',
    customer_name: profile?.name ?? null,
    company:       profile?.company ?? null,
    lines,
    total_ht:      totalHT,
    total_ttc:     totalTTC,
    frais_ht:      fraisHT,
    status:        'draft',
    source:        'erp',
    pdf_path:      pdfPath,
    ...(payload.validUntil ? { valid_until: payload.validUntil } : {}),
  });

  if (error) {
    const msg = error.message.includes('duplicate')
      ? `Le devis ${devisNumber} existe déjà.`
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, devisNumber });
}
