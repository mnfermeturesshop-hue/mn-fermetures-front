import { products, brands, categories } from './mock';
import type { Product } from './types';
import { isUnit, isKit } from './types';

export interface SearchResult {
  product: Product;
  score: number;
  matchedField: 'reference' | 'name' | 'category' | 'brand' | 'description';
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function refs(p: Product): string[] {
  if (isUnit(p)) return p.variants.map((v) => v.reference);
  if (isKit(p)) return p.configs.map((c) => c.reference);
  return [];
}

export function searchProducts(query: string, limit = 24): SearchResult[] {
  const q = norm(query);
  if (q.length < 2) return [];

  const results: SearchResult[] = [];

  for (const product of products) {
    const name = norm(product.name);
    const productRefs = refs(product).map(norm);
    const desc = norm(product.description ?? '');
    const catName = norm(categories.find((c) => c.slug === product.categorySlug)?.name ?? '');
    const brandName = norm(brands.find((b) => b.slug === product.brandSlug)?.name ?? '');

    let score = 0;
    let matchedField: SearchResult['matchedField'] = 'name';

    if (productRefs.some((r) => r === q || r.startsWith(q))) {
      score = 110;
      matchedField = 'reference';
    } else if (productRefs.some((r) => r.includes(q))) {
      score = 90;
      matchedField = 'reference';
    } else if (name === q) {
      score = 80;
      matchedField = 'name';
    } else if (name.startsWith(q)) {
      score = 70;
      matchedField = 'name';
    } else if (name.includes(q)) {
      score = 55;
      matchedField = 'name';
    } else if (brandName.includes(q)) {
      score = 40;
      matchedField = 'brand';
    } else if (catName.includes(q)) {
      score = 35;
      matchedField = 'category';
    } else if (desc.includes(q)) {
      score = 20;
      matchedField = 'description';
    }

    if (score > 0) results.push({ product, score, matchedField });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Suggestions pour l'autocomplete (top 6 résultats). */
export function suggest(query: string): SearchResult[] {
  return searchProducts(query, 6);
}

/** Tous les produits d'une catégorie, filtrés + triés. */
export interface CatalogFilter {
  brandSlugs: string[];
  inStockOnly: boolean;
  maxPrice: number | null;
}

export type SortKey = 'pertinence' | 'prix-asc' | 'prix-desc';

export function filterProducts(
  categorySlug: string,
  filter: CatalogFilter,
  sort: SortKey
): Product[] {
  let list = products.filter((p) => p.categorySlug === categorySlug);

  if (filter.brandSlugs.length > 0) {
    list = list.filter((p) => p.brandSlug && filter.brandSlugs.includes(p.brandSlug));
  }

  if (filter.inStockOnly) {
    list = list.filter((p) => {
      if (isUnit(p)) return p.variants.some((v) => v.inStock);
      return true;
    });
  }

  if (filter.maxPrice !== null) {
    const { priceFrom } = require('./resolvePrice');
    list = list.filter((p) => priceFrom(p) <= (filter.maxPrice as number));
  }

  if (sort === 'prix-asc') {
    const { priceFrom } = require('./resolvePrice');
    list = [...list].sort((a, b) => priceFrom(a) - priceFrom(b));
  } else if (sort === 'prix-desc') {
    const { priceFrom } = require('./resolvePrice');
    list = [...list].sort((a, b) => priceFrom(b) - priceFrom(a));
  }

  return list;
}
