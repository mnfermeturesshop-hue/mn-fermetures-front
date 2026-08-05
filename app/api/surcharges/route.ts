import { NextResponse } from 'next/server';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { surchargeMapFromNodes } from '@/lib/pricing/discount-resolver';
import { TAXONOMY_SEED } from '@/lib/catalog/taxonomy';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Surcharges temporaires par nœud (lecture publique). */
export async function GET() {
  const nodes = await getTaxonomy();

  // Sonde directe : montre l'erreur SQL exacte (ex. colonne surcharge absente).
  let probe: unknown = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('taxonomy_nodes')
      .select('slug, surcharge')
      .eq('slug', 'tradi')
      .maybeSingle();
    probe = { data, error: error?.message ?? null };
  } catch (e) {
    probe = { thrown: e instanceof Error ? e.message : String(e) };
  }

  const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^https?:\/\//, '').split('.')[0];

  return NextResponse.json({
    surcharges: surchargeMapFromNodes(nodes),
    _debug: {
      source: nodes === TAXONOMY_SEED ? 'seed' : 'db',
      count: nodes.length,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseProject: supabaseHost || null, // ref du projet Supabase vu par l'app
      probe,                                  // { data, error } ou { thrown }
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
