/* Parse docs/Tarif_BLOC-BAIE_EXT_2026.xlsx → grilles 2D (JSON) pour Bloc baie
   EXTÉRIEUR (1.3.3). 6 feuilles = 2 lames (PVC 40 / Alu 42) × 2 marques (MN / Somfy) ;
   Alu 42 coupée en 2 par largeur. Filaire / Radio ENTRELACÉS.
   Prix indexé par « largeur dos de coulisse × hauteur sous coffre » (= hauteur menuiserie,
   aucune déduction). Hauteurs IMPLICITES par ordre des lignes : 850 → 2450 (H maxi 2450).
   Bornes L-mini lues dans la ligne sous l'en-tête des largeurs (comme le réno). Coffre unique
   par lame (pas de bandes). Renfort coffre = ligne « Plus value renfort » (par largeur).
   Sortie : lib/configurateur/data/bloc-baie-ext-*.json. */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fix = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/[Ss]/g, '5').replace(/[oO]/g, '0').replace(/[^0-9.\-]/g, '');
  return s === '' ? null : Number(s);
};
const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_BLOC-BAIE_EXT_2026.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

const HEIGHTS = []; for (let h = 850; h <= 2450; h += 100) HEIGHTS.push(h); // 17 hauteurs sous coffre

const GROUPS = [
  { key: 'pvc40', mn: ['Table 1'],           somfy: ['Table 2'] },
  { key: 'alu42', mn: ['Table 3', 'Table 4'], somfy: ['Table 5', 'Table 6'] },
];
const isFil = (t) => /filaire/i.test(t);
const isRad = (t) => /(radio|rs\s?100|\bio\b)/i.test(t) && !/filaire/i.test(t);
const isMainW = (w) => w != null && w >= 700 && w <= 4000 && w % 100 === 0;
const price = (v) => { const n = fix(v); return n != null && Number.isInteger(n) && n >= 50 && n <= 6000 ? n : null; };

function widthCols(a) {
  let best = null;
  for (let i = 0; i < Math.min(a.length, 6); i++) {
    const cols = [];
    for (let c = 0; c < a[i].length; c++) { const w = fix(a[i][c]); if (isMainW(w)) cols.push({ idx: c, w }); }
    if (!best || cols.length > best.mainCols.length) best = { hrow: i, mainCols: cols };
  }
  return best && best.mainCols.length ? best : null;
}

// Filaire / radio entrelacés, hauteurs implicites (ordre). Clé L-mini = borne haute (hrow+1).
function readSheet(a) {
  const wc = widthCols(a); if (!wc) return null;
  const keyFil = fix((a[wc.hrow + 1] || [])[3]);
  const keyRad = fix((a[wc.hrow + 1] || [])[4]);
  const out = { filaire: [], radio: [], keyFil, keyRad };
  for (let i = wc.hrow + 1; i < a.length; i++) {
    const t = String(a[i][1]).trim();
    const kind = isFil(t) ? 'filaire' : isRad(t) ? 'radio' : null;
    if (!kind) continue;
    const min = price(a[i][kind === 'filaire' ? 3 : 4]);
    const cells = wc.mainCols.map((mc) => ({ w: mc.w, p: price(a[i][mc.idx]) }));
    out[kind].push({ min, cells });
  }
  return out;
}

function buildGrid(sheets, kind) {
  const A1o = readSheet(A(sheets[0]));
  const A1 = A1o[kind];
  const B1 = sheets[1] ? (readSheet(A(sheets[1])) || {})[kind] || [] : [];
  const key = kind === 'filaire' ? A1o.keyFil : A1o.keyRad;
  const rows = HEIGHTS.slice(0, A1.length);
  const colsA = A1[0].cells.map((c) => c.w);
  const maxA = Math.max(...colsA);
  const colsB = (B1[0] ? B1[0].cells.map((c) => c.w) : []).filter((w) => w > maxA);
  const cols = [key, ...colsA, ...colsB];
  let filled = 0;
  const cells = A1.map((rowA, i) => {
    const rowB = B1[i];
    const vA = rowA.cells.map((c) => c.p);
    const vB = rowB ? rowB.cells.filter((c) => c.w > maxA).map((c) => c.p) : colsB.map(() => null);
    const row = [rowA.min, ...vA, ...vB];
    for (let c = row.length - 2; c >= 0; c--) { if (row[c] == null && row[c + 1] != null) { row[c] = row[c + 1]; filled++; } }
    return row;
  });
  if (filled) console.log(`  ↳ ${kind} : ${filled} cellule(s) comblée(s)`);
  return { rows, cols, cells };
}

const grids = {};
for (const grp of GROUPS) {
  grids[`bbe_${grp.key}_mn_filaire`]    = buildGrid(grp.mn,    'filaire');
  grids[`bbe_${grp.key}_mn_radio`]      = buildGrid(grp.mn,    'radio');
  grids[`bbe_${grp.key}_somfy_filaire`] = buildGrid(grp.somfy, 'filaire');
  grids[`bbe_${grp.key}_somfy_radio`]   = buildGrid(grp.somfy, 'radio');
}

// Renfort coffre (option) par largeur — ligne « Plus value renfort », feuilles MN fusionnées.
function extractRenfort(sheetName) {
  const a = A(sheetName); const wc = widthCols(a); if (!wc) return {};
  const row = a.find((r) => /renfort/i.test(String(r[0]) + ' ' + String(r[1])));
  if (!row) return {};
  const o = {};
  for (const mc of wc.mainCols) { const v = fix(row[mc.idx]); if (v != null) o[mc.w] = v; }
  return o;
}
const renfort = {};
for (const grp of GROUPS) {
  const m = { ...extractRenfort(grp.mn[0]), ...(grp.mn[1] ? extractRenfort(grp.mn[1]) : {}) };
  const keys = Object.keys(m).map(Number).sort((x, y) => x - y);
  renfort[`renfort_e_${grp.key}`] = { keys, values: keys.map((k) => m[k]) };
}

// ── Vérifs ──
const at = (g, h, w) => { const t = grids[g]; const ri = t.rows.indexOf(h), ci = t.cols.indexOf(w); return ri < 0 || ci < 0 ? `??(h${h}/w${w})` : t.cells[ri][ci]; };
console.log('=== Dimensions ===');
for (const [id, t] of Object.entries(grids)) {
  const nNull = t.cells.flat().filter((v) => v == null).length;
  console.log(`${id.padEnd(26)} ${t.rows.length}h (${t.rows[0]}→${t.rows[t.rows.length - 1]}) × ${t.cols.length}w · L ${t.cols[0]}→${t.cols[t.cols.length - 1]} · nulls=${nNull}`);
}
console.log('\n=== Références (comparer à l’Excel) ===');
console.log('pvc40 MN fil  H850 : Lmin=', at('bbe_pvc40_mn_filaire', 850, grids.bbe_pvc40_mn_filaire.cols[0]), '(467) · L800=', at('bbe_pvc40_mn_filaire', 850, 800), '(389) · L1700=', at('bbe_pvc40_mn_filaire', 850, 1700));
console.log('pvc40 MN rad  H850 : Lmin=', at('bbe_pvc40_mn_radio', 850, grids.bbe_pvc40_mn_radio.cols[0]), '(654) · L800=', at('bbe_pvc40_mn_radio', 850, 800), '(578)');
console.log('pvc40 Somfy fil H850 : L700=', at('bbe_pvc40_somfy_filaire', 850, 700), '(463) · Lmin=', at('bbe_pvc40_somfy_filaire', 850, grids.bbe_pvc40_somfy_filaire.cols[0]), '(552)');
console.log('renfort_e_pvc40 =', JSON.stringify(renfort.renfort_e_pvc40));

const outG = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'bloc-baie-ext-grids.json');
const outR = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'bloc-baie-ext-renfort.json');
fs.writeFileSync(outG, JSON.stringify(grids), 'utf8');
fs.writeFileSync(outR, JSON.stringify(renfort), 'utf8');
console.log('\nÉcrit', path.relative(process.cwd(), outG), '+', path.relative(process.cwd(), outR));
