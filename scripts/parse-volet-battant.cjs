/* =====================================================================
   Parser des grilles de prix VOLETS BATTANTS panneaux (Ecotek/Novatek).
   14 fichiers OPTILOG dans docs/Tarif_VB/. Format de chaque feuille :
     ligne 0 : nb de vantaux par colonne (1/2/3/4)
     ligne 1 : largeur de la colonne
     colonne 0 (dès la ligne 2) : hauteur
     cellules : prix (vide / 0 = hors grille → null)
   Sortie : lib/configurateur/data/volet-battant-grids.json
     clés `vb_<CODE>_<count>` → Table2D { rows:hauteurs, cols:largeurs, cells }.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DIR = path.join(__dirname, '..', 'docs', 'Tarif_VB');
const CODE_FILE = {
  // Ecotek
  VBEPCP:  'TARIF_VBEPCP_VOLET ECOTEK PENTURES CONTRE-PENTURES-261.XLSX',
  VBEPBE:  'TARIF_VBEPBE_VOLET ECOTEK BARRES ECHARPE-261.XLSX',
  VBEPB:   'TARIF_VBEPB_VOLET ECOTEK BARRES-261.XLSX',
  VBEPCPC: 'TARIF_VBEPCPC_VOLET ECOTEK PENTURES C-PENTURES CADRE-261.XLSX',
  VBEPBEC: 'TARIF_VBEPBEC_VOLET ECOTEK BARRES ECHARPE CADRE-261.XLSX',
  VBEPBC:  'TARIF_VBEPBC_VOLET ECOTEK BARRES CADRE-261.XLSX',
  // Novatek classique
  VBNPCP:  'TARIF_VBNPCP_VOLET NOVATEK PENTURES CONTRE-PENTURES-261.XLSX',
  VBNPBE:  'TARIF_VBNPBE_VOLET NOVATEK BARRES ECHARPE-261.XLSX',
  VBNPB:   'TARIF_VBNPB_VOLET NOVATEK BARRES-261.XLSX',
  VBNPCPC: 'TARIF_VBNPCPC_VOLET NOVATEK PENTURES C-PENTURES CADRE-261.XLSX',
  VBNPBEC: 'TARIF_VBNPBEC_VOLET NOVATEK BARRES ECHARPE CADRE-261.XLSX',
  VBNPBC:  'TARIF_VBNPBC_VOLET NOVATEK BARRES CADRE-261.XLSX',
  // Novatek contemporain (PCP uniquement)
  VBNCONTPCP:  'TARIF_VBNCONTPCP_VOLET NOVATEK CONTEMPORAIN PCP-261.XLSX',
  VBNCONTPCPC: 'TARIF_VBNCONTPCPC_VOLET NOVATEK CONTEMPORAIN PCP CADRE-261.XLSX',
};

const num = (v) => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const grids = {};
for (const [code, file] of Object.entries(CODE_FILE)) {
  const wb = XLSX.readFile(path.join(DIR, file));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const a = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  const countRow = a[0], larRow = a[1];

  // Colonnes groupées par nb de vantaux
  const byCount = {}; // count -> { cols:[largeur], idx:[colIndex] }
  for (let c = 1; c < countRow.length; c++) {
    const cnt = Number(countRow[c]);
    const lar = num(larRow[c]);
    if (!cnt || cnt < 1 || cnt > 4 || !lar) continue;
    (byCount[cnt] ||= { cols: [], idx: [] });
    byCount[cnt].cols.push(lar);
    byCount[cnt].idx.push(c);
  }

  // Lignes hauteur (col 0)
  const hRows = []; const hIdx = [];
  for (let r = 2; r < a.length; r++) {
    const h = num(a[r][0]);
    if (!h) continue;
    hRows.push(h); hIdx.push(r);
  }

  for (const cntStr of Object.keys(byCount)) {
    const { cols, idx } = byCount[cntStr];
    // Ne garder que les hauteurs ayant au moins une cellule tarifée pour ce count
    const rows = []; const cells = [];
    for (let ri = 0; ri < hIdx.length; ri++) {
      const rowCells = idx.map((c) => num(a[hIdx[ri]][c]));
      if (rowCells.every((v) => v == null)) continue;
      rows.push(hRows[ri]); cells.push(rowCells);
    }
    grids[`vb_${code}_${cntStr}`] = { rows, cols, cells };
  }
}

// ---- Validation iso-prix (cellules de référence lues dans l'Excel) ----
const check = (key, h, l, expected) => {
  const g = grids[key];
  if (!g) { console.warn('  ⚠ grille absente:', key); return; }
  const ri = g.rows.indexOf(h), ci = g.cols.indexOf(l);
  const got = ri >= 0 && ci >= 0 ? g.cells[ri][ci] : undefined;
  const ok = got === expected;
  console.log(`  ${ok ? '✓' : '✗'} ${key} H${h}×L${l} = ${got} (attendu ${expected})`);
};
console.log('Iso-prix (référence VBEPCP) :');
check('vb_VBEPCP_1', 850, 500, 277);
check('vb_VBEPCP_1', 950, 600, 323);
check('vb_VBEPCP_2', 850, 700, 439);
check('vb_VBEPCP_2', 1350, 1200, 732);
check('vb_VBEPCP_3', 850, 1100, 666);
check('vb_VBEPCP_4', 850, 1400, 903);

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'volet-battant-grids.json');
fs.writeFileSync(out, JSON.stringify(grids), 'utf8');
const counts = {};
for (const k of Object.keys(grids)) { const c = k.split('_').pop(); counts[c] = (counts[c] || 0) + 1; }
console.log(`Écrit ${path.relative(process.cwd(), out)} — ${Object.keys(grids).length} grilles`, counts);
