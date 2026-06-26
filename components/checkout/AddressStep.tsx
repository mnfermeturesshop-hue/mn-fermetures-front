'use client';

import { useState } from 'react';
import type { Address } from '@/lib/store/checkout';
import { useCheckoutStore } from '@/lib/store/checkout';
import { useAuthStore } from '@/lib/store/auth';

interface Props { onNext: () => void }

function AddressFields({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: Address;
  onChange: (a: Address) => void;
}) {
  const field = (key: keyof Address, label: string, type = 'text', required = true, pattern?: string) => (
    <div className="field">
      <label htmlFor={`${prefix}-${key}`}>{label}{required && ' *'}</label>
      <input
        id={`${prefix}-${key}`}
        type={type}
        required={required}
        pattern={pattern}
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        autoComplete={key === 'firstName' ? 'given-name' : key === 'lastName' ? 'family-name' : key}
      />
    </div>
  );

  return (
    <div className="addr-grid">
      <div className="addr-row-2">
        {field('firstName', 'Prénom')}
        {field('lastName', 'Nom')}
      </div>
      {field('company', 'Société / Raison sociale', 'text', false)}
      {field('address1', 'Adresse')}
      {field('address2', "Complément d'adresse", 'text', false)}
      <div className="addr-row-2">
        {field('postalCode', 'Code postal', 'text', true, '[0-9]{5}')}
        {field('city', 'Ville')}
      </div>
      {field('phone', 'Téléphone', 'tel', true)}
    </div>
  );
}

export function AddressStep({ onNext }: Props) {
  const { shippingAddress, billingAddress, sameAsBilling,
    setShippingAddress, setBillingAddress, setSameAsBilling } = useCheckoutStore();
  const { user } = useAuthStore();

  const [shipping, setShipping] = useState<Address>(() => ({
    ...shippingAddress,
    firstName: shippingAddress.firstName || user?.name.split(' ')[0] || '',
    lastName:  shippingAddress.lastName  || user?.name.split(' ').slice(1).join(' ') || '',
    company:   shippingAddress.company   || user?.company || '',
  }));
  const [billing, setBilling] = useState<Address>(billingAddress);
  const [same, setSame] = useState(sameAsBilling);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShippingAddress(shipping);
    setBillingAddress(same ? shipping : billing);
    setSameAsBilling(same);
    onNext();
  };

  return (
    <form className="ck-form" onSubmit={handleSubmit}>
      <div className="ck-section">
        <h2 className="ck-section-title">Adresse de livraison</h2>
        <AddressFields prefix="ship" value={shipping} onChange={setShipping} />
      </div>

      <div className="ck-section">
        <label className="ck-checkbox">
          <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} />
          <span>Adresse de facturation identique à la livraison</span>
        </label>
      </div>

      {!same && (
        <div className="ck-section">
          <h2 className="ck-section-title">Adresse de facturation</h2>
          <AddressFields prefix="bill" value={billing} onChange={setBilling} />
        </div>
      )}

      <div className="ck-actions">
        <button className="btn solid lg" type="submit">
          Continuer → Mode de livraison
        </button>
      </div>
    </form>
  );
}
