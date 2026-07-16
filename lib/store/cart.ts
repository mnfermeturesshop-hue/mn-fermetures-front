'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, Uom } from '@/lib/catalog/types';

const TVA = 0.20;
const FRANCO_SEUIL = 400;
const FRANCO_FORFAIT = 26;
const LAQUAGE_FORFAIT = 77;   // forfait laquage RAL par commande…
const LAQUAGE_FRANCO = 2000;  // …offert dès 2000 € HT de commande

interface CartStore {
  lines: CartLine[];
  isOpen: boolean;
  showTTC: boolean;

  addLine: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;
  updateQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  setLines: (lines: CartLine[]) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleTTC: () => void;

  totalHT: () => number;
  totalTTC: () => number;
  tva: () => number;
  fraisLivraison: () => number;
  isFranco: () => boolean;
  hasLaquage: () => boolean;
  laquageForfait: () => number;
  totalLines: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      showTTC: false,

      addLine: (incoming) => {
        set((state) => {
          const qty = incoming.quantity ?? 1;
          const exists = state.lines.find((l) => l.key === incoming.key);
          if (exists) {
            return {
              lines: state.lines.map((l) =>
                l.key === incoming.key ? { ...l, quantity: l.quantity + qty } : l
              ),
            };
          }
          return { lines: [...state.lines, { ...incoming, quantity: qty }] };
        });
      },

      updateQty: (key, qty) => {
        if (qty <= 0) {
          get().removeLine(key);
          return;
        }
        set((state) => ({
          lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: qty } : l)),
        }));
      },

      removeLine: (key) =>
        set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

      clearCart: () => set({ lines: [] }),
      setLines: (lines) => set({ lines }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleTTC: () => set((s) => ({ showTTC: !s.showTTC })),

      totalHT: () => get().lines.reduce((s, l) => s + l.unitPriceHT * l.quantity, 0),
      tva: () => get().totalHT() * TVA,
      totalTTC: () => get().totalHT() * (1 + TVA),
      isFranco: () => get().totalHT() >= FRANCO_SEUIL,
      fraisLivraison: () => (get().isFranco() ? 0 : FRANCO_FORFAIT),
      hasLaquage: () =>
        get().lines.some((l) => l.pricing?.kind === 'configurateur' && l.pricing.laque === true),
      laquageForfait: () =>
        get().hasLaquage() && get().totalHT() < LAQUAGE_FRANCO ? LAQUAGE_FORFAIT : 0,
      totalLines: () => get().lines.reduce((s, l) => s + l.quantity, 0),
    }),
    {
      name: 'mm-cart',
      partialize: (s) => ({ lines: s.lines, showTTC: s.showTTC }),
    }
  )
);

export const uomLabel = (uom: Uom): string => {
  if (uom === 'ml') return '/ml';
  if (uom === 'paire') return '/paire';
  if (uom === 'm2') return '/m²';
  return '/u';
};

export const euro = (n: number): string =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
