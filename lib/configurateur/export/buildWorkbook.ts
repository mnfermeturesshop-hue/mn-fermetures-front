/* =====================================================================
   MN FERMETURES — Export DefV2 → classeur Excel (moteur universel)
   Les PRIX (tables 2D « Grille », tables 1D « Barème ») sont exportés dans
   des feuilles éditables ; la STRUCTURE (champs, étapes, règles, conditions)
   est portée telle quelle en JSON découpé dans une feuille technique
   `_structure` → round-trip sans perte. L'admin édite les prix ; la logique
   reste intacte. Miroir de `../import/parseWorkbook.ts`.
   ===================================================================== */

import * as XLSX from 'xlsx';
import type { DefV2 } from '../v2/types';

type Cell = string | number;
const CHUNK = 30000; // < limite Excel (32767 caractères/cellule)

/** Nom de feuille Excel valide : retire les caractères interdits (: \ / ? * [ ]),
 *  tronque à 31 et déduplique via un suffixe. L'id de la table reste l'ancre en
 *  cellule A1 (l'import lit A1, pas le nom de feuille). */
function sheetNamer() {
  const used = new Set<string>();
  return (label: string, fallback: string): string => {
    const base = (label || fallback).replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || fallback;
    let name = base, i = 2;
    while (used.has(name.toLowerCase())) { const suf = ` (${i++})`; name = base.slice(0, 31 - suf.length) + suf; }
    used.add(name.toLowerCase());
    return name;
  };
}

export function buildWorkbook(def: DefV2): Uint8Array {
  const wb = XLSX.utils.book_new();
  const nameFor = sheetNamer();
  const labels = def.tableLabels ?? {};
  const add = (name: string, rows: Cell[][]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 31));

  // 1. Structure (def sans les tables) en JSON découpé — colonne A.
  const { tables, ...structure } = def;
  const json = JSON.stringify(structure);
  const chunks: Cell[][] = [['__structure_json__']];
  for (let i = 0; i < json.length; i += CHUNK) chunks.push([json.slice(i, i + CHUNK)]);
  add('_structure', chunks);

  // 2. Grilles (tables 2D) — une feuille éditable par table, nommée par libellé.
  const d2 = tables?.d2 ?? {};
  Object.keys(d2).forEach((id, i) => {
    const t = d2[id];
    const rows: Cell[][] = [['id', id], ['', ...t.cols]];
    t.rows.forEach((r, ri) => rows.push([r, ...t.cells[ri].map((v) => (v == null ? '' : v))]));
    add(nameFor(labels[id], `G${i + 1}`), rows);
  });

  // 3. Barèmes (tables 1D) — une feuille éditable par table, nommée par libellé.
  const d1 = tables?.d1 ?? {};
  Object.keys(d1).forEach((id, i) => {
    const t = d1[id];
    const rows: Cell[][] = [['id', id], ['key', 'value']];
    t.keys.forEach((k, ki) => rows.push([k, t.values[ki] == null ? '' : (t.values[ki] as number)]));
    add(nameFor(labels[id], `B${i + 1}`), rows);
  });

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

export function workbookFilename(slug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `tarif-${slug}-${date}.xlsx`;
}
