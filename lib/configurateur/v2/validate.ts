/* =====================================================================
   MN FERMETURES — Moteur v2 · Validation d'une définition (autoring admin)
   Vérifie la structure d'une DefV2 saisie par l'admin et tente un calcul de
   prix sur les valeurs par défaut (garde-fou : on ne met en ligne qu'une def
   qui produit un prix). Utilisé par l'éditeur back-office (aperçu + save).
   ===================================================================== */

import type { DefV2, Values } from './types';
import { resolvePrice } from './engine';
import { repairValues } from './cascade';

export interface ValidateResult {
  def: DefV2 | null;
  errors: string[];
  warnings: string[];
  priceFrom: number | null;
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function validateDef(raw: unknown): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const d = raw as Record<string, unknown>;

  if (!d || typeof d !== 'object') {
    return { def: null, errors: ['Définition vide ou invalide (objet attendu).'], warnings, priceFrom: null };
  }
  if (!isStr(d.slug)) errors.push('« slug » manquant ou invalide.');
  else if (!/^[a-z0-9-]+$/.test(d.slug)) errors.push('« slug » : minuscules, chiffres et tirets uniquement.');
  if (!isStr(d.name)) errors.push('« name » manquant.');
  if (!isStr(d.famille)) errors.push('« famille » manquante.');

  const fields = d.fields as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(fields) || fields.length === 0) errors.push('« fields » (tableau non vide) manquant.');
  else fields.forEach((f, i) => {
    if (!isStr(f.id)) errors.push(`fields[${i}] : « id » manquant.`);
    if (!isStr(f.type)) errors.push(`fields[${i}] : « type » manquant.`);
    if (f.type === 'choice' && !Array.isArray(f.options)) warnings.push(`fields[${i}] (${f.id}) : choix sans options.`);
  });
  const ids = new Set<string>();
  (Array.isArray(fields) ? fields : []).forEach((f) => { if (isStr(f.id)) { if (ids.has(f.id)) errors.push(`Champ en double : ${f.id}.`); ids.add(f.id); } });

  if (!Array.isArray(d.steps)) warnings.push('« steps » manquant : le wizard n’aura pas d’étapes.');
  const priceRules = d.priceRules as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(priceRules) || priceRules.length === 0) errors.push('« priceRules » (tableau non vide) manquant.');
  else if (!priceRules.some((r) => r.kind === 'base')) errors.push('Aucune règle de prix de base (kind:"base").');

  if (errors.length) return { def: null, errors, warnings, priceFrom: null };

  // Garde-fou : la def doit produire un prix sur des valeurs par défaut plausibles.
  let priceFrom: number | null = null;
  try {
    const def = d as unknown as DefV2;
    const init: Values = {};
    for (const f of def.fields) if (f.default !== undefined) init[f.id] = f.default;
    const values = repairValues(def, init);
    const r = resolvePrice(def, values);
    priceFrom = r.ok ? r.total : null;
    if (!r.ok) warnings.push('Aucun prix sur les valeurs par défaut (dimensions par défaut hors limites ?).');
  } catch (e) {
    errors.push('Erreur au calcul de prix : ' + (e instanceof Error ? e.message : String(e)));
  }

  return { def: errors.length ? null : (d as unknown as DefV2), errors, warnings, priceFrom };
}
