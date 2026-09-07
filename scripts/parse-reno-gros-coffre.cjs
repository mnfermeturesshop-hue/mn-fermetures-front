/* Parse docs/Tarif_RENO_GROS_COFFRE.xlsx → grilles 2D (JSON) pour le Reno gros coffre
   LAME 77 (coffres 300 & 360, produit « Rollpark »). Chaque coffre = UNE grille H×L dont
   la BASE inclut « Motorisation Somfy filaire à commande de secours » (confirmé PDG). Les
   packs (homme présent, radio MN, Rollixo io/RTS) sont des plus-values FIXES gérées dans
   le build (pas dans la grille). Pas de grille MN/radio/solaire pour la lame 77.

     - Table 1 = coffre 300 : 1 bloc  (L 1800→4000, H 1850→3200).
     - Table 2 = coffre 360 : 2 blocs (L 1800→3900 puis L 4000→5000), fusionnés par hauteur.

   Sortie : lib/configurateur/data/reno-gros-coffre-grids.json
     → r77_300_somfy_filaire, r77_360_somfy_filaire.  À VÉRIFIER avec le PDG. */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_RENO_GROS_COFFRE.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

const num = (v) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/[^0-9.\-]/g, '');   // « H/L », « Transport… » → '' → null
  if (s === '') return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
};
// Largeur « principale » = multiple de 100 dans [1800, 5000].
const isMainW = (w) => w != null && w >= 1800 && w <= 5000 && w % 100 === 0;
// Hauteur de ligne plausible (col0).
const isH = (h) => h != null && h >= 1500 && h <= 4000;
// Prix valide : entier plausible pour un volet (fourchette large).
const price = (v) => { const n = num(v); return n != null && Number.isInteger(n) && n >= 500 && n <= 9000 ? n : null; };

// Lit tous les blocs d'une feuille : chaque bloc = { cols:[largeurs], rows:[{h, vals:[]}] }
// démarrant à une ligne d'en-tête « H/L … 1800 1900 … ».
function readBlocks(a) {
  const blocks = [];
  for (let i = 0; i < a.length; i++) {
    const cols = [];
    for (let c = 1; c < a[i].length; c++) { const w = num(a[i][c]); if (isMainW(w)) cols.push({ idx: c, w }); }
    // En-tête = ligne avec ≥ 3 largeurs principales ET col0 non numérique (H/L).
    if (cols.length >= 3 && num(a[i][0]) == null) {
      const rows = [];
      for (let k = i + 1; k < a.length; k++) {
        const h = num(a[k][0]);
        if (!isH(h)) { if (rows.length) break; else continue; }
        rows.push({ h, vals: cols.map((mc) => price(a[k][mc.idx])) });
      }
      blocks.push({ cols: cols.map((mc) => mc.w), rows });
      i = i + rows.length; // saute le bloc lu
    }
  }
  return blocks;
}

// Fusionne un ou plusieurs blocs en une grille { rows, cols, cells } (union des largeurs
// et des hauteurs, dans l'ordre croissant). Comble les nulls INTÉRIEURS par la largeur
// voisine supérieure (snap-up, cellules corrompues) ; laisse les nulls de fin (hors-surface).
function merge(blocks) {
  const cols = [...new Set(blocks.flatMap((b) => b.cols))].sort((x, y) => x - y);
  const heights = [...new Set(blocks.flatMap((b) => b.rows.map((r) => r.h)))].sort((x, y) => x - y);
  let filled = 0;
  const cells = heights.map((h) => {
    const row = cols.map((w) => {
      for (const b of blocks) {
        const ci = b.cols.indexOf(w); if (ci < 0) continue;
        const r = b.rows.find((rr) => rr.h === h); if (!r) continue;
        if (r.vals[ci] != null) return r.vals[ci];
      }
      return null;
    });
    for (let c = row.length - 2; c >= 0; c--) {
      if (row[c] == null && row[c + 1] != null) { row[c] = row[c + 1]; filled++; }
    }
    return row;
  });
  return { grid: { rows: heights, cols, cells }, filled };
}

const t1 = merge(readBlocks(A('Table 1'))); // coffre 300
const t2 = merge(readBlocks(A('Table 2'))); // coffre 360 (2 blocs fusionnés)

const grids = {
  r77_300_somfy_filaire: t1.grid,
  r77_360_somfy_filaire: t2.grid,
};

// ── Vérifications ──
const at = (g, h, w) => { const t = grids[g]; const ri = t.rows.indexOf(h), ci = t.cols.indexOf(w); return ri < 0 || ci < 0 ? `??(h${h}/w${w})` : t.cells[ri][ci]; };
console.log('=== Dimensions ===');
for (const [id, t] of Object.entries(grids)) {
  const nNull = t.cells.flat().filter((v) => v == null).length;
  console.log(`${id.padEnd(24)} ${t.rows.length}h [${t.rows[0]}…${t.rows[t.rows.length - 1]}] × ${t.cols.length}w [${t.cols[0]}…${t.cols[t.cols.length - 1]}] · nulls=${nNull}`);
}
console.log(`snap-up comblés : 300=${t1.filled} · 360=${t2.filled}`);
console.log('\n=== Références (à confirmer PDG) ===');
console.log('C300 H1850 : L1800=', at('r77_300_somfy_filaire', 1850, 1800), '(attendu 1874) · L1900=', at('r77_300_somfy_filaire', 1850, 1900), '(1904) · L2000=', at('r77_300_somfy_filaire', 1850, 2000), '(1934)');
console.log('C300 H3200 : L1800=', at('r77_300_somfy_filaire', 3200, 1800), '(attendu 2401) · L1900=', at('r77_300_somfy_filaire', 3200, 1900), '(2450)');
console.log('C360 H1850 : L1800=', at('r77_360_somfy_filaire', 1850, 1800), '(attendu 2260) · L1900=', at('r77_360_somfy_filaire', 1850, 1900), '(2293) · L4000=', at('r77_360_somfy_filaire', 1850, 4000), '(3185)');

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'reno-gros-coffre-grids.json');
fs.writeFileSync(out, JSON.stringify(grids), 'utf8');
console.log('\nÉcrit', path.relative(process.cwd(), out));
