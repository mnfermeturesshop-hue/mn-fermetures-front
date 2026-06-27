'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import { useCheckoutStore } from '@/lib/store/checkout';
import { useAuthStore } from '@/lib/store/auth';
import { trackBeginCheckout } from '@/lib/analytics';
import { StepBar } from '@/components/checkout/StepBar';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { AddressStep } from '@/components/checkout/AddressStep';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { IdentityStep } from '@/components/checkout/IdentityStep';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default function CheckoutPage() {
  const { totalLines } = useCartStore();
  const { step, setStep, guestEmail, guestMode } = useCheckoutStore();
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (totalLines() === 0) { router.replace('/panier'); return; }
    trackBeginCheckout({ totalHT: useCartStore.getState().totalHT(), numItems: totalLines() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (totalLines() === 0) return null;

  const next = () => setStep((step < 3 ? step + 1 : step) as 1 | 2 | 3);
  const back = () => setStep((step > 1 ? step - 1 : step) as 1 | 2 | 3);

  // Étape identité : si ni connecté ni email invité collecté
  const needsIdentity = !user && !guestEmail;

  if (needsIdentity) {
    return (
      <div className="wrap checkout-page">
        <Breadcrumb crumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Panier', href: '/panier' },
          { label: 'Commande' },
        ]} />
        <IdentityStep onContinue={() => setStep(1)} />
      </div>
    );
  }

  return (
    <div className="wrap checkout-page">
      <Breadcrumb crumbs={[
        { label: 'Accueil', href: '/' },
        { label: 'Panier', href: '/panier' },
        { label: 'Commande' },
      ]} />

      <StepBar current={step} />

      <div className="checkout-layout">
        <div className="checkout-main">
          {step === 1 && <AddressStep onNext={next} />}
          {step === 2 && <ShippingStep onNext={next} onBack={back} />}
          {step === 3 && <PaymentStep onBack={back} />}
        </div>

        <OrderSummary />
      </div>
    </div>
  );
}
