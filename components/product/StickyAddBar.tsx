'use client';

import { useEffect, useRef, useState } from 'react';
import { useCartStore, euro } from '@/lib/store/cart';
import { toast } from '@/components/ui/Toast';
import type { UnitProduct } from '@/lib/catalog/types';

interface Props {
  product: UnitProduct;
  /** ID de l'élément à observer — quand il est visible, la barre se cache */
  panelId: string;
}

export function StickyAddBar({ product, panelId }: Props) {
  const [visible, setVisible] = useState(false);
  const { addLine, openCart } = useCartStore();
  const variant = product.variants[0];

  useEffect(() => {
    const el = document.getElementById(panelId);
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [panelId]);

  if (!variant || product.proOnly) return null;

  const handleAdd = () => {
    addLine({
      key: variant.reference,
      name: product.name,
      detail: variant.label,
      reference: variant.reference,
      unitPriceHT: variant.priceHT,
      quantity: 1,
      uom: product.uom,
    });
    toast.success(`${product.name} ajouté au panier`);
    openCart();
  };

  return (
    <div className={`sticky-add-bar ${visible ? 'sticky-add-bar--visible' : ''}`} aria-hidden={!visible}>
      <div className="sticky-add-inner">
        <div className="sticky-add-info">
          <span className="sticky-add-name">{product.name}</span>
          <span className="sticky-add-price">{euro(variant.priceHT)} <small>HT</small></span>
        </div>
        <button className="btn solid" type="button" onClick={handleAdd} tabIndex={visible ? 0 : -1}>
          Ajouter au panier
        </button>
      </div>
    </div>
  );
}
