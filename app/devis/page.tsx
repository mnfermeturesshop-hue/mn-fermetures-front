'use client';

import { Suspense, useEffect } from 'react';
import Image from 'next/image';
import { useCheckoutStore } from '@/lib/store/checkout';
import { useCartStore, euro } from '@/lib/store/cart';
import { useSearchParams } from 'next/navigation';

const TVA = 0.2;

function DevisContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const { placedOrder } = useCheckoutStore();
  const { lines, totalHT, totalTTC, tva, isFranco, fraisLivraison } = useCartStore();

  const isOrderMode = !!orderId && !!placedOrder && placedOrder.id === orderId;

  const devisLines  = isOrderMode ? placedOrder.lines : lines;
  const devisTotalHT  = isOrderMode ? placedOrder.totalHT : totalHT() + fraisLivraison();
  const devisTotalTTC = isOrderMode ? placedOrder.totalTTC : totalTTC() + fraisLivraison() * (1 + TVA);
  const devisTVA    = devisTotalHT * TVA;
  const devisNum    = isOrderMode ? placedOrder.id : `DEVIS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const devisDate   = isOrderMode ? placedOrder.date : new Date().toLocaleDateString('fr-FR');
  const validUntil  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');

  useEffect(() => {
    document.title = `${devisNum} — MN Fermetures`;
  }, [devisNum]);

  return (
    <div className="devis-page">
      <div className="devis-print-bar no-print">
        <span>Aperçu du devis — {devisNum}</span>
        <button className="btn solid" type="button" onClick={() => window.print()}>
          Imprimer / Enregistrer PDF
        </button>
      </div>

      <div className="devis-doc">
        {/* En-tête */}
        <div className="devis-header">
          <div className="devis-logo">
            <Image
              src="/logo.png"
              alt="MN Fermetures"
              width={160}
              height={62}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div className="devis-meta">
            <div className="devis-type">DEVIS / BON DE COMMANDE</div>
            <table className="devis-meta-table">
              <tbody>
                <tr><td>N°</td><td><strong className="ref">{devisNum}</strong></td></tr>
                <tr><td>Date</td><td>{devisDate}</td></tr>
                {!isOrderMode && <tr><td>Valable jusqu&apos;au</td><td>{validUntil}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adresses */}
        <div className="devis-parties">
          <div className="devis-emetteur">
            <div className="devis-party-label">Émetteur</div>
            <address>
              <strong>MN FERMETURES SARL</strong><br />
              Chemin du Mas de Pastrou<br />
              34560 Villeveyrac<br />
              04 67 78 06 63<br />
              contact@mmfermetures.fr
            </address>
          </div>
          {isOrderMode && placedOrder.shippingAddress.lastName && (
            <div className="devis-destinataire">
              <div className="devis-party-label">Destinataire / Livraison</div>
              <address>
                <strong>{placedOrder.shippingAddress.firstName} {placedOrder.shippingAddress.lastName}</strong><br />
                {placedOrder.shippingAddress.company && <>{placedOrder.shippingAddress.company}<br /></>}
                {placedOrder.shippingAddress.address1}<br />
                {placedOrder.shippingAddress.address2 && <>{placedOrder.shippingAddress.address2}<br /></>}
                {placedOrder.shippingAddress.postalCode} {placedOrder.shippingAddress.city}<br />
                {placedOrder.shippingAddress.phone}
              </address>
            </div>
          )}
        </div>

        {/* Tableau des lignes */}
        <table className="devis-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Réf.</th>
              <th>Qté</th>
              <th>P.U. HT</th>
              <th>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {devisLines.map((l: import('@/lib/catalog/types').CartLine, i: number) => (
              <tr key={l.key ?? i}>
                <td>
                  <div className="devis-line-name">{l.name}</div>
                  {l.detail && <div className="devis-line-detail">{l.detail}</div>}
                </td>
                <td className="ref">{l.reference ?? '—'}</td>
                <td>{l.quantity}</td>
                <td>{euro(l.unitPriceHT)}</td>
                <td>{euro(l.unitPriceHT * l.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Frais de livraison HT</td>
              <td>{isOrderMode ? (placedOrder.fraisHT === 0 ? 'Offerte' : euro(placedOrder.fraisHT)) : (isFranco() ? 'Offerte' : euro(fraisLivraison()))}</td>
            </tr>
            <tr className="devis-subtotal">
              <td colSpan={4}>Sous-total HT</td>
              <td>{euro(devisTotalHT)}</td>
            </tr>
            <tr>
              <td colSpan={4}>TVA 20 %</td>
              <td>{euro(devisTVA)}</td>
            </tr>
            <tr className="devis-total">
              <td colSpan={4}><strong>Total TTC</strong></td>
              <td><strong>{euro(devisTotalTTC)}</strong></td>
            </tr>
          </tfoot>
        </table>

        {/* Conditions */}
        <div className="devis-conditions">
          <div className="devis-cond-block">
            <strong>Livraison</strong>
            <p>Franco de port en Occitanie dès 400 € HT. Forfait 26 € HT en deçà. Express 24h : 42 € HT.</p>
          </div>
          <div className="devis-cond-block">
            <strong>Paiement</strong>
            <p>Comptes professionnels : virement 30 jours fin de mois. Particuliers : CB ou virement anticipé.</p>
          </div>
          <div className="devis-cond-block">
            <strong>Validité</strong>
            <p>Ce devis est valable 30 jours à compter de sa date d&apos;émission. Prix HT — TVA 20 %.</p>
          </div>
        </div>

        <div className="devis-footer">
          MN FERMETURES SARL · SIRET 123 456 789 00014 · RCS Montpellier · NAF 4669B
        </div>
      </div>
    </div>
  );
}

export default function DevisPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Chargement du devis…</div>}>
      <DevisContent />
    </Suspense>
  );
}
