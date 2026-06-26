'use client';

import { useCheckoutStore, shippingCostHT } from '@/lib/store/checkout';
import { useCartStore, euro } from '@/lib/store/cart';
import type { ShippingMethod } from '@/lib/store/checkout';

interface Props { onNext: () => void; onBack: () => void }

interface Option {
  id: ShippingMethod;
  label: string;
  desc: string;
  eta: string;
}

const OPTIONS: Option[] = [
  {
    id: 'standard',
    label: 'Livraison standard',
    desc: 'Franco de port dès 400 € HT · sinon 26 € HT',
    eta: '3 à 5 jours ouvrés',
  },
  {
    id: 'express',
    label: 'Livraison express 24h',
    desc: '42 € HT · Expédition le jour même si commande avant 14h',
    eta: '24h ouvrées',
  },
];

export function ShippingStep({ onNext, onBack }: Props) {
  const { shippingMethod, setShippingMethod } = useCheckoutStore();
  const { isFranco } = useCartStore();
  const franco = isFranco();

  return (
    <div className="ck-form">
      <div className="ck-section">
        <h2 className="ck-section-title">Mode de livraison</h2>

        <div className="shipping-options">
          {OPTIONS.map((opt) => {
            const cost = shippingCostHT(opt.id, franco);
            const active = shippingMethod === opt.id;
            return (
              <label
                key={opt.id}
                className={`shipping-option ${active ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="shipping"
                  value={opt.id}
                  checked={active}
                  onChange={() => setShippingMethod(opt.id)}
                />
                <div className="shipping-option-body">
                  <div className="shipping-option-top">
                    <span className="shipping-option-label">{opt.label}</span>
                    <span className="shipping-option-price">
                      {cost === 0 ? <span className="green">Offerte</span> : `${euro(cost)} HT`}
                    </span>
                  </div>
                  <div className="shipping-option-desc">{opt.desc}</div>
                  <div className="shipping-option-eta">⏱ {opt.eta}</div>
                </div>
              </label>
            );
          })}
        </div>

        {franco && shippingMethod === 'standard' && (
          <div className="franco-badge" style={{ marginTop: 12 }}>
            ✓ Votre commande bénéficie du franco de port — livraison offerte !
          </div>
        )}
      </div>

      <div className="ck-actions">
        <button className="btn ghost" type="button" onClick={onBack}>← Retour</button>
        <button className="btn solid lg" type="button" onClick={onNext}>
          Continuer → Paiement
        </button>
      </div>
    </div>
  );
}
