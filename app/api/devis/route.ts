import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { verifyCartLines } from '@/lib/catalog/verifyCart';
import { getUserDiscounts } from '@/lib/pricing/discounts';
import { computeOrderTotals, type ShippingMethod } from '@/lib/pricing/shipping';

export async function POST(req: NextRequest) {
  // user_id/email issus EXCLUSIVEMENT de la session (audit S5) — jamais du body
  const serverClient = createClient();
  const { data: { user: sessionUser } } = await serverClient.auth.getUser();

  if (!sessionUser?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const userId = sessionUser.id;
  const email = sessionUser.email;

  const body = await req.json() as {
    devisNumber: string;
    customerName: string;
    company?: string;
    lines: unknown[];
    shippingMethod?: ShippingMethod;
  };

  if (!body.devisNumber?.trim()) {
    return NextResponse.json({ error: 'Numéro de devis manquant.' }, { status: 400 });
  }

  // Re-tarification autoritaire côté serveur (audit S2) : prix, remises et
  // totaux recalculés à partir du catalogue — jamais les montants du body,
  // qui alimenteraient sinon un bon de commande via /convert (cf. audit devis).
  const discounts = await getUserDiscounts(userId);
  const verified = await verifyCartLines(body.lines, discounts, { userId });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }
  const method: ShippingMethod = body.shippingMethod === 'express' ? 'express' : 'standard';
  const totals = computeOrderTotals(verified.productsHT, method);

  const adminClient = createAdminClient();
  const { error } = await adminClient.from('devis').insert({
    devis_number:  body.devisNumber.trim(),
    user_id:       userId,
    email,
    customer_name: body.customerName,
    company:       body.company ?? null,
    lines:         verified.lines,
    total_ht:      totals.totalHT,
    total_ttc:     totals.totalTTC,
    frais_ht:      totals.fraisHT,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

const ALLOWED_DEVIS_STATUS = ['draft', 'converted', 'expired'] as const;

export async function PATCH(req: NextRequest) {
  // Changement de statut : réservé au propriétaire du devis ou à un admin (audit S6)
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { devisNumber, status } = await req.json() as { devisNumber: string; status: string };
  if (!devisNumber || !status) {
    return NextResponse.json({ error: 'devisNumber et status requis' }, { status: 400 });
  }
  if (!(ALLOWED_DEVIS_STATUS as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Vérifie la propriété (ou le rôle admin) avant toute écriture
  const { data: devis } = await adminClient
    .from('devis')
    .select('user_id')
    .eq('devis_number', devisNumber)
    .single();
  if (!devis) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });

  if (devis.user_id !== user.id) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
  }

  const { error } = await adminClient
    .from('devis')
    .update({ status })
    .eq('devis_number', devisNumber);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
