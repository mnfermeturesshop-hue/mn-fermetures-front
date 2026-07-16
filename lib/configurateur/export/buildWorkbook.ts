/* =====================================================================
   MN FERMETURES — Export ConfiguratorDef → classeur Excel
   Miroir EXACT de `../import/parseWorkbook.ts` : produit le gabarit
   décrit dans `docs/configurateur-modele-tarif.md`, toutes valeurs
   pré-remplies. Objectif : l'admin exporte le tarif en cours, édite les
   prix dans Excel, ré-importe — sans perte (round-trip lossless).
   ===================================================================== */

import * as XLSX from 'xlsx';
import type { ConfiguratorDef, PriceGrid, LayerGrid, MotorLayer } from '../types';

type Cell = string | number;
type Row = Cell[];

const serializeScope = (scope?: Record<string, string>): string =>
  scope ? Object.entries(scope).map(([k, v]) => `${k}=${v}`).join(',') : '';

const serializeBareme = (b: Record<number, number>): string =>
  Object.keys(b).map(Number).sort((a, z) => a - z).map((w) => `${w}:${b[w]}`).join(';');

const serializeModes = (m?: Record<string, number>): string =>
  m ? Object.entries(m).map(([k, v]) => `${k}:${v}`).join(';') : '';

const serializeOptions = (opts?: { value: string; label: string }[]): string =>
  (opts ?? []).map((o) => `${o.value}=${o.label}`).join('|');

/** Deux objets de portée strictement égaux (mêmes clés/valeurs). */
function sameScope(a: Record<string, string> | undefined, b: Record<string, string>): boolean {
  if (!a) return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => a[k] === b[k]);
}

/** Feuille `Grille <pose> <lame> <moteur>` : en-tête largeurs = union des
 *  couches ; chaque ligne remplie aux largeurs de sa couche, vide ailleurs. */
function gridSheet(def: ConfiguratorDef, g: PriceGrid): { name: string; rows: Row[] } {
  const filaire = g.layers.filaire, radio = g.layers.radio;
  const union = [...new Set([...(filaire?.widths ?? []), ...(radio?.widths ?? [])])].sort((a, z) => a - z);

  const rows: Row[] = [];
  rows.push(['', '', ...union]);                                   // ligne d'en-tête largeurs (col C+)

  const valsAt = (lg: LayerGrid, h: number): Cell[] =>
    union.map((w) => {
      const i = lg.widths.indexOf(w);
      if (i < 0) return '';
      const v = lg.rows[h]?.[i];
      return v == null ? '' : v;                                   // null = hors abaque → cellule vide
    });

  for (const h of g.heights) {
    for (const layer of ['filaire', 'radio'] as MotorLayer[]) {
      const lg = g.layers[layer];
      if (lg) rows.push([h, layer, ...valsAt(lg, h)]);
    }
  }

  // Ligne MV_AR = barème attaches rigides propre à cette grille.
  const ar = def.adjustments.find((a) => a.code === 'attaches_rigides' && sameScope(a.scope, g.key));
  if (ar) rows.push(['MV_AR', '', ...union.map((w) => ar.baremeParLargeur[w] ?? '')]);

  // Nom = « Grille <val1> <val2> … » dans l'ordre des axes de grille (Meta.grid_axes).
  const name = `Grille ${Object.keys(g.key).map((a) => g.key[a]).join(' ')}`.trim();
  return { name, rows };
}

/** Sérialise une définition de configurateur en classeur .xlsx (buffer). */
export function buildWorkbook(def: ConfiguratorDef): Uint8Array {
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: Row[]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 31));

  // Meta (clé/valeur, sans ligne d'en-tête). `grid_axes` = noms des axes de
  // grille dans l'ordre des colonnes du nom de feuille (découple type_volet/pose).
  const gridAxes = Object.keys(def.grids[0]?.key ?? {});
  add('Meta', [['slug', def.slug], ['name', def.name], ['famille', def.famille], ['grid_axes', gridAxes.join(',')]]);

  // Selecteurs (scope/layer par sélecteur ; derived = axes dérivés par option)
  const selRows: Row[] = [['selecteur_id', 'selecteur_label', 'option_value', 'option_label', 'hint', 'scope', 'layer', 'derived']];
  for (const s of def.selectors)
    for (const o of s.options)
      selRows.push([s.id, s.label, o.value, o.label, o.hint ?? '', serializeScope(s.scope), s.layer ?? '', serializeScope(o.derivedAxes)]);
  add('Selecteurs', selRows);

  // Options (prix fixe) + colonne layer
  const optRows: Row[] = [['code', 'label', 'prix_ht', 'groupe', 'scope', 'layer']];
  for (const o of def.options)
    optRows.push([o.code, o.label, o.priceHT, o.group ?? '', serializeScope(o.scope), o.layer ?? '']);
  add('Options', optRows);

  // Ajustements (hors attaches rigides, portées par les grilles) + colonne scope
  const adjRows: Row[] = [['code', 'label', 'scope', 'layer', 'optional', 'bareme']];
  for (const a of def.adjustments) {
    if (a.code === 'attaches_rigides') continue;                    // écrit dans les grilles (MV_AR)
    adjRows.push([a.code, a.label, serializeScope(a.scope), a.layer ?? '', a.optional ? 'oui' : 'non', serializeBareme(a.baremeParLargeur)]);
  }
  add('Ajustements', adjRows);

  // Coloris : une ligne par (coloris × lame disponible). Ordre def.colors préservé
  // pour un round-trip fidèle de la liste ET des politiques par lame.
  const colRows: Row[] = [['code', 'label', 'hex', 'lame', 'type', 'montant', 'seuil_laquage']];
  for (const col of def.colors) {
    for (const pol of def.colorPolicies) {
      if (pol.standard.includes(col.code)) colRows.push([col.code, col.label, col.hex, pol.lame, 'standard', '', '']);
      else if (pol.pvM2?.codes.includes(col.code)) colRows.push([col.code, col.label, col.hex, pol.lame, 'pv_m2', pol.pvM2.montantParM2, '']);
      else if (pol.forfait?.codes.includes(col.code)) colRows.push([col.code, col.label, col.hex, pol.lame, 'forfait', pol.forfait.montant, pol.forfait.seuilLaquageHT ?? '']);
    }
  }
  add('Coloris', colRows);

  // Limites (+ pose, + largeur mini par mode)
  const limRows: Row[] = [['lame', 'pose', 'surface_max_m2', 'largeur_min', 'largeur_min_modes', 'largeur_max', 'hauteur_max']];
  for (const l of def.limits)
    limRows.push([l.lame, l.pose ?? '', l.surfaceMaxM2, l.largeurMin, serializeModes(l.largeurMinByMode), l.largeurMax, l.hauteurMax]);
  add('Limites', limRows);

  // Champs de fabrication (sans impact prix)
  const specRows: Row[] = [['id', 'label', 'type', 'options', 'required', 'defaut', 'scope', 'layer', 'group']];
  for (const f of def.specFields ?? [])
    specRows.push([f.id, f.label, f.type, serializeOptions(f.options), f.required ? 'oui' : 'non', f.defaultValue ?? '', serializeScope(f.scope), f.layer ?? '', f.group ?? '']);
  add('Champs', specRows);

  // Grilles (une feuille par pose × lame × moteur)
  for (const g of def.grids) { const s = gridSheet(def, g); add(s.name, s.rows); }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

/** Nom de fichier suggéré pour le téléchargement. */
export function workbookFilename(slug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `tarif-${slug}-${date}.xlsx`;
}
