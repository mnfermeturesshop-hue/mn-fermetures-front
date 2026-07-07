import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStaff, getCommercialClientIds } from '@/lib/auth/guards';

export async function GET() {
  // Staff : un commercial ne voit que les commandes de SES clients
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;
  const supabase = createAdminClient();

  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (guard.role === 'commercial') {
    const clientIds = await getCommercialClientIds(guard.userId);
    if (clientIds.size === 0) return NextResponse.json([]);
    query = query.in('user_id', [...clientIds]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;
  const { id, status } = await req.json() as { id: string; status: string };
  if (!id || !status) return NextResponse.json({ error: 'id et status requis' }, { status: 400 });
  const supabase = createAdminClient();

  // Un commercial ne modifie que les commandes de SES clients
  if (guard.role === 'commercial') {
    const [{ data: order }, clientIds] = await Promise.all([
      supabase.from('orders').select('user_id').eq('id', id).single(),
      getCommercialClientIds(guard.userId),
    ]);
    if (!order?.user_id || !clientIds.has(order.user_id)) {
      return NextResponse.json({ error: 'Cette commande ne concerne pas vos clients.' }, { status: 403 });
    }
  }

  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
