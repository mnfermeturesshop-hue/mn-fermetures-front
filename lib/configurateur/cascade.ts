/* =====================================================================
   MN FERMETURES — Configurateur · sélecteurs en cascade
   Déduit, à partir des grilles existantes, les valeurs possibles de chaque
   axe et répare une sélection pour qu'elle reste une combinaison réelle.
   Gère les AXES DÉRIVÉS : une option (ex. « type de volet ») peut poser
   automatiquement un axe interne de grille (ex. pose) — l'étiquette client
   est ainsi découplée de la clé de grille.
   Extrait du composant pour être testable côté serveur ET client.
   ===================================================================== */

import type { ConfiguratorDef, PriceGrid } from './types';

type Axes = Record<string, string>;

/** Axes dérivés des options actuellement choisies (ex. type_volet → pose). */
export function deriveAxes(def: ConfiguratorDef, axes: Axes): Axes {
  const d: Axes = {};
  for (const sel of def.selectors) {
    const opt = sel.options.find((o) => o.value === axes[sel.id]);
    if (opt?.derivedAxes) Object.assign(d, opt.derivedAxes);
  }
  return d;
}

/**
 * Valeurs possibles d'un axe compte tenu des axes déjà fixés. Un axe de grille
 * DÉRIVÉ (hors sélecteur, ex. pose) est toujours contraignant ; un axe
 * sélecteur ne contraint que s'il est AMONT dans l'ordre (cascade).
 */
export function availableFor(def: ConfiguratorDef, selId: string, order: string[], axes: Axes): Set<string> {
  const constrained = def.grids.some((g) => selId in g.key);
  if (!constrained) return new Set(def.selectors.find((s) => s.id === selId)?.options.map((o) => o.value) ?? []);
  const selectorIds = new Set(order);
  const prior = new Set(order.slice(0, order.indexOf(selId)));
  const set = new Set<string>();
  for (const g of def.grids) {
    const ok = Object.keys(g.key).every((k) => {
      if (k === selId) return true;
      if (!selectorIds.has(k) || prior.has(k)) return g.key[k] === axes[k];  // dérivé ou amont → contrainte
      return true;                                                            // aval → libre
    });
    if (ok && selId in g.key) set.add(g.key[selId]);
  }
  return set;
}

/**
 * Répare une sélection d'axes pour qu'elle reste une combinaison existante,
 * en injectant les axes dérivés au fur et à mesure (dispo pour les axes aval).
 */
export function repairAxes(def: ConfiguratorDef, order: string[], axes: Axes): Axes {
  const out: Axes = {};
  for (const sel of def.selectors) {
    const avail = availableFor(def, sel.id, order, out);
    out[sel.id] = avail.has(axes[sel.id])
      ? axes[sel.id]
      : (sel.options.find((o) => avail.has(o.value))?.value ?? sel.options[0]?.value ?? '');
    const opt = sel.options.find((o) => o.value === out[sel.id]);
    if (opt?.derivedAxes) Object.assign(out, opt.derivedAxes);
  }
  return out;
}

/** Grille correspondant exactement aux axes (toutes les clés de grille, dérivées incluses). */
export function findGrid(def: ConfiguratorDef, axes: Axes): PriceGrid | null {
  return def.grids.find((g) => Object.keys(g.key).every((id) => g.key[id] === axes[id])) ?? null;
}
