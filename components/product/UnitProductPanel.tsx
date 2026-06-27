'use client';

import { useState } from 'react';
import { type UnitProduct, type ProductVariant } from '@/lib/catalog/types';
import { useCartStore, euro } from '@/lib/store/cart';
import { toast } from '@/components/ui/Toast';

const UOM_LABELS: Record<string, string> = {
  unite: 'unité',
  ml: 'ml',
  paire: 'paire',
  m2: 'm²',
};

export function UnitProductPanel({ product }: { product: UnitProduct }) {
  const [selectedRef, setSelectedRef] = useState(product.variants[0]?.reference ?? '');
  const [qty, setQty] = useState(1);
  const { addLine, openCart, showTTC } = useCartStore();
  const TVA = 0.20;

  const variant: ProductVariant | undefined = product.variants.find((v) => v.reference === selectedRef);

  const handleAdd = () => {
    if (!variant) return;
    addLine({
      key: `${variant.reference}`,
      name: product.name,
      detail: variant.label,
      reference: variant.reference,
      unitPriceHT: variant.priceHT,
      quantity: qty,
      uom: product.uom,
    });
    toast.success(`${product.name} ajouté au panier`);
    openCart();
  };

  const hasColors = product.variants.some((v) => v.color);
  const hasLabels = product.variants.some((v) => v.label && !v.color);
  const uomLabel = UOM_LABELS[product.uom] ?? product.uom;

  return (
    <div className="unit-panel">
      {hasColors && (
        <div className="field">
          <label>Couleur</label>
          <div className="color-picker">
            {product.variants.map((v) => (
              <button
                key={v.reference}
                type="button"
                className={`color-swatch ${v.reference === selectedRef ? 'active' : ''} ${!v.inStock ? 'out' : ''}`}
                style={{ background: v.color?.hex }}
                title={v.color?.label ?? v.label}
                onClick={() => setSelectedRef(v.reference)}
                aria-label={v.color?.label ?? v.label}
              />
            ))}
          </div>
          {variant?.color && (
            <div className="color-name">{variant.color.label}</div>
          )}
        </div>
      )}

      {hasLabels && !hasColors && (
        <div className="field">
          <label>Variante</label>
          <div className="variant-btns">
            {product.variants.map((v) => (
              <button
                key={v.reference}
                type="button"
                className={`variant-btn ${v.reference === selectedRef ? 'active' : ''}`}
                onClick={() => setSelectedRef(v.reference)}
              >
                {v.label ?? v.reference}
              </button>
            ))}
          </div>
        </div>
      )}

      {variant && (
        <>
          <div className="field">
            <label>Quantité ({uomLabel})</label>
            <div className="qty-row">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <button type="button" onClick={() => setQty(qty + 1)}>+</button>
            </div>
          </div>

          <div className="unit-footer">
            <div>
              <div className="unit-ref ref">{variant.reference}</div>
              <div className={`stock ${variant.inStock ? 'ok' : 'no'}`}>
                {variant.inStock
                  ? variant.stockQty !== undefined
                    ? `${variant.stockQty} en stock`
                    : 'En stock'
                  : 'Sur commande'}
              </div>
            </div>
            <div>
              <div className="pr">
                {showTTC
                  ? <>{euro(variant.priceHT * qty * (1 + TVA))}<small> TTC</small></>
                  : <>{euro(variant.priceHT * qty)}<small> HT</small></>
                }
              </div>
              <div className="unit-uprice">
                {showTTC
                  ? <>{euro(variant.priceHT * (1 + TVA))} TTC / {uomLabel}</>
                  : <>{euro(variant.priceHT)} HT / {uomLabel}</>
                }
              </div>
            </div>
          </div>

          <button
            className="btn solid full"
            type="button"
            onClick={handleAdd}
          >
            Ajouter au panier
          </button>
        </>
      )}
    </div>
  );
}
