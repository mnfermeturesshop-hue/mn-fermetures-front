/* Chargement d'une définition de configurateur (moteur universel v2) — serveur.
   Priorité à la base (`configurators`) si la ligne est au format v2 (présence
   d'un tableau `fields`) ; sinon repli sur le seed intégré. */

import { createAdminClient } from '@/lib/supabase/admin';
import type { DefV2 } from './v2/types';
import { VR_TRADI_SEED } from './seed';
import storeBanne from './data/store-banne.json';
import renovation from './data/volet-roulant-renovation.v2.json';
import tablier from './data/tablier-sur-mesure.v2.json';
import blocBaie from './data/volet-roulant-bloc-baie.v2.json';

// Seeds intégrés (repli). Ajouter une famille = ajouter une DONNÉE ici — aucun
// code moteur/UI à écrire (cf. store banne, tarifé par formule et non par grille).
const SEEDS: Record<string, DefV2> = {
  [VR_TRADI_SEED.slug]: VR_TRADI_SEED,
  'store-banne': storeBanne as unknown as DefV2,
  [(renovation as unknown as DefV2).slug]: renovation as unknown as DefV2,
  [(tablier as unknown as DefV2).slug]: tablier as unknown as DefV2,
  [(blocBaie as unknown as DefV2).slug]: blocBaie as unknown as DefV2,
};

const isV2 = (d: unknown): d is DefV2 =>
  !!d && typeof d === 'object' && Array.isArray((d as { fields?: unknown }).fields);

/**
 * Ajoute UN champ libre commun à TOUS les configurateurs : une note commerciale
 * (nom de la pièce, remarque…) saisie en fin de parcours, juste avant le
 * récapitulatif. Sans impact prix (aucune règle ne la lit) ; remontée dans le
 * détail de ligne (devis / bon de commande). Idempotent.
 */
function withCommercialNote(def: DefV2): DefV2 {
  if (def.fields.some((f) => f.id === 'note_commercial')) return def;
  const field = {
    id: 'note_commercial',
    label: 'Emplacement / remarque',
    type: 'text' as const,
    help: 'Nom de la pièce (chambre, cuisine, salon…) ou toute information utile au commercial.',
  };
  const step = { id: 'infos', title: 'Informations', fields: ['note_commercial'] };
  const recapIdx = def.steps.findIndex((s) => s.id === 'recap');
  const steps = recapIdx >= 0
    ? [...def.steps.slice(0, recapIdx), step, ...def.steps.slice(recapIdx)]
    : [...def.steps, step];
  return { ...def, fields: [...def.fields, field], steps };
}

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
      if (data) {
        if (data.active === false) return null;   // désactivé par l'admin (seed inclus)
        if (isV2(data.definition)) return withCommercialNote(data.definition as DefV2);
      }
    } catch {
      // Table absente ou ligne au format v1 → repli sur le seed.
    }
  }
  const seed = SEEDS[slug];
  return seed ? withCommercialNote(seed) : null;
}

/** Un slug correspond-il à un configurateur INTÉGRÉ (seed en dur) ? Un seed ne peut pas
 *  être supprimé (c'est du code) — seulement désactivé. */
export function isSeedConfigurator(slug: string): boolean {
  return slug in SEEDS;
}

/** Définition BRUTE (base si présente, sinon seed) — sans le filtre « désactivé » ni la
 *  note commerciale. Sert au back-office (ré/activer, archiver). */
export async function rawConfiguratorDef(slug: string): Promise<DefV2 | null> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.from('configurators').select('definition').eq('slug', slug).single();
      if (data && isV2(data.definition)) return data.definition as DefV2;
    } catch { /* repli seed */ }
  }
  return SEEDS[slug] ?? null;
}

export interface ConfiguratorListItem {
  slug: string; name: string; famille: string; active: boolean;
  source: 'seed' | 'db'; hasSeed: boolean; updatedAt?: string;
}

/** Liste fusionnée seeds + base (la base prime), avec l'état actif/désactivé. */
export async function listConfigurators(): Promise<ConfiguratorListItem[]> {
  const map = new Map<string, ConfiguratorListItem>();
  for (const b of builtinConfigurators()) {
    map.set(b.slug, { ...b, active: true, source: 'seed', hasSeed: true });
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.from('configurators').select('slug, name, famille, active, updated_at');
      for (const r of data ?? []) {
        map.set(r.slug, {
          slug: r.slug, name: r.name, famille: r.famille, active: r.active,
          source: 'db', hasSeed: isSeedConfigurator(r.slug), updatedAt: r.updated_at,
        });
      }
    } catch { /* table absente → seeds seuls */ }
  }
  return [...map.values()];
}
