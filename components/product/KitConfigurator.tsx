'use client';

import { useState } from 'react';
import { type KitProduct } from '@/lib/catalog/types';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { resolveB2BDiscountSeed, resolveB2BSurchargeSeed, resolveEcoSeed, splitB2BPrice } from '@/lib/pricing/discount-resolver';
import { useSurchargeStore } from '@/lib/store/surcharge';
import { toast } from '@/components/ui/Toast';
import { trackAddToCart } from '@/lib/analytics';

export function KitConfigurator({ product }: { product: KitProduct }) {
  const [selectedRef, setSelectedRef] = useState(product.configs[0].reference);
  const { addLine, openCart } = useCartStore();
  const { user } = useAuthStore();

  const config = product.configs.find((c) => c.reference === selectedRef) ?? product.configs[0];
  const node = product.taxonomySlug ?? product.famille;
  const discountPct = resolveB2BDiscountSeed(user?.proDiscounts, node);
  const surchargePct = resolveB2BSurchargeSeed(useSurchargeStore((s) => s.map), node);
  const ecoContribHT = resolveEcoSeed(useSurchargeStore((s) => s.eco), node);
  const net = (base: number) => { const s = splitB2BPrice(base, surchargePct, discountPct); return s.productNet + s.surchargeNet + ecoContribHT; };
  const finalPriceHT = net(config.priceHT);
  const split = splitB2BPrice(config.priceHT, surchargePct, discountPct);
  const showBreakdown = surchargePct > 0 || ecoContribHT > 0;

  const handleAdd = () => {
    const s = splitB2BPrice(config.priceHT, surchargePct, discountPct);
    addLine({
      key: config.reference,
      name: product.name,
      detail: config.label,
      reference: config.reference,
      grossUnitPriceHT: config.priceHT,
      unitPriceHT: s.productNet,
      ...(s.surchargeNet > 0 ? { surchargePct, surchargeGrossUnitHT: s.surchargeGross, surchargeUnitHT: s.surchargeNet } : {}),
      ...(ecoContribHT > 0 ? { ecoContribHT } : {}),
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
            <span className="kit-cfg-price">{euro(net(c.priceHT))} HT</span>
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
          {showBreakdown && (
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
        </div>
        <button className="btn solid" type="button" onClick={handleAdd}>
          Ajouter au panier
        </button>
      </div>
    </div>
  );
}
