/* =====================================================================
   MN FERMETURES — Configurateur produit générique · Moteur de calcul
   Résout un prix HT à partir d'une définition (ConfiguratorDef) et d'une
   sélection utilisateur. Même logique de snap-up que le tablier
   (lib/tablier/engine.ts), généralisée aux grilles multi-axes + couches
   moteur + moins-values + options + coloris.
   Utilisé côté client (prix instantané) ET serveur (audit S2).
   ===================================================================== */

import type {
  ConfiguratorDef,
  ConfiguratorResult,
  ConfiguratorSelection,
  BaremeParLargeur,
  PriceGrid,
  MoneyHT,
  PriceLineItem,
} from './types';

/** Plus petite borne >= valeur (snap vers le haut). null si hors barème. */
function snapUp(value: number, values: number[]): number | null {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.find((v) => v >= value) ?? null;
}

/** Montant du barème pour la première borne largeur >= largeur. */
function lookupBareme(bareme: BaremeParLargeur | undefined, largeur: number): number {
  if (!bareme) return 0;
  const key = Object.keys(bareme)
    .map(Number)
    .sort((a, b) => a - b)
    .find((k) => k >= largeur);
  return key !== undefined ? bareme[key] : 0;
}

/** Vrai si tous les axes de `filter` sont présents et égaux dans `axes`. */
function matches(filter: Record<string, string> | undefined, axes: Record<string, string>): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => axes[k] === v);
}

/** Grille correspondant à la combinaison d'axes choisie. */
function findGrid(def: ConfiguratorDef, axes: Record<string, string>): PriceGrid | null {
  return def.grids.find((g) => matches(g.key, axes)) ?? null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Résout le prix d'une configuration. Renvoie `null` si hors limites
 * dimensionnelles ou hors abaque (case/dimension non tarifée).
 */
export function resolveConfiguratorPrice(
  def: ConfiguratorDef,
  sel: ConfiguratorSelection,
): ConfiguratorResult | null {
  // 1. Limites dimensionnelles de la lame
  const lame = sel.axes.lame;
  const limit = def.limits.find((l) => l.lame === lame);
  if (limit) {
    if (sel.largeur < limit.largeurMin || sel.largeur > limit.largeurMax) return null;
    if (sel.hauteur > limit.hauteurMax) return null;
    const surfaceM2 = (sel.largeur / 1000) * (sel.hauteur / 1000);
    if (surfaceM2 > limit.surfaceMaxM2) return null;
  }

  // 2. Grille + couche + snap-up (largeurs propres à la couche)
  const grid = findGrid(def, sel.axes);
  if (!grid) return null;
  const layerGrid = grid.layers[sel.layer];
  if (!layerGrid) return null;

  const largeurSnap = snapUp(sel.largeur, layerGrid.widths);
  const hauteurSnap = snapUp(sel.hauteur, grid.heights);
  if (largeurSnap === null || hauteurSnap === null) return null;

  const row = layerGrid.rows[hauteurSnap];
  if (!row) return null;
  const base = row[layerGrid.widths.indexOf(largeurSnap)];
  if (base == null) return null;

  // 3. Ajustements (moins-values / suppléments par largeur)
  const adjustments: PriceLineItem[] = [];
  for (const adj of def.adjustments) {
    if (!matches(adj.scope, sel.axes)) continue;
    if (adj.layer && adj.layer !== sel.layer) continue;
    const active = adj.optional ? sel.optionCodes.includes(adj.code) : true;
    if (!active) continue;
    const montant = lookupBareme(adj.baremeParLargeur, largeurSnap);
    if (montant !== 0) adjustments.push({ code: adj.code, label: adj.label, montant });
  }

  // 4. Options à prix fixe
  const options: PriceLineItem[] = [];
  for (const opt of def.options) {
    if (!sel.optionCodes.includes(opt.code)) continue;
    if (!matches(opt.scope, sel.axes)) continue;
    if (opt.layer && opt.layer !== sel.layer) continue;
    if (opt.priceHT !== 0) options.push({ code: opt.code, label: opt.label, montant: opt.priceHT });
  }

  // 5. Supplément coloris
  const colorSupplement = colorSurcharge(def, lame, sel.colorCode, largeurSnap, hauteurSnap);

  const total = round2(
    base +
    adjustments.reduce((s, a) => s + a.montant, 0) +
    options.reduce((s, o) => s + o.montant, 0) +
    colorSupplement,
  );

  return { largeurSnap, hauteurSnap, base, adjustments, options, colorSupplement, total };
}

/** Surcharge coloris : +€/m² (× surface) ou forfait, selon la politique de la lame. */
function colorSurcharge(
  def: ConfiguratorDef,
  lame: string,
  colorCode: string,
  largeurSnap: number,
  hauteurSnap: number,
): MoneyHT {
  const pol = def.colorPolicies.find((p) => p.lame === lame) ?? def.colorPolicies.find((p) => p.lame === '*');
  if (!pol) return 0;
  if (pol.standard.includes(colorCode)) return 0;
  if (pol.pvM2 && pol.pvM2.codes.includes(colorCode)) {
    const surfaceM2 = (largeurSnap / 1000) * (hauteurSnap / 1000);
    return round2(pol.pvM2.montantParM2 * surfaceM2);
  }
  if (pol.forfait && pol.forfait.codes.includes(colorCode)) return pol.forfait.montant;
  return 0;
}

/** Prix « à partir de » (plus petite cellule non nulle) pour les listings. */
export function priceFrom(def: ConfiguratorDef): MoneyHT {
  let min = Infinity;
  for (const g of def.grids) {
    for (const lg of Object.values(g.layers)) {
      for (const row of Object.values(lg.rows)) {
        for (const v of row) if (v != null && v < min) min = v;
      }
    }
  }
  return min === Infinity ? 0 : min;
}
