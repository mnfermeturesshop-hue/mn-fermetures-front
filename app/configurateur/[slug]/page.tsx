import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ConfigurateurProduit } from '@/components/configurateur/ConfigurateurProduit';
import { loadConfiguratorDef } from '@/lib/configurateur/loader';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const def = await loadConfiguratorDef(params.slug);
  const name = def?.name ?? 'Configurateur produit';
  return {
    title: `Configurateur ${name} — MN Fermetures`,
    description: `Configurez votre ${name.toLowerCase()} : pose, lame, motorisation, dimensions, coloris — prix HT instantané d'après le barème fabricant.`,
  };
}

export default async function ConfigurateurProduitPage({ params }: { params: { slug: string } }) {
  const def = await loadConfiguratorDef(params.slug);
  const name = def?.name ?? 'Produit';

  return (
    <div className="wrap">
      <Breadcrumb
        crumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Configurateur' },
          { label: name },
        ]}
      />
      <div className="cfg-page-head">
        <span className="eyebrow">Tarif 2026 — sur mesure</span>
        <h1>Configurateur {name}</h1>
        <p className="lead">
          Choisissez la pose, la lame, la motorisation et vos dimensions&nbsp;: le prix HT est calculé
          instantanément d&apos;après le barème fabricant.
        </p>
      </div>
      <ConfigurateurProduit slug={params.slug} />
    </div>
  );
}
