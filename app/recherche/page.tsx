export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getAllProducts, getAllBrands, getAllCategories } from '@/lib/catalog/db';
import { searchProducts } from '@/lib/catalog/search';
import type { Product } from '@/lib/catalog/types';
import { RechercheClient } from './RechercheClient';

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
    const [products, brands, categories] = await Promise.all([
      getAllProducts(),
      getAllBrands(),
      getAllCategories(),
    ]);
    results = searchProducts(q, products, brands, categories, 48).map((r) => r.product);
  }

  return <RechercheClient query={q} results={results} />;
}
