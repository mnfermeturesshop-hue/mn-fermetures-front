import { NextResponse } from 'next/server';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { surchargeMapFromNodes } from '@/lib/pricing/discount-resolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Surcharges temporaires par nœud (lecture publique — donnée non sensible,
 *  reflétée dans les prix affichés ; le serveur re-tarife de toute façon). */
export async function GET() {
  const nodes = await getTaxonomy();
  return NextResponse.json({ surcharges: surchargeMapFromNodes(nodes) });
}
