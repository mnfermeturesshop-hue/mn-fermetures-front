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
  Adjustment, FixedOption, ColorRef, ColorPolicy, DimLimits, BaremeParLargeur, SpecField,
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

/** "filaire_mn:420;radio_mn:506" → { filaire_mn:420, radio_mn:506 } (clés texte). */
function parseModes(s: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of str(s).split(';')) {
    const [k, v] = part.split(':').map((x) => x.trim());
    const vi = Number(v);
    if (k && Number.isFinite(vi)) out[k] = vi;
  }
  return out;
}

/** "int=Intérieur|ext=Extérieur" → [{value:'int',label:'Intérieur'}, …] */
function parseOptionList(s: string): SelectorOption[] {
  const out: SelectorOption[] = [];
  for (const part of str(s).split('|')) {
    const i = part.indexOf('=');
    if (i < 0) { if (part.trim()) out.push({ value: part.trim(), label: part.trim() }); continue; }
    const value = part.slice(0, i).trim(), label = part.slice(i + 1).trim();
    if (value) out.push({ value, label: label || value });
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
    if (!selMap.has(id)) {
      const sel: Selector = { id, label: str(r[1]) || id, options: [] };
      const scope = parseScope(str(r[5]));        // colonne « scope » (ex. pose=coffre)
      const layer = isLayer(r[6]);                // colonne « layer » (ex. radio)
      if (scope) sel.scope = scope;
      if (layer) sel.layer = layer;
      selMap.set(id, sel); selOrder.push(id);
    }
    const opt: SelectorOption = { value: str(r[2]), label: str(r[3]) || str(r[2]) };
    if (str(r[4])) opt.hint = str(r[4]);
    const derived = parseScope(str(r[7]));       // axes dérivés (ex. pose=coffre)
    if (derived) opt.derivedAxes = derived;
    if (opt.value) selMap.get(id)!.options.push(opt);
  }
  const selectors = selOrder.map((id) => selMap.get(id)!);
  if (!selectors.length) errors.push('Onglet Selecteurs : aucun axe défini.');

  // ── Grilles + attaches rigides (une par grille) ──
  // Axes de grille : Meta.grid_axes (découple type_volet/pose) ; repli sur l'ordre
  // des sélecteurs pour les anciens classeurs.
  const gridAxes = meta.grid_axes ? meta.grid_axes.split(',').map((s) => s.trim()).filter(Boolean) : selOrder;
  const grids: PriceGrid[] = [];
  const adjustments: Adjustment[] = [];
  for (const name of wb.SheetNames) {
    if (!name.toLowerCase().startsWith('grille')) continue;
    const tokens = name.split(/\s+/).slice(1);              // après "Grille"
    const key: Record<string, string> = {};
    tokens.forEach((tk, i) => { if (gridAxes[i]) key[gridAxes[i]] = tk.toLowerCase(); });

    const aoa = sheetAoa(wb, name)!;
    const widths = aoa[0].slice(2).map(num).filter((v): v is number => v != null);
    const tmp: Partial<Record<MotorLayer, Record<number, (number | null)[]>>> = {};
    let arBareme: BaremeParLargeur | null = null;

    for (const r of aoa.slice(1)) {
      const layer = isLayer(r[1]);
      if (layer) {
        const h = num(r[0]);
        if (h == null) continue;
        (tmp[layer] ??= {})[h] = widths.map((_, i) => num(r[2 + i]));
      } else if (isArRow(r[0], r[1])) {
        arBareme = {};
        widths.forEach((w, i) => { const m = num(r[2 + i]); if (m != null) arBareme![w] = m; });
      }
    }

    if (!widths.length) errors.push(`Grille « ${name} » : ligne d'entête des largeurs vide.`);
    if (!tmp.filaire && !tmp.radio) errors.push(`Grille « ${name} » : aucune ligne filaire/radio.`);

    // Largeurs propres à chaque couche : on écarte les colonnes vides pour la
    // couche (ex. petite bande filaire ≤450 vide en radio, et inversement).
    const heights = [...new Set([...Object.keys(tmp.filaire ?? {}), ...Object.keys(tmp.radio ?? {})].map(Number))].sort((a, b) => a - b);
    const layers: PriceGrid['layers'] = {};
    for (const layer of ['filaire', 'radio'] as MotorLayer[]) {
      const rowsByH = tmp[layer];
      if (!rowsByH) continue;
      const keep: number[] = [];
      for (let k = 0; k < widths.length; k++) if (Object.values(rowsByH).some((row) => row[k] != null)) keep.push(k);
      const rows: Record<number, (number | null)[]> = {};
      for (const [h, row] of Object.entries(rowsByH)) rows[Number(h)] = keep.map((k) => row[k]);
      layers[layer] = { widths: keep.map((k) => widths[k]), rows };
    }

    grids.push({ key, heights, layers });
    if (arBareme && Object.keys(arBareme).length) {
      adjustments.push({
        code: 'attaches_rigides', label: 'Attaches rigides (au lieu des verrous)',
        scope: key, optional: true, baremeParLargeur: arBareme,
      });
    }
  }
  if (!grids.length) errors.push('Aucune grille (onglet « Grille … »).');

  // ── Ajustements par largeur (manœuvre, plus-values coffre, RTS/solaire…) ──
  // Colonnes : code | label | scope | layer | optional | bareme.
  // (« MoinsValues » accepté pour compatibilité avec l'ancien gabarit.)
  for (const r of (sheetAoa(wb, 'Ajustements') ?? sheetAoa(wb, 'MoinsValues') ?? []).slice(1)) {
    const code = str(r[0]); if (!code) continue;
    const scope = parseScope(str(r[2]));
    const layer = isLayer(r[3]);
    const optional = /oui|yes|true|1/i.test(str(r[4]));
    adjustments.push({
      code, label: str(r[1]) || code,
      ...(scope ? { scope } : {}), ...(layer ? { layer } : {}), optional,
      baremeParLargeur: parseBareme(str(r[5])),
    });
  }

  // ── Options ──
  const options: FixedOption[] = [];
  for (const r of (sheetAoa(wb, 'Options') ?? []).slice(1)) {
    const code = str(r[0]); if (!code) continue;
    const layer = isLayer(r[5]);                  // colonne « layer » (ex. radio)
    options.push({
      code, label: str(r[1]) || code, priceHT: num(r[2]) ?? 0,
      ...(str(r[3]) ? { group: str(r[3]) } : {}),
      ...(parseScope(str(r[4])) ? { scope: parseScope(str(r[4])) } : {}),
      ...(layer ? { layer } : {}),
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

  // ── Limites (+ pose, + largeur mini par mode) ──
  // Colonnes : lame | pose | surface_max_m2 | largeur_min | largeur_min_modes | largeur_max | hauteur_max
  const limits: DimLimits[] = [];
  for (const r of (sheetAoa(wb, 'Limites') ?? []).slice(1)) {
    const lame = str(r[0]); if (!lame) continue;
    const pose = str(r[1]);
    const modes = parseModes(str(r[4]));
    limits.push({
      lame, ...(pose ? { pose } : {}),
      surfaceMaxM2: num(r[2]) ?? 999, largeurMin: num(r[3]) ?? 0,
      ...(Object.keys(modes).length ? { largeurMinByMode: modes } : {}),
      largeurMax: num(r[5]) ?? 99999, hauteurMax: num(r[6]) ?? 99999,
    });
  }

  // ── Champs de fabrication (sans impact prix) ──
  // Colonnes : id | label | type | options | required | defaut | scope | layer | group
  const specFields: SpecField[] = [];
  for (const r of (sheetAoa(wb, 'Champs') ?? []).slice(1)) {
    const id = str(r[0]); if (!id) continue;
    const t = str(r[2]).toLowerCase();
    const type: SpecField['type'] = t === 'select' ? 'select' : t === 'radio' ? 'radio' : 'text';
    const opts = parseOptionList(str(r[3]));
    const scope = parseScope(str(r[6]));
    const layer = isLayer(r[7]);
    specFields.push({
      id, label: str(r[1]) || id, type,
      ...(opts.length ? { options: opts } : {}),
      ...(/oui|yes|true|1/i.test(str(r[4])) ? { required: true } : {}),
      ...(str(r[5]) ? { defaultValue: str(r[5]) } : {}),
      ...(scope ? { scope } : {}), ...(layer ? { layer } : {}),
      ...(str(r[8]) ? { group: str(r[8]) } : {}),
    });
  }

  if (errors.length) return { def: null, errors };

  const def: ConfiguratorDef = {
    slug: meta.slug, name: meta.name || meta.slug, famille: meta.famille || 'volet-roulant',
    selectors, grids, adjustments, options, colors, colorPolicies, limits,
    ...(specFields.length ? { specFields } : {}),
  };
  return { def, errors: [] };
}
