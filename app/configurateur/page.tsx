import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TablierGenerateur } from '@/components/tablier/TablierGenerateur';

export const metadata: Metadata = {
  title: 'Configurateur tablier — MM Fermetures',
  description: 'Calculez votre tablier de volet roulant sur mesure : PVC ou aluminium, 7 types de lames, prix HT instantané.',
};

export default function ConfigurateurPage() {
  return (
    <div className="wrap">
      <Breadcrumb
        crumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Configurateur tablier' },
        ]}
      />
      <div className="cfg-page-head">
        <span className="eyebrow">Tarif 2026 — sur mesure</span>
        <h1>Configurateur de tablier volet roulant</h1>
        <p className="lead">
          Choisissez la lame, le coloris, saisissez vos dimensions&nbsp;: le prix HT est calculé instantanément d&apos;après le barème fabricant.
        </p>
      </div>
      <TablierGenerateur />
    </div>
  );
}
