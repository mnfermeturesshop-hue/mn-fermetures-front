'use client';

import { useState } from 'react';
import { type KitProduct } from '@/lib/catalog/types';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { getDiscount, applyDiscount } from '@/lib/familles';
import { toast } from '@/components/ui/Toast';
import { trackAddToCart } from '@/lib/analytics';

export function KitConfigurator({ product }: { product: KitProduct }) {
  const [selectedRef, setSelectedRef] = useState(product.configs[0].reference);
  const { addLine, openCart } = useCartStore();
  const { user } = useAuthStore();

  const config = product.configs.find((c) => c.reference === selectedRef) ?? product.configs[0];
  const discountPct = getDiscount(user?.proDiscounts, product.famille);
  const finalPriceHT = applyDiscount(config.priceHT, discountPct);

  const handleAdd = () => {
    addLine({
      key: config.reference,
      name: product.name,
      detail: config.label,
      reference: config.reference,
      unitPriceHT: finalPriceHT,
      quantity: 1,
      uom: 'unite',
    });
    trackAddToCart({ key: config.reference, name: product.name, categorySlug: product.categorySlug, priceHT: finalPriceHT, quantity: 1 });
    toast.success(`${product.name} ajouté au panier`);
    openCart();
  };

  return (
    <div className="kit-config">
      <div className="kit-configs">
        {product.configs.map((c) => (
          <button
            key={c.reference}
            type="button"
            className={`kit-cfg-btn ${c.reference === selectedRef ? 'active' : ''}`}
            onClick={() => setSelectedRef(c.reference)}
          >
            <span className="kit-cfg-label">{c.label}</span>
            <span className="kit-cfg-price">{euro(applyDiscount(c.priceHT, discountPct))} HT</span>
          </button>
        ))}
      </div>

      <div className="kit-bom">
        <div className="kit-bom-title">Nomenclature du kit</div>
        <ul>
          {config.bom.map((item, i) => (
            <li key={i}>
              <span className="kit-qty">{item.quantity}×</span>
              <span>{item.label}</span>
              {item.componentReference && (
                <span className="ref kit-compref"> {item.componentReference}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="kit-footer">
        <div>
          <div className="eyebrow">Prix du kit</div>
          {discountPct > 0 && (
            <div className="unit-discount-badge">−{discountPct}% pro</div>
          )}
          <div className="big">{euro(finalPriceHT)} <small>HT</small></div>
          {discountPct > 0 && (
            <div className="unit-uprice unit-uprice--crossed">{euro(config.priceHT)} HT</div>
          )}
        </div>
        <button className="btn solid" type="button" onClick={handleAdd}>
          Ajouter au panier
        </button>
      </div>
    </div>
  );
}
