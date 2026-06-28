'use client';

import { useCartStore, euro } from '@/lib/store/cart';
import { useCheckoutStore, shippingCostHT } from '@/lib/store/checkout';

export function OrderSummary() {
  const { lines, totalHT, totalTTC, tva, isFranco, fraisLivraison } = useCartStore();
  const { shippingMethod } = useCheckoutStore();

  const ht = totalHT();
  const franco = isFranco();
  const fraisHT = shippingCostHT(shippingMethod, franco);
  const fraisTTC = fraisHT * 1.2;
  const grandTotalHT = ht + fraisHT;
  const grandTotalTTC = totalTTC() + fraisTTC;

  return (
    <aside className="order-summary">
      <h2 className="order-summary-title">Récapitulatif</h2>

      <ul className="order-summary-lines">
        {lines.map((l) => (
          <li key={l.key} className="os-line">
            <div className="os-line-info">
              <span className="os-line-name">{l.name}</span>
              {l.detail && <span className="os-line-detail">{l.detail}</span>}
            </div>
            <span className="os-line-price">{euro(l.unitPriceHT * l.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="order-summary-totals">
        <div className="os-row"><span>Sous-total HT</span><span>{euro(ht)}</span></div>
        <div className="os-row muted">
          <span>Livraison HT</span>
          <span>{franco && shippingMethod === 'standard' ? <span className="green">Offerte</span> : euro(fraisHT)}</span>
        </div>
        <div className="os-row muted"><span>TVA 20 %</span><span>{euro(tva() + fraisHT * 0.2)}</span></div>
        <div className="os-row os-total-ht"><span>Total HT</span><span>{euro(grandTotalHT)}</span></div>
        <div className="os-row os-total-ttc"><span>Total TTC</span><span>{euro(grandTotalTTC)}</span></div>
      </div>

      <div className="order-summary-note">
        Prix HT · TVA 20 % · Livraison offerte dès 400 € HT en Occitanie
      </div>
    </aside>
  );
}
