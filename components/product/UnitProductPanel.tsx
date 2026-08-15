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
  // Produits au mètre linéaire : la longueur (mm) pilote le prix (prix/ml × longueur).
  const isMl = product.uom === 'ml';
  const [lengthMm, setLengthMm] = useState(2000);
  const { addLine, openCart, showTTC } = useCartStore();
  const { user } = useAuthStore();
  const TVA = 0.20;

  const node = product.taxonomySlug ?? product.famille;
  const discountPct = resolveB2BDiscountSeed(user?.proDiscounts, node);
  const surchargePct = resolveB2BSurchargeSeed(useSurchargeStore((s) => s.map), node);
  const ecoContribHT = resolveEcoSeed(useSurchargeStore((s) => s.eco), node);

  const variant: ProductVariant | undefined = product.variants.find((v) => v.reference === selectedRef);

  // Prix de base d'UNE pièce : au ml = prix/ml × longueur(m) ; sinon = prix catalogue.
  const meters = Math.max(0, lengthMm) / 1000;
  const pieceBase = variant ? variant.priceHT * (isMl ? meters : 1) : 0;
  const split = variant ? splitB2BPrice(pieceBase, surchargePct, discountPct) : null;
  // Net « tout compris » d'une pièce (produit + surcharge + éco).
  const pieceNet = split ? split.productNet + split.surchargeNet + ecoContribHT : 0;
  // Tarif net au ml (hors éco) pour l'affichage « x € HT / ml ».
  const perMlNet = variant
    ? (() => { const s = splitB2BPrice(variant.priceHT, surchargePct, discountPct); return s.productNet + s.surchargeNet; })()
    : 0;
  const showBreakdown = !!split && (surchargePct > 0 || ecoContribHT > 0);
  const lengthValid = !isMl || lengthMm > 0;

  const handleAdd = () => {
    if (!variant || !split || !lengthValid) return;
    addLine({
      key: isMl ? `${variant.reference}-${lengthMm}` : `${variant.reference}`,
      name: product.name,
      detail: isMl
        ? `${lengthMm} mm${variant.label ? ` · ${variant.label}` : ''}`
        : variant.label,
      reference: variant.reference,
      grossUnitPriceHT: pieceBase,
      unitPriceHT: split.productNet,
      ...(split.surchargeNet > 0 ? { surchargePct, surchargeGrossUnitHT: split.surchargeGross, surchargeUnitHT: split.surchargeNet } : {}),
      ...(ecoContribHT > 0 ? { ecoContribHT } : {}),
      quantity: qty,
      uom: product.uom,
      // Re-tarification serveur : au ml, le prix dépend de la longueur.
      ...(isMl ? { pricing: { kind: 'linear' as const, reference: variant.reference, lengthMm } } : {}),
    });
    trackAddToCart({ key: variant.reference, name: product.name, categorySlug: product.categorySlug, priceHT: pieceNet, quantity: qty });
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
          {isMl && (
            <div className="field">
              <label htmlFor="lenMm">Longueur (mm)</label>
              <div className="qty-row">
                <button type="button" onClick={() => setLengthMm((v) => Math.max(0, v - 100))}>−</button>
                <input
                  id="lenMm"
                  className="ml-len"
                  type="number"
                  min={1}
                  step={10}
                  value={lengthMm}
                  onChange={(e) => setLengthMm(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <button type="button" onClick={() => setLengthMm((v) => v + 100)}>+</button>
              </div>
              <div className="ml-hint">
                Prix calculé au mètre linéaire — saisissez la longueur souhaitée (ex.&nbsp;2400&nbsp;mm).
              </div>
            </div>
          )}

          <div className="field">
            <label>Quantité ({isMl ? 'pièces' : uomLabel})</label>
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
                  ? <>{euro(pieceNet * qty * (1 + TVA))}<small> TTC</small></>
                  : <>{euro(pieceNet * qty)}<small> HT</small></>
                }
              </div>
              {discountPct > 0 && (
                <div className="unit-uprice unit-uprice--crossed">
                  {isMl
                    ? <>{euro(pieceBase * qty)} HT</>
                    : <>{euro(variant.priceHT)} HT / {uomLabel}</>}
                </div>
              )}
              {showBreakdown && split && (
                <div className="price-breakdown">
                  <div className="pb-row"><span>Produit HT{isMl ? ' (longueur)' : ''}</span><span>{euro(split.productNet)}</span></div>
                  {surchargePct > 0 && (
                    <div className="pb-row"><span>+ Surcharge temporaire (+{surchargePct}%)</span><span>{euro(split.surchargeNet)}</span></div>
                  )}
                  {ecoContribHT > 0 && (
                    <div className="pb-row"><span>+ Éco-contribution</span><span>{euro(ecoContribHT)}</span></div>
                  )}
                </div>
              )}
              <div className="unit-uprice">
                {isMl
                  ? <>{showTTC ? <>{euro(perMlNet * (1 + TVA))} TTC</> : <>{euro(perMlNet)} HT</>} / ml · {lengthMm} mm × {qty}</>
                  : (showTTC
                      ? <>{euro(pieceNet * (1 + TVA))} TTC / {uomLabel}</>
                      : <>{euro(pieceNet)} HT / {uomLabel}</>)
                }
              </div>
            </div>
          </div>

          <button
            className="btn solid full"
            type="button"
            onClick={handleAdd}
            disabled={!lengthValid}
          >
            Ajouter au panier
          </button>
        </>
      )}
    </div>
  );
}
