/* Convertit "docs/TARIF TRADI 2026 VF.xlsx" (export PDF -> Excel du fabricant)
   en definition de configurateur JSON. Reprend les chiffres EXACTS du tarif.
   - detection d'entete generique (ligne avec le plus de largeurs plausibles)
   - bande "petite largeur" propre a chaque couche
   - 2e moitie de grille alignee ligne-a-ligne sur la 1ere (certaines n'ont pas
     de colonnes couche/hauteur)
   - controles: largeurs strictement croissantes + ancres PDF
   Usage: NODE_PATH=./node_modules node scripts/build-vr-tradi.cjs            */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile('docs/TARIF TRADI 2026 VF.xlsx', { cellFormula: false });
const num = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const widthLike = (v) => { const n = num(v); return n != null && n >= 200 && n <= 4600; };

const GRIDS = [
  { key: { pose: 'independant', lame: 'cd942', moteur: 'mn' },    tables: ['Table 9', 'Table 10'] },
  { key: { pose: 'independant', lame: 'cd942', moteur: 'somfy' }, tables: ['Table 11', 'Table 12'] },
  { key: { pose: 'independant', lame: '56', moteur: 'mn' },       tables: ['Table 13', 'Table 14'] },
  { key: { pose: 'independant', lame: '56', moteur: 'somfy' },    tables: ['Table 15', 'Table 16'] },
  { key: { pose: 'independant', lame: '55', moteur: 'mn' },       tables: ['Table 17', 'Table 18'] },
  { key: { pose: 'independant', lame: '55', moteur: 'somfy' },    tables: ['Table 19', 'Table 20'] },
  { key: { pose: 'coffre', lame: 'cd942', moteur: 'mn' },         tables: ['Table 25', 'Table 26'] },
  { key: { pose: 'coffre', lame: 'cd942', moteur: 'somfy' },      tables: ['Table 27', 'Table 28'] },
  { key: { pose: 'coffre', lame: '56', moteur: 'mn' },            tables: ['Table 29', 'Table 30'] },
  { key: { pose: 'coffre', lame: '56', moteur: 'somfy' },         tables: ['Table 31', 'Table 32'] },
  { key: { pose: 'express', lame: 'cd942', moteur: 'mn' },        tables: ['Table 33', 'Table 34'] },
  { key: { pose: 'express', lame: 'cd942', moteur: 'somfy' },     tables: ['Table 35', 'Table 36'] },
];

/** Parse une demi-grille : largeurs + lignes de prix (avec couche/hauteur si presentes) + ligne AR. */
function parseHalf(name) {
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });
  // Entete = ligne avec le plus de largeurs "rondes" (multiples de 100) : les
  // lignes de PRIX ont autant de nombres mais quasi aucun multiple de 100.
  const mult100 = (v) => { const n = num(v); return n != null && n >= 200 && n <= 4600 && n % 100 === 0; };
  let hr = -1, best = -1;
  for (let i = 0; i < Math.min(aoa.length, 8); i++) {
    const cnt = aoa[i].filter(mult100).length;
    if (cnt > best) { best = cnt; hr = i; }
  }
  if (best < 3) throw new Error(name + ': ligne de largeurs introuvable');
  const header = aoa[hr];
  let widthCols = [];
  for (let c = 0; c < header.length; c++) if (widthLike(header[c])) widthCols.push({ c, w: num(header[c]) });

  // Ligne "bornes hautes" des petites largeurs = ligne suivante avec valeurs dans <=2 colonnes largeur.
  const next = aoa[hr + 1] || [];
  const nextCnt = widthCols.filter(({ c }) => widthLike(next[c])).length;
  const hasUpper = nextCnt > 0 && nextCnt <= 2;
  if (hasUpper) widthCols = widthCols.map(({ c, w }) => (widthLike(next[c]) ? { c, w: num(next[c]) } : { c, w }));

  // Tronque a la reapparition d'une largeur inferieure (bloc "Axe 70" repete du
  // lame 55), en tolerant la non-monotonie des 2 petites bandes de tete.
  let cut = widthCols.length;
  for (let k = 2; k < widthCols.length; k++) if (widthCols[k].w <= widthCols[k - 1].w) { cut = k; break; }
  widthCols = widthCols.slice(0, cut);

  const widthStart = widthCols[0].c;
  const layerCol = widthStart >= 2 ? widthStart - 2 : -1;
  const heightCol = widthStart >= 1 ? widthStart - 1 : -1;

  const rows = []; let mv = null, curH = null; const pv = {};
  for (let i = hr + (hasUpper ? 2 : 1); i < aoa.length; i++) {
    const r = aoa[i];
    const vals = widthCols.map(({ c }) => num(r[c]));
    const present = vals.filter((v) => v != null);
    if (present.length < 3) continue;
    if (present.every((v) => v < 0)) { // ligne "Moins value AR"
      mv = {}; widthCols.forEach(({ w }, k) => { if (vals[k] != null) mv[w] = vals[k]; });
      continue;
    }
    // Plus-values coffre (par largeur) : Briquelite / NeoThermic / NeoBric / sous-face 7016.
    if (layerCol >= 0) {
      const lbl = String(r[layerCol] == null ? '' : r[layerCol]).toLowerCase();
      const t = /briquel/.test(lbl) ? 'briquelite' : /neotherm/.test(lbl) ? 'neothermic'
        : /neobric/.test(lbl) ? 'neobric' : (/sous ?face/.test(lbl) || /7016/.test(lbl)) ? 'sousface7016' : null;
      if (t) { pv[t] = pv[t] || {}; widthCols.forEach(({ w }, k) => { if (vals[k] != null) pv[t][w] = vals[k]; }); continue; }
    }
    let layer = null, height = null;
    if (layerCol >= 0) {
      const lc = String(r[layerCol] == null ? '' : r[layerCol]).toLowerCase();
      if (/fil/.test(lc)) layer = 'filaire';
      else if (/radio|rs100|io/.test(lc)) layer = 'radio';
      const h = num(r[heightCol]); if (h != null) curH = h; height = curH;
    }
    rows.push({ layer, height, vals });
  }
  // Table etiquetee (avec Filaire/Radio) -> on ecarte les lignes parasites sans
  // couche (PV coffre Briquelite/NeoThermic...). Table nue -> on garde tout
  // (l'identite couche/hauteur vient de la 1ere moitie, par index).
  const labeled = rows.some((r) => r.layer != null);
  const clean = labeled ? rows.filter((r) => r.layer != null) : rows;
  return { widths: widthCols.map((x) => x.w), rows: clean, mv, pv };
}

function buildGrid(g) {
  const h1 = parseHalf(g.tables[0]);
  let h2 = parseHalf(g.tables[1]);
  // Dedoublonne le chevauchement de largeurs entre les 2 moities (ex. Somfy: 2100 repete).
  const h1max = Math.max(...h1.widths);
  const keep2 = [];
  h2.widths.forEach((w, i) => { if (w > h1max) keep2.push(i); });
  h2 = { widths: keep2.map((i) => h2.widths[i]), rows: h2.rows.map((r) => ({ layer: r.layer, height: r.height, vals: keep2.map((i) => r.vals[i]) })), mv: h2.mv };
  if (h1.rows.some((r) => r.layer == null)) throw new Error(g.tables[0] + ': 1ere moitie sans couches');
  if (h1.rows.length !== h2.rows.length) {
    console.warn(`  ! ${g.key.pose}/${g.key.lame}/${g.key.moteur}: ${h1.rows.length} vs ${h2.rows.length} lignes (2 moities)`);
  }
  const combinedWidths = [...h1.widths, ...h2.widths];
  const perLayer = { filaire: [], radio: [] }; // {height, vals[]}
  for (let i = 0; i < h1.rows.length; i++) {   // 1ere moitie autoritaire ; 2e completee (pad si manquante)
    const layer = h1.rows[i].layer;
    const v2 = h2.rows[i] ? h2.rows[i].vals : h2.widths.map(() => null);
    perLayer[layer].push({ height: h1.rows[i].height, vals: [...h1.rows[i].vals, ...v2] });
  }
  const layers = {};
  for (const layer of ['filaire', 'radio']) {
    const list = perLayer[layer];
    if (!list.length) continue;
    // largeurs propres a la couche = colonnes non nulles sur au moins une hauteur
    const keep = [];
    for (let k = 0; k < combinedWidths.length; k++) if (list.some((row) => row.vals[k] != null)) keep.push(k);
    const widths = keep.map((k) => combinedWidths[k]);
    const rows = {};
    for (const row of list) rows[row.height] = keep.map((k) => row.vals[k]);
    layers[layer] = { widths, rows };
  }
  const heights = [...new Set([...(perLayer.filaire), ...(perLayer.radio)].map((r) => r.height))].sort((a, b) => a - b);
  const mv = { ...(h1.mv || {}), ...(h2.mv || {}) };
  const pv = {};
  for (const src of [h1.pv, h2.pv]) for (const [t, b] of Object.entries(src || {})) pv[t] = { ...(pv[t] || {}), ...b };
  return { grid: { key: g.key, heights, layers }, mv, pv };
}

// ── Construction + controles ──
const grids = [], adjustments = [];
const errs = [];
const coffrePv = {};
for (const g of GRIDS) {
  let built;
  try { built = buildGrid(g); }
  catch (e) { errs.push(`${g.tables.join('+')}: ${e.message}`); continue; }
  const { grid, mv, pv } = built;
  if (grid.key.pose === 'coffre') for (const [t, b] of Object.entries(pv)) coffrePv[t] = { ...(coffrePv[t] || {}), ...b };
  const tag = `${g.key.pose}/${g.key.lame}/${g.key.moteur}`;
  for (const layer of ['filaire', 'radio']) {
    const lg = grid.layers[layer];
    if (!lg) { errs.push(`${tag}: couche ${layer} absente`); continue; }
    for (let k = 1; k < lg.widths.length; k++) if (lg.widths[k] <= lg.widths[k - 1]) errs.push(`${tag}/${layer}: largeurs non croissantes ${lg.widths[k - 1]}>=${lg.widths[k]}`);
  }
  grids.push(grid);
  if (Object.keys(mv).length) adjustments.push({ code: 'attaches_rigides', label: 'Attaches rigides (au lieu des verrous)', scope: g.key, optional: true, baremeParLargeur: mv });
}

// Ancres PDF (CD942 independant, sur)
function cell(key, layer, w, h) {
  const g = grids.find((x) => x.key.pose === key.pose && x.key.lame === key.lame && x.key.moteur === key.moteur);
  const lg = g && g.layers[layer]; if (!lg) return null;
  const wi = lg.widths.indexOf(w); if (wi < 0) return null;
  return lg.rows[h] ? lg.rows[h][wi] : null;
}
const K = { pose: 'independant', lame: 'cd942' };
const anchors = [
  [cell({ ...K, moteur: 'mn' }, 'filaire', 700, 850), 309],
  [cell({ ...K, moteur: 'mn' }, 'radio', 700, 850), 528],
  [cell({ ...K, moteur: 'mn' }, 'filaire', 1400, 850), 380],
  [cell({ ...K, moteur: 'somfy' }, 'filaire', 700, 850), 403],
  [cell({ ...K, moteur: 'somfy' }, 'radio', 700, 850), 612],
  [cell({ pose: 'independant', lame: '56', moteur: 'mn' }, 'filaire', 800, 850), 361],
  [cell({ pose: 'coffre', lame: 'cd942', moteur: 'mn' }, 'filaire', 700, 850), 446],
  [cell({ pose: 'express', lame: 'cd942', moteur: 'mn' }, 'filaire', 700, 850), 313],
  [cell({ pose: 'express', lame: 'cd942', moteur: 'mn' }, 'radio', 700, 850), 527],
];
anchors.forEach(([got, want], i) => { if (got !== want) errs.push(`ancre #${i}: ${got} != ${want}`); });

// Ancres plus-values coffre (Table 25, largeur 700)
const pvAnchors = [
  [coffrePv.briquelite && coffrePv.briquelite[700], 37, 'Briquelite'],
  [coffrePv.neothermic && coffrePv.neothermic[700], 25, 'Neothermic'],
  [coffrePv.neobric && coffrePv.neobric[700], 59, 'Neobric'],
  [coffrePv.sousface7016 && coffrePv.sousface7016[700], 12, 'sous-face 7016'],
];
pvAnchors.forEach(([got, want, lbl]) => { if (got !== want) errs.push(`PV coffre ${lbl}[700]: ${got} != ${want}`); });

// ── Reste de la definition ──
const selectors = [
  // Type de volet (étiquette client) → pose interne de grille (axe dérivé).
  // drapeau/ZF tarifés comme l'indépendant ; tunnel MN/inconnu comme le coffre.
  { id: 'type_volet', label: 'Type de volet', options: [
    { value: 'independant', label: 'Traditionnel independant', derivedAxes: { pose: 'independant' } },
    { value: 'drapeau', label: 'Tradi drapeau', derivedAxes: { pose: 'independant' } },
    { value: 'zf', label: 'Tradi ZF (zone fixe)', derivedAxes: { pose: 'independant' } },
    { value: 'tunnel_mn', label: 'Coffre tunnel MN', derivedAxes: { pose: 'coffre' } },
    { value: 'tunnel_inconnu', label: 'Coffre tunnel (marque inconnue)', derivedAxes: { pose: 'coffre' } },
    { value: 'express', label: 'Tradi express', derivedAxes: { pose: 'express' } },
  ] },
  { id: 'lame', label: 'Lame', options: [
    { value: 'cd942', label: 'Aluminium CD942', hint: 'Surface max 8 m2' },
    { value: '56', label: 'Aluminium 56', hint: 'Surface max 10 m2' },
    { value: '55', label: 'Aluminium 55', hint: 'Surface max 12 m2' },
  ] },
  { id: 'moteur', label: 'Motorisation', options: [
    { value: 'mn', label: 'Moteur MN' },
    { value: 'somfy', label: 'Moteur Somfy (LT50 / RS100 io)' },
  ] },
];
if (Object.keys(coffrePv).length) {
  selectors.push({
    id: 'coffre', label: 'Type de coffre', scope: { pose: 'coffre' },
    options: [
      { value: 'thermic', label: "Thermic'elite (standard)" },
      ...(coffrePv.briquelite ? [{ value: 'briquelite', label: 'Briquelite' }] : []),
      ...(coffrePv.neothermic ? [{ value: 'neothermic', label: 'Neothermic' }] : []),
      ...(coffrePv.neobric ? [{ value: 'neobric', label: 'Neobric' }] : []),
    ],
  });
}
// Motorisation radio Somfy : IO (incluse) / RTS / Solaire — mutuellement exclusives,
// affichees seulement en radio + moteur Somfy. Plus-values sur la grille radio RS100 io.
selectors.push({
  id: 'radio_somfy', label: 'Motorisation radio Somfy', scope: { moteur: 'somfy' }, layer: 'radio',
  options: [
    { value: 'io', label: 'RS100 io (emetteur Amy inclus)' },
    { value: 'rts', label: 'RTS — emetteur Smoove (+55 EUR)' },
    { value: 'solaire', label: 'Solaire — kit batterie + panneau (+232 EUR)', hint: 'Largeur mini 433 mm' },
  ],
});
// Manoeuvre manuelle (moins-value sur grille Filaire) — seuils/valeurs par pose (tarif p10/26/34).
const MANOEUVRE = [
  { scope: { pose: 'independant' }, bareme: { 450: -72, 3000: -13 } }, // < 451 -72 / >= 451 -13
  { scope: { pose: 'coffre' },      bareme: { 450: -41, 3000: -3 } },  // < 451 -41 / >= 451 -3
  { scope: { pose: 'express' },     bareme: { 535: -90, 3000: -28 } }, // < 535 -90 / >= 535 -28
];
for (const m of MANOEUVRE) adjustments.push({ code: 'manoeuvre_manuelle', label: 'Manoeuvre manuelle (tringle oscillante)', scope: m.scope, layer: 'filaire', optional: true, baremeParLargeur: m.bareme });

// Coffre tunnel : plus-value par largeur selon le type de coffre (base = Thermic'elite),
// + option sous-face coloris 7016. Extrait des grilles coffre.
const COFFRE_LABELS = { briquelite: 'Briquelite', neothermic: 'Neothermic', neobric: 'Neobric' };
for (const [t, label] of Object.entries(COFFRE_LABELS)) {
  if (coffrePv[t]) adjustments.push({ code: 'coffre_' + t, label: 'Coffre ' + label, scope: { pose: 'coffre', coffre: t }, optional: false, baremeParLargeur: coffrePv[t] });
}
if (coffrePv.sousface7016) adjustments.push({ code: 'sous_face_7016', label: 'Sous-face coloris 7016', scope: { pose: 'coffre' }, optional: true, baremeParLargeur: coffrePv.sousface7016 });
// Motorisation radio Somfy : RTS / solaire = plus-value sur grille radio RS100 io (tarif p11/12).
adjustments.push({ code: 'somfy_rts', label: 'Motorisation RTS', scope: { moteur: 'somfy', radio_somfy: 'rts' }, layer: 'radio', optional: false, baremeParLargeur: { 99999: 55 } });
adjustments.push({ code: 'somfy_solaire', label: 'Motorisation solaire', scope: { moteur: 'somfy', radio_somfy: 'solaire' }, layer: 'radio', optional: false, baremeParLargeur: { 99999: 232 } });
const options = [
  { code: 'inverseur', label: 'Inverseur (applique ou encastre)', priceHT: 21, group: 'commande' },
  { code: 'emetteur_portatif_5c', label: 'Emetteur portatif 5 canaux', priceHT: 80, group: 'commande', scope: { moteur: 'mn' }, layer: 'radio' },
  { code: 'emetteur_mural_5c', label: 'Emetteur mural 5 canaux', priceHT: 80, group: 'commande', scope: { moteur: 'mn' }, layer: 'radio' },
  { code: 'amy_4c_io', label: 'Emetteur Amy 4 canaux IO', priceHT: 131, group: 'commande', scope: { moteur: 'somfy' }, layer: 'radio' },
  { code: 'situo_io_1c', label: 'Emetteur Situo IO 1 canal', priceHT: 100, group: 'commande', scope: { moteur: 'somfy' }, layer: 'radio' },
  { code: 'situo_io_5c', label: 'Emetteur Situo IO 5 canaux', priceHT: 135, group: 'commande', scope: { moteur: 'somfy' }, layer: 'radio' },
  { code: 'alim_depannage', label: 'Alimentation de depannage (solaire)', priceHT: 83, group: 'commande', scope: { moteur: 'somfy', radio_somfy: 'solaire' }, layer: 'radio' },
  { code: 'genouillere_60', label: 'Genouillere 60 (sans plus-value)', priceHT: 0, group: 'manoeuvre' },
  { code: 'genouillere_60a', label: 'Genouillere 60 aimantee', priceHT: 41, group: 'manoeuvre' },
  { code: 'genouillere_90', label: 'Genouillere 90', priceHT: 18, group: 'manoeuvre' },
  { code: 'genouillere_90a', label: 'Genouillere 90 aimantee', priceHT: 59, group: 'manoeuvre' },
  { code: 'serrure_lame_finale', label: 'Serrure sur lame finale', priceHT: 135, group: 'divers' },
  { code: 'flasque_guidage', label: 'Flasques de guidage 188', priceHT: 18, group: 'divers' },
  { code: 'kit_inverseur_secours', label: 'Kit inverseur + contact a cle + telerupteur', priceHT: 139, group: 'divers' },
];
// ── Coloris : matrice disponibilite/prix par lame (tarif p39 « DISPONIBILITE ET
//    PRIX DES COLORIS », fusions resolues). Par lame : T = tarif (standard, +0) ·
//    P = +14 EUR/m2 (coloris laque RAL) · '' = indisponible pour cette lame.
//    Le forfait laquage 77 EUR est PAR COMMANDE (< 2000 EUR HT), pas par volet :
//    il n'est donc pas integre au prix unitaire (note affichee dans l'UI).
//                       code            libelle              hex        942  56  55
const COLOR_DEFS = [
  ['blanc-9010',   'Blanc 9010',        '#F1F0EA', 'T', 'T', 'T'],
  ['ivoire-1015',  'Ivoire 1015',       '#E4D5B7', 'T', 'T', 'T'],
  ['gris-7035',    'Gris 7035',         '#D5D8D2', 'T', 'T', 'T'],
  ['gris-7038',    'Gris 7038',         '#B4B8B1', 'T', 'T', 'T'],
  ['gris-7016',    'Gris anthracite 7016', '#383E42', 'T', 'T', 'T'],
  ['alu-9006',     'Alu AS 9006',       '#A1A2A1', 'T', 'T', 'T'],
  ['marron-8019',  'Marron 8019',       '#3D3635', 'T', 'T', 'T'],
  ['noir-9005',    'Noir 9005',         '#0E0E10', 'T', 'T', 'T'],
  ['rouge-3004',   'Rouge 3004',        '#672324', 'P', 'P', 'P'],
  ['bleu-5011',    'Bleu 5011',         '#232C3B', 'P', 'P', '' ],
  ['vert-6005',    'Vert 6005',         '#114232', 'P', 'P', '' ],
  ['vert-6009',    'Vert 6009',         '#27352A', 'P', '',  '' ],
  ['vert-6021',    'Vert 6021',         '#7E9B6C', 'P', 'P', '' ],
  ['gris-7011',    'Gris 7011',         '#434B4D', '',  'P', 'P'],
  ['gris-7012',    'Gris 7012',         '#4E5451', '',  'P', 'P'],
  ['gris-7021',    'Gris 7021',         '#2E3234', 'P', '',  '' ],
  ['gris-7022',    'Gris 7022',         '#4B4D46', 'P', '',  '' ],
  ['gris-7039',    'Gris 7039',         '#6C6960', 'T', 'T', '' ],
  ['marron-8014',  'Marron 8014',       '#432F1D', 'P', 'P', 'P'],
  ['gris-9007',    'Gris 9007',         '#8A8B86', 'P', 'P', '' ],
  ['noir-2100',    'Noir 2100 sable',   '#1A1A1A', 'T', 'T', '' ],
  ['gris-2900',    'Gris 2900 sable',   '#6E6E6E', 'T', 'T', '' ],
  ['chene-dore',   'Chene dore',        '#8A6A38', 'P', 'P', '' ],
];
const colors = COLOR_DEFS.map(([code, label, hex]) => ({ code, label, hex }));
const LAME_COL = { cd942: 3, 56: 4, 55: 5 };
const colorPolicies = Object.entries(LAME_COL).map(([lame, idx]) => {
  const standard = [], pv = [];
  for (const r of COLOR_DEFS) { if (r[idx] === 'T') standard.push(r[0]); else if (r[idx] === 'P') pv.push(r[0]); }
  return { lame, standard, pvM2: { codes: pv, montantParM2: 14 } };
});
// Limites dimensionnelles (tarif Table 23 « LIMITES DIMENSIONNELLES »).
// La largeur MINI depend du mode de manoeuvre/moteur ; la largeur MAXI et la
// surface dependent de la lame. Modes : filaire_mn / radio_mn / filaire_somfy /
// radio_somfy / tringle (manoeuvre manuelle) / tirage_direct.
// Hauteur maxi = borne haute globale (3230, verrous axe 60) ; affinee par
// axe/coffre au Lot coffre.
const MINS_TRADI = { filaire_mn: 420, radio_mn: 506, filaire_somfy: 400, radio_somfy: 400, tringle: 400, tirage_direct: 630 };
const MINS_EXPRESS = { filaire_mn: 505, radio_mn: 591, filaire_somfy: 400, radio_somfy: 400, tringle: 400, tirage_direct: 630 };
const limits = [
  { lame: 'cd942', surfaceMaxM2: 8, largeurMin: 400, largeurMax: 3000, hauteurMax: 3230, largeurMinByMode: MINS_TRADI },
  { lame: '56', surfaceMaxM2: 10, largeurMin: 400, largeurMax: 4000, hauteurMax: 3230, largeurMinByMode: MINS_TRADI },
  { lame: '55', surfaceMaxM2: 12, largeurMin: 400, largeurMax: 4500, hauteurMax: 3230, largeurMinByMode: MINS_TRADI },
  { lame: 'cd942', pose: 'express', surfaceMaxM2: 8, largeurMin: 400, largeurMax: 3000, hauteurMax: 3230, largeurMinByMode: MINS_EXPRESS },
];

// Champs de fabrication (sans impact prix) — remontent a la production.
const specFields = [
  { id: 'enroulement', label: 'Enroulement', type: 'radio', required: true, defaultValue: 'int', group: 'pose',
    options: [ { value: 'int', label: 'Interieur (INT)' }, { value: 'ext', label: 'Exterieur (EXT)' } ] },
];

const def = { slug: 'volet-roulant-traditionnel', name: 'Volet roulant traditionnel', famille: 'volet-roulant', selectors, grids, adjustments, options, colors, colorPolicies, limits, specFields };

console.log('Grilles construites: ' + grids.length + '/' + GRIDS.length);
for (const g of grids) {
  const f = g.layers.filaire, r = g.layers.radio;
  console.log('  ' + `${g.key.pose}/${g.key.lame}/${g.key.moteur}`.padEnd(28) +
    ' H=' + String(g.heights.length).padStart(2) +
    ' | fil ' + (f ? f.widths.length + 'L ' + f.widths[0] + '..' + f.widths[f.widths.length - 1] : '-').padEnd(16) +
    ' | rad ' + (r ? r.widths.length + 'L ' + r.widths[0] + '..' + r.widths[r.widths.length - 1] : '-'));
}
if (errs.length) { console.log('\nPROBLEMES (' + errs.length + '):'); errs.slice(0, 40).forEach((e) => console.log('  - ' + e)); }
else console.log('\nContoles OK (largeurs croissantes + ancres PDF).');

const out = path.join('lib', 'configurateur', 'data', 'volet-roulant-traditionnel.json');
fs.writeFileSync(out, JSON.stringify(def));
console.log('Ecrit ' + out + ' (' + (fs.statSync(out).size / 1024).toFixed(0) + ' Ko)');
