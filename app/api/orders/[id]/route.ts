import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Détail d'une commande par numéro (`order_number`), réservé à son
 * propriétaire ou à un admin. Source de vérité pour la page de confirmation
 * et la facture (au lieu du store client éphémère).
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from('orders')
    .select('order_number, status, payment_method, shipping_method, created_at, lines, total_ht, total_ttc, frais_ht, shipping_address, customer_name, email, user_id')
    .eq('order_number', params.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }

  // Propriétaire, sinon admin uniquement
  if (order.user_id !== user.id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
  }

  const { user_id: _uid, ...safe } = order;
  return NextResponse.json(safe);
}
