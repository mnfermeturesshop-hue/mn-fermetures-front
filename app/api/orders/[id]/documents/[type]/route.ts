import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

interface OrderRecord {
  user_id: string | null;
  documents: Record<string, string> | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; type: string } }
) {
  // Authentification via session cookie
  const serverClient = createClient();
  const { data: { user }, error: authErr } = await serverClient.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Vérifier que la commande appartient à l'utilisateur connecté
  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('user_id, documents')
    .eq('order_number', params.id)
    .single<OrderRecord>();

  if (orderErr || !order || order.user_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const path = order.documents?.[params.type];
  if (!path) {
    return NextResponse.json({ error: 'Document non disponible' }, { status: 404 });
  }

  // URL signée valable 5 minutes
  const { data, error: urlErr } = await adminClient.storage
    .from('order-documents')
    .createSignedUrl(path, 300);

  if (urlErr || !data) {
    return NextResponse.json({ error: 'Erreur génération URL' }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
