/**
 * Barème de port & TVA — source unique partagée client ET serveur.
 * Aucun `'use client'` ici : ce module doit rester importable depuis les
 * routes API (calcul autoritaire des montants, cf. audit S2).
 */

export type ShippingMethod = 'standard' | 'express';

export const TVA_RATE = 0.20;

/** Seuil de franco de port (HT). Au-delà, le port standard est offert. */
export const FRANCO_SEUIL_HT = 400;

/**
 * Forfait laquage (coloris RAL laqués) : facturé UNE fois par commande, offert
 * dès `LAQUAGE_FRANCO_HT` de commande nette (tarif fabricant p39).
 */
export const LAQUAGE_FORFAIT_HT = 77;
export const LAQUAGE_FRANCO_HT = 2000;

/** Montant du forfait laquage pour une commande : 0 si aucune ligne laquée ou franco. */
export function laquageForfaitHT(productsHT: number, hasLaque: boolean): number {
  return hasLaque && productsHT < LAQUAGE_FRANCO_HT ? LAQUAGE_FORFAIT_HT : 0;
}

const SHIPPING_PRICE: Record<ShippingMethod, number> = {
  standard: 26, // offert si franco
  express: 42,
};

export function isFranco(totalHT: number): boolean {
  return totalHT >= FRANCO_SEUIL_HT;
}

export function shippingCostHT(method: ShippingMethod, franco: boolean): number {
  if (method === 'standard' && franco) return 0;
  return SHIPPING_PRICE[method];
}

/**
 * Totaux d'une commande à partir du sous-total produits HT (déjà vérifié
 * côté serveur) et du mode de livraison. Arrondi au centime.
 */
export function computeOrderTotals(productsHT: number, method: ShippingMethod, laquageHT = 0): {
  fraisHT: number;
  laquageHT: number;
  totalHT: number;
  totalTTC: number;
} {
  const fraisHT = shippingCostHT(method, isFranco(productsHT));
  const totalHT = Math.round((productsHT + fraisHT + laquageHT) * 100) / 100;
  const totalTTC = Math.round(totalHT * (1 + TVA_RATE) * 100) / 100;
  return { fraisHT, laquageHT, totalHT, totalTTC };
}
