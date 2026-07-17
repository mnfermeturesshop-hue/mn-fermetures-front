/* =====================================================================
   MN FERMETURES — Moteur v2 · Disponibilité des options & réparation
   Généralise la cascade : la disponibilité d'une option est pilotée par sa
   condition `availableWhen` (données), et choisir une option peut poser des
   valeurs dérivées (`setsValues`). `repairValues` garantit une sélection
   toujours cohérente (chaque champ de choix a une valeur disponible).
   ===================================================================== */

import type { DefV2, Field, FieldOption, Values, Condition } from './types';
import { evalCond, type Tables } from './expr';

/** Contexte enrichi des valeurs dérivées posées par les options choisies. */
export function withDerivedValues(def: DefV2, values: Values): Values {
  const out: Values = { ...values };
  for (const f of def.fields) {
    if (f.type !== 'choice') continue;
    const opt = f.options?.find((o) => o.value === out[f.id]);
    if (opt?.setsValues) Object.assign(out, opt.setsValues);
  }
  return out;
}

/** Une option est-elle disponible dans le contexte courant ? */
export function optionAvailable(opt: FieldOption, ctx: Values, tables: Tables = {}): boolean {
  return opt.availableWhen ? evalCond(opt.availableWhen, ctx, tables) : true;
}

/** Valeurs d'un champ de choix disponibles dans le contexte courant. */
export function availableOptions(def: DefV2, field: Field, values: Values): Set<string> {
  const ctx = withDerivedValues(def, values);
  const tables = def.tables ?? {};
  return new Set((field.options ?? []).filter((o) => optionAvailable(o, ctx, tables)).map((o) => o.value));
}

/**
 * Répare une sélection : parcourt les champs de choix dans l'ordre ; si la
 * valeur courante n'est pas disponible, prend la 1re disponible ; injecte au
 * fur et à mesure les `setsValues` pour que les champs aval voient les axes dérivés.
 */
export function repairValues(def: DefV2, values: Values): Values {
  const out: Values = { ...values };
  const tables = def.tables ?? {};
  for (const f of def.fields) {
    if (f.type !== 'choice' || !f.options?.length) continue;
    const avail = f.options.filter((o) => optionAvailable(o, out, tables));
    const cur = f.options.find((o) => o.value === out[f.id]);
    const chosen = (cur && avail.includes(cur)) ? cur : (avail[0] ?? f.options[0]);
    out[f.id] = chosen.value;
    if (chosen.setsValues) Object.assign(out, chosen.setsValues);
  }
  return out;
}

/** Un champ / une étape est-il visible dans le contexte courant ? */
export function isVisible(when: Condition | undefined, values: Values, tables: Tables = {}): boolean {
  return when === undefined ? true : evalCond(when, values, tables);
}
