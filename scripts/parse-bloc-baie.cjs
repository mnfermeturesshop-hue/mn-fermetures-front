/* Parse docs/Tarif_BLOC-BAIE_INT-NEUF_2026.xlsx → grilles 2D (JSON) pour Bloc baie
   intérieur neuf (1.3.1). 10 feuilles = 3 lames (PVC 40 / Alu 42 / Alu 56) × 2 marques
   (MN / Somfy). Alu 42 & Alu 56 sont COUPÉES EN 2 par largeur ; PVC 40 tient sur 1 feuille.
   Lignes Filaire / Radio ENTRELACÉES. Hauteurs NON écrites (axe implicite, pas de 100).
   Le COFFRE est déterminé par la hauteur (bandes continues 168/205/235 selon la lame).
   Artefacts OCR S=5, o=0, unicode → nettoyés. Sortie : lib/configurateur/data/bloc-baie-*.json.
   À VÉRIFIER avec le PDG (cellules de référence en fin de script). */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fix = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/[Ss]/g, '5').replace(/[oO]/g, '0').replace(/[^0-9.\-]/g, '');
  return s === '' ? null : Number(s);
};
const seq = (from, to) => { const a = []; for (let h = from; h <= to; h += 100) a.push(h); return a; };

const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_BLOC-BAIE_INT-NEUF_2026.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

// Groupes lame × marque. sheets = [feuille largeurs basses, continuation] (ou 1 seule).
// Colonnes L-mini (borne haute de bande) : MN filaire 525 / radio 675 ; Somfy filaire 535 / radio 490.
const GROUPS = [
  { key: 'pvc40', heights: seq(850, 2450), mn: ['Table 1'],           somfy: ['Table 2'] },
  { key: 'alu42', heights: seq(850, 2850), mn: ['Table 3', 'Table 4'], somfy: ['Table 5', 'Table 6'] },
  { key: 'alu56', heights: seq(850, 2350), mn: ['Table 7', 'Table 8'], somfy: ['Table 9', 'Table 10'] },
];
const MIN = { mn: { filaire: 525, radio: 675 }, somfy: { filaire: 535, radio: 490 } };

const isFil = (t) => /filaire/i.test(t);
const isRad = (t) => /(radio|rs\s?100|\bio\b)/i.test(t) && !/filaire/i.test(t);
const isMainW = (w) => w != null && w >= 700 && w <= 4000 && w % 100 === 0;

// Ligne d'en-tête largeurs = celle qui maximise le nb de largeurs multiples de 100 (≥700).
function widthCols(a) {
  let best = null;
  for (let i = 0; i < Math.min(a.length, 8); i++) {
    const cols = [];
    for (let c = 0; c < a[i].length; c++) { const w = fix(a[i][c]); if (isMainW(w)) cols.push({ idx: c, w }); }
    if (!best || cols.length > best.mainCols.length) best = { hrow: i, mainCols: cols };
  }
  return best && best.mainCols.length ? best : null;
}
const price = (v) => { const n = fix(v); return n != null && Number.isInteger(n) && n >= 50 && n <= 6000 ? n : null; };

// { filaire:[{min,cells}], radio:[...] } d'une feuille (label Filaire/Radio en col1, min L en col3/col4).
function readSheet(a) {
  const wc = widthCols(a); if (!wc) return null;
  const labelCol = a.some((r) => isFil(String(r[1]))) ? 1 : 0;
  const out = { filaire: [], radio: [] };
  for (let i = wc.hrow + 1; i < a.length; i++) {
    const t = String(a[i][labelCol]).trim();
    const kind = isFil(t) ? 'filaire' : isRad(t) ? 'radio' : null;
    if (!kind) continue;
    const min = labelCol === 1 ? price(a[i][kind === 'filaire' ? 3 : 4]) : null;
    const cells = wc.mainCols.map((mc) => ({ w: mc.w, p: price(a[i][mc.idx]) }));
    out[kind].push({ min, cells });
  }
  return out;
}

function buildGrid(grp, sheets, kind, minWidth) {
  const A1 = readSheet(A(sheets[0]))[kind];
  const B1 = sheets[1] ? (readSheet(A(sheets[1])) || {})[kind] || [] : [];
  const H = grp.heights;
  if (A1.length !== H.length) console.warn(`  ⚠ ${grp.key}/${kind}: ${A1.length} lignes lues pour ${H.length} hauteurs (${sheets[0]})`);
  const colsA = A1[0].cells.map((c) => c.w);
  const maxA = Math.max(...colsA);
  const colsB = (B1[0] ? B1[0].cells.map((c) => c.w) : []).filter((w) => w > maxA);
  const cols = [minWidth, ...colsA, ...colsB];
  let filled = 0;
  const cells = H.map((_, i) => {
    const rowA = A1[i], rowB = B1[i];
    const min = rowA ? rowA.min : null;
    const vA = rowA ? rowA.cells.map((c) => c.p) : colsA.map(() => null);
    const vB = rowB ? rowB.cells.filter((c) => c.w > maxA).map((c) => c.p) : colsB.map(() => null);
    const row = [min, ...vA, ...vB];
    for (let c = row.length - 2; c >= 0; c--) { if (row[c] == null && row[c + 1] != null) { row[c] = row[c + 1]; filled++; } }
    return row;
  });
  if (filled) console.log(`  ↳ ${grp.key}/${kind} : ${filled} cellule(s) comblée(s)`);
  return { rows: H.slice(), cols, cells };
}

const grids = {};
for (const grp of GROUPS) {
  grids[`bb_${grp.key}_mn_filaire`]    = buildGrid(grp, grp.mn,    'filaire', MIN.mn.filaire);
  grids[`bb_${grp.key}_mn_radio`]      = buildGrid(grp, grp.mn,    'radio',   MIN.mn.radio);
  grids[`bb_${grp.key}_somfy_filaire`] = buildGrid(grp, grp.somfy, 'filaire', MIN.somfy.filaire);
  grids[`bb_${grp.key}_somfy_radio`]   = buildGrid(grp, grp.somfy, 'radio',   MIN.somfy.radio);
}

// ── Barème renfort (option) par largeur, par lame — ligne « Plus value renfort ».
//    Extrait des feuilles MN (gamme la plus complète), fusionné ≤/›continuation.
function extractRenfort(sheetName) {
  const a = A(sheetName); const wc = widthCols(a); if (!wc) return {};
  const row = a.find((r) => /renfort/i.test(String(r[0]) + String(r[1])));
  if (!row) return {};
  const o = {};
  for (const mc of wc.mainCols) { const v = fix(row[mc.idx]); if (v != null) o[mc.w] = v; }
  return o;
}
const renfort = {};
for (const grp of GROUPS) {
  const m = { ...extractRenfort(grp.mn[0]), ...(grp.mn[1] ? extractRenfort(grp.mn[1]) : {}) };
  const keys = Object.keys(m).map(Number).sort((x, y) => x - y);
  renfort[`renfort_${grp.key}`] = { keys, values: keys.map((k) => m[k]) };
}

// ── Vérifications ──
const at = (g, h, w) => { const t = grids[g]; const ri = t.rows.indexOf(h), ci = t.cols.indexOf(w); return ri < 0 || ci < 0 ? `??(h${h}/w${w})` : t.cells[ri][ci]; };
console.log('=== Dimensions ===');
for (const [id, t] of Object.entries(grids)) {
  const nNull = t.cells.flat().filter((v) => v == null).length;
  console.log(`${id.padEnd(24)} ${t.rows.length}h × ${t.cols.length}w · L ${t.cols[0]}→${t.cols[t.cols.length - 1]} · nulls=${nNull}`);
}
console.log('\n=== Références (comparer aux slides) ===');
console.log('pvc40 MN fil  H850 : Lmin525=', at('bb_pvc40_mn_filaire', 850, 525), '(441) · L800=', at('bb_pvc40_mn_filaire', 850, 800), '(368) · L1700=', at('bb_pvc40_mn_filaire', 850, 1700), '(476)');
console.log('pvc40 MN rad  H850 : Lmin675=', at('bb_pvc40_mn_radio', 850, 675), '(653) · L800=', at('bb_pvc40_mn_radio', 850, 800), '(574)');
console.log('alu42 MN fil  H850 : L800=', at('bb_alu42_mn_filaire', 850, 800), '(387) · L3000=', at('bb_alu42_mn_filaire', 850, 3000), '(695)');
console.log('alu56 MN fil  H850 : L700=', at('bb_alu56_mn_filaire', 850, 700), '(465) · L3500=', at('bb_alu56_mn_filaire', 850, 3500), '(1072)');
console.log('\n=== Renfort (1D largeur) ===');
for (const [id, t] of Object.entries(renfort)) console.log(`${id.padEnd(16)} keys=[${t.keys[0]}…${t.keys[t.keys.length - 1]}] values=[${t.values.slice(0, 6).join(',')}…${t.values[t.values.length - 1]}]`);

const outG = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'bloc-baie-grids.json');
const outR = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'bloc-baie-renfort.json');
fs.writeFileSync(outG, JSON.stringify(grids), 'utf8');
fs.writeFileSync(outR, JSON.stringify(renfort), 'utf8');
console.log('\nÉcrit', path.relative(process.cwd(), outG), '+', path.relative(process.cwd(), outR));
