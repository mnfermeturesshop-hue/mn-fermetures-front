'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { euro } from '@/lib/store/cart';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ amountTTC, onPay, paying, setExternalPaying }: {
  amountTTC: number;
  onPay: (confirmStripe: () => Promise<{ error?: string }>) => void;
  paying: boolean;
  setExternalPaying: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    onPay(async () => {
      setExternalPaying(true);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${siteUrl}/commande/confirmation`,
        },
      });
      if (error) {
        setMessage(error.message ?? 'Erreur de paiement');
        setExternalPaying(false);
        return { error: error.message };
      }
      return {};
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card-form">
      <div className="stripe-badge">
        <span>Paiement sécurisé</span>
        <span className="stripe-logo">🔒 SSL · Stripe</span>
      </div>

      <PaymentElement onReady={() => setReady(true)} />

      {message && <div className="form-error" style={{ marginTop: 12 }}>{message}</div>}

      <button
        className={`btn pay-btn full ${paying ? 'paying' : ''}`}
        type="submit"
        disabled={!stripe || !elements || !ready || paying}
        style={{ marginTop: 20 }}
      >
        {paying ? (
          <span className="pay-loading"><span className="spinner" /> Traitement en cours…</span>
        ) : (
          `Payer ${euro(amountTTC)} TTC`
        )}
      </button>

      <p className="pay-notice">
        Vos données bancaires sont chiffrées par Stripe et ne transitent jamais par nos serveurs.
      </p>
    </form>
  );
}

export function StripeCardForm({ amountTTC, orderNumber, email, onPay, paying, setExternalPaying }: {
  amountTTC: number;
  orderNumber: string;
  email: string;
  onPay: (confirmStripe: () => Promise<{ error?: string }>) => void;
  paying: boolean;
  setExternalPaying: (v: boolean) => void;
}) {
  const [clientSecret, setClientSecret] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!amountTTC || !orderNumber) return;
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountTTC, orderNumber, email }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setLoadError(data.error ?? 'Impossible d\'initialiser le paiement');
      })
      .catch(() => setLoadError('Erreur réseau'));
  }, [amountTTC, orderNumber, email]);

  if (loadError) return <div className="form-error">{loadError}</div>;
  if (!clientSecret) return <div className="adm-loading" style={{ padding: 24 }}>Initialisation du paiement…</div>;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: '#10314f', borderRadius: '6px', fontFamily: 'inherit' },
        },
        locale: 'fr',
      }}
    >
      <CheckoutForm
        amountTTC={amountTTC}
        onPay={onPay}
        paying={paying}
        setExternalPaying={setExternalPaying}
      />
    </Elements>
  );
}
