import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { products, categories, brands } from '@/lib/catalog/mock';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CatalogueClient } from '@/components/catalogue/CatalogueClient';
import type { Brand } from '@/lib/catalog/types';

interface Props { params: { category: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = categories.find((c) => c.slug === params.category);
  if (!cat) return { title: 'Catalogue' };
  return {
    title: `${cat.name} — Catalogue`,
    description: `Tous les produits ${cat.name} de MN Fermetures. Prix HT, livraison franco Occitanie dès 400 € HT.`,
  };
}

export default function CataloguePage({ params }: Props) {
  const cat = categories.find((c) => c.slug === params.category);
  if (!cat) notFound();

  const catProducts = products.filter((p) => p.categorySlug === params.category);

  const brandSlugsInCat = new Set(
    catProducts.map((p) => p.brandSlug).filter(Boolean) as string[]
  );
  const brandsInCat: Brand[] = brands.filter((b) => brandSlugsInCat.has(b.slug));

  return (
    <div className="wrap cat-page">
      <Breadcrumb crumbs={[
        { label: 'Accueil', href: '/' },
        { label: 'Catalogue' },
        { label: cat.name },
      ]} />

      <CatalogueClient
        products={catProducts}
        category={cat}
        allCategories={categories}
        brandsInCat={brandsInCat}
      />
    </div>
  );
}
