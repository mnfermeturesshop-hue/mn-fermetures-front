import type { Product } from './types';

/**
 * Masque les prix d'un produit AVANT envoi au navigateur (payload RSC compris).
 * Utilisé quand les prix sont réservés aux comptes connectés (PUBLIC_PRICES=false).
 *
 * Réutilise le mécanisme `proOnly` existant : tous les composants d'affichage
 * (ProductCard, fiche produit, configurateurs, StickyAddBar) savent déjà rendre
 * l'état « Prix réservé aux pros ». En plus du flag, les VALEURS de prix sont
 * vidées — regarder la source de la page ne révèle donc rien.
 *
 * Les informations produit non tarifaires (référence, specs, nomenclature,
 * dimensions disponibles, couleurs) restent visibles : elles servent la vitrine.
 */
export function maskProductPrices(p: Product): Product {
  if (p.pricingType === 'unit') {
    return { ...p, proOnly: true, variants: p.variants.map((v) => ({ ...v, priceHT: 0 })) };
  }
  if (p.pricingType === 'matrix') {
    return { ...p, proOnly: true, grid: {}, options: [] };
  }
  return { ...p, proOnly: true, configs: p.configs.map((c) => ({ ...c, priceHT: 0 })) };
}
