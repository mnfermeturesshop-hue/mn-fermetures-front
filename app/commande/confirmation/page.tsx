'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCheckoutStore } from '@/lib/store/checkout';
import { useCartStore } from '@/lib/store/cart';

type Status = 'loading' | 'error';

function ConfirmationHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { pendingOrderPayload, setPendingOrderPayload, setPlacedOrder } = useCheckoutStore();
  const { clearCart } = useCartStore();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
    const redirectStatus = searchParams.get('redirect_status');

    if (!paymentIntentClientSecret) {
      setStatus('error');
      setErrorMsg('Paramètres de paiement manquants.');
      return;
    }

    if (redirectStatus !== 'succeeded') {
      setStatus('error');
      setErrorMsg('Le paiement n\'a pas abouti. Veuillez réessayer.');
      return;
    }

    if (!pendingOrderPayload) {
      setStatus('error');
      setErrorMsg('Données de commande introuvables. Contactez-nous si vous avez été débité.');
      return;
    }

    const payload = pendingOrderPayload;
    const orderNumber = payload.orderNumber;
    const paymentIntentId = searchParams.get('payment_intent') ?? undefined;

    // On n'affiche la confirmation QUE si le serveur valide le paiement :
    // /api/orders vérifie le PaymentIntent auprès de Stripe (audit S3).
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, paymentMethod: 'card', paymentIntentId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'Le paiement n\'a pas pu être confirmé.');
        }
        setPlacedOrder({
          id: orderNumber,
          date: new Date().toLocaleDateString('fr-FR'),
          lines: payload.lines,
          totalHT: payload.totalHT,
          totalTTC: payload.totalTTC,
          fraisHT: payload.fraisHT,
          shippingAddress: payload.shippingAddress,
          shippingMethod: payload.shippingMethod,
          paymentMethod: 'card',
          status: 'paid',
        });
        clearCart();
        setPendingOrderPayload(null);
        router.replace(`/commande/${orderNumber}`);
      })
      .catch((e: Error) => {
        setStatus('error');
        setErrorMsg(e.message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'error') {
    return (
      <div className="wrap" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Problème avec votre paiement</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>{errorMsg}</p>
        <a href="/checkout" className="btn solid">Retour au paiement</a>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 24px' }} />
      <p style={{ color: '#6b7280' }}>Finalisation de votre commande…</p>
    </div>
  );
}

export default function StripeConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="wrap" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 24px' }} />
        <p style={{ color: '#6b7280' }}>Chargement…</p>
      </div>
    }>
      <ConfirmationHandler />
    </Suspense>
  );
}
