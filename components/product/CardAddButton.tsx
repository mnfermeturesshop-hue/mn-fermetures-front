'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/store/cart';
import { toast } from '@/components/ui/Toast';
import { trackAddToCart } from '@/lib/analytics';
import type { Uom } from '@/lib/catalog/types';

interface Props {
  lineKey: string;
  name: string;
  reference: string;
  unitPriceHT: number;
  uom: Uom;
  label?: string;
}

export function CardAddButton({ lineKey, name, reference, unitPriceHT, uom, label }: Props) {
  const [qty, setQty] = useState(1);
  const { addLine, openCart } = useCartStore();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addLine({ key: lineKey, name, detail: label, reference, unitPriceHT, quantity: qty, uom });
    trackAddToCart({ key: lineKey, name, categorySlug: '', priceHT: unitPriceHT, quantity: qty });
    toast.success(`${name} ajouté au panier`);
    openCart();
  };

  return (
    <div className="card-add-row" onClick={(e) => e.preventDefault()}>
      <div className="card-qty-ctrl">
        <button
          type="button"
          aria-label="Diminuer"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}
        >−</button>
        <span>{qty}</span>
        <button
          type="button"
          aria-label="Augmenter"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty((q) => q + 1); }}
        >+</button>
      </div>
      <button className="add" type="button" onClick={handleAdd}>
        Ajouter
      </button>
    </div>
  );
}
