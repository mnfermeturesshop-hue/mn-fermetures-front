/* =====================================================================
   MN FERMETURES — Moteur v2 · Résolution de prix (universel)
   `resolvePrice(def, values)` : construit le contexte (valeurs + variables
   dérivées), applique les contraintes, évalue les règles de prix (base +
   suppléments) et renvoie le détail. Même moteur client ET serveur.
   ===================================================================== */

import type { DefV2, Values, ResolveResult, LineItem } from './types';
import { evalExpr, evalCond, type Tables } from './expr';

const round2 = (n: number) => Math.round(n * 100) / 100;

export function resolvePrice(def: DefV2, values: Values): ResolveResult {
  const tables: Tables = def.tables ?? {};

  // 1. Contexte = valeurs saisies + variables dérivées (dans l'ordre déclaré).
  const ctx: Values = { ...values };
  for (const d of def.derived ?? []) {
    const v = evalExpr(d.expr, ctx, tables);
    if (v !== null) ctx[d.id] = v;
  }

  // 2. Contraintes (limites dimensionnelles, règles métier…).
  const errors: string[] = [];
  for (const c of def.constraints ?? []) {
    if (!evalCond(c.requires, ctx, tables)) errors.push(c.message);
  }

  // 3. Règles de prix (base + suppléments). Un `amount` null sur une base = hors abaque.
  const lineItems: LineItem[] = [];
  let baseInvalid = false;
  for (const r of def.priceRules) {
    if (r.when && !evalCond(r.when, ctx, tables)) continue;
    const amt = evalExpr(r.amount, ctx, tables);
    if (amt === null) { if (r.kind === 'base') baseInvalid = true; continue; }
    const montant = typeof amt === 'number' ? round2(amt) : 0;
    if (montant !== 0 || r.kind === 'base') {
      lineItems.push({ code: r.code, label: r.label, kind: r.kind, montant });
    }
  }

  const hasBase = lineItems.some((l) => l.kind === 'base');
  const ok = !baseInvalid && hasBase && errors.length === 0;
  const total = round2(lineItems.reduce((s, l) => s + l.montant, 0));
  return { ok, total, lineItems, errors, context: ctx };
}

/** Prix « à partir de » (plus petite cellule des tables de base) — pour les listings. */
export function priceFrom(def: DefV2): number {
  let min = Infinity;
  for (const t of Object.values(def.tables?.d2 ?? {}))
    for (const row of t.cells) for (const v of row) if (v != null && v < min) min = v;
  for (const t of Object.values(def.tables?.d1 ?? {}))
    for (const v of t.values) if (v != null && v < min) min = v;
  return min === Infinity ? 0 : min;
}
