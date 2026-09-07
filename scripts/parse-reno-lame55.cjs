/* Parse docs/Tarif_RENO_LAME55.xlsx → grilles 2D (JSON) pour le Reno gros coffre LAME 55
   (coffre 250). Même modèle que la lame 56 (arbre filaire/radio, MN & Somfy) SAUF pas de
   solaire. Disposition Excel type Renobox : lignes Filaire/Radio ENTRELACÉES, hauteurs
   implicites (axe 850→2850 pas de 100, 21 h), largeurs coupées ≤2700 / ≥2800, artefacts
   S=5 / o=0. Barème « Moins value AR » (attaches rigides) propre à la lame 55.

     MN    : Table 2  (L 1100→2700) + Table 9  (L 2800→4000) — label « Filaire » / « Radio »
     Somfy : Table 15 (L 1100→2700) + Table 24 (L 2800→4000) — label « Filaire » / « RS100 io »

   Sorties :
     lib/configurateur/data/reno-lame55-grids.json  → r55_250_{mn,somfy}_{filaire,radio}
     lib/configurateur/data/reno-lame55-adjust.json → ar_r55_250 (moins-value AR par largeur) */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_RENO_LAME55.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

// Corrige les artefacts du fichier (S→5, o/O→0) puis extrait un nombre (signe conservé).
const fix = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/[Ss]/g, '5').replace(/[oO]/g, '0').replace(/[^0-9.\-]/g, '');
  return s === '' || s === '-' ? null : Number(s);
};
const seq = (from, to) => { const a = []; for (let h = from; h <= to; h += 100) a.push(h); return a; };
const HEIGHTS = seq(850, 2850); // 21 hauteurs (confirmé : 21 lignes Filaire par feuille)

const isMainW = (w) => w != null && w >= 700 && w <= 4000 && w % 100 === 0;
const isFil = (t) => /filaire/i.test(t);
const isRad = (t) => /radio|rs\s*100/i.test(t) && !/filaire/i.test(t);
const price = (v) => { const n = fix(v); return n != null && Number.isInteger(n) && n >= 50 && n <= 5000 ? n : null; };

// Ligne d'en-tête = celle (parmi les 4 premières) qui maximise le nombre de largeurs principales.
function widthCols(a) {
  let best = null;
  for (let i = 0; i < Math.min(a.length, 4); i++) {
    const cols = [];
    for (let c = 0; c < a[i].length; c++) { const w = fix(a[i][c]); if (isMainW(w)) cols.push({ idx: c, w }); }
    if (!best || cols.length > best.mainCols.length) best = { hrow: i, mainCols: cols };
  }
  return best && best.mainCols.length ? best : null;
}

// { filaire:[rows], radio:[rows] } d'une feuille (label en col1, prix aux colonnes de largeur).
function readSheet(a) {
  const wc = widthCols(a);
  const out = { filaire: [], radio: [] };
  for (let i = wc.hrow + 1; i < a.length; i++) {
    const t = String(a[i][1]);
    const kind = isFil(t) ? 'filaire' : isRad(t) ? 'radio' : null;
    if (!kind) continue;
    out[kind].push(wc.mainCols.map((mc) => ({ w: mc.w, p: price(a[i][mc.idx]) })));
  }
  return out;
}

// Fusionne feuille ≤2700 (A) + continuation ≥2800 (B) pour un moteur × commande.
function buildGrid(sheetA, sheetB, kind) {
  const A1 = readSheet(A(sheetA))[kind];
  const B1 = readSheet(A(sheetB))[kind];
  if (A1.length < HEIGHTS.length) console.warn(`  ⚠ ${sheetA}/${kind}: ${A1.length} lignes pour ${HEIGHTS.length} hauteurs`);
  const colsA = A1[0].map((c) => c.w);
  const maxA = Math.max(...colsA);
  const colsB = (B1[0] ? B1[0].map((c) => c.w) : []).filter((w) => w > maxA);
  const cols = [...colsA, ...colsB];
  let filled = 0;
  const cells = HEIGHTS.map((_, i) => {
    const vA = A1[i] ? A1[i].map((c) => c.p) : colsA.map(() => null);
    const vB = B1[i] ? B1[i].filter((c) => c.w > maxA).map((c) => c.p) : colsB.map(() => null);
    const row = [...vA, ...vB];
    for (let c = row.length - 2; c >= 0; c--) if (row[c] == null && row[c + 1] != null) { row[c] = row[c + 1]; filled++; }
    return row;
  });
  if (filled) console.log(`  ↳ ${sheetA}/${kind} : ${filled} cellule(s) comblée(s) (snap-up)`);
  return { rows: HEIGHTS.slice(), cols, cells };
}

const grids = {
  r55_250_mn_filaire: buildGrid('Table 2', 'Table 9', 'filaire'),
  r55_250_mn_radio: buildGrid('Table 2', 'Table 9', 'radio'),
  r55_250_somfy_filaire: buildGrid('Table 15', 'Table 24', 'filaire'),
  r55_250_somfy_radio: buildGrid('Table 15', 'Table 24', 'radio'),
};

// ── Barème « Moins value AR » (attaches rigides) par largeur — mécanique (lu sur MN). ──
function arRow(sheetName) {
  const a = A(sheetName); const wc = widthCols(a);
  const row = a.find((r) => /moins\s*value\s*ar/i.test(String(r[1]).replace(/\s+/g, ' ')));
  const out = {};
  if (row) for (const mc of wc.mainCols) { const v = fix(row[mc.idx]); if (v != null) out[mc.w] = v; }
  return out;
}
const arMerged = { ...arRow('Table 2'), ...arRow('Table 9') };
const arKeys = Object.keys(arMerged).map(Number).sort((x, y) => x - y);
const adjust = { ar_r55_250: { keys: arKeys, values: arKeys.map((k) => arMerged[k]) } };

// ── Vérifications ──
const at = (g, h, w) => { const t = grids[g]; return t.cells[t.rows.indexOf(h)][t.cols.indexOf(w)]; };
console.log('=== Dimensions ===');
for (const [id, t] of Object.entries(grids)) {
  const nNull = t.cells.flat().filter((v) => v == null).length;
  console.log(`${id.padEnd(24)} ${t.rows.length}h [${t.rows[0]}…${t.rows[t.rows.length - 1]}] × ${t.cols.length}w [${t.cols[0]}…${t.cols[t.cols.length - 1]}] · nulls=${nNull}`);
}
console.log('\n=== Références (à confirmer PDG) ===');
console.log('MN filaire  H850 : L1100=', at('r55_250_mn_filaire', 850, 1100), '(attendu 725) · L1200=', at('r55_250_mn_filaire', 850, 1200), '(734) · L2800=', at('r55_250_mn_filaire', 850, 2800), '(1109)');
console.log('MN radio    H850 : L1100=', at('r55_250_mn_radio', 850, 1100), '(attendu 975)');
console.log('Somfy fil   H850 : L1100=', at('r55_250_somfy_filaire', 850, 1100), '(attendu 822)');
console.log('Somfy RS100 H850 : L1100=', at('r55_250_somfy_radio', 850, 1100), '(attendu 1037)');
console.log('AR moins-value :', adjust.ar_r55_250.keys.slice(0, 3).map((k, i) => `L${k}=${adjust.ar_r55_250.values[i]}`).join(' · '), '… L2800=', arMerged[2800], '(attendu -49) · L2900=', arMerged[2900], '(-60)');

fs.writeFileSync(path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'reno-lame55-grids.json'), JSON.stringify(grids), 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'reno-lame55-adjust.json'), JSON.stringify(adjust), 'utf8');
console.log('\nÉcrit reno-lame55-grids.json + reno-lame55-adjust.json');
