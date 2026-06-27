'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckoutStore, shippingCostHT } from '@/lib/store/checkout';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';
import type { PaymentMethod } from '@/lib/store/checkout';

interface Props { onBack: () => void }

function fmtCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}

function CardForm({ onPay, paying }: { onPay: () => void; paying: boolean }) {
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holder, setHolder] = useState('');
  const { totalTTC, isFranco } = useCartStore();
  const { shippingMethod } = useCheckoutStore();
  const frais = shippingCostHT(shippingMethod, isFranco()) * 1.2;
  const grand = totalTTC() + frais;

  const valid = cardNum.replace(/\s/g, '').length === 16 && expiry.length === 5 && cvc.length >= 3 && holder.trim().length > 0;

  return (
    <div className="card-form">
      <div className="stripe-badge">
        <span>Paiement sécurisé</span>
        <span className="stripe-logo">🔒 SSL</span>
      </div>

      <div className="field">
        <label>Numéro de carte</label>
        <div className="card-input-wrap">
          <input
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={cardNum}
            maxLength={19}
            onChange={(e) => setCardNum(fmtCard(e.target.value))}
            autoComplete="cc-number"
          />
          <span className="card-icons">💳</span>
        </div>
      </div>

      <div className="card-row-2">
        <div className="field">
          <label>Date d&apos;expiration</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM/AA"
            value={expiry}
            maxLength={5}
            onChange={(e) => setExpiry(fmtExpiry(e.target.value))}
            autoComplete="cc-exp"
          />
        </div>
        <div className="field">
          <label>CVC</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={cvc}
            maxLength={4}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="cc-csc"
          />
        </div>
      </div>

      <div className="field">
        <label>Titulaire de la carte</label>
        <input
          type="text"
          placeholder="Jean Dupont"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          autoComplete="cc-name"
        />
      </div>

      <button
        className={`btn pay-btn full ${paying ? 'paying' : ''}`}
        type="button"
        disabled={!valid || paying}
        onClick={onPay}
      >
        {paying ? (
          <span className="pay-loading"><span className="spinner" /> Traitement en cours…</span>
        ) : (
          `Payer ${euro(grand)} TTC`
        )}
      </button>

      <p className="pay-notice">
        Vos données bancaires sont chiffrées et ne sont jamais stockées sur nos serveurs.
      </p>
    </div>
  );
}

function VirementForm({ onConfirm, paying }: { onConfirm: () => void; paying: boolean }) {
  const { placedOrder } = useCheckoutStore();
  const tempRef = `CMD-${new Date().getFullYear()}-XXXX`;
  return (
    <div className="virement-form">
      <div className="virement-info">
        <div className="virement-row"><span>Titulaire</span><strong>MN FERMETURES SARL</strong></div>
        <div className="virement-row"><span>IBAN</span><strong className="ref">FR76 3000 4004 0300 0100 1234 567</strong></div>
        <div className="virement-row"><span>BIC</span><strong className="ref">BNPAFRPPXXX</strong></div>
        <div className="virement-row virement-ref">
          <span>Référence à indiquer</span>
          <strong className="ref">{tempRef}</strong>
        </div>
      </div>
      <div className="virement-notice">
        <strong>Délai de traitement :</strong> votre commande est réservée 5 jours ouvrés.
        Elle sera expédiée dès réception du virement. Conditions : 30 jours fin de mois.
      </div>
      <button
        className="btn solid lg full"
        type="button"
        disabled={paying}
        onClick={onConfirm}
      >
        {paying ? 'Enregistrement…' : 'Confirmer la commande'}
      </button>
    </div>
  );
}

export function PaymentStep({ onBack }: Props) {
  const { paymentMethod, setPaymentMethod, placeOrder, shippingAddress, billingAddress,
    sameAsBilling, shippingMethod, guestEmail, guestMode } = useCheckoutStore();
  const { user, isPro } = useAuthStore();
  const { lines, totalHT, totalTTC, isFranco, clearCart } = useCartStore();
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  const defaultMethod: PaymentMethod = isPro() ? 'virement' : 'card';
  if (paymentMethod !== defaultMethod && !paying) {
    setPaymentMethod(defaultMethod);
  }

  const handlePay = async () => {
    setPaying(true);
    const fraisHT = shippingCostHT(shippingMethod, isFranco());
    const orderId = placeOrder({
      lines,
      totalHT: totalHT() + fraisHT,
      totalTTC: totalTTC() + fraisHT * 1.2,
      isFranco: isFranco(),
    });

    const email = guestMode ? guestEmail : (user?.email ?? '');
    const customerName = guestMode
      ? `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()
      : (user?.name ?? '');

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderId,
          email,
          customerName,
          isGuest: guestMode || !user,
          userId: user?.id,
          paymentMethod,
          shippingMethod,
          lines,
          totalHT: totalHT() + fraisHT,
          totalTTC: totalTTC() + fraisHT * 1.2,
          fraisHT,
          shippingAddress,
          billingAddress: sameAsBilling ? shippingAddress : billingAddress,
        }),
      });
    } catch (e) {
      console.error('[checkout] order API error:', e);
    }

    clearCart();
    toast.success('Commande confirmée !');
    router.push(`/commande/${orderId}`);
  };

  const methods: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'card',     label: 'Carte bancaire',     icon: '💳' },
    { id: 'virement', label: 'Virement bancaire',   icon: '🏦' },
  ];

  return (
    <div className="ck-form">
      <div className="ck-section">
        <h2 className="ck-section-title">Mode de paiement</h2>

        <div className="payment-tabs">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`payment-tab ${paymentMethod === m.id ? 'active' : ''}`}
              onClick={() => setPaymentMethod(m.id)}
            >
              <span>{m.icon}</span> {m.label}
              {m.id === 'virement' && isPro() && (
                <span className="pro-chip" style={{ marginLeft: 6 }}>PRO</span>
              )}
            </button>
          ))}
        </div>

        {paymentMethod === 'card'
          ? <CardForm onPay={handlePay} paying={paying} />
          : <VirementForm onConfirm={handlePay} paying={paying} />}
      </div>

      <div className="ck-actions">
        <button className="btn ghost" type="button" onClick={onBack} disabled={paying}>
          ← Retour
        </button>
      </div>
    </div>
  );
}
