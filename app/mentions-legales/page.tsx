import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = {
  title: 'Mentions légales — MN Fermetures',
  description: 'Mentions légales du site MN Fermetures.',
};

/* ⚠️ MODÈLE À RELIRE ET VALIDER par MN Fermetures avant publication.
   Les champs entre [crochets] sont à compléter (capital social, RCS complet,
   directeur de publication, TVA intracommunautaire…). */
export default function MentionsLegalesPage() {
  return (
    <div className="wrap" style={{ maxWidth: 820, paddingTop: 24, paddingBottom: 64 }}>
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Mentions légales' }]} />

      <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--navy-700)', margin: '16px 0 4px' }}>
        Mentions légales
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 28px' }}>Dernière mise à jour : août 2026</p>

      <div className="cgv-body">
        <section>
          <h2>Éditeur du site</h2>
          <p>
            <strong>MN FERMETURES SAS</strong><br />
            Chemin du Mas de Pastrou — 34560 Villeveyrac (France)<br />
            Second site : 2066 Av. Marcel Pagnol — 34470 Pérols<br />
            Téléphone : 04 67 78 06 63 — E-mail : contact@mnfermetures.fr<br />
            SIRET : 790 910 574 00033 — RCS Montpellier 790 910 574 — Code APE 25.12Z<br />
            Capital social : 581 300 € — TVA intracommunautaire : FR 87 790 910 574<br />
            Directeur de la publication : Pierre Marques
          </p>
        </section>

        <section>
          <h2>Hébergeur</h2>
          <p>
            Le site est hébergé par <strong>Vercel Inc.</strong><br />
            340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis — vercel.com
          </p>
          <p>
            Base de données et authentification : <strong>Supabase</strong>. Ces prestataires
            interviennent en qualité de sous-traitants (voir la <a href="/confidentialite">politique de confidentialité</a>).
          </p>
        </section>

        <section>
          <h2>Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus du site (textes, visuels, logos, structure, base de données) est protégé
            par le droit de la propriété intellectuelle. Toute reproduction ou réutilisation sans autorisation
            écrite préalable de MN Fermetures est interdite. Les marques et logos de tiers (ex. Somfy) restent
            la propriété de leurs titulaires respectifs.
          </p>
        </section>

        <section>
          <h2>Responsabilité</h2>
          <p>
            MN Fermetures s'efforce d'assurer l'exactitude des informations diffusées (prix HT, disponibilités,
            caractéristiques). Ces informations sont susceptibles d'évoluer selon la configuration technique
            retenue et la disponibilité des produits. Seul l'Accusé de Réception de Commande (ARC) fait foi.
          </p>
        </section>

        <section>
          <h2>Données personnelles &amp; cookies</h2>
          <p>
            Le traitement de vos données personnelles est décrit dans notre{' '}
            <a href="/confidentialite">politique de confidentialité</a>. La gestion des cookies est détaillée
            dans notre <a href="/cookies">politique cookies</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
