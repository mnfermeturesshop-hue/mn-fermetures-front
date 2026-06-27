export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductBySlugDB, getAllBrands, getAllCategories, getProductsByCategory } from '@/lib/catalog/db';
import { isUnit, isMatrix, isKit } from '@/lib/catalog/types';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { TablierConfigurator } from '@/components/product/TablierConfigurator';
import { KitConfigurator } from '@/components/product/KitConfigurator';
import { UnitProductPanel } from '@/components/product/UnitProductPanel';
import { StickyAddBar } from '@/components/product/StickyAddBar';
import { ReassuranceStrip } from '@/components/ui/ReassuranceStrip';
import { ProductCard } from '@/components/product/ProductCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import Link from 'next/link';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlugDB(params.slug);
  if (!product) return { title: 'Produit introuvable' };
  return {
    title: product.name,
    description: product.description ?? `${product.name} — MN Fermetures`,
  };
}

const GLYPHS: Record<string, string> = {
  tabliers: '▤', 'kits-axes': '⚙', motorisations: '⊙', commandes: '⎚',
  profils: '▬', consoles: '◳', embouts: '◖', verrouillages: '⛓',
};

const PILL: Record<string, { cls: string; label: string }> = {
  matrix: { cls: 'matrix', label: 'Sur mesure' },
  kit:    { cls: 'kit',    label: 'Kit monté' },
  unit:   { cls: 'unit',   label: "À l'unité" },
};

export default async function ProductPage({ params }: Props) {
  const [product, allBrands, allCategories] = await Promise.all([
    getProductBySlugDB(params.slug),
    getAllBrands(),
    getAllCategories(),
  ]);
  if (!product) notFound();

  // Produits associés : composants du kit (référence croisée) OU même catégorie
  const catProducts = await getProductsByCategory(product.categorySlug);

  let related = catProducts.filter((p) => p.slug !== product.slug).slice(0, 4);

  // Pour les kits : mettre en avant les composants vendus séparément
  if (isKit(product)) {
    const bomRefs = product.configs.flatMap((c) =>
      c.bom.map((b) => b.componentReference).filter(Boolean)
    ) as string[];

    if (bomRefs.length > 0) {
      const allCat = await getProductsByCategory(product.categorySlug);
      const byRef = allCat.filter((p) =>
        isUnit(p) && p.variants.some((v) => bomRefs.includes(v.reference))
      );
      if (byRef.length > 0) related = byRef.slice(0, 4);
    }
  }

  const brand    = allBrands.find((b) => b.slug === product.brandSlug);
  const category = allCategories.find((c) => c.slug === product.categorySlug);
  const pill     = PILL[product.pricingType] ?? PILL.unit;
  const prixFrom = priceFrom(product);
  const specs    = product.specs ? Object.entries(product.specs) : [];

  const crumbs = [
    { label: 'Accueil', href: '/' },
    { label: category?.name ?? product.categorySlug, href: `/catalogue/${product.categorySlug}` },
    { label: product.name },
  ];

  return (
    <div className="wrap prod-page">
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd crumbs={crumbs} />
      <Breadcrumb crumbs={crumbs} />

      <div className="prod-layout">
        {/* Visuel */}
        <div className="prod-visual">
          <div className="prod-thumb">
            <span className={`pill ${pill.cls}`}>{pill.label}</span>
            {brand && <span className="brandchip">{brand.name.toUpperCase()}</span>}
            {product.imageUrl ? (
              <ZoomableImage
                src={product.imageUrl}
                alt={product.name}
                sizes="(max-width:768px) 100vw, 560px"
              />
            ) : (
              <span className="prod-glyph">{GLYPHS[product.categorySlug] ?? '▣'}</span>
            )}
          </div>

          {isUnit(product) && product.variants.length > 1 && product.variants.some((v) => v.color) && (
            <div className="prod-swatches">
              {product.variants.map((v) => v.color && (
                <span
                  key={v.reference}
                  className="sw lg"
                  title={v.color.label}
                  style={{ background: v.color.hex }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Infos + configurateur */}
        <div className="prod-info">
          <h1 className="prod-h1">{product.name}</h1>

          {isUnit(product) && product.variants[0]?.reference && (
            <div className="ref prod-ref">{product.variants[0].reference}</div>
          )}

          {brand && (
            <div className="prod-brand">
              Marque : <strong>{brand.name}</strong>
            </div>
          )}

          {product.description && (
            <p className="prod-desc">{product.description}</p>
          )}

          {specs.length > 0 && (
            <table className="prod-specs">
              <tbody>
                {specs.map(([k, v]) => (
                  <tr key={k}>
                    <td>{k.replace(/_/g, ' ')}</td>
                    <td>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {product.proOnly ? (
            <div className="pro-gate">
              <p>Ce produit est réservé aux professionnels.</p>
              <Link className="btn solid" href="/pro">Accéder à l&apos;espace pro</Link>
            </div>
          ) : (
            <>
              {isUnit(product) && (
                <>
                  <div className="prod-price-hint">
                    À partir de <strong>
                      {prixFrom.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </strong> HT
                  </div>
                  <div id="unit-panel">
                    <UnitProductPanel product={product} />
                  </div>
                  <StickyAddBar product={product} panelId="unit-panel" />
                </>
              )}
              {isMatrix(product) && <TablierConfigurator product={product} />}
              {isKit(product) && <KitConfigurator product={product} />}
              <ReassuranceStrip />
            </>
          )}
        </div>
      </div>

      {/* Produits associés */}
      {related.length > 0 && (
        <section className="prod-related">
          <div className="prod-related-head">
            <h2>
              {isKit(product) ? 'Composants & références associées' : 'Dans la même famille'}
            </h2>
            <Link className="link-all" href={`/catalogue/${product.categorySlug}`}>
              Voir tout {category?.name} →
            </Link>
          </div>
          <div className="prods">
            {related.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </section>
      )}

      {related.length === 0 && (
        <div className="prod-related">
          <Link className="link-all" href={`/catalogue/${product.categorySlug}`}>
            Voir tout le catalogue {category?.name} →
          </Link>
        </div>
      )}
    </div>
  );
}
