export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllProducts } from '@/lib/catalog/db';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { recomputeCodes, children, chainSlugs, bySlug, type TaxonomyNode } from '@/lib/catalog/taxonomy';
import { productsInSubtree, generatorsInSubtree } from '@/lib/catalog/taxonomy-nav';
import { ProductCard } from '@/components/product/ProductCard';
import { maskProductPrices } from '@/lib/catalog/maskPrices';
import { pricesVisible } from '@/lib/pricing/visibility';

interface Props { params: { path?: string[] } }

/** Chemin canonique d'un nœud : /gammes/<gamme>/<famille>/<sous‑famille>. */
function hrefFor(nodes: TaxonomyNode[], node: TaxonomyNode): string {
  return '/gammes/' + chainSlugs(nodes, node.slug).reverse().map((s) => s).join('/');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const nodes = await getTaxonomy();
  const slug = params.path?.[params.path.length - 1];
  const node = slug ? bySlug(nodes).get(slug) : undefined;
  const name = node ? node.name : 'Nos gammes';
  return {
    title: `${name} — MN Fermetures`,
    description: `${name} — catalogue professionnel, prix HT, livraison franco Occitanie dès 400 € HT.`,
  };
}

export default async function GammesPage({ params }: Props) {
  const path = params.path ?? [];
  const nodes = recomputeCodes(await getTaxonomy());
  const map = bySlug(nodes);
  const currentSlug = path[path.length - 1];
  const current = currentSlug ? map.get(currentSlug) : undefined;
  if (currentSlug && !current) notFound();

  const subNodes = children(nodes, current ? current.slug : null); // actifs, triés
  const [rawProducts, showPrices] = await Promise.all([getAllProducts(), pricesVisible()]);
  const products = showPrices ? rawProducts : rawProducts.map(maskProductPrices);
  const nodeProducts = current ? productsInSubtree(products, nodes, current.slug) : [];
  const generators = current ? generatorsInSubtree(nodes, current.slug) : [];

  const chain = current ? chainSlugs(nodes, current.slug).map((s) => map.get(s)!).reverse() : [];

  return (
    <div className="gam-page">
      <nav className="gam-crumbs" aria-label="Fil d'ariane">
        <Link href="/">Accueil</Link>
        <span>›</span>
        <Link href="/gammes">Nos gammes</Link>
        {chain.map((n, i) => (
          <span key={n.slug} className="gam-crumb">
            <span>›</span>
            {i === chain.length - 1
              ? <b>{n.name}</b>
              : <Link href={hrefFor(nodes, n)}>{n.name}</Link>}
          </span>
        ))}
      </nav>

      <header className="gam-head">
        <h1>{current ? current.name : 'Nos gammes'}</h1>
        {current && <span className="gam-code">{current.code}</span>}
      </header>

      {/* Générateurs (configurateurs sur mesure) rattachés à ce niveau */}
      {generators.length > 0 && (
        <section className="gam-gens">
          {generators.map((g) => (
            <Link key={g.slug} href={`/configurateur/${g.generatorSlug}`} className="gam-gen">
              <span className="gam-gen-ic">▦</span>
              <span>
                <b>Configurer sur mesure</b>
                <small>{g.name}</small>
              </span>
              <span className="gam-gen-go">→</span>
            </Link>
          ))}
        </section>
      )}

      {/* Sous‑catégories */}
      {subNodes.length > 0 && (
        <section>
          <h2 className="gam-h2">{current ? 'Sous‑catégories' : 'Choisissez une gamme'}</h2>
          <div className="gam-grid">
            {subNodes.map((n) => {
              const count = productsInSubtree(products, nodes, n.slug).length;
              return (
                <Link key={n.slug} href={hrefFor(nodes, n)} className="gam-card">
                  <span className="gam-card-code">{n.code}</span>
                  <b className="gam-card-name">{n.name}</b>
                  <small className="gam-card-meta">
                    {count > 0 ? `${count} produit${count > 1 ? 's' : ''}` : 'Voir la sélection'}
                  </small>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Produits rattachés */}
      {nodeProducts.length > 0 && (
        <section>
          <h2 className="gam-h2">Produits</h2>
          <div className="gam-products">
            {nodeProducts.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </section>
      )}

      {current && subNodes.length === 0 && nodeProducts.length === 0 && generators.length === 0 && (
        <div className="gam-empty">
          <p>Aucun produit rattaché à cette catégorie pour le moment.</p>
          <p className="gam-empty-sub">Les produits apparaîtront ici une fois rattachés à la nomenclature depuis l’administration.</p>
        </div>
      )}
    </div>
  );
}
