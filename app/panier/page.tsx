'use client';

import Link from 'next/link';
import { useCartStore, euro } from '@/lib/store/cart';
import type { CartLine } from '@/lib/catalog/types';

function LineRow({ line }: { line: CartLine }) {
  const { updateQty, removeLine } = useCartStore();
  return (
    <tr className="cart-tr">
      <td className="cart-td-name">
        <div className="cart-name">{line.name}</div>
        {line.detail && <div className="cart-detail">{line.detail}</div>}
        {line.reference && <div className="ref">{line.reference}</div>}
      </td>
      <td className="cart-td-price">{euro(line.unitPriceHT)} HT</td>
      <td className="cart-td-qty">
        <div className="qty-ctrl">
          <button type="button" onClick={() => updateQty(line.key, line.quantity - 1)}>−</button>
          <span>{line.quantity}</span>
          <button type="button" onClick={() => updateQty(line.key, line.quantity + 1)}>+</button>
        </div>
      </td>
      <td className="cart-td-total">{euro(line.unitPriceHT * line.quantity)} HT</td>
      <td className="cart-td-del">
        <button type="button" className="cart-del" onClick={() => removeLine(line.key)} aria-label="Supprimer">✕</button>
      </td>
    </tr>
  );
}

export default function CartPage() {
  const { lines, totalHT, totalTTC, tva, fraisLivraison, isFranco, clearCart, showTTC, toggleTTC } = useCartStore();

  const ht = totalHT();
  const franco = isFranco();
  const frais = fraisLivraison();
  const ttc = totalTTC();

  if (lines.length === 0) {
    return (
      <div className="wrap cart-empty-page">
        <h1>Votre panier est vide</h1>
        <p>Retrouvez nos produits dans le catalogue.</p>
        <Link className="btn solid" href="/">Voir le catalogue</Link>
      </div>
    );
  }

  return (
    <div className="wrap cart-page">
      <div className="cart-head">
        <h1>Panier ({lines.length} ligne{lines.length > 1 ? 's' : ''})</h1>
        <div className="cart-head-right">
          <button className="ttc-toggle" type="button" onClick={toggleTTC}>
            Afficher en {showTTC ? 'HT' : 'TTC'}
          </button>
          <button className="cart-clear" type="button" onClick={clearCart}>Vider le panier</button>
        </div>
      </div>

      <div className="cart-layout">
        {/* Tableau des lignes */}
        <div className="cart-lines-wrap">
          <table className="cart-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Prix unitaire</th>
                <th>Quantité</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => <LineRow key={l.key} line={l} />)}
            </tbody>
          </table>
        </div>

        {/* Récap & CTA */}
        <aside className="cart-summary">
          <h2>Récapitulatif</h2>

          {!franco && (
            <div className="franco-hint cart-franco">
              <b>Franco de port à {euro(400)} HT</b>
              <span>Il vous manque {euro(400 - ht)} HT</span>
              <span className="franco-bar">
                <span style={{ width: `${Math.min(100, (ht / 400) * 100)}%` }} />
              </span>
            </div>
          )}
          {franco && (
            <div className="franco-badge">✓ Franco de port — Livraison offerte</div>
          )}

          <div className="summary-rows">
            <div className="summary-row"><span>Sous-total HT</span><span>{euro(ht)}</span></div>
            <div className="summary-row muted"><span>TVA 20%</span><span>{euro(tva())}</span></div>
            <div className="summary-row muted">
              <span>Frais de livraison HT</span>
              <span>{franco ? <span className="green">Offerts</span> : euro(frais)}</span>
            </div>
            <div className="summary-row summary-ht"><span>Total HT</span><span>{euro(ht + frais)}</span></div>
            <div className="summary-row summary-ttc"><span>Total TTC</span><span>{euro(ttc + frais * 1.2)}</span></div>
          </div>

          <div className="summary-note">
            Prix HT · TVA 20% · Livraison franco Occitanie dès 400 € HT
          </div>

          <Link className="btn checkout full" href="/checkout">
            Commander →
          </Link>
          <Link className="btn ghost full" href="/catalogue/tabliers">
            Continuer mes achats
          </Link>
          <Link className="btn devis full" href="/devis">
            Télécharger le devis PDF
          </Link>
        </aside>
      </div>
    </div>
  );
}
