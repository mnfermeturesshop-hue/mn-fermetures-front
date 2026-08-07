/* Chargement de la nomenclature (serveur) : base `taxonomy_nodes` en priorité,
   repli sur le seed intégré tant que la table n'est pas peuplée. */

import { createAdminClient } from '@/lib/supabase/admin';
import { TAXONOMY_SEED, type TaxonomyNode } from './taxonomy';

export async function getTaxonomy(): Promise<TaxonomyNode[]> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('taxonomy_nodes')
        .select('slug, parent_slug, level, code, name, sort_order, active, generator_slug, surcharge, eco_contribution');
      if (data && data.length) {
        return data.map((r) => ({
          slug: r.slug, parentSlug: r.parent_slug, level: r.level, code: r.code,
          name: r.name, sortOrder: r.sort_order, active: r.active,
          ...(r.generator_slug ? { generatorSlug: r.generator_slug } : {}),
          ...(r.surcharge ? { surcharge: Number(r.surcharge) } : {}),
          ...(r.eco_contribution ? { ecoContribution: Number(r.eco_contribution) } : {}),
        })) as TaxonomyNode[];
      }
    } catch {
      // Table absente (migration non jouée) → seed.
    }
  }
  return TAXONOMY_SEED;
}
