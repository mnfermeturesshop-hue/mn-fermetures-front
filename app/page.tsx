import Link from 'next/link';
import { getAllProducts, getProductBySlugDB } from '@/lib/catalog/db';
import { MENU } from '@/lib/catalog/mock';
import { isMatrix } from '@/lib/catalog/types';
import { ProductCard } from '@/components/product/ProductCard';
import { TablierConfigurator } from '@/components/product/TablierConfigurator';
import { FindMyPart } from '@/components/ui/FindMyPart';
import { HomeEspaces } from '@/components/home/HomeEspaces';
import { TablierGenerateur } from '@/components/tablier/TablierGenerateur';

export default async function HomePage() {
  const [allProducts, tablier] = await Promise.all([
    getAllProducts(),
    getProductBySlugDB('tablier-pvc-40'),
  ]);

  const featured = allProducts.slice(0, 6);

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
            {MENU.map((item) => (
              <Link className="cat" href={item.href} key={item.href}>
                <div className="ic">{item.icon}</div>
                <b>{item.name}</b>
                <span>Voir les références</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* GUIDE "TROUVER MA PIÈCE" */}
      <section className="block">
        <div className="wrap">
          <FindMyPart />
        </div>
      </section>

      {/* À LA UNE */}
      {featured.length > 0 && (
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
      )}

      {/* CONFIGURATEUR TABLIER */}
      <section className="block alt">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Sur mesure — Tarif 2026</span>
              <h2>Configurateur de tablier volet roulant</h2>
            </div>
            <Link className="link-all" href="/configurateur">Ouvrir en plein écran →</Link>
          </div>
          <p style={{ marginBottom: 32, color: 'var(--muted)', fontSize: 15 }}>
            7 types de lames PVC &amp; aluminium, 10 coloris, calcul du prix HT instantané selon les dimensions saisies.
          </p>
          <TablierGenerateur />
        </div>
      </section>

      {/* ESPACES CLIENTS */}
      <HomeEspaces />

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
