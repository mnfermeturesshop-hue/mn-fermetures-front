'use client';

import { Fragment } from 'react';
import { useCartStore, euro } from '@/lib/store/cart';
import { useCheckoutStore, shippingCostHT } from '@/lib/store/checkout';

export function OrderSummary() {
  const { lines, totalHT, isFranco, laquageForfait, hasLaquage } = useCartStore();
  const { shippingMethod } = useCheckoutStore();

  const ht = totalHT();
  const franco = isFranco();
  const fraisHT = shippingCostHT(shippingMethod, franco);
  const laquageHT = laquageForfait();
  const ecoHT = lines.reduce((s, l) => s + (l.ecoContribHT ?? 0) * l.quantity, 0);
  const grandTotalHT = ht + fraisHT + laquageHT;
  const grandTotalTTC = grandTotalHT * 1.2;

  return (
    <aside className="order-summary">
      <h2 className="order-summary-title">Récapitulatif</h2>

      <ul className="order-summary-lines">
        {lines.map((l) => (
          <Fragment key={l.key}>
            <li className="os-line">
              <div className="os-line-info">
                <span className="os-line-name">{l.name}</span>
                {l.detail && <span className="os-line-detail">{l.detail}</span>}
                {(l.grossUnitPriceHT ?? l.unitPriceHT) > l.unitPriceHT + 0.005 && (
                  <span className="os-line-detail" style={{ color: '#166534' }}>Remise pro appliquée</span>
                )}
                {!!l.ecoContribHT && <span className="os-line-detail">dont éco-contribution : {euro(l.ecoContribHT)}/u</span>}
              </div>
              <span className="os-line-price">
                {(l.grossUnitPriceHT ?? l.unitPriceHT) > l.unitPriceHT + 0.005 && (
                  <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: 11, marginRight: 6 }}>{euro((l.grossUnitPriceHT ?? l.unitPriceHT) * l.quantity)}</span>
                )}
                {euro((l.unitPriceHT + (l.ecoContribHT ?? 0)) * l.quantity)}
              </span>
            </li>
            {!!l.surchargeUnitHT && (
              <li className="os-line">
                <div className="os-line-info">
                  <span className="os-line-detail">Surcharge temporaire (+{l.surchargePct}%)</span>
                </div>
                <span className="os-line-price">{euro(l.surchargeUnitHT * l.quantity)}</span>
              </li>
            )}
          </Fragment>
        ))}
      </ul>

      <div className="order-summary-totals">
        <div className="os-row"><span>Sous-total HT</span><span>{euro(ht)}</span></div>
        {ecoHT > 0 && <div className="os-row muted"><span>dont éco-contribution</span><span>{euro(ecoHT)}</span></div>}
        <div className="os-row muted">
          <span>Livraison HT</span>
          <span>{franco && shippingMethod === 'standard' ? <span className="green">Offerte</span> : euro(fraisHT)}</span>
        </div>
        {laquageHT > 0 ? (
          <div className="os-row muted"><span>Forfait laquage</span><span>{euro(laquageHT)}</span></div>
        ) : hasLaquage() ? (
          <div className="os-row muted"><span>Forfait laquage</span><span className="green">Offert</span></div>
        ) : null}
        <div className="os-row muted"><span>TVA 20 %</span><span>{euro((ht + fraisHT + laquageHT) * 0.2)}</span></div>
        <div className="os-row os-total-ht"><span>Total HT</span><span>{euro(grandTotalHT)}</span></div>
        <div className="os-row os-total-ttc"><span>Total TTC</span><span>{euro(grandTotalTTC)}</span></div>
      </div>

      <div className="order-summary-note">
        Prix HT · TVA 20 % · Franco de port dès 400 € HT en Occitanie
      </div>
    </aside>
  );
}
