export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getAllProducts, getAllBrands, getAllCategories } from '@/lib/catalog/db';
import { searchProducts } from '@/lib/catalog/search';
import type { Product } from '@/lib/catalog/types';
import { RechercheClient } from './RechercheClient';
import { maskProductPrices } from '@/lib/catalog/maskPrices';
import { pricesVisible, getRequestHiddenNodes } from '@/lib/pricing/visibility';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { isNodeHidden } from '@/lib/pricing/discount-resolver';

export const metadata: Metadata = {
  title: 'Recherche — MN Fermetures',
  description: 'Recherchez un produit par référence, nom ou marque.',
};

interface Props {
  searchParams: { q?: string };
}

export default async function Page({ searchParams }: Props) {
  const q = (searchParams.q ?? '').trim();
  let results: Product[] = [];

  if (q.length >= 2) {
    const [products, brands, categories, showPrices, hidden] = await Promise.all([
      getAllProducts(),
      getAllBrands(),
      getAllCategories(),
      pricesVisible(),
      getRequestHiddenNodes(),
    ]);
    // Masquage par client : exclure les produits dont le nœud (ou un ancêtre) est masqué.
    const taxonomy = hidden.length > 0 ? await getTaxonomy() : [];
    results = searchProducts(q, products, brands, categories, 48)
      .filter((r) => !(hidden.length > 0 && isNodeHidden(hidden, r.product.taxonomySlug ?? r.product.famille, taxonomy)))
      .map((r) => (showPrices ? r.product : maskProductPrices(r.product)));
  }

  return <RechercheClient query={q} results={results} />;
}
