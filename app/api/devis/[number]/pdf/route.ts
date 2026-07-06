import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface DevisRecord {
  user_id: string | null;
  pdf_path: string | null;
}

/**
 * Téléchargement du PDF d'un devis ERP — réservé au propriétaire du devis
 * (ou à un admin). Bucket privé → URL signée 5 minutes, même modèle que les
 * documents de commande.
 */
export async function GET(_req: NextRequest, { params }: { params: { number: string } }) {
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const admin = createAdminClient();
  const { data: devis, error } = await admin
    .from('devis')
    .select('user_id, pdf_path')
    .eq('devis_number', params.number)
    .single<DevisRecord>();

  if (error || !devis) {
    return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
  }

  if (devis.user_id !== user.id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
  }

  if (!devis.pdf_path) {
    return NextResponse.json({ error: 'Aucun PDF pour ce devis' }, { status: 404 });
  }

  const { data, error: urlErr } = await admin.storage
    .from('devis-documents')
    .createSignedUrl(devis.pdf_path, 300);

  if (urlErr || !data) {
    return NextResponse.json({ error: 'Erreur génération URL' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
