/* =====================================================================
   MN FERMETURES — Import classeur Excel → DefV2 (moteur universel)
   Miroir de `../export/buildWorkbook.ts` : reconstruit la structure depuis
   la feuille `_structure` (JSON découpé) et les tables de prix depuis les
   feuilles `Gn` (2D) et `Bn` (1D). Round-trip sans perte.
   ===================================================================== */

import * as XLSX from 'xlsx';
import type { DefV2, Table1D, Table2D } from '../v2/types';

export interface ParseResult { def: DefV2 | null; errors: string[] }

type Row = (string | number | undefined)[];

const num = (v: unknown): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string => (v == null ? '' : String(v));

function sheetAoa(wb: XLSX.WorkBook, name: string): Row[] {
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });
}

export function parseWorkbook(data: ArrayBuffer | Uint8Array): ParseResult {
  const errors: string[] = [];
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: 'array' });
  } catch {
    return { def: null, errors: ['Fichier illisible (format Excel attendu).'] };
  }

  // 1. Structure (JSON découpé dans `_structure`, colonne A hors en-tête).
  if (!wb.SheetNames.includes('_structure')) {
    return { def: null, errors: ['Feuille `_structure` manquante (classeur non issu de l’export).'] };
  }
  const json = sheetAoa(wb, '_structure').slice(1).map((r) => str(r[0])).join('');
  let structure: Omit<DefV2, 'tables'>;
  try {
    structure = JSON.parse(json);
  } catch {
    return { def: null, errors: ['Structure illisible (JSON `_structure` corrompu).'] };
  }
  if (!structure?.slug || !Array.isArray(structure.fields)) {
    return { def: null, errors: ['Structure invalide (slug/fields manquants).'] };
  }

  // 2. Tables de prix : feuilles Gn (2D) et Bn (1D).
  const d2: Record<string, Table2D> = {};
  const d1: Record<string, Table1D> = {};
  for (const name of wb.SheetNames) {
    if (/^G\d+$/.test(name)) {
      const aoa = sheetAoa(wb, name);
      const id = str(aoa[0]?.[1]);
      const cols = (aoa[1] ?? []).slice(1).map(num).filter((v): v is number => v != null);
      const rows: number[] = [];
      const cells: (number | null)[][] = [];
      for (const r of aoa.slice(2)) {
        const rk = num(r[0]); if (rk == null) continue;
        rows.push(rk);
        cells.push(cols.map((_, i) => num(r[1 + i])));
      }
      if (id) d2[id] = { rows, cols, cells };
    } else if (/^B\d+$/.test(name)) {
      const aoa = sheetAoa(wb, name);
      const id = str(aoa[0]?.[1]);
      const keys: number[] = [];
      const values: (number | null)[] = [];
      for (const r of aoa.slice(2)) {
        const k = num(r[0]); if (k == null) continue;
        keys.push(k);
        values.push(num(r[1]));
      }
      if (id) d1[id] = { keys, values };
    }
  }

  const def: DefV2 = { ...structure, tables: { d1, d2 } };
  return { def, errors };
}
