/* Parse docs/Tarif_RENO_MINIBOX_MN_2026.xlsx → grilles 2D (JSON) pour le
   configurateur Reno Minibox. 2 feuilles : MN (filaire/radio) + Somfy (filaire
   Ilmo / radio RS100 io). Corrige l'artefact « S » (= 5) du fichier source.
   Sortie : lib/configurateur/data/reno-minibox-grids.json { g_mn_filaire, ... }. */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const HEIGHTS = [850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950, 2050, 2150, 2250, 2350, 2450, 2550];
const toNum = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/[Ss]/g, '5').replace(/[^0-9.\-]/g, '');
  return s === '' ? null : Number(s);
};

function parseSheet(aoa, moteur, radioKey) {
  const row1 = aoa[1], row2 = aoa[2];
  const range = [], main = [];
  for (let c = 3; c < row1.length; c++) {
    const n1 = toNum(row1[c]), n2 = toNum(row2[c]);
    if (n1 != null && n2 != null) range.push({ idx: c, width: n2 });   // colonne « L de/à » → borne haute
    else if (n1 != null) main.push({ idx: c, width: n1 });
  }
  // Attribue les 2 colonnes « min » à Filaire / Radio selon la 1re ligne remplie.
  const fRow = aoa[3], rRow = aoa[4];
  const fMin = range.find((rc) => toNum(fRow[rc.idx]) != null);
  const rMin = range.find((rc) => toNum(rRow[rc.idx]) != null);
  const build = (minCol, rowOffset) => {
    const colIdx = [minCol.idx, ...main.map((m) => m.idx)];
    const cols = [minCol.width, ...main.map((m) => m.width)];
    const cells = HEIGHTS.map((_, i) => { const r = aoa[3 + rowOffset + 2 * i]; return colIdx.map((c) => toNum(r[c])); });
    return { rows: HEIGHTS.slice(), cols, cells };
  };
  return {
    [`g_${moteur}_filaire`]: build(fMin, 0),
    [`g_${moteur}_radio`]: build(rMin, 1),
  };
}

const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_RENO_MINIBOX_MN_2026.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });
const grids = { ...parseSheet(A('Table 1'), 'mn'), ...parseSheet(A('Table 2'), 'somfy') };

// Vérifications (valeurs de référence fournies par le PDG / lues).
const at = (g, h, w) => { const t = grids[g]; return t.cells[t.rows.indexOf(h)][t.cols.indexOf(w)]; };
console.log('=== Vérifications ===');
console.log('MN filaire  h850 : L566=', at('g_mn_filaire', 850, 566), '(=367) · L800=', at('g_mn_filaire', 850, 800), '(=297) · L2400=', at('g_mn_filaire', 850, 2400), '(=473)');
console.log('MN radio    h850 : L716=', at('g_mn_radio', 850, 716), '(=580) · L800=', at('g_mn_radio', 850, 800), '(=517)');
console.log('Somfy fil   h850 : L576=', at('g_somfy_filaire', 850, 576), '(=568) · L800=', at('g_somfy_filaire', 850, 800), '(=401)');
console.log('Somfy RS100 h850 : L531=', at('g_somfy_radio', 850, 531), '(=624) · L800=', at('g_somfy_radio', 850, 800), '(=602)');
for (const [id, t] of Object.entries(grids)) {
  const nNull = t.cells.flat().filter((v) => v == null).length;
  console.log(`${id}: ${t.rows.length}×${t.cols.length} · cols=[${t.cols.join(',')}] · nulls=${nNull}`);
}
const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'reno-minibox-grids.json');
fs.writeFileSync(out, JSON.stringify(grids), 'utf8');
console.log('\nÉcrit', path.relative(process.cwd(), out));
