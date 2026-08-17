import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { listConfigurators } from '@/lib/configurateur/loader';
import { FEATURED_CONFIGURATORS } from '@/lib/configurateur/featured';

export const metadata: Metadata = {
  title: 'Configurateurs sur mesure — MN Fermetures',
  description: 'Tous nos configurateurs de fermetures sur mesure : volet roulant traditionnel, rénovation, store banne, tablier — prix HT instantané à la dimension.',
};

export default async function ConfigurateursPage() {
  // N'afficher que les configurateurs ACTIFS (désactivables depuis le back-office).
  let activeSlugs: Set<string>;
  try {
    const configs = await listConfigurators();
    activeSlugs = new Set(configs.filter((c) => c.active).map((c) => c.slug));
  } catch {
    activeSlugs = new Set(FEATURED_CONFIGURATORS.map((c) => c.slug));
  }
  const configurators = FEATURED_CONFIGURATORS.filter((c) => activeSlugs.has(c.slug));

  return (
    <div className="wrap">
      <Breadcrumb
        crumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Configurateur sur mesure' },
        ]}
      />
      <div className="cfg-page-head">
        <span className="eyebrow">Sur mesure — prix instantané</span>
        <h1>Configurateurs sur mesure</h1>
        <p className="lead">
          Choisissez votre produit à configurer&nbsp;: le prix HT net (remise pro déduite) est calculé
          instantanément d&apos;après le barème fabricant.
        </p>
      </div>

      <div className="config-grid">
        {configurators.map((c) => (
          <Link className="config-card" href={c.href} key={c.href}>
            <div className="config-ic">{c.icon}</div>
            <div className="config-body">
              <b>{c.name}</b>
              <span>{c.desc}</span>
            </div>
            <span className="config-cta">Configurer →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
