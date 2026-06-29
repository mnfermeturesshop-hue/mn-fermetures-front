export const FAMILLES = [
  { slug: 'volet-roulant',  label: 'Volet roulant'    },
  { slug: 'porte-garage',   label: 'Porte de garage'  },
  { slug: 'volet-battant',  label: 'Volet battant'    },
  { slug: 'portail',        label: 'Portail'           },
  { slug: 'accessoires',    label: 'Accessoires'      },
] as const;

export type FamilleSlug = typeof FAMILLES[number]['slug'];
export type DiscountMap = Partial<Record<FamilleSlug, number>>;

/** Retourne le % de remise pour une famille donnée (0 si aucune). */
export function getDiscount(discounts: DiscountMap | undefined, famille: FamilleSlug | undefined): number {
  if (!discounts || !famille) return 0;
  return discounts[famille] ?? 0;
}

/** Applique une remise à un prix HT. */
export function applyDiscount(priceHT: number, discountPct: number): number {
  if (discountPct <= 0) return priceHT;
  return Math.round(priceHT * (1 - discountPct / 100) * 100) / 100;
}
