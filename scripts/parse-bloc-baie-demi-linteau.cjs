/* Parse docs/Tarif_BLOC-BAIE_DEMI_LINTEAU_2026.xlsx → grilles 2D (JSON) pour Bloc baie
   DEMI-LINTEAU (1.3.4). Une seule lame ALU 42 (le PVC 40 du bon de commande n'est plus
   vendu). 4 grilles = MN (Tables 1+8) et Somfy (Tables 15+24), chacune coupée en 2 par
   largeur, Filaire / Radio ENTRELACÉS. Prix indexé par « largeur (dos de coulisse = tableau
   fini) × hauteur (menuiserie = hauteur sous coffre) ». Hauteurs IMPLICITES 850→2450.
   Bornes L-mini type « neuf » (MN 375→525 / 581→675 ; Somfy 400→535 / 400→490). Pas de renfort.
   Sortie : lib/configurateur/data/bloc-baie-demi-linteau-grids.json. */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fix = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/[Ss]/g, '5').replace(/[oO]/g, '0').replace(/[^0-9.\-]/g, '');
  return s === '' ? null : Number(s);
};
const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_BLOC-BAIE_DEMI_LINTEAU_2026.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

const HEIGHTS = []; for (let h = 850; h <= 2450; h += 100) HEIGHTS.push(h); // 17 hauteurs sous coffre

const GROUPS = [
  { key: 'alu42', mn: ['Table 1', 'Table 8'], somfy: ['Table 15', 'Table 24'] },
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
  grids[`bbdl_${grp.key}_mn_filaire`]    = buildGrid(grp.mn,    'filaire');
  grids[`bbdl_${grp.key}_mn_radio`]      = buildGrid(grp.mn,    'radio');
  grids[`bbdl_${grp.key}_somfy_filaire`] = buildGrid(grp.somfy, 'filaire');
  grids[`bbdl_${grp.key}_somfy_radio`]   = buildGrid(grp.somfy, 'radio');
}

// ── Vérifs ──
const at = (g, h, w) => { const t = grids[g]; const ri = t.rows.indexOf(h), ci = t.cols.indexOf(w); return ri < 0 || ci < 0 ? `??(h${h}/w${w})` : t.cells[ri][ci]; };
console.log('=== Dimensions ===');
for (const [id, t] of Object.entries(grids)) {
  const nNull = t.cells.flat().filter((v) => v == null).length;
  console.log(`${id.padEnd(28)} ${t.rows.length}h (${t.rows[0]}→${t.rows[t.rows.length - 1]}) × ${t.cols.length}w · L ${t.cols[0]}→${t.cols[t.cols.length - 1]} · nulls=${nNull}`);
}
console.log('\n=== Références (comparer à l’Excel) ===');
console.log('alu42 MN fil  H850 : Lmin=', at('bbdl_alu42_mn_filaire', 850, grids.bbdl_alu42_mn_filaire.cols[0]), '(469) · L800=', at('bbdl_alu42_mn_filaire', 850, 800), '(390)');
console.log('alu42 Somfy fil H850 : L700=', at('bbdl_alu42_somfy_filaire', 850, 700), '(524) · L800=', at('bbdl_alu42_somfy_filaire', 850, 800));
console.log('alu42 Somfy rad H850 : L700=', at('bbdl_alu42_somfy_radio', 850, 700), '(636)');

const outG = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'bloc-baie-demi-linteau-grids.json');
fs.writeFileSync(outG, JSON.stringify(grids), 'utf8');
console.log('\nÉcrit', path.relative(process.cwd(), outG));
