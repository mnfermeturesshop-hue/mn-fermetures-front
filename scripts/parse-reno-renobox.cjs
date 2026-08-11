/* Parse docs/Tarif_RENO_RENOBOX_2026.xlsx → grilles 2D (JSON) pour Renobox.
   12 feuilles = 3 groupes (lame 42 ; lame 56 coffre 205 ; lame 56 coffre 250)
   × 2 moteurs (MN ; Somfy), chaque grille COUPÉE EN 2 par largeur (≤2200 puis >2200).
   Lignes filaire/radio ENTRELACÉES. Hauteurs non écrites sur les feuilles MN → axe
   850 mm pas de 100 (confirmé sur feuilles Somfy col2). Artefacts S=5, o=0, unicode.
   Sortie : lib/configurateur/data/reno-renobox-grids.json. À VÉRIFIER avec le PDG. */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fix = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/[Ss]/g, '5').replace(/[oO]/g, '0').replace(/[^0-9.\-]/g, '');
  return s === '' ? null : Number(s);
};
const seq = (from, to) => { const a = []; for (let h = from; h <= to; h += 100) a.push(h); return a; };

const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_RENO_RENOBOX_2026.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

// Groupes : sheetsMN/Somfy = [feuille largeurs ≤2200, feuille continuation >2200].
const GROUPS = [
  { key: 'r42',     minFil: 422, minRadio: 622, heights: seq(850, 2850),           mn: ['Table 1', 'Table 2'],  somfy: ['Table 3', 'Table 4'] },
  { key: 'r56_205', minFil: 422, minRadio: 628, heights: [...seq(850, 2550), 2640], mn: ['Table 5', 'Table 6'],  somfy: ['Table 7', 'Table 8'] },
  { key: 'r56_250', minFil: 422, minRadio: 628, heights: seq(850, 2850),           mn: ['Table 9', 'Table 10'], somfy: ['Table 11', 'Table 12'] },
];
const RADIO_LABELS = ['radio', 'rs100', 'rs 100', 'io'];
const isFil = (t) => /filaire/i.test(t);
const isRad = (t) => RADIO_LABELS.some((l) => t.toLowerCase().includes(l)) && !/filaire/i.test(t);

// Colonnes de largeur d'une feuille : ligne d'en-tête = celle qui maximise le nombre
// de largeurs « principales » (multiples de 100 dans [700,4000]). Cela marche pour les
// feuilles ≤2200 ET les continuations >2200, et exclut naturellement les L mini
// (422/622/628, non multiples de 100). Les L mini filaire/radio sont lues en col3/col4.
const isMainW = (w) => w != null && w >= 700 && w <= 4000 && w % 100 === 0;
function widthCols(a) {
  let best = null;
  for (let i = 0; i < Math.min(a.length, 8); i++) {
    const cols = [];
    for (let c = 0; c < a[i].length; c++) { const w = fix(a[i][c]); if (isMainW(w)) cols.push({ idx: c, w }); }
    if (!best || cols.length > best.mainCols.length) best = { hrow: i, mainCols: cols };
  }
  return best && best.mainCols.length ? best : null;
}

// Prix valide : entier plausible (les cellules corrompues du fichier — ex. « 0.12 » pour
// 1120 — sont neutralisées → null, la lookup2d prendra la colonne voisine par snap-up).
const price = (v) => { const n = fix(v); return n != null && Number.isInteger(n) && n >= 50 && n <= 5000 ? n : null; };

// Extrait { filaire:[...], radio:[...] } d'UNE feuille. La colonne du label (Filaire /
// RS100 io) est en col1 sur la plupart des feuilles, mais en col0 sur certaines
// continuations Somfy (ex. Table 12) → détection dynamique.
function readSheet(a) {
  const wc = widthCols(a);
  if (!wc) return null;
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

// Construit une grille { rows, cols, cells } pour un moteur/commande d'un groupe,
// en fusionnant la feuille ≤2200 et la continuation >2200.
function buildGrid(grp, sheetA, sheetB, kind, minWidth) {
  const A1 = readSheet(A(sheetA))[kind];
  const B1 = sheetB ? (readSheet(A(sheetB)) || {})[kind] || [] : [];
  const H = grp.heights;
  if (A1.length < H.length) console.warn(`  ⚠ ${grp.key}/${kind}: ${A1.length} lignes lues pour ${H.length} hauteurs (${sheetA})`);
  // Colonnes = [minWidth, largeurs principales A (dédupliquées), largeurs B >max(A)].
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
    // Comble les nulls INTÉRIEURS (cellules corrompues du fichier) par la largeur voisine
    // supérieure (snap-up). Les nulls de fin de ligne (coins hors-surface) restent null.
    for (let c = row.length - 2; c >= 0; c--) {
      if (row[c] == null && row[c + 1] != null) { row[c] = row[c + 1]; filled++; }
    }
    return row;
  });
  if (filled) console.log(`  ↳ ${grp.key}/${kind} : ${filled} cellule(s) corrompue(s) comblée(s) par la largeur voisine`);
  return { rows: H.slice(), cols, cells };
}

const grids = {};
for (const grp of GROUPS) {
  // L mini confirmées PDG : filaire 422 (MN) / 427 (Somfy) ; radio 622 (lame 42) / 628 (lame 56).
  grids[`${grp.key}_mn_filaire`]    = buildGrid(grp, grp.mn[0],    grp.mn[1],    'filaire', 422);
  grids[`${grp.key}_mn_radio`]      = buildGrid(grp, grp.mn[0],    grp.mn[1],    'radio',   grp.minRadio);
  grids[`${grp.key}_somfy_filaire`] = buildGrid(grp, grp.somfy[0], grp.somfy[1], 'filaire', 427);
  grids[`${grp.key}_somfy_radio`]   = buildGrid(grp, grp.somfy[0], grp.somfy[1], 'radio',   grp.minRadio);
}

// ── Vérifications ──
const at = (g, h, w) => { const t = grids[g]; const ri = t.rows.indexOf(h), ci = t.cols.indexOf(w); return ri < 0 || ci < 0 ? `??(h${h}/w${w})` : t.cells[ri][ci]; };
console.log('=== Dimensions ===');
for (const [id, t] of Object.entries(grids)) {
  const nNull = t.cells.flat().filter((v) => v == null).length;
  console.log(`${id.padEnd(22)} ${t.rows.length}h × ${t.cols.length}w · cols=[${t.cols.slice(0, 5).join(',')}…${t.cols[t.cols.length - 1]}] · nulls=${nNull}`);
}
console.log('\n=== Références (à confirmer PDG) ===');
console.log('r42 MN filaire  H850 : L422=', at('r42_mn_filaire', 850, 422), '(brut 401) · L800=', at('r42_mn_filaire', 850, 800), '(313) · L1200=', at('r42_mn_filaire', 850, 1200), '(370)');
console.log('r42 MN radio    H850 : L622=', at('r42_mn_radio', 850, 622), '(562) · L800=', at('r42_mn_radio', 850, 800), '(533)');
console.log('r56_205 MN fil  H850 : L422=', at('r56_205_mn_filaire', 850, 422), '(487) · L800=', at('r56_205_mn_filaire', 850, 800), '(405)');
console.log('r56_205 MN rad  H850 : L628=', at('r56_205_mn_radio', 850, 628), '(688) · L800=', at('r56_205_mn_radio', 850, 800), '(655)');

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'reno-renobox-grids.json');
fs.writeFileSync(out, JSON.stringify(grids), 'utf8');
console.log('\nÉcrit', path.relative(process.cwd(), out));

// ── Barèmes 1D par LARGEUR : DVA (plus-value verrous automatiques, coffres ≤205) et
//    AR (moins-value attaches rigides, coffre 250). Par groupe × moteur, merge ≤2200 + continuation.
function extractAdj(sheetName) {
  const a = A(sheetName); const wc = widthCols(a); if (!wc) return {};
  const row = a.find((r) => /(plus|moins)\s*value/i.test(String(r[0]) + ' ' + String(r[1])));
  if (!row) return {};
  const out2 = {};
  for (const mc of wc.mainCols) { const v = fix(row[mc.idx]); if (v != null) out2[mc.w] = v; }
  return out2;
}
function adjTable(sheetA, sheetB) {
  const m = { ...extractAdj(sheetA), ...extractAdj(sheetB) };
  const keys = Object.keys(m).map(Number).sort((x, y) => x - y);
  return { keys, values: keys.map((k) => m[k]) };
}
// Le verrouillage est MÉCANIQUE (indépendant du moteur) : un seul barème par groupe,
// lu sur les feuilles MN (gamme de largeurs la plus complète), fallback Somfy.
const adjust = {};
for (const grp of GROUPS) {
  const type = grp.key === 'r56_250' ? 'ar' : 'dva';
  let t = adjTable(grp.mn[0], grp.mn[1]);
  if (!t.keys.length) t = adjTable(grp.somfy[0], grp.somfy[1]);
  adjust[`${type}_${grp.key}`] = t;
}
console.log('\n=== Barèmes DVA / AR (1D largeur) ===');
for (const [id, t] of Object.entries(adjust)) console.log(`${id.padEnd(20)} keys=[${t.keys[0]}…${t.keys[t.keys.length - 1]}] values=[${[...new Set(t.values)].join(',')}]`);
const outAdj = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'reno-renobox-adjust.json');
fs.writeFileSync(outAdj, JSON.stringify(adjust), 'utf8');
console.log('Écrit', path.relative(process.cwd(), outAdj));
