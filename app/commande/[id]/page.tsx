'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCheckoutStore, type PlacedOrder } from '@/lib/store/checkout';
import { euro } from '@/lib/store/cart';

interface Props { params: { id: string } }

const SHIPPING_LABELS: Record<string, string> = {
  standard: 'Livraison standard (3-5 jours ouvrés)',
  express:  'Livraison express 24h',
};
const PAYMENT_LABELS: Record<string, string> = {
  card:            'Carte bancaire',
  virement:        'Virement bancaire (30 jours fin de mois)',
  bon_de_commande: 'Bon de commande pro',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbOrder(d: any): PlacedOrder {
  return {
    id: d.order_number,
    date: new Date(d.created_at).toLocaleDateString('fr-FR'),
    lines: d.lines ?? [],
    totalHT: Number(d.total_ht),
    totalTTC: Number(d.total_ttc),
    fraisHT: Number(d.frais_ht),
    shippingAddress: d.shipping_address,
    shippingMethod: d.shipping_method,
    paymentMethod: d.payment_method,
    status: d.status,
  };
}

export default function ConfirmationPage({ params }: Props) {
  const { placedOrder } = useCheckoutStore();
  const router = useRouter();

  const fromStore = placedOrder && placedOrder.id === params.id ? placedOrder : null;
  const [order, setOrder] = useState<PlacedOrder | null>(fromStore);
  const [loading, setLoading] = useState(!fromStore);

  useEffect(() => {
    if (fromStore) return;
    // Repli sur la base (source de vérité) — utile en cas de rechargement / revisite.
    let cancelled = false;
    fetch(`/api/orders/${params.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setOrder(mapDbOrder(data)); })
      .catch(() => { if (!cancelled) router.replace('/'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="wrap" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 24px' }} />
        <p style={{ color: '#6b7280' }}>Chargement de votre commande…</p>
      </div>
    );
  }
  if (!order) return null;

  const addr = order.shippingAddress;
  const isVirement      = order.paymentMethod === 'virement';
  const isBonDeCommande = order.paymentMethod === 'bon_de_commande';
  const isPaid          = order.status === 'paid';

  return (
    <div className="wrap confirm-page">
      {/* Hero confirmation */}
      <div className="confirm-hero">
        <div className="confirm-icon">✓</div>
        <h1>{isPaid ? 'Paiement validé !' : 'Commande confirmée !'}</h1>
        <p className="confirm-subtitle">
          {isPaid
            ? 'Votre paiement a bien été validé. Un email de confirmation vous a été envoyé.'
            : 'Merci pour votre commande. Un email de confirmation vous a été envoyé.'}
        </p>
        {isPaid && (
          <div className="confirm-paid-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 14px', background: '#dcfce7', color: '#166534', borderRadius: 999, fontWeight: 700, fontSize: 14 }}>
            ✓ Paiement confirmé
          </div>
        )}
        <div className="confirm-order-id">
          <span>N° de commande</span>
          <strong className="ref">{order.id}</strong>
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
                {order.lines.map((l) => (
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
                  <td colSpan={2}>Livraison ({SHIPPING_LABELS[order.shippingMethod]})</td>
                  <td>{order.fraisHT === 0 ? <span className="green">Offerte</span> : euro(order.fraisHT)}</td>
                </tr>
                <tr className="confirm-total-row">
                  <td colSpan={2}><strong>Total TTC</strong></td>
                  <td><strong>{euro(order.totalTTC)}</strong></td>
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

          {/* Paiement / Bon de commande */}
          <section className="confirm-section">
            <h2>{isBonDeCommande ? 'Bon de commande' : 'Paiement'}</h2>
            <p className="confirm-payment">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
            {isBonDeCommande && (
              <div className="doc-info-box" style={{ marginTop: 12 }}>
                <strong>Votre bon de commande a été transmis à notre équipe commerciale.</strong>
                <p style={{ margin: '6px 0 0' }}>
                  Nous vous contacterons sous 24h ouvrées pour confirmer la disponibilité
                  et les modalités de livraison. Un email de confirmation vous a été envoyé.
                </p>
              </div>
            )}
            {isVirement && (
              <div className="virement-reminder">
                <strong>Rappel — virement à effectuer :</strong>
                <div className="virement-info" style={{ marginTop: 10 }}>
                  <div className="virement-row"><span>Titulaire</span><strong>MN FERMETURES SARL</strong></div>
                  <div className="virement-row"><span>IBAN</span><strong className="ref">FR76 3000 4004 0300 0100 1234 567</strong></div>
                  <div className="virement-row"><span>Référence</span><strong className="ref">{order.id}</strong></div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar actions */}
        <aside className="confirm-sidebar">
          <div className="confirm-next">
            <h3>Et maintenant ?</h3>
            {isBonDeCommande ? (
              <p>Notre équipe vous contactera sous 24h ouvrées pour valider et préparer votre commande.</p>
            ) : isVirement ? (
              <p>Effectuez votre virement sous 5 jours ouvrés pour que nous lancions la préparation.</p>
            ) : (
              <p>Votre paiement a été accepté. Nous préparons votre commande.</p>
            )}
            <div className="confirm-eta">
              <span>📦</span>
              <span>Expédition estimée : <strong>
                {order.shippingMethod === 'express' ? '24h ouvrées' : '3–5 jours ouvrés'}
              </strong></span>
            </div>
          </div>

          <div className="confirm-actions">
            {!isBonDeCommande && (
              <button
                className="btn devis full"
                type="button"
                onClick={() => window.open(`/devis?order=${order.id}`, '_blank')}
              >
                Télécharger la facture
              </button>
            )}
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
