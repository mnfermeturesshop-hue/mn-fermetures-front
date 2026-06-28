'use client';

import Link from 'next/link';
import { useCartStore, euro } from '@/lib/store/cart';

export function DevisActions() {
  const { lines, totalHT, fraisLivraison, isFranco } = useCartStore();

  const buildMailto = () => {
    const ht = totalHT();
    const frais = isFranco() ? 0 : fraisLivraison();
    const lignes = lines
      .map((l) => `- ${l.name}${l.detail ? ` (${l.detail})` : ''} × ${l.quantity} = ${euro(l.unitPriceHT * l.quantity)} HT`)
      .join('\n');
    const body = encodeURIComponent(
      `Bonjour,\n\nVoici mon devis MN Fermetures :\n\n${lignes}\n\n` +
      `Sous-total HT : ${euro(ht)}\n` +
      `Livraison HT : ${isFranco() ? 'Offerte (dès 400 € HT)' : euro(frais)}\n` +
      `Total HT : ${euro(ht + frais)}\n` +
      `Total TTC : ${euro((ht + frais) * 1.2)}\n\n` +
      `Merci de confirmer la disponibilité et les délais.\n\nCordialement`
    );
    return `mailto:contact@mmfermetures.fr?subject=${encodeURIComponent('Demande de devis MN Fermetures')}&body=${body}`;
  };

  return (
    <div className="devis-actions">
      <div className="devis-actions-label">Vous préférez un devis ?</div>
      <div className="devis-actions-row">
        <Link className="btn devis-pdf" href="/devis" title="Générer un devis PDF imprimable">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          Devis PDF
        </Link>
        <a className="btn devis-mail" href={buildMailto()} title="Envoyer le devis par e-mail">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
          Envoyer par e-mail
        </a>
      </div>
    </div>
  );
}
