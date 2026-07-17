/* Chargement d'une définition de configurateur (moteur universel v2) — serveur.
   Priorité à la base (`configurators`) si la ligne est au format v2 (présence
   d'un tableau `fields`) ; sinon repli sur le seed intégré. */

import { createAdminClient } from '@/lib/supabase/admin';
import type { DefV2 } from './v2/types';
import { VR_TRADI_SEED } from './seed';
import storeBanne from './data/store-banne.json';

// Seeds intégrés (repli). Ajouter une famille = ajouter une DONNÉE ici — aucun
// code moteur/UI à écrire (cf. store banne, tarifé par formule et non par grille).
const SEEDS: Record<string, DefV2> = {
  [VR_TRADI_SEED.slug]: VR_TRADI_SEED,
  'store-banne': storeBanne as unknown as DefV2,
};

const isV2 = (d: unknown): d is DefV2 =>
  !!d && typeof d === 'object' && Array.isArray((d as { fields?: unknown }).fields);

/** Configurateurs intégrés (seeds) — pour le gestionnaire back-office. */
export function builtinConfigurators(): { slug: string; name: string; famille: string }[] {
  return Object.values(SEEDS).map((d) => ({ slug: d.slug, name: d.name, famille: d.famille }));
}

export async function loadConfiguratorDef(slug: string): Promise<DefV2 | null> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('configurators')
        .select('definition, active')
        .eq('slug', slug)
        .single();
      if (data?.active && isV2(data.definition)) return data.definition as DefV2;
    } catch {
      // Table absente ou ligne au format v1 → repli sur le seed.
    }
  }
  return SEEDS[slug] ?? null;
}
