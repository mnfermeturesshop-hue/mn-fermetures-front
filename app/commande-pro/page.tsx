'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { useCheckoutStore, shippingCostHT, genOrderId } from '@/lib/store/checkout';
import type { Address } from '@/lib/store/checkout';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AddressFields } from '@/components/checkout/AddressStep';

const BLANK: Address = {
  firstName: '', lastName: '', company: '',
  address1: '', address2: '', postalCode: '', city: '', phone: '',
};

type BcStep = 1 | 2 | 3;

export default function CommandeProPage() {
  const router = useRouter();
  const { user, isPro } = useAuthStore();
  const { lines, totalHT, totalTTC, isFranco, clearCart } = useCartStore();
  const { shippingAddress, shippingMethod, setShippingAddress, setShippingMethod } = useCheckoutStore();

  const [step, setStep]         = useState<BcStep>(1);
  const [address, setAddress]   = useState<Address>(() => ({
    ...BLANK,
    ...shippingAddress,
    firstName: shippingAddress.firstName || (user?.name?.split(' ')[0] ?? ''),
    lastName:  shippingAddress.lastName  || (user?.name?.split(' ').slice(1).join(' ') ?? ''),
    company:   shippingAddress.company   || user?.company || '',
  }));
  const [shipping, setShipping] = useState<'standard' | 'express'>(shippingMethod);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!user || !isPro()) router.replace('/pro');
  }, [user, isPro, router]);

  useEffect(() => {
    if (user && lines.length === 0) router.replace('/panier');
  }, [user, lines, router]);

  if (!user || !isPro() || lines.length === 0) return null;

  const ht      = totalHT();
  const franco  = isFranco();
  const fraisHT = shippingCostHT(shipping, franco);
  const grandHT  = ht + fraisHT;
  const grandTTC = totalTTC() + fraisHT * 1.2;

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShippingAddress(address);
    setStep(2);
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShippingMethod(shipping);
    setStep(3);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    const orderNumber = genOrderId();

    try {
      const res = await fetch('/api/orders/bon-de-commande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          email: user.email,
          customerName: user.name,
          company: user.company ?? '',
          userId: user.id,
          shippingMethod: shipping,
          lines: lines.map((l) => ({
            key: l.key,
            name: l.name,
            reference: l.reference,
            detail: l.detail,
            quantity: l.quantity,
            unitPriceHT: l.unitPriceHT,
          })),
          totalHT: grandHT,
          totalTTC: grandTTC,
          fraisHT,
          shippingAddress: address,
        }),
      });

      if (!res.ok) throw new Error('api');

      useCheckoutStore.setState({
        placedOrder: {
          id: orderNumber,
          date: new Date().toLocaleDateString('fr-FR'),
          lines: [...lines],
          totalHT: grandHT,
          totalTTC: grandTTC,
          fraisHT,
          shippingAddress: address,
          shippingMethod: shipping,
          paymentMethod: 'bon_de_commande',
        },
      });

      clearCart();
      router.push(`/commande/${orderNumber}`);
    } catch {
      setError("Une erreur s'est produite. Veuillez réessayer ou nous contacter au 04 67 78 06 63.");
      setSubmitting(false);
    }
  };

  const STEPS = ['Adresse', 'Livraison', 'Confirmation'];

  return (
    <div className="wrap bc-page">
      <Breadcrumb crumbs={[
        { label: 'Accueil', href: '/' },
        { label: 'Panier', href: '/panier' },
        { label: 'Bon de commande' },
      ]} />

      <div className="bc-header">
        <h1>Bon de commande</h1>
        <p className="bc-header-sub">Espace professionnel — {user.company ?? user.name}</p>
      </div>

      {/* Step bar */}
      <div className="bc-stepbar">
        {STEPS.map((label, i) => (
          <div key={label} className={`bc-step${step === i + 1 ? ' active' : step > i + 1 ? ' done' : ''}`}>
            <div className="bc-step-n">{step > i + 1 ? '✓' : i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="bc-layout">
        <main className="bc-main">

          {/* ── Step 1 : Adresse ── */}
          {step === 1 && (
            <form className="ck-form" onSubmit={handleAddressSubmit}>
              <div className="ck-section">
                <h2 className="ck-section-title">Adresse de livraison</h2>
                <AddressFields prefix="bc" value={address} onChange={setAddress} />
              </div>
              <div className="ck-actions">
                <button className="btn solid lg" type="submit">
                  Continuer → Mode de livraison
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2 : Livraison ── */}
          {step === 2 && (
            <form className="ck-form" onSubmit={handleShippingSubmit}>
              <div className="ck-section">
                <h2 className="ck-section-title">Mode de livraison</h2>
                <div className="shipping-options">
                  {([
                    { id: 'standard', label: 'Standard',    desc: '3–5 jours ouvrés', price: franco ? 0 : 26 },
                    { id: 'express',  label: 'Express 24h', desc: 'Livraison le lendemain ouvré', price: 42 },
                  ] as const).map((opt) => (
                    <label key={opt.id} className={`shipping-option${shipping === opt.id ? ' active' : ''}`}>
                      <input type="radio" name="shipping" value={opt.id}
                        checked={shipping === opt.id}
                        onChange={() => setShipping(opt.id)}
                      />
                      <div className="shipping-option-body">
                        <div className="shipping-option-top">
                          <span className="shipping-option-label">{opt.label}</span>
                          <span className="shipping-option-price">
                            {opt.price === 0 ? <span className="green">Offerte</span> : `${euro(opt.price)} HT`}
                          </span>
                        </div>
                        <div className="shipping-option-desc">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="ck-actions">
                <button className="btn ghost" type="button" onClick={() => setStep(1)}>← Retour</button>
                <button className="btn solid lg" type="submit">Continuer → Récapitulatif</button>
              </div>
            </form>
          )}

          {/* ── Step 3 : Confirmation ── */}
          {step === 3 && (
            <div className="ck-form">
              <div className="ck-section">
                <h2 className="ck-section-title">Récapitulatif</h2>

                <div className="bc-recap">
                  <div className="bc-recap-block">
                    <div className="bc-recap-content">
                      <div className="bc-recap-label">Adresse de livraison</div>
                      <div className="bc-recap-body">
                        <strong>{address.firstName} {address.lastName}</strong>
                        {address.company && <div>{address.company}</div>}
                        <div>{address.address1}</div>
                        {address.address2 && <div>{address.address2}</div>}
                        <div>{address.postalCode} {address.city}</div>
                        <div>{address.phone}</div>
                      </div>
                    </div>
                    <button className="btn ghost sm" type="button" onClick={() => setStep(1)}>Modifier</button>
                  </div>

                  <div className="bc-recap-block">
                    <div className="bc-recap-content">
                      <div className="bc-recap-label">Mode de livraison</div>
                      <div className="bc-recap-body">
                        {shipping === 'express' ? 'Express 24h' : 'Standard 3–5 jours ouvrés'}
                        {' — '}
                        {fraisHT === 0
                          ? <span className="green">Offerte</span>
                          : `${euro(fraisHT)} HT`}
                      </div>
                    </div>
                    <button className="btn ghost sm" type="button" onClick={() => setStep(2)}>Modifier</button>
                  </div>
                </div>

                <div className="bc-info-box">
                  En cliquant sur &quot;Envoyer le bon de commande&quot;, votre demande est transmise
                  par email à notre équipe commerciale. Nous vous confirmerons la disponibilité
                  et les modalités de livraison sous 24h ouvrées.
                </div>

                {error && <div className="doc-warning" style={{ marginTop: 16 }}>{error}</div>}
              </div>

              <div className="ck-actions">
                <button className="btn ghost" type="button" onClick={() => setStep(2)} disabled={submitting}>
                  ← Retour
                </button>
                <button
                  className="btn solid lg"
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Envoi en cours…' : 'Envoyer le bon de commande →'}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ── Récap commande (sticky) ── */}
        <aside className="bc-summary">
          <h3>Votre commande</h3>
          <div className="bc-lines">
            {lines.map((l) => (
              <div key={l.key} className="bc-line">
                <div className="bc-line-name">{l.name}</div>
                {l.reference && <div className="ref" style={{ fontSize: 11 }}>{l.reference}</div>}
                {l.detail && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.detail}</div>}
                <div className="bc-line-qty-price">
                  <span>{l.quantity} ×</span>
                  <span>{euro(l.unitPriceHT * l.quantity)} HT</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bc-summary-totals">
            <div className="summary-row"><span>Sous-total HT</span><span>{euro(ht)}</span></div>
            <div className="summary-row muted">
              <span>Livraison HT</span>
              <span>{fraisHT === 0 ? <span className="green">Offerte</span> : euro(fraisHT)}</span>
            </div>
            <div className="summary-row summary-ht"><span>Total HT</span><span>{euro(grandHT)}</span></div>
            <div className="summary-row summary-ttc"><span>Total TTC</span><span>{euro(grandTTC)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
