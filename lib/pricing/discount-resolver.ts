/* =====================================================================
   MN FERMETURES — Remises B2B hiérarchiques
   Une remise peut être posée à n'importe quel niveau (gamme / famille /
   sous‑famille). La remise EFFECTIVE d'un produit est la plus PRÉCISE définie
   en remontant sa chaîne : sous‑famille → famille → gamme. Source serveur
   (jamais le client) : `profiles.discounts` = { slug_de_nœud: % }.
   ===================================================================== */

import type { TaxonomyNode } from '@/lib/catalog/taxonomy';
import { chainSlugs } from '@/lib/catalog/taxonomy';
import { applyDiscount } from '@/lib/familles';

export type NodeDiscountMap = Record<string, number>; // slug de nœud → %

/** Remise effective (héritée) pour un nœud ; 0 si aucune sur la chaîne. */
export function resolveDiscount(
  discounts: NodeDiscountMap | undefined,
  nodeSlug: string | undefined,
  nodes: TaxonomyNode[],
): number {
  if (!discounts || !nodeSlug) return 0;
  for (const slug of chainSlugs(nodes, nodeSlug)) {
    const v = discounts[slug];
    if (typeof v === 'number' && v > 0) return v;
  }
  return 0;
}

export { applyDiscount };
