import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ManageCookiesLink } from '@/components/consent/ManageCookiesLink';

export const metadata: Metadata = {
  title: 'Politique cookies — MN Fermetures',
  description: 'Les cookies utilisés par le site MN Fermetures et la gestion de votre consentement.',
};

/* ⚠️ MODÈLE À RELIRE. Mettre à jour le tableau si des traceurs non essentiels
   (mesure d'audience, marketing) sont ajoutés au site. */
export default function CookiesPage() {
  return (
    <div className="wrap" style={{ maxWidth: 820, paddingTop: 24, paddingBottom: 64 }}>
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Cookies' }]} />

      <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--navy-700)', margin: '16px 0 4px' }}>
        Politique de gestion des cookies
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 28px' }}>Dernière mise à jour : août 2026</p>

      <div className="cgv-body">
        <section>
          <h2>Qu'est-ce qu'un cookie ?</h2>
          <p>
            Un cookie (ou traceur) est un petit fichier déposé sur votre appareil lors de la visite d'un site.
            Certains sont <strong>nécessaires</strong> au fonctionnement et ne requièrent pas votre accord ;
            d'autres, non essentiels (mesure d'audience, publicité), ne sont déposés qu'avec votre
            <strong> consentement</strong>.
          </p>
        </section>

        <section>
          <h2>Cookies utilisés à ce jour</h2>
          <p>Le site n'utilise actuellement que des cookies et stockages <strong>strictement nécessaires</strong> :</p>
          <ul>
            <li><strong>Session &amp; connexion</strong> (Supabase) — vous garder connecté à votre espace.</li>
            <li><strong>Sécurité de session</strong> (mm_sess_*) — déconnexion automatique après inactivité.</li>
            <li><strong>Panier &amp; préférences</strong> (stockage local du navigateur) — conserver votre panier et vos choix.</li>
            <li><strong>Anti-robots</strong> (Cloudflare Turnstile) — protéger les formulaires d'inscription.</li>
            <li><strong>Paiement</strong> (Stripe) — sécuriser la transaction et prévenir la fraude, lors du paiement.</li>
          </ul>
          <p style={{ color: 'var(--muted)' }}>
            Aucun cookie de <strong>mesure d'audience</strong> ni de <strong>publicité</strong> n'est actif à ce jour.
            Si nous en ajoutons, ils n'apparaîtront qu'après votre consentement et cette page sera mise à jour.
          </p>
        </section>

        <section>
          <h2>Gérer votre consentement</h2>
          <p>
            Vous pouvez à tout moment revenir sur vos choix (accepter, refuser ou personnaliser) :{' '}
            <ManageCookiesLink style={{ color: 'var(--navy-700)', textDecoration: 'underline', fontWeight: 600 }} />.
            Vous pouvez aussi configurer votre navigateur pour bloquer ou supprimer les cookies — au risque de
            dégrader certaines fonctionnalités (connexion, panier).
          </p>
        </section>
      </div>
    </div>
  );
}
