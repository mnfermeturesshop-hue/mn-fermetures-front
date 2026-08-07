import { NextResponse } from 'next/server';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { surchargeMapFromNodes, ecoMapFromNodes } from '@/lib/pricing/discount-resolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Surcharges temporaires (%) ET éco-contributions (€) par nœud (lecture publique —
 *  données non sensibles, reflétées dans les prix affichés ; le serveur re-tarife
 *  de toute façon). */
export async function GET() {
  const nodes = await getTaxonomy();
  return NextResponse.json(
    { surcharges: surchargeMapFromNodes(nodes), eco: ecoMapFromNodes(nodes) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
