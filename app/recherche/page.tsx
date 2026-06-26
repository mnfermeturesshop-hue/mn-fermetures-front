import type { Metadata } from 'next';
import Link from 'next/link';
import { searchProducts } from '@/lib/catalog/search';
import { categories, getBrand } from '@/lib/catalog/mock';
import { ProductCard } from '@/components/product/ProductCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import type { Product } from '@/lib/catalog/types';

interface Props { searchParams: { q?: string } }

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = searchParams.q ?? '';
  return {
    title: q ? `Résultats pour « ${q} »` : 'Recherche',
    robots: { index: false },
  };
}

export default function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? '').trim();
  const results = q.length >= 2 ? searchProducts(q) : [];

  const byCategory = results.reduce<Record<string, Product[]>>((acc, r) => {
    const slug = r.product.categorySlug;
    if (!acc[slug]) acc[slug] = [];
    acc[slug].push(r.product);
    return acc;
  }, {});

  const catSlugs = Object.keys(byCategory);

  return (
    <div className="wrap search-page">
      <Breadcrumb crumbs={[
        { label: 'Accueil', href: '/' },
        { label: 'Recherche' },
      ]} />

      <div className="search-header">
        {q ? (
          <>
            <h1>
              {results.length > 0
                ? `${results.length} résultat${results.length > 1 ? 's' : ''} pour « ${q} »`
                : `Aucun résultat pour « ${q} »`}
            </h1>
            {results.length === 0 && (
              <div className="search-empty">
                <p>Essayez avec une autre référence ou un terme différent.</p>
                <div className="search-tips">
                  <div className="search-tip-title">Suggestions :</div>
                  <ul>
                    <li>Vérifiez l&apos;orthographe de la référence</li>
                    <li>Utilisez des mots plus généraux (ex. « moteur » plutôt que « moteur 10nm »)</li>
                    <li>Parcourez le catalogue par famille de produits</li>
                  </ul>
                </div>
                <div className="search-cats">
                  {categories.map((c) => (
                    <Link key={c.slug} href={`/catalogue/${c.slug}`} className="search-cat-pill">
                      {c.icon} {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <h1>Recherche</h1>
        )}
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {catSlugs.map((slug) => {
            const cat = categories.find((c) => c.slug === slug);
            const catProds = byCategory[slug];
            return (
              <section key={slug} className="search-section">
                <div className="search-section-head">
                  <h2>
                    {cat?.icon && <span>{cat.icon}</span>} {cat?.name ?? slug}
                  </h2>
                  <Link href={`/catalogue/${slug}`} className="link-all">
                    Voir toute la famille →
                  </Link>
                </div>
                <div className="prods">
                  {catProds.map((p) => (
                    <ProductCard key={p.slug} product={p} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
