'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Gestion du consentement cookies (RGPD / ePrivacy / CNIL).
 *
 * Aujourd'hui le site n'utilise que des cookies ESSENTIELS (session, panier,
 * sécurité, paiement) — exemptés de consentement. Ce module prépare l'ajout de
 * traceurs NON essentiels (mesure d'audience) : rien de tel ne doit être chargé
 * sans `hasAudienceConsent()`.
 *
 * Conformité : consentement libre, éclairé, aussi simple à refuser qu'à accepter,
 * mémorisé (preuve = version + date), révocable à tout moment (« Gérer les cookies »).
 */

// Incrémenter si les finalités / la liste des traceurs changent → le bandeau
// est redemandé aux utilisateurs (leur ancien choix ne vaut plus).
export const CONSENT_VERSION = '2026-08-31';

export interface ConsentRecord {
  version: string;
  date: string;       // ISO — preuve d'horodatage du choix
  audience: boolean;  // mesure d'audience (OFF par défaut)
}

interface ConsentStore {
  consent: ConsentRecord | null;
  prefsOpen: boolean;
  needsBanner: () => boolean;
  hasAudience: () => boolean;
  acceptAll: () => void;
  refuseAll: () => void;
  save: (audience: boolean) => void;
  openPrefs: () => void;
  closePrefs: () => void;
}

const record = (audience: boolean): ConsentRecord => ({
  version: CONSENT_VERSION,
  date: new Date().toISOString(),
  audience,
});

export const useConsentStore = create<ConsentStore>()(
  persist(
    (set, get) => ({
      consent: null,
      prefsOpen: false,

      // Bandeau requis tant qu'aucun choix valide (version courante) n'est enregistré.
      needsBanner: () => {
        const c = get().consent;
        return !c || c.version !== CONSENT_VERSION;
      },
      hasAudience: () => {
        const c = get().consent;
        return !!c && c.version === CONSENT_VERSION && c.audience;
      },

      acceptAll: () => set({ consent: record(true), prefsOpen: false }),
      refuseAll: () => set({ consent: record(false), prefsOpen: false }),
      save: (audience) => set({ consent: record(audience), prefsOpen: false }),
      openPrefs: () => set({ prefsOpen: true }),
      closePrefs: () => set({ prefsOpen: false }),
    }),
    { name: 'mm-consent', partialize: (s) => ({ consent: s.consent }) }
  )
);

/** À appeler AVANT de charger un traceur non essentiel (ex. mesure d'audience). */
export function hasAudienceConsent(): boolean {
  return useConsentStore.getState().hasAudience();
}
