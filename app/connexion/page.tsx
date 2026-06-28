import type { Metadata } from 'next';
import { HomeEspaces } from '@/components/home/HomeEspaces';

export const metadata: Metadata = {
  title: 'Connexion — MM Fermetures',
  description: 'Connectez-vous à votre espace particulier ou professionnel MM Fermetures.',
};

export default function ConnexionPage() {
  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <span className="eyebrow">Mon espace</span>
        <h1 style={{ fontSize: 'clamp(22px, 3vw, 32px)', margin: '8px 0 0' }}>
          Connexion
        </h1>
      </div>
      <HomeEspaces standalone />
    </div>
  );
}
