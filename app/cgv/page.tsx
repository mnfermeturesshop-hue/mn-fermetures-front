import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CGV_VERSION } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Conditions générales de vente — MN Fermetures',
  description: 'Conditions générales de vente de MN Fermetures — vente aux professionnels.',
};

/*
 * Texte officiel fourni par MN Fermetures (juillet 2026).
 * À chaque révision du texte, incrémenter CGV_VERSION dans lib/config.ts —
 * la preuve d'acceptation des clients (clickwrap) référence cette version.
 */
export default function CgvPage() {
  return (
    <div className="wrap" style={{ maxWidth: 820, paddingTop: 24, paddingBottom: 64 }}>
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'CGV' }]} />

      <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--navy-700)', margin: '16px 0 4px' }}>
        Conditions générales de vente
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 28px' }}>
        Version du {new Date(CGV_VERSION).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · MN FERMETURES
      </p>

      <div className="cgv-body">
        <section>
          <h2>1. Acceptation des conditions</h2>
          <p>
            Toute vente implique l’acceptation expresse et sans réserve des présentes conditions
            générales, quelles que soient les clauses pouvant figurer sur les documents du client.
          </p>
        </section>

        <section>
          <h2>2. Commandes</h2>
          <p>
            Les commandes doivent être transmises sur un document au format validé par MN Fermetures,
            revêtu de la signature du client et de son cachet commercial. Les documents transmis par
            mail ou télécopie ont valeur d’écrit. Aucune commande verbale ne sera considérée comme
            valable sans confirmation écrite. Toute modification de commande après validation pourra
            entraîner des frais supplémentaires ou être refusée si la fabrication est engagée.
          </p>
        </section>

        <section>
          <h2>3. Produits sur mesure</h2>
          <p>
            Toutes nos fabrications étant réalisées sur mesure, toute annulation ou retour de commande
            donnera lieu, par décision de MN Fermetures, à la facturation totale ou partielle de la
            commande initiale.
          </p>
        </section>

        <section>
          <h2>4. Livraison</h2>
          <p>
            Les marchandises sont livrées franco de port en Occitanie pour toute commande supérieure
            à 400 € HT. En dessous de ce montant, un forfait de 26 € HT est appliqué. Au-delà de cette
            zone une tarification supplémentaire sera exigée. Une tarification additionnelle de
            50 € HT sera appliquée pour le transport des produits de grande dimension.
          </p>
          <p>
            Nos fournitures, même franco, voyagent aux risques et périls du destinataire. En cas
            d’avarie ou perte, il appartient au client de faire toutes réserves et d’exercer tout
            recours auprès du transporteur.
          </p>
          <p>
            Les délais de livraison sont donnés à titre indicatif. Les retards, grèves, épidémies,
            intempéries, pénuries, cas de force majeure ne peuvent donner lieu ni à pénalités, ni à
            dommages et intérêts, ni à annulation de commande.
          </p>
          <h3>Livraison en l’absence du client</h3>
          <p>
            En cas d’absence du client lors de la livraison, MN Fermetures est autorisée, sauf
            indication contraire écrite préalable, à déposer la marchandise à l’adresse indiquée,
            dans un lieu accessible réputé sécurisé. Ce dépôt vaut livraison conforme. Les risques
            sont alors transférés au client, et MN Fermetures décline toute responsabilité en cas de
            vol, perte ou détérioration postérieure.
          </p>
          <h3>Frais de stockage</h3>
          <p>
            En cas d’impossibilité de livraison du fait du client ou de report supérieur à 15 jours,
            des frais de stockage seront facturés à hauteur de 20 € HT/m³ par semaine entamée.
          </p>
        </section>

        <section>
          <h2>5. Réclamations</h2>
          <p>
            Toute réclamation (hors transport) doit être formulée par écrit dans les 8 jours suivant
            la réception. Passé ce délai, aucune réclamation ne sera prise en compte.
          </p>
        </section>

        <section>
          <h2>6. Retours</h2>
          <p>
            Aucun retour ne pourra être effectué sans accord écrit préalable. Ce consentement
            n’implique pas reconnaissance de responsabilité.
          </p>
        </section>

        <section>
          <h2>7. Tolérances de fabrication</h2>
          <p>
            Les produits fabriqués peuvent présenter des tolérances dimensionnelles de ±3 mm, ainsi
            que de légères variations de teinte ou d’aspect, qui ne sauraient constituer un motif de
            refus ou réclamation.
          </p>
        </section>

        <section>
          <h2>8. Prix et règlement</h2>
          <p>
            Les factures sont payables à Villeveyrac (34560) et le paiement du client doit intervenir
            le jour où il valide sa commande. Dans le cas où le client a reçu une notification écrite
            l’autorisant à bénéficier d’un paiement à 30 jours par traite directe avec autorisation de
            prélèvement le client devra respecter ce délai. Les paiements s’imputent sur la dette la
            plus ancienne. Aucun escompte, compensation ou retenue ne peut être appliqué par le client.
          </p>
          <p>Tout défaut de paiement entraîne :</p>
          <ul>
            <li>Exigibilité immédiate de toutes les sommes dues,</li>
            <li>Facturation par MN Fermetures de frais à hauteur de 20 € HT par incident,</li>
            <li>Intérêts de retard au taux de base bancaire majoré de 2 %,</li>
            <li>Une clause pénale de 15 % des sommes dues en cas de recouvrement contentieux,</li>
            <li>Possibilité pour MN Fermetures d’exiger des garanties ou d’annuler les commandes en cours,</li>
            <li>En cas de non-paiement, les marchandises livrées doivent être restituées aux frais du client, MN Fermetures se réservant le droit d’en reprendre possession.</li>
          </ul>
        </section>

        <section>
          <h2>9. Réserve de propriété — Loi n°80-335 du 12/05/1980</h2>
          <p>
            La propriété des marchandises reste à MN Fermetures jusqu’au paiement intégral.
            Toutefois, le client en assume les risques dès la livraison. En cas de revente, la
            créance est réputée nous être cédée.
          </p>
        </section>

        <section>
          <h2>10. Garanties</h2>
          <p>
            Nos produits sont garantis 2 ans contre tout défaut de matière ou de fabrication.
            La garantie couvre uniquement l’échange des pièces reconnues défectueuses.
          </p>
          <p>
            Les moteurs de volets roulants sont garantis 5 ans, extensible à 7 ans pour les modèles
            Somfy RS 100 io et RS 100 Solar io. D’autres produits peuvent bénéficier de garanties
            complémentaires (nous consulter).
          </p>
          <p>Sont exclus de la garantie :</p>
          <ul>
            <li>Négligence ou mauvaise utilisation,</li>
            <li>Non-respect des règles de pose,</li>
            <li>Dépassement des abaques,</li>
            <li>Usure normale, défaut d’entretien, exposition à des produits chimiques ou à l’air marin,</li>
            <li>Intempéries extrêmes, incendie, foudre.</li>
          </ul>
        </section>

        <section>
          <h2>11. Utilisation commerciale des marques</h2>
          <p>
            Toute utilisation commerciale de nos marques ou produits est interdite sans accord écrit
            préalable de MN Fermetures.
          </p>
        </section>

        <section>
          <h2>12. Traitement des données personnelles (RGPD)</h2>
          <p>
            Les données personnelles collectées sont utilisées uniquement pour le traitement des
            commandes et la gestion commerciale. Conformément au RGPD, le client dispose d’un droit
            d’accès, de rectification, d’opposition ou de suppression sur simple demande écrite.
            Aucune donnée n’est cédée à des tiers à des fins commerciales.
          </p>
        </section>

        <section>
          <h2>13. Médiation — Règlement des litiges</h2>
          <p>
            En cas de différend, les parties s’engagent à recourir à un médiateur avant toute
            procédure judiciaire. À défaut d’accord amiable dans un délai de 30 jours, le litige
            pourra être porté devant les tribunaux compétents.
          </p>
        </section>

        <section>
          <h2>14. Juridiction compétente</h2>
          <p>
            En cas de contestation, le Tribunal de commerce de Montpellier est seul compétent,
            même en cas d’appel en garantie ou de pluralité de défendeurs.
          </p>
        </section>
      </div>
    </div>
  );
}
