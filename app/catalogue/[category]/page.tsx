import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllProducts, getAllBrands } from '@/lib/catalog/db';
import { resolveMenuPath } from '@/lib/catalog/menuResolve';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CatalogueClient } from '@/components/catalogue/CatalogueClient';

interface Props { params: { category: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = resolveMenuPath([params.category]);
  if (!resolved) return { title: 'Catalogue' };
  return {
    title: `${resolved.name} — MN Fermetures`,
    description: `${resolved.name} — Prix HT, livraison franco Occitanie dès 400 € HT.`,
  };
}

export default async function CataloguePage({ params }: Props) {
  const resolved = resolveMenuPath([params.category]);
  if (!resolved) notFound();

  const [allProducts, allBrands] = await Promise.all([getAllProducts(), getAllBrands()]);

  const catProducts = allProducts.filter((p) =>
    p.menuPath
      ? p.menuPath.startsWith(resolved.href)
      : p.categorySlug === params.category
  );

  const brandSlugsInCat = new Set(
    catProducts.map((p) => p.brandSlug).filter(Boolean) as string[]
  );
  const brandsInCat = allBrands.filter((b) => brandSlugsInCat.has(b.slug));

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
