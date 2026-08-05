'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Surcharges temporaires globales (slug de nœud → %), chargées depuis
 *  `/api/surcharges` et persistées pour éviter un flash au rechargement.
 *  Utilisées pour l'affichage ; le serveur reste autoritaire (verifyCart). */
interface SurchargeStore {
  map: Record<string, number>;
  load: () => Promise<void>;
}

export const useSurchargeStore = create<SurchargeStore>()(
  persist(
    (set) => ({
      map: {},
      load: async () => {
        try {
          const r = await fetch('/api/surcharges');
          if (r.ok) { const d = await r.json(); set({ map: d.surcharges ?? {} }); }
        } catch { /* réseau indisponible → on garde la valeur persistée */ }
      },
    }),
    { name: 'mn-surcharges' },
  ),
);
