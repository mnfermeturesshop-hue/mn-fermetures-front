'use client';

import { useState } from 'react';
import { useCheckoutStore, shippingCostHT, genOrderId } from '@/lib/store/checkout';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { StripeCardForm } from '@/components/checkout/StripeCardForm';
import type { PaymentMethod } from '@/lib/store/checkout';

interface Props { onBack: () => void }

function VirementForm({ onConfirm, paying }: { onConfirm: () => void; paying: boolean }) {
  const tempRef = `CMD-${new Date().getFullYear()}-XXXX`;
  return (
    <div className="virement-form">
      <div className="virement-info">
        <div className="virement-row"><span>Titulaire</span><strong>MN FERMETURES SAS</strong></div>
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
  const {
    paymentMethod, setPaymentMethod,
    shippingAddress, billingAddress, sameAsBilling,
    shippingMethod, guestEmail, guestMode,
    setPendingOrderPayload, setPlacedOrder,
  } = useCheckoutStore();
  const { user, isPro } = useAuthStore();
  const { lines, totalHT, isFranco, laquageForfait, clearCart } = useCartStore();
  const [paying, setPaying] = useState(false);

  const defaultMethod: PaymentMethod = isPro() ? 'virement' : 'card';
  if (paymentMethod !== defaultMethod && !paying) {
    setPaymentMethod(defaultMethod);
  }

  const fraisHT  = shippingCostHT(shippingMethod, isFranco());
  const laquageHT = laquageForfait();
  const grandHT  = totalHT() + fraisHT + laquageHT;
  const grandTTC = grandHT * 1.2;

  const email        = guestMode ? guestEmail : (user?.email ?? '');
  const customerName = guestMode
    ? `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()
    : (user?.name ?? '');

  // Génère le numéro de commande une seule fois dès que ce composant est monté
  const [orderNumber] = useState(() => genOrderId());

  const buildPayload = () => ({
    orderNumber,
    email,
    customerName,
    isGuest: guestMode || !user,
    userId: user?.id,
    paymentMethod,
    shippingMethod,
    lines,
    totalHT: grandHT,
    totalTTC: grandTTC,
    fraisHT,
    shippingAddress,
    billingAddress: sameAsBilling ? shippingAddress : billingAddress,
  });

  // Paiement carte : Stripe gère la redirection vers /commande/confirmation
  const handleStripeConfirm = async (confirmStripe: () => Promise<{ error?: string }>) => {
    setPendingOrderPayload(buildPayload());
    const result = await confirmStripe();
    if (result.error) setPaying(false);
    // En cas de succès, Stripe redirige — pas besoin d'action supplémentaire
  };

  // Paiement virement : on sauvegarde directement et on redirige
  const handleVirement = async () => {
    setPaying(true);
    const payload = buildPayload();
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('[checkout] order API error:', e);
    }
    // Mémorise la commande pour l'affichage de la page de confirmation
    setPlacedOrder({
      id: orderNumber,
      date: new Date().toLocaleDateString('fr-FR'),
      lines,
      totalHT: grandHT,
      totalTTC: grandTTC,
      fraisHT,
      shippingAddress,
      shippingMethod,
      paymentMethod: 'virement',
      status: 'pending',
    });
    clearCart();
    window.location.href = `/commande/${orderNumber}`;
  };

  const methods: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'card',     label: 'Carte bancaire',   icon: '💳' },
    { id: 'virement', label: 'Virement bancaire', icon: '🏦' },
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
              disabled={paying}
            >
              <span>{m.icon}</span> {m.label}
              {m.id === 'virement' && isPro() && (
                <span className="pro-chip" style={{ marginLeft: 6 }}>PRO</span>
              )}
            </button>
          ))}
        </div>

        {paymentMethod === 'card' ? (
          <StripeCardForm
            amountTTC={grandTTC}
            orderNumber={orderNumber}
            email={email}
            lines={lines}
            shippingMethod={shippingMethod}
            onPay={handleStripeConfirm}
            paying={paying}
            setExternalPaying={setPaying}
          />
        ) : (
          <VirementForm onConfirm={handleVirement} paying={paying} />
        )}
      </div>

      <div className="ck-actions">
        <button className="btn ghost" type="button" onClick={onBack} disabled={paying}>
          ← Retour
        </button>
      </div>
    </div>
  );
}
