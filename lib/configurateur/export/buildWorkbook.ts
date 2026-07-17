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

export function buildWorkbook(def: DefV2): Uint8Array {
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: Cell[][]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 31));

  // 1. Structure (def sans les tables) en JSON découpé — colonne A.
  const { tables, ...structure } = def;
  const json = JSON.stringify(structure);
  const chunks: Cell[][] = [['__structure_json__']];
  for (let i = 0; i < json.length; i += CHUNK) chunks.push([json.slice(i, i + CHUNK)]);
  add('_structure', chunks);

  // 2. Grilles (tables 2D) — une feuille éditable par table.
  const d2 = tables?.d2 ?? {};
  Object.keys(d2).forEach((id, i) => {
    const t = d2[id];
    const rows: Cell[][] = [['id', id], ['', ...t.cols]];
    t.rows.forEach((r, ri) => rows.push([r, ...t.cells[ri].map((v) => (v == null ? '' : v))]));
    add(`G${i + 1}`, rows);
  });

  // 3. Barèmes (tables 1D) — une feuille éditable par table.
  const d1 = tables?.d1 ?? {};
  Object.keys(d1).forEach((id, i) => {
    const t = d1[id];
    const rows: Cell[][] = [['id', id], ['key', 'value']];
    t.keys.forEach((k, ki) => rows.push([k, t.values[ki] == null ? '' : (t.values[ki] as number)]));
    add(`B${i + 1}`, rows);
  });

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

export function workbookFilename(slug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `tarif-${slug}-${date}.xlsx`;
}
