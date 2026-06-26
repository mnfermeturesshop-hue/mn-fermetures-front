'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import { useCheckoutStore } from '@/lib/store/checkout';
import { StepBar } from '@/components/checkout/StepBar';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { AddressStep } from '@/components/checkout/AddressStep';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default function CheckoutPage() {
  const { totalLines } = useCartStore();
  const { step, setStep } = useCheckoutStore();
  const router = useRouter();

  useEffect(() => {
    if (totalLines() === 0) router.replace('/panier');
  }, [totalLines, router]);

  if (totalLines() === 0) return null;

  const next = () => setStep((step < 3 ? step + 1 : step) as 1 | 2 | 3);
  const back = () => setStep((step > 1 ? step - 1 : step) as 1 | 2 | 3);

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
