'use client';

import { useCartStore } from '@/lib/store/cart';

export function PriceToggle() {
  const { showTTC, toggleTTC } = useCartStore();
  return (
    <button
      type="button"
      className="price-toggle"
      onClick={toggleTTC}
      title={showTTC ? 'Afficher les prix HT' : 'Afficher les prix TTC'}
      aria-label={showTTC ? 'Afficher les prix HT' : 'Afficher les prix TTC'}
    >
      <span className={showTTC ? '' : 'active'}>HT</span>
      <span className="price-toggle-sep">/</span>
      <span className={showTTC ? 'active' : ''}>TTC</span>
    </button>
  );
}
