/* Chargement d'une définition de configurateur — côté serveur uniquement.
   Priorité à la base (`configurators`, alimentée par l'import Excel) ; repli
   sur le seed intégré tant que la table n'est pas jouée/peuplée. */

import { createAdminClient } from '@/lib/supabase/admin';
import type { ConfiguratorDef } from './types';
import { VR_TRADI_SEED } from './seed';

const SEEDS: Record<string, ConfiguratorDef> = {
  [VR_TRADI_SEED.slug]: VR_TRADI_SEED,
};

export async function loadConfiguratorDef(slug: string): Promise<ConfiguratorDef | null> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('configurators')
        .select('definition, active')
        .eq('slug', slug)
        .single();
      if (data?.active && data.definition) return data.definition as ConfiguratorDef;
    } catch {
      // Table absente (migration non jouée) → repli sur le seed.
    }
  }
  return SEEDS[slug] ?? null;
}
