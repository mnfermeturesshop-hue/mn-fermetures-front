/* =====================================================================
   Build def v2 — VOLETS BATTANTS PANNEAUX (Ecotek + Novatek).
   UN configurateur multi-modèles, MANUEL. Arbre de décision PDG (8 étapes) :
   modèle → dimensions → couleur (diffère Ecotek/Novatek) → type de volet →
   vantaux → feuillure → cintrage → cadre → pose → arrêt.
   PHASE 2 : prix instantané. Grille = lookup2d(vb_<CODE>_<vantaux>, hauteur, largeur),
   CODE routé par modèle × type de volet × cadre (sans / U 3 côtés). 56 grilles
   (docs/Tarif_VB → volet-battant-grids.json). Bornes L/H par nb de vantaux via
   contraintes. Plus-values intégrées : cadre 4 côtés (« Dormant 4 cotés », lookup1d
   selon largeur, tables __d4) ; cintrage arc/plein 110 €/vantail, anse 170 €/vantail
   (flèche ≤ 800 mm pour arc/plein) ; couvre-joint 70 mm ECOTEK = 24 €/ml (périmètre
   2H+2L) — Novatek : 70 mm inclus, 24/35/50 mm sans supplément. Reste à tarifer :
   feuillure, arrêt, gonds (aujourd'hui sans impact prix).
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const grids = require('../lib/configurateur/data/volet-battant-grids.json');
const surch = require('../lib/configurateur/data/volet-battant-surcharges.json');

const V = (n) => ({ var: n });
const MUL = (...args) => ({ op: '*', args });
const eq = (n, v) => ({ op: 'eq', left: V(n), right: v });
const ne = (n, v) => ({ op: 'ne', left: V(n), right: v });
const inSet = (n, set) => ({ op: 'in', value: V(n), set });
const AND = (cs) => (cs.length === 1 ? cs[0] : { all: cs });
const IF = (cond, then, els) => ({ op: 'if', cond, then, else: els });
const eqV = (n, v) => ({ op: 'eq', left: V(n), right: v }); // alias lisible

const IS_ECO = eq('modele', 'ecotek');
const IS_NOV = eq('modele', 'novatek');

const fields = [];

// ── Étape 1 : Modèle (nodeField). Valeurs = slugs de nomenclature (ecotek/novatek). ──
fields.push({
  id: 'modele', label: 'Modèle', type: 'choice', default: 'ecotek',
  help: 'Ecotek (RAL satiné) ou Novatek (mat givré / sablé, plus de coloris et un type contemporain).',
  options: [
    { value: 'ecotek', label: 'Ecotek' },
    { value: 'novatek', label: 'Novatek' },
  ],
});

// ── Étape 2 : Dimensions (identiques) — cotes de commande en mm. ──
fields.push({ id: 'dim_help', type: 'info', help: 'Cotes de commande (mm). Les bornes de largeur dépendent du nombre de vantaux (hauteur 850–2550).' });
fields.push({ id: 'largeur', label: 'Largeur', type: 'dimension', unit: 'mm', min: 500, max: 2600, step: 1 });
fields.push({ id: 'hauteur', label: 'Hauteur', type: 'dimension', unit: 'mm', min: 850, max: 2550, step: 1 });

// ── Étape 3 : Couleur (diffère selon le modèle) ──
// Ecotek — RAL satiné (5 coloris).
fields.push({
  id: 'coloris_ecotek', label: 'Coloris (RAL satiné)', type: 'choice', default: 'blanc-9010',
  visibleWhen: IS_ECO,
  options: [
    { value: 'blanc-9010', label: 'Blanc 9010', hex: '#f4f4f2' },
    { value: 'gris-7016', label: 'Gris anthracite 7016', hex: '#383e42' },
    { value: 'rouge-3004', label: 'Rouge pourpre 3004', hex: '#641c34' },
    { value: 'vert-6021', label: 'Vert pâle 6021', hex: '#89ac76' },
    { value: 'marron-8014', label: 'Marron sépia 8014', hex: '#472b1f' },
  ],
});
// Novatek — Mat givré (11 RAL) + Sablé (2 finitions).
fields.push({
  id: 'coloris_novatek', label: 'Coloris', type: 'choice', default: 'givre-9010',
  visibleWhen: IS_NOV,
  help: 'Finition mat givré (RAL) ou sablé.',
  options: [
    { value: 'givre-1015', label: 'Mat givré · Ivoire 1015', hex: '#e6d2b5' },
    { value: 'givre-3004', label: 'Mat givré · Rouge 3004', hex: '#641c34' },
    { value: 'givre-5014', label: 'Mat givré · Bleu pigeon 5014', hex: '#606e8c' },
    { value: 'givre-5024', label: 'Mat givré · Bleu pastel 5024', hex: '#5d9b9b' },
    { value: 'givre-6005', label: 'Mat givré · Vert mousse 6005', hex: '#114232' },
    { value: 'givre-6021', label: 'Mat givré · Vert pâle 6021', hex: '#89ac76' },
    { value: 'givre-7016', label: 'Mat givré · Gris anthracite 7016', hex: '#383e42' },
    { value: 'givre-7035', label: 'Mat givré · Gris clair 7035', hex: '#d7d7d7' },
    { value: 'givre-7039', label: 'Mat givré · Gris quartz 7039', hex: '#6c6e6b' },
    { value: 'givre-8019', label: 'Mat givré · Brun gris 8019', hex: '#3d3635' },
    { value: 'givre-9010', label: 'Mat givré · Blanc 9010', hex: '#f4f4f2' },
    { value: 'sable-gris-2900', label: 'Sablé · Gris 2900', hex: '#7d7f7e' },
    { value: 'sable-chene-dore', label: 'Sablé · Faux bois chêne doré', hex: '#b5884e' },
  ],
});

// ── Étape 4 : Type de volet (Ecotek 3 choix ; Novatek +1 contemporain) ──
fields.push({
  id: 'type_volet', label: 'Type de volet', type: 'choice', default: 'pentures',
  helpImage: '/type_de_volets.png',
  options: [
    { value: 'pentures', label: 'Pentures / contre-pentures' },
    { value: 'barres_echarpe', label: 'Barres et écharpe' },
    { value: 'barres', label: 'Barres' },
    { value: 'pentures_contemporain', label: 'Pentures / contre-pentures contemporain', availableWhen: IS_NOV },
  ],
});

// ── Étape 5 : Vantaux (identique) — nombre puis configuration/sens d'ouverture ──
fields.push({
  id: 'nb_vantaux', label: 'Nombre de vantaux', type: 'choice', default: '1',
  options: [
    { value: '1', label: '1 vantail' }, { value: '2', label: '2 vantaux' },
    { value: '3', label: '3 vantaux' }, { value: '4', label: '4 vantaux' },
  ],
});
fields.push({
  id: 'config_vantaux', label: 'Configuration', type: 'choice', default: '1d', imageChoice: true, imageChoiceWide: true,
  help: 'Sens et répartition des vantaux (G = gauche, D = droite ; « ouverture principale » = grand vantail).',
  options: [
    // 1 vantail
    { value: '1d', label: '1 vantail — ouverture à droite', imageUrl: '/1V1D.png', availableWhen: eq('nb_vantaux', '1') },
    { value: '1g', label: '1 vantail — ouverture à gauche', imageUrl: '/1V1G.png', availableWhen: eq('nb_vantaux', '1') },
    // 2 vantaux
    { value: '2_1g1d_d', label: '1G/1D — ouverture principale à droite', imageUrl: '/2V-1G1D-OD.png', availableWhen: eq('nb_vantaux', '2') },
    { value: '2_1g1d_g', label: '1G/1D — ouverture principale à gauche', imageUrl: '/2V-1G1D-OG.png', availableWhen: eq('nb_vantaux', '2') },
    { value: '2_2d', label: '2 vantaux à droite (2D)', imageUrl: '/2V-2D.png', availableWhen: eq('nb_vantaux', '2') },
    { value: '2_2g', label: '2 vantaux à gauche (2G)', imageUrl: '/2V-2G.png', availableWhen: eq('nb_vantaux', '2') },
    // 3 vantaux
    { value: '3_2g1d_d', label: '2G/1D — ouverture principale à droite', imageUrl: '/3V-2G1D-OD.png', availableWhen: eq('nb_vantaux', '3') },
    { value: '3_2g1d_g', label: '2G/1D — ouverture principale à gauche', imageUrl: '/3V-2G1D-OG.png', availableWhen: eq('nb_vantaux', '3') },
    { value: '3_1g2d_d', label: '1G/2D — ouverture principale à droite', imageUrl: '/3V-1G2D-OD.png', availableWhen: eq('nb_vantaux', '3') },
    { value: '3_1g2d_g', label: '1G/2D — ouverture principale à gauche', imageUrl: '/3V-1G2D-OG.png', availableWhen: eq('nb_vantaux', '3') },
    // 4 vantaux
    { value: '4_2g2d_d', label: '2G/2D — ouverture principale à droite', imageUrl: '/4V-2G2D-OD.png', availableWhen: eq('nb_vantaux', '4') },
    { value: '4_2g2d_g', label: '2G/2D — ouverture principale à gauche', imageUrl: '/4V-2G2D-OG.png', availableWhen: eq('nb_vantaux', '4') },
  ],
});

// ── Étape 6 : Feuillure (sans / avec → FH/FB/FG/FD, oui = valeur) ──
fields.push({
  id: 'feuillure', label: 'Feuillure', type: 'choice', default: 'non',
  helpImage: '/feuillure.png',
  options: [{ value: 'non', label: 'Sans feuillure' }, { value: 'oui', label: 'Avec feuillure' }],
});
const FEUILLURE_ON = eq('feuillure', 'oui');
fields.push({ id: 'feuillure_help', type: 'info', visibleWhen: FEUILLURE_ON,
  help: 'Renseignez la profondeur (mm) de chaque feuillure présente ; laissez à 0 si absente.' });
fields.push({ id: 'feuillure_fh', label: 'Feuillure haute (FH)', type: 'number', unit: 'mm', min: 0, step: 1, role: 'spec', visibleWhen: FEUILLURE_ON });
fields.push({ id: 'feuillure_fb', label: 'Feuillure basse (FB)', type: 'number', unit: 'mm', min: 0, step: 1, role: 'spec', visibleWhen: FEUILLURE_ON });
fields.push({ id: 'feuillure_fg', label: 'Feuillure gauche (FG)', type: 'number', unit: 'mm', min: 0, step: 1, role: 'spec', visibleWhen: FEUILLURE_ON });
fields.push({ id: 'feuillure_fd', label: 'Feuillure droite (FD)', type: 'number', unit: 'mm', min: 0, step: 1, role: 'spec', visibleWhen: FEUILLURE_ON });

// ── Étape 7 : Cintrage (sans / arc surbaissé / plein cintre / anse de panier) ──
fields.push({
  id: 'cintrage', label: 'Cintrage', type: 'choice', default: 'non',
  helpImage: '/cintrage.png',
  options: [
    { value: 'non', label: 'Sans cintrage' },
    { value: 'arc', label: 'Arc surbaissé régulier' },
    { value: 'plein', label: 'Plein cintre' },
    { value: 'anse', label: 'Anse de panier' },
  ],
});
fields.push({ id: 'cintrage_f', label: 'Flèche du cintre (F)', type: 'number', unit: 'mm', min: 0, step: 1, role: 'spec',
  visibleWhen: inSet('cintrage', ['arc', 'plein']), help: 'Hauteur de flèche F (mesurée sur la hauteur de commande).' });
fields.push({ id: 'cintrage_info', type: 'info', visibleWhen: inSet('cintrage', ['plein', 'anse']),
  help: 'Demande de faisabilité obligatoire (gabarit obligatoire pour l’anse de panier). Un cintrage exclut le cadre.' });

// ── Étape 8 : Cadre (impossible si cintrage) ──
const NO_CINTRAGE = eq('cintrage', 'non');
fields.push({
  id: 'cadre', label: 'Cadre', type: 'choice', default: 'non', visibleWhen: NO_CINTRAGE,
  options: [{ value: 'non', label: 'Sans cadre' }, { value: 'oui', label: 'Avec cadre' }],
});
const CADRE_ON = AND([NO_CINTRAGE, eq('cadre', 'oui')]);
fields.push({
  id: 'cadre_type', label: 'Type de cadre', type: 'choice', default: 'u', visibleWhen: CADRE_ON,
  help: 'Cadre 3 côtés (U inversé) ou 4 côtés (dormant complet, plus-value selon la largeur).',
  options: [
    { value: 'u', label: '3 côtés (U inversé)' },
    { value: 'c', label: '4 côtés (dormant complet)' },
  ],
});
// Couvre-joint : options et défaut différents selon le modèle.
//  ECOTEK  : 50 mm par défaut (inclus) · sans (sans plus-value) · 70 mm = 24 €/ml (2H+2L)
//  NOVATEK : 70 mm par défaut (inclus) · sans (sans plus-value) · 24/35/50 mm (sans plus-value)
// L'ordre place le défaut de chaque modèle en tête (repairValues prend la 1re dispo).
fields.push({
  id: 'cadre_couvrejoint', label: 'Couvre-joint', type: 'choice', default: '50', visibleWhen: CADRE_ON,
  help: 'Ecotek : 50 mm inclus (70 mm en supplément 24 €/ml). Novatek : 70 mm inclus (24/35/50 mm sans supplément).',
  options: [
    { value: '50', label: 'Couvre-joint 50 mm (inclus)', availableWhen: IS_ECO },
    { value: '70', label: 'Couvre-joint 70 mm' }, // dispo pour les deux modèles (défaut Novatek, +24 €/ml Ecotek)
    { value: 'sans', label: 'Sans couvre-joint' },
    { value: '24_35_50', label: 'Couvre-joint 24 / 35 / 50 mm (inclus)', availableWhen: IS_NOV },
  ],
});

// ── Étape 9 : Pose (gonds existants / fournis → à sceller / à visser + positions) ──
fields.push({
  id: 'pose', label: 'Pose', type: 'choice', default: 'gonds_existants',
  options: [
    { value: 'gonds_existants', label: 'Gonds existants' },
    { value: 'gonds_fournis', label: 'Gonds fournis et à poser' },
  ],
});
const GONDS_FOURNIS = eq('pose', 'gonds_fournis');
fields.push({
  id: 'gonds_type', label: 'Type de gonds', type: 'choice', default: 'sceller', visibleWhen: GONDS_FOURNIS,
  helpImage: '/Position_gonds.png',
  options: [{ value: 'sceller', label: 'Gonds à sceller' }, { value: 'visser', label: 'Gonds à visser' }],
});
fields.push({ id: 'pose_help', type: 'info', visibleWhen: GONDS_FOURNIS, help: 'Position des gonds (mm) depuis le haut : GH (haut), GI (intermédiaire), GB (bas).' });
fields.push({ id: 'gond_gh', label: 'Gond haut (GH)', type: 'number', unit: 'mm', min: 0, step: 1, role: 'spec', visibleWhen: GONDS_FOURNIS });
fields.push({ id: 'gond_gi', label: 'Gond intermédiaire (GI)', type: 'number', unit: 'mm', min: 0, step: 1, role: 'spec', visibleWhen: GONDS_FOURNIS });
fields.push({ id: 'gond_gb', label: 'Gond bas (GB)', type: 'number', unit: 'mm', min: 0, step: 1, role: 'spec', visibleWhen: GONDS_FOURNIS });

// ── Étape 10 : Arrêt ──
fields.push({
  id: 'arret', label: 'Arrêt de volet', type: 'choice', default: 'sans',
  options: [
    { value: 'sans', label: 'Sans arrêts' },
    { value: 'marseillais', label: 'Marseillais' },
    { value: 'automatique', label: 'Automatique' },
    { value: 'paillette', label: 'Paillette' },
  ],
});
fields.push({
  id: 'arret_gonds', label: 'Gonds de l’arrêt', type: 'choice', default: 'sceller', visibleWhen: eq('arret', 'marseillais'),
  options: [{ value: 'sceller', label: 'Gonds à sceller' }, { value: 'visser', label: 'Gonds à visser' }],
});

// ── Étapes ──
const steps = [
  { id: 'modele', title: 'Modèle', fields: ['modele'] },
  { id: 'dimensions', title: 'Dimensions', fields: ['dim_help', 'largeur', 'hauteur'] },
  { id: 'couleur', title: 'Couleur', fields: ['coloris_ecotek', 'coloris_novatek'] },
  { id: 'type', title: 'Type de volet', fields: ['type_volet'] },
  { id: 'vantaux', title: 'Vantaux', fields: ['nb_vantaux', 'config_vantaux'] },
  { id: 'feuillure', title: 'Feuillure', fields: ['feuillure', 'feuillure_help', 'feuillure_fh', 'feuillure_fb', 'feuillure_fg', 'feuillure_fd'] },
  { id: 'cintrage', title: 'Cintrage', fields: ['cintrage', 'cintrage_f', 'cintrage_info'] },
  { id: 'cadre', title: 'Cadre', fields: ['cadre', 'cadre_type', 'cadre_couvrejoint'] },
  { id: 'pose', title: 'Pose', fields: ['pose', 'gonds_type', 'pose_help', 'gond_gh', 'gond_gi', 'gond_gb'] },
  { id: 'arret', title: 'Arrêt', fields: ['arret', 'arret_gonds'] },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

// ---- Routage : code fichier de grille selon modèle / panneau / type / cadre ----
const t = 'type_volet';
const cadreOn = eq('cadre', 'oui');          // cadre masqué si cintrage → reste 'non'
const contemp = eq(t, 'pentures_contemporain');
const typeIf = (m) => IF(eq(t, 'pentures'), m.pentures, IF(eq(t, 'barres_echarpe'), m.barres_echarpe, m.barres));
const ecoCode = IF(cadreOn,
  typeIf({ pentures: 'VBEPCPC', barres_echarpe: 'VBEPBEC', barres: 'VBEPBC' }),
  typeIf({ pentures: 'VBEPCP',  barres_echarpe: 'VBEPBE',  barres: 'VBEPB'  }));
const novClass = IF(cadreOn,
  typeIf({ pentures: 'VBNPCPC', barres_echarpe: 'VBNPBEC', barres: 'VBNPBC' }),
  typeIf({ pentures: 'VBNPCP',  barres_echarpe: 'VBNPBE',  barres: 'VBNPB'  }));
const novCode = IF(contemp, IF(cadreOn, 'VBNCONTPCPC', 'VBNCONTPCP'), novClass);
const vbcode = IF(eq('modele', 'ecotek'), ecoCode, novCode);

const derived = [
  { id: 'grid', expr: { op: 'concat', args: ['vb_', vbcode, '_', V('nb_vantaux')] } },
  // Table de surcharge « Dormant 4 côtés » : même clé de grille + suffixe __d4
  { id: 'grid4', expr: { op: 'concat', args: [V('grid'), '__d4'] } },
];

// ---- Prix ----
const priceRules = [
  // Base = lookup2d(grille, hauteur, largeur)
  { code: 'base', label: 'Volet battant panneau', kind: 'base',
    amount: { op: 'lookup2d', table: V('grid'), row: V('hauteur'), col: V('largeur') } },
  // Cadre 4 côtés (dormant complet) : plus-value selon largeur (constante en hauteur)
  { code: 'cadre_4cotes', label: 'Cadre 4 côtés (dormant complet)', kind: 'add',
    when: AND([eq('cadre', 'oui'), eq('cadre_type', 'c')]),
    amount: { op: 'lookup1d', table: V('grid4'), key: V('largeur') } },
  // Cintrage (par vantail × nombre de vantaux)
  { code: 'cintrage_arc_plein', label: 'Cintrage (arc surbaissé / plein cintre)', kind: 'add',
    when: inSet('cintrage', ['arc', 'plein']), amount: MUL(110, V('nb_vantaux')) },
  { code: 'cintrage_anse', label: 'Cintrage anse de panier', kind: 'add',
    when: eq('cintrage', 'anse'), amount: MUL(170, V('nb_vantaux')) },
  // Couvre-joint 70 mm ECOTEK : 24 €/ml sur le périmètre (2×hauteur + 2×largeur)
  { code: 'couvrejoint_70_eco', label: 'Couvre-joint 70 mm (Ecotek)', kind: 'add',
    when: AND([eq('cadre', 'oui'), eq('modele', 'ecotek'), eq('cadre_couvrejoint', '70')]),
    amount: { op: 'round', decimals: 2, arg: MUL(0.024, { op: '+', args: [MUL(2, V('hauteur')), MUL(2, V('largeur'))] }) } },
];

// ---- Contraintes de bornes L/H, générées par grille (scopées par la clé `grid`) ----
const gte = (n, v) => ({ op: 'gte', left: V(n), right: v });
const lte = (n, v) => ({ op: 'lte', left: V(n), right: v });
const NVLABEL = { 1: '1 vantail', 2: '2 vantaux', 3: '3 vantaux', 4: '4 vantaux' };
const constraints = [];
for (const [key, g] of Object.entries(grids)) {
  const lmin = g.cols[0], lmax = g.cols[g.cols.length - 1];
  const hmin = g.rows[0], hmax = g.rows[g.rows.length - 1];
  const cnt = key.split('_').pop();
  constraints.push({
    requires: { any: [ ne('grid', key), { all: [gte('largeur', lmin), lte('largeur', lmax), gte('hauteur', hmin), lte('hauteur', hmax)] } ] },
    message: `${NVLABEL[cnt] || cnt} : largeur ${lmin}–${lmax} mm, hauteur ${hmin}–${hmax} mm.`,
  });
}
// Flèche de cintrage limitée à 800 mm (arc surbaissé / plein cintre)
constraints.push({
  requires: { any: [ { not: inSet('cintrage', ['arc', 'plein']) }, { not: { op: 'gt', left: V('cintrage_f'), right: 800 } } ] },
  message: 'Flèche du cintre limitée à 800 mm (arc surbaissé / plein cintre).',
});

// ---- Libellés de grilles (onglets Excel lisibles) ----
const tableLabels = {};
for (const k of Object.keys(grids)) tableLabels[k] = k.replace(/^vb_/, '').replace(/_(\d)$/, ' · $1V');

// Tables de surcharge cadre 4 côtés indexées avec le suffixe __d4 (cf. dérivée grid4)
const d1 = {};
for (const [k, t] of Object.entries(surch)) d1[`${k}__d4`] = t;

const def = {
  slug: 'volet-battant-panneau',
  name: 'Volet battant Ecotek / Novatek',
  famille: 'volets-battants',
  nodeField: 'modele',
  fields, derived, steps, priceRules, tables: { d1, d2: grids }, tableLabels, constraints,
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'volet-battant-panneau.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
console.log(`Écrit ${path.relative(process.cwd(), out)} — ${fields.length} champs, ${steps.length} étapes, ${constraints.length} contraintes, ${Object.keys(grids).length} grilles (prix instantané).`);
