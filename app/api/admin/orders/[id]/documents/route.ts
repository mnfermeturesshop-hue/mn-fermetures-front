import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStaff, getCommercialClientIds } from '@/lib/auth/guards';

const ALLOWED_TYPES = ['arc', 'proforma', 'bl', 'facture', 'suivi'] as const;
type DocType = (typeof ALLOWED_TYPES)[number];

interface OrderRecord {
  id: string;
  order_number: string;
  user_id: string | null;
  documents: Record<string, string> | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string | null;

  if (!file || !type || !(ALLOWED_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: 'file et type (arc|proforma|bl|facture|suivi) requis' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_number, user_id, documents')
    .eq('id', params.id)
    .single<OrderRecord>();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }

  // Un commercial ne joint des documents qu'aux commandes de SES clients
  if (guard.role === 'commercial') {
    const clientIds = await getCommercialClientIds(guard.userId);
    if (!order.user_id || !clientIds.has(order.user_id)) {
      return NextResponse.json({ error: 'Cette commande ne concerne pas vos clients.' }, { status: 403 });
    }
  }

  const path = `${order.order_number}/${type as DocType}.pdf`;
  const bytes = await file.arrayBuffer();

  const { error: uploadErr } = await supabase.storage
    .from('order-documents')
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 400 });
  }

  const documents = { ...(order.documents ?? {}), [type]: path };

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ documents })
    .eq('id', params.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, documents });
}
