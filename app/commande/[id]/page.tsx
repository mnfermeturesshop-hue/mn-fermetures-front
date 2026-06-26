'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCheckoutStore } from '@/lib/store/checkout';
import { euro } from '@/lib/store/cart';

interface Props { params: { id: string } }

const SHIPPING_LABELS = {
  standard: 'Livraison standard (3-5 jours ouvrés)',
  express:  'Livraison express 24h',
};
const PAYMENT_LABELS = {
  card:     'Carte bancaire',
  virement: 'Virement bancaire (30 jours fin de mois)',
};

export default function ConfirmationPage({ params }: Props) {
  const { placedOrder } = useCheckoutStore();
  const router = useRouter();

  useEffect(() => {
    if (!placedOrder || placedOrder.id !== params.id) {
      router.replace('/');
    }
  }, [placedOrder, params.id, router]);

  if (!placedOrder || placedOrder.id !== params.id) return null;

  const addr = placedOrder.shippingAddress;
  const isVirement = placedOrder.paymentMethod === 'virement';

  return (
    <div className="wrap confirm-page">
      {/* Hero confirmation */}
      <div className="confirm-hero">
        <div className="confirm-icon">✓</div>
        <h1>Commande confirmée !</h1>
        <p className="confirm-subtitle">
          Merci pour votre commande. Un email de confirmation vous a été envoyé.
        </p>
        <div className="confirm-order-id">
          <span>N° de commande</span>
          <strong className="ref">{placedOrder.id}</strong>
        </div>
      </div>

      <div className="confirm-layout">
        {/* Détails commande */}
        <div className="confirm-main">

          {/* Lignes */}
          <section className="confirm-section">
            <h2>Récapitulatif</h2>
            <table className="confirm-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>Total HT</th>
                </tr>
              </thead>
              <tbody>
                {placedOrder.lines.map((l) => (
                  <tr key={l.key}>
                    <td>
                      <div className="confirm-line-name">{l.name}</div>
                      {l.detail && <div className="confirm-line-detail">{l.detail}</div>}
                      {l.reference && <div className="ref">{l.reference}</div>}
                    </td>
                    <td>{l.quantity}</td>
                    <td>{euro(l.unitPriceHT * l.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Livraison ({SHIPPING_LABELS[placedOrder.shippingMethod]})</td>
                  <td>{placedOrder.fraisHT === 0 ? <span className="green">Offerte</span> : euro(placedOrder.fraisHT)}</td>
                </tr>
                <tr className="confirm-total-row">
                  <td colSpan={2}><strong>Total TTC</strong></td>
                  <td><strong>{euro(placedOrder.totalTTC)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Livraison */}
          <section className="confirm-section">
            <h2>Adresse de livraison</h2>
            <address className="confirm-address">
              <strong>{addr.firstName} {addr.lastName}</strong><br />
              {addr.company && <>{addr.company}<br /></>}
              {addr.address1}<br />
              {addr.address2 && <>{addr.address2}<br /></>}
              {addr.postalCode} {addr.city}<br />
              {addr.phone}
            </address>
          </section>

          {/* Paiement */}
          <section className="confirm-section">
            <h2>Paiement</h2>
            <p className="confirm-payment">{PAYMENT_LABELS[placedOrder.paymentMethod]}</p>
            {isVirement && (
              <div className="virement-reminder">
                <strong>Rappel — virement à effectuer :</strong>
                <div className="virement-info" style={{ marginTop: 10 }}>
                  <div className="virement-row"><span>Titulaire</span><strong>MN FERMETURES SARL</strong></div>
                  <div className="virement-row"><span>IBAN</span><strong className="ref">FR76 3000 4004 0300 0100 1234 567</strong></div>
                  <div className="virement-row"><span>Référence</span><strong className="ref">{placedOrder.id}</strong></div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar actions */}
        <aside className="confirm-sidebar">
          <div className="confirm-next">
            <h3>Et maintenant ?</h3>
            {isVirement ? (
              <p>Effectuez votre virement sous 5 jours ouvrés pour que nous lancions la préparation.</p>
            ) : (
              <p>Votre paiement a été accepté. Nous préparons votre commande.</p>
            )}
            <div className="confirm-eta">
              <span>📦</span>
              <span>Expédition estimée : <strong>
                {placedOrder.shippingMethod === 'express' ? '24h ouvrées' : '3–5 jours ouvrés'}
              </strong></span>
            </div>
          </div>

          <div className="confirm-actions">
            <button
              className="btn devis full"
              type="button"
              onClick={() => window.open(`/devis?order=${placedOrder.id}`, '_blank')}
            >
              Télécharger le devis PDF
            </button>
            <Link className="btn ghost full" href="/catalogue/tabliers">
              Continuer mes achats
            </Link>
            <Link className="btn ghost full" href="/compte">
              Voir mes commandes
            </Link>
          </div>

          <div className="confirm-contact">
            <strong>Une question ?</strong>
            <p>04 67 78 06 63 · Du lun. au ven. 8h–17h</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
