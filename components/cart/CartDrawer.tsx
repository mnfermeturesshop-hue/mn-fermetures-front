'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import type { CartLine } from '@/lib/catalog/types';
import { B2C_ENABLED } from '@/lib/config';

function CartLineRow({ line }: { line: CartLine }) {
  const { updateQty, removeLine } = useCartStore();

  return (
    <div className="drawer-line">
      <div className="drawer-line-info">
        <div className="drawer-line-name">{line.name}</div>
        {line.detail && <div className="drawer-line-detail">{line.detail}</div>}
        {line.reference && <div className="ref">{line.reference}</div>}
      </div>
      <div className="drawer-line-right">
        <div className="qty-ctrl">
          <button
            type="button"
            onClick={() => updateQty(line.key, line.quantity - 1)}
            aria-label="Diminuer"
          >−</button>
          <span>{line.quantity}</span>
          <button
            type="button"
            onClick={() => updateQty(line.key, line.quantity + 1)}
            aria-label="Augmenter"
          >+</button>
        </div>
        <div className="drawer-line-price">{euro(line.unitPriceHT * line.quantity)}</div>
        <button
          className="drawer-remove"
          type="button"
          onClick={() => removeLine(line.key)}
          aria-label="Supprimer"
        >✕</button>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { lines, isOpen, closeCart, totalHT, tva, fraisLivraison, isFranco, laquageForfait, showTTC, toggleTTC } =
    useCartStore();
  const { isPro } = useAuthStore();
  // B2B uniquement : les non-pros sont dirigés vers l'espace pro pour se connecter
  const checkoutHref = isPro() ? '/devis' : B2C_ENABLED ? '/checkout' : '/pro';
  const checkoutLabel = isPro() ? 'Créer un devis →' : B2C_ENABLED ? 'Commander →' : 'Se connecter à l\'espace pro →';

  // Mobile : fige le défilement de la page derrière le tiroir ouvert
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const ht = totalHT();
  const franco = isFranco();
  const frais = fraisLivraison();
  const laquage = laquageForfait();
  const grandHT = ht + frais + laquage;
  const display = showTTC ? grandHT * 1.2 : grandHT;

  return (
    <>
      <div className="drawer-overlay" onClick={closeCart} aria-hidden />
      <aside className="drawer" role="dialog" aria-label="Panier">
        <div className="drawer-head">
          <span className="drawer-title">Mon panier</span>
          <div className="drawer-head-right">
            <button className="ttc-toggle" type="button" onClick={toggleTTC}>
              {showTTC ? 'TTC' : 'HT'}
            </button>
            <button className="drawer-close" type="button" onClick={closeCart} aria-label="Fermer">✕</button>
          </div>
        </div>

        <div className="drawer-body">
          {lines.length === 0 ? (
            <div className="drawer-empty">
              <span>🛒</span>
              <p>Votre panier est vide</p>
              <button className="btn ghost" type="button" onClick={closeCart}>Continuer mes achats</button>
            </div>
          ) : (
            <div className="drawer-lines">
              {lines.map((l) => (
                <CartLineRow key={l.key} line={l} />
              ))}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="drawer-foot">
            {franco ? (
              <div className="franco-badge">✓ Franco de port !</div>
            ) : (
              <div className="franco-hint">
                Encore {euro(400 - ht)} HT pour le franco de port
                <span className="franco-bar">
                  <span style={{ width: `${Math.min(100, (ht / 400) * 100)}%` }} />
                </span>
              </div>
            )}

            <div className="drawer-totals">
              <div className="drawer-row"><span>Sous-total HT</span><span>{euro(ht)}</span></div>
              {showTTC && <div className="drawer-row muted"><span>TVA 20%</span><span>{euro(tva())}</span></div>}
              <div className="drawer-row muted">
                <span>Livraison</span>
                <span>{franco ? <b className="green">Offerte</b> : euro(frais) + ' HT'}</span>
              </div>
              {laquage > 0 && (
                <div className="drawer-row muted">
                  <span>Forfait laquage</span>
                  <span>{euro(laquage)} HT</span>
                </div>
              )}
              <div className="drawer-row total">
                <span>Total {showTTC ? 'TTC' : 'HT'}</span>
                <span>{euro(display)}</span>
              </div>
            </div>

            <div className="drawer-ctas">
              <Link className="btn checkout full" href={checkoutHref} onClick={closeCart}>
                {checkoutLabel}
              </Link>
              <Link className="btn solid full" href="/panier" onClick={closeCart}>
                Voir le panier
              </Link>
              {!isPro() && B2C_ENABLED && (
                <Link className="btn devis-link" href="/devis" onClick={closeCart}>
                  Générer un devis PDF
                </Link>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
