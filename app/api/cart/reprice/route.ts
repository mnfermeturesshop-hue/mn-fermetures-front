import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserDiscounts } from '@/lib/pricing/discounts';
import { verifyCartLines } from '@/lib/catalog/verifyCart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Re-tarife des lignes de panier au TAUX COURANT (surcharge + remise) — utilisé
 *  quand on recharge un devis dans le panier, pour que l'aperçu du checkout
 *  reflète le prix réel (et pas le prix figé du devis). Autoritaire côté serveur. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { lines?: unknown[] } | null;
  if (!body?.lines || !Array.isArray(body.lines)) {
    return NextResponse.json({ error: 'Lignes manquantes.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const discounts = user ? await getUserDiscounts(user.id) : {};

  const verified = await verifyCartLines(body.lines, discounts, { userId: user?.id ?? null });
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

  return NextResponse.json({ lines: verified.lines }, { headers: { 'Cache-Control': 'no-store' } });
}
