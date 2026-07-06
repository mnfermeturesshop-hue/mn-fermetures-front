export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllProducts, getAllBrands } from '@/lib/catalog/db';
import { resolveMenuPath } from '@/lib/catalog/menuResolve';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CatalogueClient } from '@/components/catalogue/CatalogueClient';
import { TablierGenerateur } from '@/components/tablier/TablierGenerateur';
import { maskProductPrices } from '@/lib/catalog/maskPrices';
import { pricesVisible } from '@/lib/pricing/visibility';

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

  const [rawProducts, allBrands, showPrices] = await Promise.all([
    getAllProducts(),
    getAllBrands(),
    pricesVisible(),
  ]);
  // Prix réservés aux connectés : masqués avant envoi au navigateur
  const allProducts = showPrices ? rawProducts : rawProducts.map(maskProductPrices);

  const catProducts = allProducts.filter((p) =>
    p.menuPath
      ? p.menuPath.startsWith(resolved.href)
      : p.categorySlug === params.category
  );

  const brandSlugsInCat = new Set(
    catProducts.map((p) => p.brandSlug).filter(Boolean) as string[]
  );
  const brandsInCat = allBrands.filter((b) => brandSlugsInCat.has(b.slug));

  const isTabliers = params.category === 'tabliers';

  return (
    <div className="wrap cat-page">
      <Breadcrumb crumbs={resolved.breadcrumbs} />

      {isTabliers && (
        <section className="block cfg-catalogue-block">
          <div className="cfg-catalogue-head">
            <span className="eyebrow">Tarif 2026 — sur mesure</span>
            <h2>Configurateur de tablier</h2>
            <p>Sélectionnez la lame, le coloris et les dimensions pour obtenir votre prix HT instantanément.</p>
          </div>
          <TablierGenerateur />
        </section>
      )}

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
