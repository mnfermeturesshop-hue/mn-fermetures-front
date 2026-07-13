/* =====================================================================
   MN FERMETURES — Import Excel → ConfiguratorDef
   Transforme un classeur au format `docs/configurateur-modele-tarif.md`
   en définition de configurateur. Tolérant : casse des couches
   (Filaire/Radio), libellé de la ligne attaches rigides (MV_AR / -MV / …),
   lignes/colonnes vides.
   ===================================================================== */

import * as XLSX from 'xlsx';
import type {
  ConfiguratorDef, Selector, SelectorOption, PriceGrid, MotorLayer,
  Adjustment, FixedOption, ColorRef, ColorPolicy, DimLimits, BaremeParLargeur,
} from '../types';

export interface ParseResult { def: ConfiguratorDef | null; errors: string[] }

type Row = (string | number | undefined)[];

const num = (v: unknown): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string => (v == null ? '' : String(v)).trim();

/** aoa d'une feuille (par nom insensible à la casse). */
function sheetAoa(wb: XLSX.WorkBook, name: string): Row[] | null {
  const real = wb.SheetNames.find((n) => n.toLowerCase() === name.toLowerCase());
  if (!real) return null;
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[real], { header: 1, blankrows: false, defval: '' });
}

/** "moteur=mn,pose=independant" → { moteur:'mn', pose:'independant' } */
function parseScope(s: string): Record<string, string> | undefined {
  const t = str(s);
  if (!t) return undefined;
  const out: Record<string, string> = {};
  for (const part of t.split(/[,;]/)) {
    const [k, v] = part.split('=').map((x) => x.trim());
    if (k && v) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** "450:-72;3000:-13" → { 450:-72, 3000:-13 } */
function parseBareme(s: string): BaremeParLargeur {
  const out: BaremeParLargeur = {};
  for (const part of str(s).split(/[;,]/)) {
    const [w, m] = part.split(':').map((x) => x.trim());
    const wi = Number(w), mi = Number(m);
    if (Number.isFinite(wi) && Number.isFinite(mi)) out[wi] = mi;
  }
  return out;
}

const isLayer = (v: unknown): MotorLayer | null => {
  const t = str(v).toLowerCase();
  return t === 'filaire' ? 'filaire' : t === 'radio' ? 'radio' : null;
};
/** Ligne « moins-value attaches rigides » : A contient MV ou AR, B vide. */
const isArRow = (a: unknown, b: unknown): boolean => {
  if (isLayer(b) || str(b)) return false;
  const key = str(a).toUpperCase().replace(/[^A-Z]/g, '');
  return key.includes('MV') || key.includes('AR');
};

export function parseWorkbook(data: ArrayBuffer | Uint8Array): ParseResult {
  const errors: string[] = [];
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: 'array' });
  } catch {
    return { def: null, errors: ['Fichier illisible (format Excel attendu).'] };
  }

  // ── Meta ──
  const metaRows = sheetAoa(wb, 'Meta') ?? [];
  const meta: Record<string, string> = {};
  for (const r of metaRows) if (str(r[0])) meta[str(r[0]).toLowerCase()] = str(r[1]);
  if (!meta.slug) errors.push('Onglet Meta : slug manquant.');

  // ── Selecteurs ──
  const selRows = sheetAoa(wb, 'Selecteurs') ?? [];
  const selMap = new Map<string, Selector>();
  const selOrder: string[] = [];
  for (const r of selRows.slice(1)) {
    const id = str(r[0]); if (!id) continue;
    if (!selMap.has(id)) { selMap.set(id, { id, label: str(r[1]) || id, options: [] }); selOrder.push(id); }
    const opt: SelectorOption = { value: str(r[2]), label: str(r[3]) || str(r[2]) };
    if (str(r[4])) opt.hint = str(r[4]);
    if (opt.value) selMap.get(id)!.options.push(opt);
  }
  const selectors = selOrder.map((id) => selMap.get(id)!);
  if (!selectors.length) errors.push('Onglet Selecteurs : aucun axe défini.');

  // ── Grilles + attaches rigides (une par grille) ──
  const grids: PriceGrid[] = [];
  const adjustments: Adjustment[] = [];
  for (const name of wb.SheetNames) {
    if (!name.toLowerCase().startsWith('grille')) continue;
    const tokens = name.split(/\s+/).slice(1);              // après "Grille"
    const key: Record<string, string> = {};
    tokens.forEach((tk, i) => { if (selOrder[i]) key[selOrder[i]] = tk.toLowerCase(); });

    const aoa = sheetAoa(wb, name)!;
    const widths = aoa[0].slice(2).map(num).filter((v): v is number => v != null);
    const cells: PriceGrid['cells'] = {};
    let arBareme: BaremeParLargeur | null = null;

    for (const r of aoa.slice(1)) {
      const layer = isLayer(r[1]);
      if (layer) {
        const h = num(r[0]);
        if (h == null) continue;
        const prices = widths.map((_, i) => num(r[2 + i]));
        (cells[layer] ??= {})[h] = prices;
      } else if (isArRow(r[0], r[1])) {
        arBareme = {};
        widths.forEach((w, i) => { const m = num(r[2 + i]); if (m != null) arBareme![w] = m; });
      }
    }

    if (!widths.length) errors.push(`Grille « ${name} » : ligne d'entête des largeurs vide.`);
    if (!cells.filaire && !cells.radio) errors.push(`Grille « ${name} » : aucune ligne filaire/radio.`);

    grids.push({ key, widths, heights: Object.keys(cells.filaire ?? cells.radio ?? {}).map(Number).sort((a, b) => a - b), cells });
    if (arBareme && Object.keys(arBareme).length) {
      adjustments.push({
        code: 'attaches_rigides', label: 'Attaches rigides (au lieu des verrous)',
        scope: key, optional: true, baremeParLargeur: arBareme,
      });
    }
  }
  if (!grids.length) errors.push('Aucune grille (onglet « Grille … »).');

  // ── MoinsValues (ajustements par largeur, ex. manœuvre) ──
  for (const r of (sheetAoa(wb, 'MoinsValues') ?? []).slice(1)) {
    const code = str(r[0]); if (!code) continue;
    const layer = isLayer(r[2]);
    const optional = /oui|yes|true|1/i.test(str(r[3]));
    adjustments.push({
      code, label: str(r[1]) || code,
      ...(layer ? { layer } : {}), optional,
      baremeParLargeur: parseBareme(str(r[4])),
    });
  }

  // ── Options ──
  const options: FixedOption[] = [];
  for (const r of (sheetAoa(wb, 'Options') ?? []).slice(1)) {
    const code = str(r[0]); if (!code) continue;
    options.push({
      code, label: str(r[1]) || code, priceHT: num(r[2]) ?? 0,
      ...(str(r[3]) ? { group: str(r[3]) } : {}),
      ...(parseScope(str(r[4])) ? { scope: parseScope(str(r[4])) } : {}),
    });
  }

  // ── Coloris + politiques par lame ──
  const colors: ColorRef[] = [];
  const seen = new Set<string>();
  const polByLame = new Map<string, ColorPolicy>();
  for (const r of (sheetAoa(wb, 'Coloris') ?? []).slice(1)) {
    const code = str(r[0]); if (!code) continue;
    if (!seen.has(code)) { seen.add(code); colors.push({ code, label: str(r[1]) || code, hex: str(r[2]) || '#cccccc' }); }
    const lame = str(r[3]) || '*';
    const type = str(r[4]).toLowerCase();
    const montant = num(r[5]) ?? 0;
    const seuil = num(r[6]);
    const pol = polByLame.get(lame) ?? { lame, standard: [] };
    if (type === 'pv_m2') { pol.pvM2 ??= { codes: [], montantParM2: montant }; pol.pvM2.codes.push(code); if (montant) pol.pvM2.montantParM2 = montant; }
    else if (type === 'forfait') { pol.forfait ??= { codes: [], montant, ...(seuil != null ? { seuilLaquageHT: seuil } : {}) }; pol.forfait.codes.push(code); if (montant) pol.forfait.montant = montant; }
    else pol.standard.push(code);
    polByLame.set(lame, pol);
  }
  const colorPolicies = [...polByLame.values()];

  // ── Limites ──
  const limits: DimLimits[] = [];
  for (const r of (sheetAoa(wb, 'Limites') ?? []).slice(1)) {
    const lame = str(r[0]); if (!lame) continue;
    limits.push({
      lame, surfaceMaxM2: num(r[1]) ?? 999, largeurMin: num(r[2]) ?? 0,
      largeurMax: num(r[3]) ?? 99999, hauteurMax: num(r[4]) ?? 99999,
    });
  }

  if (errors.length) return { def: null, errors };

  const def: ConfiguratorDef = {
    slug: meta.slug, name: meta.name || meta.slug, famille: meta.famille || 'volet-roulant',
    selectors, grids, adjustments, options, colors, colorPolicies, limits,
  };
  return { def, errors: [] };
}
