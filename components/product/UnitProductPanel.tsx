'use client';

import { useState } from 'react';
import { type UnitProduct, type ProductVariant } from '@/lib/catalog/types';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { resolveB2BDiscountSeed, resolveB2BSurchargeSeed, resolveEcoSeed, splitB2BPrice } from '@/lib/pricing/discount-resolver';
import { useSurchargeStore } from '@/lib/store/surcharge';
import { toast } from '@/components/ui/Toast';
import { trackAddToCart } from '@/lib/analytics';

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
  const { user } = useAuthStore();
  const TVA = 0.20;

  const node = product.taxonomySlug ?? product.famille;
  const discountPct = resolveB2BDiscountSeed(user?.proDiscounts, node);
  const surchargePct = resolveB2BSurchargeSeed(useSurchargeStore((s) => s.map), node);
  const ecoContribHT = resolveEcoSeed(useSurchargeStore((s) => s.eco), node);
  // Prix affiché = produit net + surcharge nette + éco (tout compris) ; la ligne panier stocke le détail.
  const net = (base: number) => { const s = splitB2BPrice(base, surchargePct, discountPct); return s.productNet + s.surchargeNet + ecoContribHT; };

  const variant: ProductVariant | undefined = product.variants.find((v) => v.reference === selectedRef);
  // Détail transparent (par unité) : produit net / surcharge / éco quand ils s'appliquent.
  const split = variant ? splitB2BPrice(variant.priceHT, surchargePct, discountPct) : null;
  const showBreakdown = !!split && (surchargePct > 0 || ecoContribHT > 0);

  const handleAdd = () => {
    if (!variant) return;
    const s = splitB2BPrice(variant.priceHT, surchargePct, discountPct);
    addLine({
      key: `${variant.reference}`,
      name: product.name,
      detail: variant.label,
      reference: variant.reference,
      grossUnitPriceHT: variant.priceHT,
      unitPriceHT: s.productNet,
      ...(s.surchargeNet > 0 ? { surchargePct, surchargeGrossUnitHT: s.surchargeGross, surchargeUnitHT: s.surchargeNet } : {}),
      ...(ecoContribHT > 0 ? { ecoContribHT } : {}),
      quantity: qty,
      uom: product.uom,
    });
    trackAddToCart({ key: variant.reference, name: product.name, categorySlug: product.categorySlug, priceHT: variant.priceHT, quantity: qty });
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
              {discountPct > 0 && (
                <div className="unit-discount-badge">−{discountPct}% pro</div>
              )}
              <div className="pr">
                {showTTC
                  ? <>{euro(net(variant.priceHT) * qty * (1 + TVA))}<small> TTC</small></>
                  : <>{euro(net(variant.priceHT) * qty)}<small> HT</small></>
                }
              </div>
              {discountPct > 0 && (
                <div className="unit-uprice unit-uprice--crossed">
                  {euro(variant.priceHT)} HT / {uomLabel}
                </div>
              )}
              {showBreakdown && split && (
                <div className="price-breakdown">
                  <div className="pb-row"><span>Produit HT</span><span>{euro(split.productNet)}</span></div>
                  {surchargePct > 0 && (
                    <div className="pb-row"><span>+ Surcharge temporaire (+{surchargePct}%)</span><span>{euro(split.surchargeNet)}</span></div>
                  )}
                  {ecoContribHT > 0 && (
                    <div className="pb-row"><span>+ Éco-contribution</span><span>{euro(ecoContribHT)}</span></div>
                  )}
                </div>
              )}
              <div className="unit-uprice">
                {showTTC
                  ? <>{euro(net(variant.priceHT) * (1 + TVA))} TTC / {uomLabel}</>
                  : <>{euro(net(variant.priceHT))} HT / {uomLabel}</>
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
