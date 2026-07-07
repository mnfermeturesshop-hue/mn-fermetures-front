import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CGV_VERSION } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Conditions générales de vente — MN Fermetures',
  description: 'Conditions générales de vente de MN Fermetures SARL — vente aux professionnels.',
};

/*
 * ⚠️ TEXTE À COMPLÉTER : structure type fournie en attendant le texte
 * définitif des CGV (PDG/juriste). À chaque révision du texte, incrémenter
 * CGV_VERSION dans lib/config.ts — la preuve d'acceptation des clients
 * référence cette version.
 */
export default function CgvPage() {
  return (
    <div className="wrap" style={{ maxWidth: 820, paddingTop: 24, paddingBottom: 64 }}>
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'CGV' }]} />

      <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', color: 'var(--navy-700)', margin: '16px 0 4px' }}>
        Conditions générales de vente
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 28px' }}>
        Version du {new Date(CGV_VERSION).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · MN FERMETURES SARL — vente réservée aux professionnels
      </p>

      <div className="cgv-body">
        <section>
          <h2>1. Objet et champ d&apos;application</h2>
          <p>
            Les présentes conditions générales de vente (CGV) régissent l&apos;ensemble des ventes
            conclues entre MN FERMETURES SARL (Chemin du Mas de Pastrou, 34560 Villeveyrac —
            SIRET 123 456 789 00014, RCS Montpellier) et ses clients professionnels, via le site
            ou tout autre canal de commande. Toute ouverture de compte professionnel et toute
            commande impliquent l&apos;acceptation sans réserve des présentes CGV.
          </p>
        </section>

        <section>
          <h2>2. Prix</h2>
          <p>
            Les prix sont exprimés en euros hors taxes (HT), TVA en sus au taux en vigueur.
            Ils sont réservés aux clients professionnels titulaires d&apos;un compte approuvé et
            peuvent être révisés à tout moment ; les commandes sont facturées au tarif en vigueur
            au jour de la commande, ou aux conditions du devis accepté pendant sa durée de validité.
          </p>
        </section>

        <section>
          <h2>3. Commandes et devis</h2>
          <p>
            Les commandes sont passées en ligne (bon de commande) ou sur devis. Un devis est
            valable 30 jours à compter de son émission, sauf mention contraire. Les produits
            fabriqués sur mesure (tabliers, dimensions spécifiques) ne peuvent être ni repris
            ni échangés.
          </p>
        </section>

        <section>
          <h2>4. Livraison</h2>
          <p>
            Livraison offerte en Occitanie à partir de 400 € HT de commande ; forfait de
            26 € HT en deçà, livraison express 24 h : 42 € HT. Les délais indiqués courent à
            réception du paiement ou de la validation de la commande et sont donnés à titre
            indicatif. Le client vérifie l&apos;état des marchandises à réception et formule ses
            réserves sur le bon de livraison.
          </p>
        </section>

        <section>
          <h2>5. Paiement</h2>
          <p>
            Sauf conditions particulières accordées, le paiement s&apos;effectue par virement à
            30 jours fin de mois. Tout retard de paiement entraîne de plein droit l&apos;application
            de pénalités au taux légal et de l&apos;indemnité forfaitaire de recouvrement de 40 €
            (art. L441-10 du Code de commerce).
          </p>
        </section>

        <section>
          <h2>6. Réserve de propriété</h2>
          <p>
            Les marchandises demeurent la propriété de MN FERMETURES jusqu&apos;au paiement intégral
            du prix. Le transfert des risques intervient à la livraison.
          </p>
        </section>

        <section>
          <h2>7. Garanties</h2>
          <p>
            Les produits bénéficient des garanties fabricant (jusqu&apos;à 7 ans selon les gammes,
            voir documentation produit). La garantie ne couvre ni l&apos;usure normale, ni les
            défauts résultant d&apos;une pose non conforme aux règles de l&apos;art ou d&apos;une utilisation
            anormale.
          </p>
        </section>

        <section>
          <h2>8. Données personnelles</h2>
          <p>
            Les données collectées à l&apos;ouverture du compte (identité, coordonnées, SIRET,
            Kbis le cas échéant) sont utilisées pour la gestion de la relation commerciale et
            conservées pendant la durée de celle-ci. Conformément au RGPD, le client dispose
            d&apos;un droit d&apos;accès, de rectification et de suppression en écrivant à
            contact@mmfermetures.fr.
          </p>
        </section>

        <section>
          <h2>9. Droit applicable et litiges</h2>
          <p>
            Les présentes CGV sont soumises au droit français. À défaut d&apos;accord amiable,
            tout litige relève de la compétence exclusive du tribunal de commerce de Montpellier.
          </p>
        </section>
      </div>
    </div>
  );
}
