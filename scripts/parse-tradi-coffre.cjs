/* Parse docs/Tarif_TRADI_tradi+coffre_2026.xlsx → grilles 2D + barèmes 1D pour le
   configurateur Tradi « Volet + coffre » (1.1.2). 8 feuilles = 2 lames (42/56) × 2 moteurs
   (MN/Somfy) × 2 commandes (filaire/radio) — chaque grille coupée en 2 par largeur
   (≤2100 puis continuation 2200-3000), filaire/radio ENTRELACÉS, hauteurs 850-2850 pas 100.
   La BASE = prix TOUT COMPRIS (volet + coffre Thermic'élite 280, verrouillage DVA).
   PV par largeur : Briquélite / NeoThermic / NeoBric (autres coffres), sous-face 7016 ;
   moins-value AR (attaches rigides). Sortie : data/tradi-coffre-grids.json + -adjust.json. */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fix = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/[Ss]/g, '5').replace(/[oO]/g, '0').replace(/[^0-9.\-]/g, '');
  return s === '' ? null : Number(s);
};
const seq = (from, to) => { const a = []; for (let h = from; h <= to; h += 100) a.push(h); return a; };
const price = (v) => { const n = fix(v); return n != null && Number.isInteger(n) && n >= 50 && n <= 6000 ? n : null; };

const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_TRADI_tradi+coffre_2026.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

// L mini (bande) : filaire 300-450 → 450 ; radio 506-600 → 600 (borne haute pour snap-up).
const GROUPS = [
  { key: 'tc42', minFil: 450, minRadio: 600, heights: seq(850, 2850), mn: ['Table 1', 'Table 2'], somfy: ['Table 3', 'Table 4'] },
  { key: 'tc56', minFil: 450, minRadio: 600, heights: seq(850, 2850), mn: ['Table 5', 'Table 6'], somfy: ['Table 7', 'Table 8'] },
];
const isMainW = (w) => w != null && w >= 700 && w <= 4000 && w % 100 === 0;
const isFil = (t) => /filaire/i.test(t);
const isRad = (t) => /radio|rs100|rs 100|\bio\b/i.test(t) && !/filaire/i.test(t);

function widthCols(a) {
  let best = null;
  for (let i = 0; i < Math.min(a.length, 8); i++) {
    const cols = [];
    for (let c = 0; c < a[i].length; c++) { const w = fix(a[i][c]); if (isMainW(w)) cols.push({ idx: c, w }); }
    if (!best || cols.length > best.mainCols.length) best = { hrow: i, mainCols: cols };
  }
  return best && best.mainCols.length ? best : null;
}
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
function buildGrid(grp, sheetA, sheetB, kind, minWidth) {
  const A1 = readSheet(A(sheetA))[kind];
  const B1 = sheetB ? (readSheet(A(sheetB)) || {})[kind] || [] : [];
  const H = grp.heights;
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
  grids[`${grp.key}_mn_filaire`]    = buildGrid(grp, grp.mn[0],    grp.mn[1],    'filaire', grp.minFil);
  grids[`${grp.key}_mn_radio`]      = buildGrid(grp, grp.mn[0],    grp.mn[1],    'radio',   grp.minRadio);
  grids[`${grp.key}_somfy_filaire`] = buildGrid(grp, grp.somfy[0], grp.somfy[1], 'filaire', grp.minFil);
  grids[`${grp.key}_somfy_radio`]   = buildGrid(grp, grp.somfy[0], grp.somfy[1], 'radio',   grp.minRadio);
}

// ── Barèmes 1D par largeur : PV coffres (Briquélite / NeoThermic / NeoBric), sous-face
//    couleur, moins-value AR. Extraits par groupe (lame), depuis la feuille MN ≤2100 +
//    continuation. (Verrouillage/coffre = mécanique, a priori indép. du moteur.)
const ADJ_LABELS = {
  pv_briquelite: /pv\s*briquelite/i,
  pv_neothermic: /pv\s*neothermic/i,
  pv_neobric: /pv\s*neobric/i,
  pv_sousface: /pv\s*sous\s*face/i,
  ar: /moins\s*value\s*ar/i,
};
function extractAdj(sheetName, re, minFil, minRadio) {
  const a = A(sheetName); const wc = widthCols(a); if (!wc) return {};
  const row = a.find((r) => re.test(String(r[0]) + ' ' + String(r[1])));
  if (!row) return {};
  const o = {};
  // Feuille principale (bandes L-mini en col3/col4, < 700) : PV aussi pour ces bandes.
  if (fix(a[wc.hrow][3]) != null && fix(a[wc.hrow][3]) < 700) {
    const vFil = fix(row[3]); if (vFil != null) o[minFil] = vFil;
    const vRad = fix(row[4]); if (vRad != null) o[minRadio] = vRad;
  }
  for (const mc of wc.mainCols) { const v = fix(row[mc.idx]); if (v != null) o[mc.w] = v; }
  return o;
}
function adjTable(sheets, re, minFil, minRadio) {
  const m = {}; for (const s of sheets) Object.assign(m, extractAdj(s, re, minFil, minRadio));
  const keys = Object.keys(m).map(Number).sort((x, y) => x - y);
  return { keys, values: keys.map((k) => m[k]) };
}
const adjust = {};
for (const grp of GROUPS) {
  for (const [id, re] of Object.entries(ADJ_LABELS)) {
    adjust[`${id}_${grp.key}`] = adjTable([grp.mn[0], grp.mn[1]], re, grp.minFil, grp.minRadio);
  }
}

// ── Vérifications (contre le brut Table 1 : MN lame 42, filaire/radio) ──
const at = (g, h, w) => { const t = grids[g]; const ri = t.rows.indexOf(h), ci = t.cols.indexOf(w); return ri < 0 || ci < 0 ? '??' : t.cells[ri][ci]; };
console.log('=== Dimensions ===');
for (const [id, t] of Object.entries(grids)) {
  const nNull = t.cells.flat().filter((v) => v == null).length;
  console.log(`${id.padEnd(20)} ${t.rows.length}h × ${t.cols.length}w · L ${t.cols[0]}→${t.cols[t.cols.length - 1]} · nulls=${nNull}`);
}
console.log('\n=== Références MN lame 42 (Table 1) ===');
console.log('filaire H850 : Lmin=', at('tc42_mn_filaire', 850, 450), '(490) · L700=', at('tc42_mn_filaire', 850, 700), '(446) · L800=', at('tc42_mn_filaire', 850, 800), '(428) · L2000=', at('tc42_mn_filaire', 850, 2000), '(635)');
console.log('radio   H850 : Lmin=', at('tc42_mn_radio', 850, 600), '(622) · L700=', at('tc42_mn_radio', 850, 700), '(606) · L800=', at('tc42_mn_radio', 850, 800), '(630)');
console.log('\n=== Barèmes coffre (1D largeur) ===');
for (const [id, t] of Object.entries(adjust)) console.log(`${id.padEnd(20)} keys=[${t.keys[0]}…${t.keys[t.keys.length - 1]}] values=[${[...new Set(t.values)].slice(0, 8).join(',')}…]`);

fs.writeFileSync(path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'tradi-coffre-grids.json'), JSON.stringify(grids), 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'tradi-coffre-adjust.json'), JSON.stringify(adjust), 'utf8');
console.log('\nÉcrit tradi-coffre-grids.json + tradi-coffre-adjust.json');
