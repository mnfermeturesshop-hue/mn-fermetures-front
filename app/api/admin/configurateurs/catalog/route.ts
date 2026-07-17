import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 3000;

/**
 * Parse un catalogue fournisseur (CSV ou Excel) en lignes brutes (tableau de
 * tableaux) pour l'import d'options dans une définition. Le mapping des colonnes
 * (valeur/libellé/hex…) est fait côté client. Admin uniquement.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Fichier requis.' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier vide ou trop volumineux (10 Mo max).' }, { status: 400 });
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
  } catch {
    return NextResponse.json({ error: 'Fichier illisible (CSV ou Excel attendu).' }, { status: 400 });
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return NextResponse.json({ error: 'Classeur vide.' }, { status: 400 });

  const aoa = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, blankrows: false, defval: '' });
  const rows = aoa.slice(0, MAX_ROWS).map((r) => r.map((c) => (c == null ? '' : c)));
  const cols = Math.max(0, ...rows.map((r) => r.length));

  return NextResponse.json({ rows, cols, truncated: aoa.length > MAX_ROWS });
}
