/* Helpers de navigation dérivée de la nomenclature (catalogue /gammes).
   Rattachement d'un produit à un nœud = product.taxonomySlug, avec repli sur
   l'ancienne famille plate (legacyFamilleToNode) le temps de la migration. */

import type { Product } from '@/lib/catalog/types';
import type { TaxonomyNode } from '@/lib/catalog/taxonomy';
import { legacyFamilleToNode } from '@/lib/pricing/discount-resolver';

/** Nœud de rattachement effectif d'un produit (taxonomySlug sinon famille mappée). */
export function productNode(p: Product): string | undefined {
  return p.taxonomySlug ?? legacyFamilleToNode(p.famille);
}

/** Le nœud + tous ses descendants (slugs). */
export function subtreeSlugs(nodes: TaxonomyNode[], slug: string): Set<string> {
  const byParent = new Map<string | null, TaxonomyNode[]>();
  for (const n of nodes) {
    const k = n.parentSlug;
    (byParent.get(k) ?? byParent.set(k, []).get(k)!).push(n);
  }
  const out = new Set<string>();
  const walk = (s: string) => { out.add(s); for (const c of byParent.get(s) ?? []) walk(c.slug); };
  walk(slug);
  return out;
}

/** Produits rattachés à un nœud (par défaut : lui + ses descendants). */
export function productsInSubtree(products: Product[], nodes: TaxonomyNode[], slug: string): Product[] {
  const subtree = subtreeSlugs(nodes, slug);
  return products.filter((p) => { const n = productNode(p); return n ? subtree.has(n) : false; });
}

/** Nœuds porteurs d'un générateur dans le sous‑arbre d'un nœud. */
export function generatorsInSubtree(nodes: TaxonomyNode[], slug: string): TaxonomyNode[] {
  const subtree = subtreeSlugs(nodes, slug);
  return nodes.filter((n) => n.generatorSlug && subtree.has(n.slug));
}
