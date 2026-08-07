/* =====================================================================
   MN FERMETURES — Remises B2B hiérarchiques
   Une remise peut être posée à n'importe quel niveau (gamme / famille /
   sous‑famille). La remise EFFECTIVE d'un produit est la plus PRÉCISE définie
   en remontant sa chaîne : sous‑famille → famille → gamme. Source serveur
   (jamais le client) : `profiles.discounts` = { slug_de_nœud: % }.
   ===================================================================== */

import type { TaxonomyNode } from '@/lib/catalog/taxonomy';
import { chainSlugs, TAXONOMY_SEED } from '@/lib/catalog/taxonomy';
import { applyDiscount } from '@/lib/familles';

export type NodeDiscountMap = Record<string, number>; // slug de nœud → %

/** Correspondance anciennes familles plates → nœuds de la nomenclature
 *  (iso-comportement : une remise posée sur l'ancienne famille reste valable). */
export const LEGACY_FAMILLE_TO_NODE: Record<string, string> = {
  'volet-roulant': 'volets-roulants',
  'porte-garage': 'porte-de-garage',
  'volet-battant': 'volets-battants',
  portail: 'portails-clotures',
  accessoires: 'accessoires',
};

/** Nœud d'une ancienne clé de famille (sinon la clé telle quelle). */
export const legacyFamilleToNode = (famille: string | undefined): string | undefined =>
  famille ? (LEGACY_FAMILLE_TO_NODE[famille] ?? famille) : undefined;

/** Réécrit une carte de remises (clés anciennes familles → slugs de nœuds). */
export function normalizeDiscounts(discounts: Record<string, number> | undefined): NodeDiscountMap {
  const out: NodeDiscountMap = {};
  for (const [k, v] of Object.entries(discounts ?? {})) out[LEGACY_FAMILLE_TO_NODE[k] ?? k] = v;
  return out;
}

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

/** Remise B2B effective, tolérante aux anciennes clés/familles : normalise la
 *  carte de remises et mappe la famille/nœud avant de résoudre l'héritage. */
export function resolveB2BDiscount(
  discounts: Record<string, number> | undefined,
  nodeOrFamille: string | undefined,
  nodes: TaxonomyNode[],
): number {
  return resolveDiscount(normalizeDiscounts(discounts), legacyFamilleToNode(nodeOrFamille), nodes);
}

/** Variante d'affichage client : résout via le SEED de nomenclature (pas d'accès
 *  base). Le prix autoritaire est toujours recalculé serveur (`resolveB2BDiscount`
 *  avec la taxonomie en base) dans verifyCart. */
export function resolveB2BDiscountSeed(
  discounts: Record<string, number> | undefined,
  nodeOrFamille: string | undefined,
): number {
  return resolveB2BDiscount(discounts, nodeOrFamille, TAXONOMY_SEED);
}

/* =====================================================================
   Surcharge temporaire (PDG) — % positif posé sur un nœud, hérité comme les
   remises (la plus précise l'emporte) mais GLOBAL (pas par client). Stocké sur
   les nœuds (`taxonomy_nodes.surcharge`) ; résolu par la même mécanique.
   ===================================================================== */

/** Applique une surcharge % (positive) à un prix HT. */
export function applySurcharge(priceHT: number, pct: number): number {
  if (!pct || pct <= 0) return priceHT;
  return Math.round(priceHT * (1 + pct / 100) * 100) / 100;
}

/** Découpe un prix de base en : produit net (remise), + surcharge en sous-ligne
 *  (montant brut base×pct%, puis net après la même remise). */
export function splitB2BPrice(base: number, surchargePct: number, discountPct: number) {
  const productNet = applyDiscount(base, discountPct);
  const surchargeGross = surchargePct > 0 ? Math.round(base * surchargePct) / 100 : 0;
  const surchargeNet = surchargeGross > 0 ? applyDiscount(surchargeGross, discountPct) : 0;
  return { productNet, surchargeGross, surchargeNet };
}

/** Carte de surcharges (slug de nœud → %) à partir des nœuds de taxonomie. */
export function surchargeMapFromNodes(nodes: TaxonomyNode[]): NodeDiscountMap {
  const out: NodeDiscountMap = {};
  for (const n of nodes) if (typeof n.surcharge === 'number' && n.surcharge > 0) out[n.slug] = n.surcharge;
  return out;
}

/** Surcharge d'un produit — INDÉPENDANTE (pas d'héritage) : uniquement le taux
 *  posé sur le nœud EXACT du produit (typiquement une sous-famille). Contrairement
 *  aux remises client (héritées), une surcharge sur la gamme ne descend pas.
 *  Le 3e paramètre (nodes) est ignoré, conservé pour compat des appels. */
export function resolveB2BSurcharge(
  surcharges: NodeDiscountMap | undefined,
  nodeOrFamille: string | undefined,
  _nodes?: TaxonomyNode[],
): number {
  const node = legacyFamilleToNode(nodeOrFamille);
  const v = node ? surcharges?.[node] : undefined;
  return typeof v === 'number' && v > 0 ? v : 0;
}

/** Variante d'affichage client : résout via le SEED de nomenclature. */
export function resolveB2BSurchargeSeed(
  surcharges: NodeDiscountMap | undefined,
  nodeOrFamille: string | undefined,
): number {
  return resolveB2BSurcharge(surcharges, nodeOrFamille, TAXONOMY_SEED);
}

/* =====================================================================
   Éco-contribution (AGEC / Valobat) — montant en € posé par nœud. Résolution
   EXACTE (pas d'héritage), comme la surcharge : seul le montant du nœud du produit
   s'applique. Ajoutée une fois par produit, JAMAIS remisée ni surchargée.
   ===================================================================== */

/** Carte d'éco-contributions (slug de nœud → €) à partir des nœuds de taxonomie. */
export function ecoMapFromNodes(nodes: TaxonomyNode[]): NodeDiscountMap {
  const out: NodeDiscountMap = {};
  for (const n of nodes) if (typeof n.ecoContribution === 'number' && n.ecoContribution > 0) out[n.slug] = n.ecoContribution;
  return out;
}

/** Éco-contribution (€) d'un produit — nœud EXACT uniquement (0 sinon). */
export function resolveEco(
  eco: NodeDiscountMap | undefined,
  nodeOrFamille: string | undefined,
): number {
  const node = legacyFamilleToNode(nodeOrFamille);
  const v = node ? eco?.[node] : undefined;
  return typeof v === 'number' && v > 0 ? v : 0;
}

/** Alias d'affichage client (même résolution exacte). */
export const resolveEcoSeed = resolveEco;

export { applyDiscount };
