import { NextResponse } from 'next/server';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { surchargeMapFromNodes } from '@/lib/pricing/discount-resolver';
import { TAXONOMY_SEED } from '@/lib/catalog/taxonomy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Surcharges temporaires par nœud (lecture publique — donnée non sensible,
 *  reflétée dans les prix affichés ; le serveur re-tarife de toute façon). */
export async function GET() {
  const nodes = await getTaxonomy();
  const tradi = nodes.find((n) => n.slug === 'tradi');
  const body = {
    surcharges: surchargeMapFromNodes(nodes),
    // Diagnostic temporaire — à retirer une fois la surcharge confirmée.
    _debug: {
      source: nodes === TAXONOMY_SEED ? 'seed' : 'db',
      count: nodes.length,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      tradiSurcharge: tradi ? (tradi.surcharge ?? null) : 'noeud tradi absent',
      withSurcharge: nodes.filter((n) => typeof n.surcharge === 'number' && n.surcharge > 0).map((n) => `${n.slug}=${n.surcharge}`),
    },
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
