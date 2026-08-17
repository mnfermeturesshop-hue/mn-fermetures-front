'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AbaqueTool } from '@/components/documentation/AbaqueTool';

/** Fiche moteur : bouton ouvrant une modale « Abaques moteurs » avec verdict de
 *  compatibilité pour la puissance du moteur (`nm`, lue dans le nom du produit). */
export function MotorAbaqueButton({ nm }: { nm?: number }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button type="button" className="btn ghost abaque-btn" onClick={() => setOpen(true)}>
        ⚡ Abaques moteurs — vérifier la compatibilité
      </button>

      {mounted && open && createPortal(
        <div className="abaque-overlay" onClick={() => setOpen(false)}>
          <div className="abaque-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Abaques moteurs">
            <div className="abaque-modal-head">
              <h2>Abaques d&apos;utilisation des moteurs{nm ? ` — moteur ${nm} Nm` : ''}</h2>
              <button type="button" className="abaque-close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            </div>
            <div className="abaque-modal-body">
              <p className="abaque-modal-intro">
                Saisissez la hauteur et la largeur finies de votre volet pour vérifier que ce moteur convient.
              </p>
              <AbaqueTool motorNm={nm} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
