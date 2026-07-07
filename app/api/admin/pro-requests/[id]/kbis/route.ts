import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';

/**
 * Téléchargement du Kbis d'une demande pro — admin uniquement.
 * Bucket privé `kbis-documents` → URL signée 5 minutes (même modèle que les
 * documents de commande et les PDF de devis).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data: request, error } = await admin
    .from('pro_requests')
    .select('kbis_path')
    .eq('id', params.id)
    .single<{ kbis_path: string | null }>();

  if (error || !request) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }
  if (!request.kbis_path) {
    return NextResponse.json({ error: 'Aucun Kbis pour cette demande' }, { status: 404 });
  }

  const { data, error: urlErr } = await admin.storage
    .from('kbis-documents')
    .createSignedUrl(request.kbis_path, 300);

  if (urlErr || !data) {
    return NextResponse.json({ error: 'Erreur génération URL' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
