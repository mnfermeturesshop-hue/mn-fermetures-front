import Link from 'next/link';
import { categories, getFeatured, getProductBySlug } from '@/lib/catalog/mock';
import { isMatrix } from '@/lib/catalog/types';
import { ProductCard } from '@/components/product/ProductCard';
import { TablierConfigurator } from '@/components/product/TablierConfigurator';

export default function HomePage() {
  const tablier = getProductBySlug('tablier-pvc-40');
  const featured = getFeatured();

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <div className="grid">
            <div>
              <span className="eyebrow">Accessoires volets roulants · Tarif 2026</span>
              <h1>Tout le sur‑mesure du volet roulant, à la référence près.</h1>
              <p className="lead">
                Tabliers, kits axes, motorisations Somfy &amp; MN, profilés et pièces détachées.
                Un prix juste, calculé à la dimension.
              </p>
              <div className="cta-row">
                <Link className="btn solid" href="/catalogue/tabliers">Voir le catalogue</Link>
                <Link className="btn ghost" href="/panier">Demander un devis</Link>
              </div>
            </div>
            {tablier && isMatrix(tablier) && <TablierConfigurator product={tablier} />}
          </div>
        </div>
      </section>

      {/* FAMILLES */}
      <section className="block">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Univers produits</span>
              <h2>Parcourir par famille</h2>
            </div>
          </div>
          <div className="catgrid">
            {categories.map((c) => (
              <Link className="cat" href={`/catalogue/${c.slug}`} key={c.slug}>
                <div className="ic">{c.icon}</div>
                <b>{c.name}</b>
                <span>Voir les références</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* À LA UNE */}
      <section className="block alt">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">2026</span>
              <h2>Les références à la une</h2>
            </div>
            <Link className="link-all" href="/catalogue/tabliers">Tout le catalogue →</Link>
          </div>
          <div className="prods">
            {featured.map((p) => (
              <ProductCard product={p} key={p.slug} />
            ))}
          </div>
        </div>
      </section>

      {/* DOCUMENTATION */}
      <section className="block">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Aide à la pose</span>
              <h2>Documentation</h2>
            </div>
          </div>
          <div className="docs">
            {[
              ['48', 'Notices & plans de montage'],
              ['12', 'Fiches conseil'],
              ['9', 'Abaques moteurs'],
              ['2', 'Catalogues en ligne'],
            ].map(([n, label]) => (
              <div className="doc" key={label}>
                <div className="n">{n}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
