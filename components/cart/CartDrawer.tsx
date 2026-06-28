'use client';

import Link from 'next/link';
import { useCartStore, euro } from '@/lib/store/cart';
import type { CartLine } from '@/lib/catalog/types';

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
  const { lines, isOpen, closeCart, totalHT, totalTTC, tva, fraisLivraison, isFranco, showTTC, toggleTTC } =
    useCartStore();

  if (!isOpen) return null;

  const ht = totalHT();
  const franco = isFranco();
  const frais = fraisLivraison();
  const display = showTTC ? totalTTC() + frais * 1.2 : ht + frais;

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
              <div className="franco-badge">✓ Livraison offerte !</div>
            ) : (
              <div className="franco-hint">
                Encore {euro(400 - ht)} HT pour la livraison offerte
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
              <div className="drawer-row total">
                <span>Total {showTTC ? 'TTC' : 'HT'}</span>
                <span>{euro(display)}</span>
              </div>
            </div>

            <div className="drawer-ctas">
              <Link className="btn checkout full" href="/checkout" onClick={closeCart}>
                Commander →
              </Link>
              <Link className="btn solid full" href="/panier" onClick={closeCart}>
                Voir le panier
              </Link>
              <Link className="btn devis-link" href="/devis" onClick={closeCart}>
                Générer un devis PDF
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
