import { NextResponse } from 'next/server';
import { listConfigurators } from '@/lib/configurateur/loader';
import { getRequestHiddenNodes } from '@/lib/pricing/visibility';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { generatorNode } from '@/lib/catalog/taxonomy';
import { isNodeHidden } from '@/lib/pricing/discount-resolver';

// Réponse propre à l'utilisateur connecté (masquage) → jamais mise en cache.
export const dynamic = 'force-dynamic';

/** Slugs de configurateurs visibles pour la requête : ACTIFS (back-office) ET non
 *  masqués pour le client connecté. Utilisé par le menu pour cacher les
 *  configurateurs désactivés ou masqués. */
export async function GET() {
  try {
    const configs = await listConfigurators();
    let slugs = configs.filter((c) => c.active).map((c) => c.slug);
    // Masquage par client : retirer les configurateurs dont le nœud générateur est masqué.
    const hidden = await getRequestHiddenNodes();
    if (hidden.length) {
      const taxonomy = await getTaxonomy();
      slugs = slugs.filter((slug) => !isNodeHidden(hidden, generatorNode(taxonomy, slug), taxonomy));
    }
    return NextResponse.json({ slugs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // En cas d'erreur (base indisponible) : on ne masque rien (menu complet).
    return NextResponse.json({ slugs: null }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
