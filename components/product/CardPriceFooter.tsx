'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { useSurchargeStore } from '@/lib/store/surcharge';
import {
  resolveB2BDiscountSeed,
  resolveB2BSurchargeSeed,
  resolveEcoSeed,
  splitB2BPrice,
} from '@/lib/pricing/discount-resolver';
import { toast } from '@/components/ui/Toast';
import { trackAddToCart } from '@/lib/analytics';
import type { Uom } from '@/lib/catalog/types';

interface Props {
  name: string;
  /** Nœud de taxonomie (sous-famille) ou famille — pour remise/surcharge/éco. */
  node?: string;
  categorySlug: string;
  proOnly: boolean;
  /** Style d'affichage du prix : fabriqué (« à partir de » arrondi), au mètre, ou à l'unité. */
  kind: 'made' | 'ml' | 'unit';
  uom: Uom;
  /** Prix HT brut « à partir de » (avant remise/surcharge/éco). */
  grossFrom: number;
  detailHref: string;
  ctaLabel: string;
  /** Présent = ajout direct possible (unitaire, variante unique en stock). */
  directVariant?: { reference: string; priceHT: number; label?: string };
}

/** Pied de carte produit (prix + ajout) rendu côté client : applique la remise pro,
 *  la surcharge temporaire et l'éco-contribution comme les fiches produit, pour que le
 *  prix affiché ET la ligne ajoutée soient cohérents partout. */
export function CardPriceFooter({
  name, node, categorySlug, proOnly, kind, uom, grossFrom, detailHref, ctaLabel, directVariant,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [qty, setQty] = useState(1);
  const { addLine, openCart } = useCartStore();
  const { user } = useAuthStore();

  const discountPct = resolveB2BDiscountSeed(user?.proDiscounts, node);
  const surchargePct = resolveB2BSurchargeSeed(useSurchargeStore((s) => s.map), node);
  const ecoContribHT = resolveEcoSeed(useSurchargeStore((s) => s.eco), node);
  const net = (base: number) => {
    const s = splitB2BPrice(base, surchargePct, discountPct);
    return s.productNet + s.surchargeNet + ecoContribHT;
  };

  // Garde d'hydratation : tant que les stores persistés ne sont pas montés, on affiche
  // le prix brut (comme le rendu serveur) pour éviter un écart d'hydratation.
  const price = mounted ? net(grossFrom) : grossFrom;
  const showDiscount = mounted && discountPct > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!directVariant) return;
    const s = splitB2BPrice(directVariant.priceHT, surchargePct, discountPct);
    addLine({
      key: directVariant.reference,
      name,
      detail: directVariant.label,
      reference: directVariant.reference,
      grossUnitPriceHT: directVariant.priceHT,
      unitPriceHT: s.productNet,
      ...(s.surchargeNet > 0 ? { surchargePct, surchargeGrossUnitHT: s.surchargeGross, surchargeUnitHT: s.surchargeNet } : {}),
      ...(ecoContribHT > 0 ? { ecoContribHT } : {}),
      quantity: qty,
      uom,
    });
    trackAddToCart({ key: directVariant.reference, name, categorySlug, priceHT: s.productNet, quantity: qty });
    toast.success(`${name} ajouté au panier`);
    openCart();
  };

  const badge = showDiscount ? <span className="card-discount-badge">−{discountPct}% pro</span> : null;
  const crossed = showDiscount ? <span className="card-cross">{euro(grossFrom)}</span> : null;

  return (
    <div className="foot">
      {proOnly ? (
        <div className="proonly">Prix réservé aux pros</div>
      ) : kind === 'made' ? (
        <div className="pr">
          {badge}
          <span className="from">à partir de</span>
          {price.toFixed(0)},00 <small>€ HT</small>
          {crossed}
        </div>
      ) : kind === 'ml' ? (
        <div className="pr">
          {badge}
          <span className="from">à partir de</span>
          {euro(price)}<small> /ml</small>
          {crossed}
        </div>
      ) : (
        <div className="pr">
          {badge}
          {euro(price)}<small> /{uom}</small>
          {crossed}
        </div>
      )}

      {proOnly ? (
        <Link className="add" href="/pro">Se connecter</Link>
      ) : directVariant ? (
        <div className="card-add-row" onClick={(e) => e.preventDefault()}>
          <div className="card-qty-ctrl">
            <button type="button" aria-label="Diminuer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty((q) => Math.max(1, q - 1)); }}>−</button>
            <span>{qty}</span>
            <button type="button" aria-label="Augmenter" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQty((q) => q + 1); }}>+</button>
          </div>
          <button className="add" type="button" onClick={handleAdd}>Ajouter</button>
        </div>
      ) : (
        <Link className={`add ${kind === 'made' || kind === 'ml' ? 'config' : ''}`} href={detailHref}>
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
