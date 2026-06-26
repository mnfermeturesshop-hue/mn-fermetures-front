import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { products, brands } from '@/lib/catalog/mock';
import { resolveMenuPath } from '@/lib/catalog/menuResolve';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CatalogueClient } from '@/components/catalogue/CatalogueClient';
import type { Brand } from '@/lib/catalog/types';

interface Props { params: { slug: string[] } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = resolveMenuPath(params.slug);
  if (!resolved) return { title: 'Catalogue' };
  return {
    title: `${resolved.name} — MN Fermetures`,
    description: `${resolved.name} — Prix HT, livraison franco Occitanie dès 400 € HT.`,
  };
}

export default function CataloguePage({ params }: Props) {
  const resolved = resolveMenuPath(params.slug);
  if (!resolved) notFound();

  const catProducts = products.filter((p) =>
    params.slug.some((s) => p.categorySlug === s)
  );

  const brandSlugsInCat = new Set(
    catProducts.map((p) => p.brandSlug).filter(Boolean) as string[]
  );
  const brandsInCat: Brand[] = brands.filter((b) => brandSlugsInCat.has(b.slug));

  return (
    <div className="wrap cat-page">
      <Breadcrumb crumbs={resolved.breadcrumbs} />
      <CatalogueClient
        products={catProducts}
        categoryName={resolved.name}
        navChildren={resolved.navChildren}
        currentHref={resolved.href}
        brandsInCat={brandsInCat}
      />
    </div>
  );
}
