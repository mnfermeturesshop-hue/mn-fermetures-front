import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });

  const admin = createAdminClient();

  // Tentative avec colonne documents (existe si migration 20260702_order_documents a été jouée)
  const { data, error } = await admin
    .from('orders')
    .select('id, order_number, created_at, total_ht, total_ttc, status, lines, payment_method, shipping_method, documents')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    // Colonne documents absente — fallback sans elle
    const { data: fallback } = await admin
      .from('orders')
      .select('id, order_number, created_at, total_ht, total_ttc, status, lines, payment_method, shipping_method')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return NextResponse.json(fallback ?? []);
  }

  return NextResponse.json(data ?? []);
}
