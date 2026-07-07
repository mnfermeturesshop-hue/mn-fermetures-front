/**
 * Programme de fidélité B2B — paliers sur le CA annuel (année civile).
 *
 * Règles (décision PDG, juillet 2026) :
 * - CA = bons de commande (payment_method 'bon_de_commande') EXPÉDIÉS ou
 *   LIVRÉS, en € HT, du 1er janvier au 31 décembre de l'année en cours.
 * - 5 paliers : Bronze 10k · Argent 25k · Or 50k · Platine 75k · Diamant 100k.
 * - Récompenses : cadeaux gérés à la main par l'équipe (aucun avantage
 *   automatique côté site) — le palier est affiché au client (jauge) et à
 *   l'admin (pilotage des cadeaux).
 *
 * Module pur (pas de 'use client') : importable côté client ET serveur.
 */

export interface LoyaltyTier {
  slug: string;
  label: string;
  /** Seuil de CA annuel HT (€) à atteindre. */
  threshold: number;
  /** Couleur du badge / jalon. */
  color: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { slug: 'bronze',  label: 'Bronze',  threshold: 10_000,  color: '#b45309' },
  { slug: 'argent',  label: 'Argent',  threshold: 25_000,  color: '#64748b' },
  { slug: 'or',      label: 'Or',      threshold: 50_000,  color: '#d4a017' },
  { slug: 'platine', label: 'Platine', threshold: 75_000,  color: '#7c8ea0' },
  { slug: 'diamant', label: 'Diamant', threshold: 100_000, color: '#38bdf8' },
];

/** Échelle de la jauge = seuil du dernier palier. */
export const LOYALTY_MAX = LOYALTY_TIERS[LOYALTY_TIERS.length - 1].threshold;

export interface LoyaltyStatus {
  /** Palier atteint (null si CA < premier seuil). */
  tier: LoyaltyTier | null;
  /** Prochain palier à atteindre (null si palier maximum atteint). */
  next: LoyaltyTier | null;
  /** Montant HT restant avant le prochain palier (0 si max atteint). */
  remaining: number;
  /** Remplissage de la jauge 0→100 (échelle globale 0 → LOYALTY_MAX). */
  progressPct: number;
}

export function computeLoyalty(caHT: number): LoyaltyStatus {
  const ca = Math.max(0, caHT);
  let tier: LoyaltyTier | null = null;
  let next: LoyaltyTier | null = null;
  for (const t of LOYALTY_TIERS) {
    if (ca >= t.threshold) tier = t;
    else { next = t; break; }
  }
  return {
    tier,
    next,
    remaining: next ? Math.max(0, next.threshold - ca) : 0,
    progressPct: Math.min(100, (ca / LOYALTY_MAX) * 100),
  };
}

/** Statuts de commande comptés comme « validés » (expédié/livré). */
const VALIDATED_STATUSES = new Set(['shipped', 'delivered']);

/**
 * Bon de commande « validé » : expédié ou livré. Règle commune à la jauge
 * de fidélité et aux statistiques de l'espace client.
 */
export function isValidatedBC(o: { payment_method?: string; status?: string }): boolean {
  return o.payment_method === 'bon_de_commande' && VALIDATED_STATUSES.has(o.status ?? '');
}

/** Une commande compte-t-elle dans le CA fidélité de l'année donnée ? */
export function orderCountsForLoyalty(
  o: { payment_method?: string; status?: string; created_at?: string },
  year: number,
): boolean {
  return (
    isValidatedBC(o) &&
    !!o.created_at &&
    new Date(o.created_at).getFullYear() === year
  );
}
