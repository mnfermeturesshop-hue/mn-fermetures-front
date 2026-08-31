import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — MN Fermetures',
  description: 'Comment MN Fermetures traite vos données personnelles (RGPD).',
};

/* ⚠️ MODÈLE À RELIRE ET VALIDER (idéalement par un juriste / DPO) avant publication.
   Vérifier notamment les durées de conservation et le contact RGPD/DPO. */
export default function ConfidentialitePage() {
  return (
    <div className="wrap" style={{ maxWidth: 820, paddingTop: 24, paddingBottom: 64 }}>
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Confidentialité' }]} />

      <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--navy-700)', margin: '16px 0 4px' }}>
        Politique de confidentialité
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 28px' }}>Dernière mise à jour : août 2026 · MN FERMETURES SAS</p>

      <div className="cgv-body">
        <section>
          <h2>1. Responsable de traitement</h2>
          <p>
            MN FERMETURES SAS (Chemin du Mas de Pastrou, 34560 Villeveyrac) est responsable des traitements
            de données personnelles effectués via ce site. Le délégué à la protection des données (DPO) est
            <strong> M. Cyril Matthieu</strong>. Pour toute question ou demande relative à vos données :
            <strong> adv@mnfermetures.com</strong>.
          </p>
        </section>

        <section>
          <h2>2. Données collectées</h2>
          <p>Selon votre usage du site, nous pouvons collecter :</p>
          <ul>
            <li><strong>Compte professionnel</strong> : nom, e-mail, téléphone, société, SIRET, extrait Kbis, mot de passe (chiffré).</li>
            <li><strong>Commandes &amp; devis</strong> : produits, dimensions, adresses de livraison/facturation, montants.</li>
            <li><strong>Paiement</strong> : traité par notre prestataire Stripe — nous ne stockons pas votre numéro de carte.</li>
            <li><strong>Techniques</strong> : cookies essentiels (session, sécurité), journaux de connexion.</li>
          </ul>
        </section>

        <section>
          <h2>3. Finalités et bases légales</h2>
          <ul>
            <li>Gestion du compte, des devis et des commandes — <em>exécution du contrat</em>.</li>
            <li>Facturation et obligations comptables — <em>obligation légale</em>.</li>
            <li>Validation des comptes professionnels (Kbis) et sécurité du site — <em>intérêt légitime</em>.</li>
            <li>Relation commerciale, emails d'information — <em>intérêt légitime</em> ou <em>consentement</em>.</li>
            <li>Mesure d'audience éventuelle — <em>consentement</em> (voir la <a href="/cookies">politique cookies</a>).</li>
          </ul>
        </section>

        <section>
          <h2>4. Destinataires &amp; sous-traitants</h2>
          <p>Vos données sont accessibles à nos équipes habilitées et à nos sous-traitants techniques :</p>
          <ul>
            <li><strong>Vercel</strong> — hébergement du site.</li>
            <li><strong>Supabase</strong> — base de données et authentification.</li>
            <li><strong>Stripe</strong> — traitement des paiements.</li>
            <li><strong>Cloudflare</strong> — protection anti-robots (Turnstile).</li>
            <li><strong>Google (Gmail)</strong> — envoi des e-mails transactionnels.</li>
            <li><strong>Anthropic</strong> — assistant d'aide en ligne (si utilisé).</li>
          </ul>
          <p>Certains prestataires peuvent être situés hors UE ; des garanties appropriées encadrent ces transferts.</p>
        </section>

        <section>
          <h2>5. Durées de conservation</h2>
          <ul>
            <li>Compte : pendant la durée de la relation commerciale, puis suppression/anonymisation au bout de 3 ans.</li>
            <li>Factures et pièces comptables : 10 ans (obligation légale).</li>
            <li>Prospects non clients : 3 ans à compter du dernier contact.</li>
            <li>Cookies : voir la <a href="/cookies">politique cookies</a> (13 mois maximum pour les traceurs soumis à consentement).</li>
          </ul>
        </section>

        <section>
          <h2>6. Vos droits</h2>
          <p>
            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition,
            de limitation et de portabilité de vos données. Vous pouvez les exercer à
            <strong> adv@mnfermetures.com</strong>. Vous pouvez également introduire une réclamation auprès de la
            <strong> CNIL</strong> (cnil.fr).
          </p>
        </section>

        <section>
          <h2>7. Sécurité</h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données
            (chiffrement des mots de passe, accès restreint, sessions à durée limitée, hébergement sécurisé).
          </p>
        </section>
      </div>
    </div>
  );
}
