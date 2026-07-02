'use client';

import { useEffect, useState } from 'react';
import type { Address } from '@/lib/store/checkout';
import { useCheckoutStore } from '@/lib/store/checkout';
import { useAuthStore } from '@/lib/store/auth';
import { fetchCitiesByPostalCode, type CityOption } from '@/lib/geo';

interface Props { onNext: () => void }

export function AddressFields({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: Address;
  onChange: (a: Address) => void;
}) {
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);

  useEffect(() => {
    const cp = value.postalCode;
    if (!/^\d{5}$/.test(cp)) { setCityOptions([]); return; }
    let cancelled = false;
    fetchCitiesByPostalCode(cp).then((cities) => {
      if (cancelled) return;
      setCityOptions(cities);
      if (cities.length === 1) {
        onChange({ ...value, city: cities[0].nom });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.postalCode]);

  const field = (key: keyof Address, label: string, type = 'text', required = true, pattern?: string) => (
    <div className="field">
      <label htmlFor={`${prefix}-${key}`}>{label}{required && ' *'}</label>
      <input
        id={`${prefix}-${key}`}
        type={type}
        required={required}
        pattern={pattern}
        maxLength={key === 'postalCode' ? 5 : undefined}
        inputMode={key === 'postalCode' ? 'numeric' : undefined}
        value={value[key]}
        onChange={(e) => {
          const v = key === 'postalCode' ? e.target.value.replace(/\D/g, '') : e.target.value;
          onChange({ ...value, [key]: v });
        }}
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
        <div className="field">
          <label htmlFor={`${prefix}-city`}>Ville *</label>
          {cityOptions.length > 1 ? (
            <select
              id={`${prefix}-city`}
              required
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
            >
              <option value="">Choisir une ville…</option>
              {cityOptions.map((c) => (
                <option key={c.code} value={c.nom}>{c.nom}</option>
              ))}
            </select>
          ) : (
            <input
              id={`${prefix}-city`}
              type="text"
              required
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              autoComplete="address-level2"
            />
          )}
        </div>
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
