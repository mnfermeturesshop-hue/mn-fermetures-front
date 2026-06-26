import {
  type Product,
  type MatrixProduct,
  type MoneyHT,
  type PriceResolvers,
  isUnit,
  isMatrix,
  isKit,
} from './types';

/** Prix « à partir de » pour les cartes/listings. */
export function priceFrom(product: Product): MoneyHT {
  if (isUnit(product)) return Math.min(...product.variants.map((v) => v.priceHT));
  if (isKit(product)) return Math.min(...product.configs.map((c) => c.priceHT));
  // matrix : plus petite cellule non nulle
  const cells = Object.values(product.grid).flat().filter((v): v is number => v != null);
  return cells.length ? Math.min(...cells) : 0;
}

/** Résout le prix d'un tablier pour une dimension + options. null si hors abaque. */
export function resolveMatrixPrice(
  product: MatrixProduct,
  height: number,
  width: number,
  optionCodes: string[]
): MoneyHT | null {
  const wi = product.widths.indexOf(width);
  if (wi < 0) return null;
  const row = product.grid[height];
  if (!row) return null;
  const base = row[wi];
  if (base == null) return null;

  let total = base;
  for (const code of optionCodes) {
    const opt = product.options?.find((o) => o.code === code);
    if (opt) total += opt.valuesByWidth[width] ?? 0;
  }
  return total;
}

/** Implémentation du contrat ; les composants n'utilisent que ceci. */
export const resolvers: PriceResolvers = { priceFrom, resolveMatrixPrice };

export { isUnit, isMatrix, isKit };
