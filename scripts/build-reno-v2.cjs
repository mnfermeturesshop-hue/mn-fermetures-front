/* =====================================================================
   Configurateur VOLET ROULANT RÉNOVATION (famille Reno 1.2) — moteur v2.
   Sous-famille MINIBOX (1.2.1). Renobox / Reno gros coffre via `sous_famille`.

   ARBRE DE DÉCISION PDG (captures, dans l'ordre) monté ci-dessous :
     Dimensions › Enroulement › Coffre (taille) › Coffre (pan) › Lame finale ›
     Coloris (coffre/coulisses/tablier) › Coulisse (type + perçage) ›
     Manœuvre (manuelle / motorisée : filaire · radio · solaire).

   ⚠️ PRIX : la BASE (grille de coût de motorisation Largeur × Hauteur, par
   commande × marque) N'EST PAS ENCORE FOURNIE → base PROVISOIRE (formule). Les
   options à PRIX FIXE de l'arbre sont câblées (inverseur +21, 5 canaux +80,
   Situo IO 1c +23 / 5c +135, Amy 4 IO +131, coulisse à aile +8,5 €/ml,
   moins-value manuelle −72/−13). À remplacer par les vraies grilles.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
// Grilles 2D (Largeur × Hauteur) parsées depuis le tarif Excel du PDG
// (scripts/parse-reno-minibox.cjs) : g_mn_filaire, g_mn_radio, g_somfy_filaire, g_somfy_radio.
const grids = require('../lib/configurateur/data/reno-minibox-grids.json');
// Grilles Renobox (parse-reno-renobox.cjs) : r42 / r56_205 / r56_250 × MN/Somfy × filaire/radio.
const renoGrids = require('../lib/configurateur/data/reno-renobox-grids.json');

// ---- helpers conditions / expr ----
const V = (name) => ({ var: name });
const eq = (name, val) => ({ op: 'eq', left: V(name), right: val });
const ne = (name, val) => ({ op: 'ne', left: V(name), right: val });
const inSet = (name, set) => ({ op: 'in', value: V(name), set });
const lt = (name, n) => ({ op: 'lt', left: V(name), right: n });
const lte = (name, n) => ({ op: 'lte', left: V(name), right: n });
const AND = (cs) => (cs.length === 1 ? cs[0] : { all: cs });
// Radio/Solaire — exige la MOTORISATION (sinon `commande` garde une valeur résiduelle
// en manœuvre manuelle et les champs émetteur/centralisation resteraient visibles).
const RADIO_SOL = { all: [{ op: 'eq', left: V('manoeuvre'), right: 'motorisee' }, inSet('commande', ['radio', 'solaire'])] };
// Gating par sous-famille : les champs COMMUNS (dimensions, pose, enroulement, coulisses,
// perçage, manœuvre + motorisation) restent SANS gate et sont partagés ; seuls les champs
// réellement spécifiques (coffre, lame, coloris) sont conditionnés à leur sous-famille.
const IS_MINIBOX = eq('sous_famille', 'minibox');
const IS_RENOBOX = eq('sous_famille', 'renobox');
// « N'enforce QUE pour la sous-famille X » (implication) pour les contraintes globales.
const onlyFor = (sf, cond) => ({ any: [ne('sous_famille', sf), cond] });

const fields = [];
const priceRules = [];

// ── Sous-famille (nœud remise/surcharge/éco + sous-familles Reno) ──
fields.push({
  id: 'sous_famille', label: 'Type de produit', type: 'choice', default: 'minibox',
  help: 'Gamme rénovation. Reno gros coffre sera ajouté prochainement.',
  options: [
    { value: 'minibox', label: 'Reno Minibox' },
    { value: 'renobox', label: 'Renobox' },
  ],
});

// ── Dimensions (cotes de FABRICATION, vue intérieure, jeux de pose déduits) ──
fields.push({ id: 'largeur', label: 'Largeur (dos de coulisse)', type: 'dimension', unit: 'mm', default: 1200 });
fields.push({ id: 'hauteur', label: 'Hauteur (coffre compris)', type: 'dimension', unit: 'mm', default: 1000 });
// Pose : en tableau (enroulement intérieur OU extérieur) ou en applique (extérieur only).
fields.push({
  id: 'pose', label: 'Pose', type: 'choice', role: 'spec', default: 'tableau',
  help: 'Pose en tableau ou en applique. Cotes de FABRICATION en mm — pensez à déduire vos jeux de pose (largeur dos de coulisses, hauteur coffre compris).',
  helpImage: '/reno-minibox-dimensions-enroulements.png',
  options: [{ value: 'tableau', label: 'En tableau' }, { value: 'applique', label: 'En applique' }],
});
fields.push({
  id: 'enroulement', label: 'Enroulement', type: 'choice', role: 'spec', default: 'interieur',
  options: [
    { value: 'interieur', label: 'Intérieur', availableWhen: eq('pose', 'tableau') }, // applique → extérieur uniquement
    { value: 'exterieur', label: 'Extérieur' },
  ],
});
fields.push({ id: 'lame_info', type: 'info', visibleWhen: IS_MINIBOX, help: 'Lame aluminium 37 — largeur max 2400 mm, surface max 5,5 m².' });

// ── (RENOBOX) Lame : Alu 42 (CD942) ou Alu 56. Détermine les sections de coffre
//    disponibles et les limites dimensionnelles. (PVC / Alu 55 non conservés.)
fields.push({
  id: 'lame_reno', label: 'Lame', type: 'choice', role: 'spec', default: 'alu42',
  visibleWhen: IS_RENOBOX,
  help: 'Choix de la lame selon les dimensions et l’exposition au vent.',
  options: [
    { value: 'alu42', label: 'Alu 42 (CD942) — L max 3000 mm · surf. max 8 m²' },
    { value: 'alu56', label: 'Alu 56 — L max 4000 mm · surf. max 10 m²' },
  ],
});

// ── Coffre : section AUTO par la hauteur (137/150/165 — 180/205/250 indisponibles
//    en Minibox alu), + forme (pan) qui pilote la lame finale et les coloris ──
fields.push({
  id: 'coffre_pan', label: 'Forme de coffre', type: 'choice', default: 'pan_coupe',
  visibleWhen: IS_MINIBOX,
  help: 'Pan coupé → lame finale affleurante · Pan rond → lame finale standard.',
  helpImage: '/reno-minibox-coffre.png',
  options: [{ value: 'pan_coupe', label: 'Pan coupé (PC)' }, { value: 'pan_rond', label: 'Pan rond (PR)' }],
});
// Lame finale : pan coupé → affleurante (défaut) ou classique ; pan rond → classique (forcé).
fields.push({
  id: 'lame_finale', label: 'Lame finale', type: 'choice', default: 'affleurante',
  visibleWhen: IS_MINIBOX,
  options: [
    { value: 'affleurante', label: 'Lame finale affleurante', availableWhen: eq('coffre_pan', 'pan_coupe') },
    { value: 'classique', label: 'Lame finale classique' },
  ],
});

// ── (RENOBOX) Coffre : section (150/165/180/205/250), la plus petite compatible avec
//    la lame par défaut. Contrainte guide : Alu 42 (CD942) → 150-205 · Alu 56 → 205/250.
fields.push({
  id: 'coffre_reno_info', type: 'info', visibleWhen: IS_RENOBOX,
  help: 'Lame 42 : section de coffre déterminée automatiquement par la hauteur (150 ≤ 1350 · 165 ≤ 1750 · 180 ≤ 2250 · 205 au-delà). Lame 56 : coffre 205 ou 250. Toutes les sections ne sont pas disponibles en pan rond — nous vous renseignerons.',
});
// Lame 42 → coffre AUTO par la hauteur (une seule grille). Lame 56 → choix 205 / 250
// (grilles distinctes). Le prix de base dépend du couple lame + coffre + moteur + commande.
fields.push({
  id: 'coffre_reno', label: 'Section de coffre', type: 'choice', role: 'spec', default: 'auto',
  visibleWhen: AND([IS_RENOBOX, eq('lame_reno', 'alu56')]),
  options: [
    { value: 'auto', label: 'Automatique (par hauteur)', availableWhen: eq('lame_reno', 'alu42') },
    { value: '205', label: 'Coffre 205', availableWhen: eq('lame_reno', 'alu56') },
    { value: '250', label: 'Coffre 250', availableWhen: eq('lame_reno', 'alu56') },
  ],
});
// Forme de coffre Renobox : pan coupé (PC) / pan rond (PR).
fields.push({
  id: 'coffre_pan_reno', label: 'Forme de coffre', type: 'choice', role: 'spec', default: 'pan_coupe',
  visibleWhen: IS_RENOBOX,
  options: [{ value: 'pan_coupe', label: 'Pan coupé (PC)' }, { value: 'pan_rond', label: 'Pan rond (PR)' }],
});
// Lame finale Renobox : classique par défaut ; affleurante (+8,5 €/ml largeur) UNIQUEMENT
// en pan coupé ET lame 42 ; pan rond → classique imposée.
fields.push({
  id: 'lame_finale_reno', label: 'Lame finale', type: 'choice', role: 'spec', default: 'classique',
  visibleWhen: IS_RENOBOX,
  options: [
    { value: 'classique', label: 'Lame finale classique' },
    { value: 'affleurante', label: 'Lame finale affleurante (+8,50 €/ml)',
      availableWhen: AND([eq('coffre_pan_reno', 'pan_coupe'), eq('lame_reno', 'alu42')]) },
  ],
});
priceRules.push({
  code: 'lame_finale_affleurante', label: 'Lame finale affleurante', kind: 'add',
  when: AND([IS_RENOBOX, eq('lame_finale_reno', 'affleurante')]),
  amount: { op: 'round', arg: { op: '*', args: [8.5, { op: '/', args: [V('largeur'), 1000] }] } },
});

// ── Coloris (coffre, coulisses & tablier) — monocouleur. Pan coupé : 5 coloris ;
//    Pan rond : Blanc 9010 & Gris 7016 seulement. Standards sans plus-value.
fields.push({
  id: 'coloris', label: 'Coloris (coffre, coulisses & tablier)', type: 'choice', default: 'blanc-9010',
  visibleWhen: IS_MINIBOX,
  options: [
    { value: 'blanc-9010', label: 'Blanc 9010', hex: '#f4f4f2' },
    { value: 'gris-7016', label: 'Gris 7016', hex: '#383e42' },
    { value: 'ivoire-1015', label: 'Ivoire 1015', hex: '#e6d2b5', availableWhen: eq('coffre_pan', 'pan_coupe') },
    { value: 'gris-7035', label: 'Gris 7035', hex: '#d7d7d7', availableWhen: eq('coffre_pan', 'pan_coupe') },
    { value: 'marron-8019', label: 'Marron 8019 (proche)', hex: '#3d3635', availableWhen: eq('coffre_pan', 'pan_coupe') },
  ],
});

// ── (RENOBOX) Coloris — Monocouleur (7 standards + Autres/RAL, sans plus-value) OU
//    Multicouleur (tablier / coffre séparés, plus-value sur les coloris « option »).
//    ⚠️ Coulisses & Lame finale : slides pas encore reçus (à ajouter ensuite).
// Palette RAL partagée (label + hex approx).
const RCOL = {
  'blanc-9010': ['Blanc 9010', '#f4f4f2'], 'ivoire-1015': ['Ivoire 1015', '#e6d2b5'],
  'gris-7035': ['Gris 7035', '#d7d7d7'], 'gris-7038': ['Gris 7038', '#b5b0a1'],
  'gris-7016': ['Gris 7016', '#383e42'], 'alu-as-9006': ['Alu AS 9006', '#a5a8a6'],
  'marron-8019': ['Marron 8019 (proche)', '#3d3635'], 'gris-7039': ['Gris 7039', '#6c6960'],
  'noir-9005': ['Noir 9005', '#0a0a0a'], 'noir-2100-sable': ['Noir 2100 sablé', '#1a1a1a'],
  'gris-2900-sable': ['Gris 2900 sablé', '#4a4a48'], 'rouge-3004': ['Rouge 3004', '#6b1f24'],
  'bleu-5011': ['Bleu 5011', '#1a2a35'], 'vert-6005': ['Vert 6005', '#114232'],
  'vert-6009': ['Vert 6009', '#26392f'], 'vert-6021': ['Vert 6021', '#89ac76'],
  'gris-7011': ['Gris 7011', '#3e4650'], 'gris-7012': ['Gris 7012', '#4e545a'],
  'gris-7021': ['Gris 7021', '#2f3234'], 'gris-7022': ['Gris 7022', '#4b4a44'],
  'marron-8014': ['Marron 8014', '#4a3526'], 'ral-9007': ['Ral 9007', '#8b8c8b'],
  'chene-dore': ['Chêne doré', '#8a5a2b'],
};
const rOpt = (keys, extra) => keys.map((k) => ({ value: k, label: RCOL[k][0], hex: RCOL[k][1], ...(extra || {}) }));

// Mode coloris.
fields.push({
  id: 'coloris_mode_reno', label: 'Coloris', type: 'choice', default: 'mono', visibleWhen: IS_RENOBOX,
  options: [{ value: 'mono', label: 'Monocouleur' }, { value: 'multi', label: 'Multicouleur' }],
});
// Monocouleur : 7 standards + Autres (RAL sur consultation) — sans plus-value.
const MONO_STD = ['blanc-9010', 'alu-as-9006', 'ivoire-1015', 'gris-7016', 'gris-7035', 'gris-7038', 'marron-8019'];
fields.push({
  id: 'coloris_mono_reno', label: 'Coloris (volet entier)', type: 'choice', default: 'blanc-9010',
  visibleWhen: AND([IS_RENOBOX, eq('coloris_mode_reno', 'mono')]),
  help: 'Coloris standard appliqué à tout le volet. « Autres » = RAL sur consultation.',
  options: [...rOpt(MONO_STD), { value: 'autres', label: 'Autre RAL (nous consulter)' }],
});

const MULTI_VIS = AND([IS_RENOBOX, eq('coloris_mode_reno', 'multi')]);
// Coloris COFFRE (identique pan coupé / pan rond). Options = plus-value selon la section.
const COFFRE_STD = ['blanc-9010', 'ivoire-1015', 'gris-7035', 'gris-7038', 'gris-7016', 'alu-as-9006', 'marron-8019'];
const COFFRE_OPT = ['rouge-3004', 'bleu-5011', 'vert-6005', 'vert-6009', 'vert-6021', 'gris-7011', 'gris-7012', 'gris-7021', 'gris-7022', 'gris-7039', 'marron-8014', 'noir-9005', 'ral-9007', 'noir-2100-sable', 'gris-2900-sable', 'chene-dore'];
fields.push({
  id: 'coloris_coffre_reno', label: 'Coloris coffre', type: 'choice', default: 'blanc-9010', visibleWhen: MULTI_VIS,
  help: 'Coloris option : plus-value au ml de largeur (lame 42 : 44 €/ml coffre 150-165, 54 €/ml 180-205 · lame 56 : 66 €/ml). Un forfait laquage de 77 € s’ajoute par commande (offert dès 2000 € de commande).',
  options: [...rOpt(COFFRE_STD), ...rOpt(COFFRE_OPT)],
});
// Plus-value coloris coffre au ml de largeur (le forfait laquage 77 € est géré au niveau
// de la COMMANDE — offert ≥ 2000 € — car conditionné au total, pas à la ligne).
priceRules.push({
  code: 'coloris_coffre_opt', label: 'Coloris coffre (option)', kind: 'add',
  when: AND([MULTI_VIS, inSet('coloris_coffre_reno', COFFRE_OPT)]),
  amount: { op: 'round', arg: { op: '*', args: [V('coffre_color_rate'), { op: '/', args: [V('largeur'), 1000] }] } },
});
// Coloris TABLIER (dépend de la lame). Options = +14 €/m².
const TABLIER_STD = ['blanc-9010', 'ivoire-1015', 'gris-7035', 'gris-7038', 'gris-7016', 'alu-as-9006', 'marron-8019', 'gris-7039', 'noir-9005', 'noir-2100-sable', 'gris-2900-sable'];
const TABLIER_OPT_BOTH = ['rouge-3004', 'bleu-5011', 'vert-6005', 'vert-6021', 'marron-8014', 'ral-9007', 'chene-dore'];
const TABLIER_OPT_56 = ['gris-7011', 'gris-7012'];
const TABLIER_OPT_42 = ['vert-6009', 'gris-7021', 'gris-7022'];
const TABLIER_OPT_ALL = [...TABLIER_OPT_BOTH, ...TABLIER_OPT_56, ...TABLIER_OPT_42];
fields.push({
  id: 'coloris_tablier_reno', label: 'Coloris tablier', type: 'choice', default: 'blanc-9010', visibleWhen: MULTI_VIS,
  help: 'Coloris option : plus-value 14 €/m².',
  options: [
    ...rOpt(TABLIER_STD),
    ...rOpt(TABLIER_OPT_BOTH),
    ...rOpt(TABLIER_OPT_56, { availableWhen: eq('lame_reno', 'alu56') }),
    ...rOpt(TABLIER_OPT_42, { availableWhen: eq('lame_reno', 'alu42') }),
  ],
});
priceRules.push({
  code: 'coloris_tablier_opt', label: 'Coloris tablier (option)', kind: 'add',
  when: AND([MULTI_VIS, inSet('coloris_tablier_reno', TABLIER_OPT_ALL)]),
  amount: { op: 'round', arg: { op: '*', args: [14, V('surface_m2')] } },
});
// Coloris COULISSE (indépendant de la lame) : 7 standards + 16 options (Chêne doré inclus).
// Plus-value option = 40 €/ml de hauteur × 2 coulisses.
const COULISSE_STD = COFFRE_STD;
const COULISSE_OPT = COFFRE_OPT;
fields.push({
  id: 'coloris_coulisse_reno', label: 'Coloris coulisses', type: 'choice', default: 'blanc-9010', visibleWhen: MULTI_VIS,
  help: 'Coloris option : plus-value 40 €/ml de hauteur (× 2 coulisses).',
  options: [...rOpt(COULISSE_STD), ...rOpt(COULISSE_OPT)],
});
priceRules.push({
  code: 'coloris_coulisse_opt', label: 'Coloris coulisses (option)', kind: 'add',
  when: AND([MULTI_VIS, inSet('coloris_coulisse_reno', COULISSE_OPT)]),
  amount: { op: 'round', arg: { op: '*', args: [{ op: '/', args: [V('hauteur'), 1000] }, 40, 2] } },
});
// Coloris LAME FINALE (indépendant de la lame) : 7 standards + 16 options (avec Chêne doré).
// Plus-value option = 18 €/ml de largeur.
fields.push({
  id: 'coloris_lamefinale_reno', label: 'Coloris lame finale', type: 'choice', default: 'blanc-9010', visibleWhen: MULTI_VIS,
  help: 'Coloris option : plus-value 18 €/ml de largeur.',
  options: [...rOpt(COFFRE_STD), ...rOpt(COFFRE_OPT)],
});
priceRules.push({
  code: 'coloris_lamefinale_opt', label: 'Coloris lame finale (option)', kind: 'add',
  when: AND([MULTI_VIS, inSet('coloris_lamefinale_reno', COFFRE_OPT)]),
  amount: { op: 'round', arg: { op: '*', args: [18, { op: '/', args: [V('largeur'), 1000] }] } },
});

// ── Coulisse : 53/22 par défaut ; à aile +8,5 €/ml. Perçage T / F / sans. ──
fields.push({
  id: 'coulisse_type', label: 'Coulisses', type: 'choice', default: 'c53x22',
  visibleWhen: IS_MINIBOX,
  help: 'Coulisse à aile : 53×22 uniquement (aile de 60 mm).',
  helpImage: '/reno-minibox-coulisse-aile.png',
  options: [
    { value: 'c53x22', label: 'Coulisse 53/22 (par défaut)' },
    { value: 'a_aile', label: 'Coulisse à aile (+8,50 €/ml)' },
  ],
});
// +value coulisse à aile : 8,5 €/ml de hauteur × 2 coulisses.
priceRules.push({
  code: 'coulisse_aile', label: 'Coulisse à aile', kind: 'add',
  when: AND([IS_MINIBOX, eq('coulisse_type', 'a_aile')]),
  amount: { op: 'round', arg: { op: '*', args: [{ op: '/', args: [V('hauteur'), 1000] }, 8.5, 2] } },
});
// ── (RENOBOX) Coulisse selon la lame : 42 → 53/22 (+ à aile) · 56 → 66/27 (pas de à aile).
fields.push({
  id: 'coulisse_reno', label: 'Coulisses', type: 'choice', role: 'spec', default: 'c53x22',
  visibleWhen: IS_RENOBOX,
  help: 'Coulisse par défaut : 53/22 (lame 42) ou 66/27 (lame 56). Coulisse à aile : 53/22 uniquement.',
  helpImage: '/reno-minibox-coulisse-aile.png',
  options: [
    { value: 'c53x22', label: 'Coulisse 53/22 (par défaut)', availableWhen: eq('lame_reno', 'alu42') },
    { value: 'c66x27', label: 'Coulisse 66/27 (par défaut)', availableWhen: eq('lame_reno', 'alu56') },
    { value: 'a_aile', label: 'Coulisse à aile (+8,50 €/ml)', availableWhen: eq('lame_reno', 'alu42') },
  ],
});
priceRules.push({
  code: 'coulisse_aile_reno', label: 'Coulisse à aile', kind: 'add',
  when: AND([IS_RENOBOX, eq('coulisse_reno', 'a_aile')]),
  amount: { op: 'round', arg: { op: '*', args: [{ op: '/', args: [V('hauteur'), 1000] }, 8.5, 2] } },
});
fields.push({
  id: 'percage', label: 'Perçage des coulisses', type: 'choice', role: 'spec', default: 'tableau',
  help: 'Tableau : perçage Ø1 / Ø6. Façade et non percé : bouchons fournis.',
  helpImage: '/reno-minibox-percage-coulisses.png',
  options: [
    { value: 'tableau', label: 'Perçage tableau' },
    { value: 'facade', label: 'Perçage façade' },
    { value: 'sans', label: 'Sans perçage' },
  ],
});
// Option arrêts bas de coulisse (+6 €/paire) — UNIQUEMENT en pose applique et
// coulisse 53×22 (les deux coulisses Minibox sont des 53×22). Bouche les coulisses
// en applique sans appui de fenêtre.
fields.push({
  id: 'arrets_bas', label: 'Arrêts bas de coulisse (+6 €/paire)', type: 'boolean',
  visibleWhen: AND([eq('pose', 'applique'), { any: [
    AND([IS_MINIBOX, inSet('coulisse_type', ['c53x22', 'a_aile'])]),
    AND([IS_RENOBOX, inSet('coulisse_reno', ['c53x22', 'a_aile'])]),
  ] }]),
  help: 'Bouche les coulisses en pose applique sans appui de fenêtre (coulisse 53×22).',
  helpImage: '/reno-minibox-arrets-bas.png',
});
priceRules.push({ code: 'opt_arrets_bas', label: 'Arrêts bas de coulisse', kind: 'add',
  when: AND([eq('arrets_bas', true), eq('pose', 'applique')]), amount: 6 });

// ── Manœuvre : manuelle / motorisée ──
fields.push({
  id: 'manoeuvre', label: 'Type de manœuvre', type: 'choice', default: 'motorisee',
  options: [
    { value: 'manuelle', label: 'Manuelle' },
    { value: 'tirage_direct', label: 'Tirage direct', availableWhen: IS_RENOBOX },
    { value: 'motorisee', label: 'Motorisation' },
  ],
});
// Manuelle = grille de coût de motorisation FILAIRE − moins-value.
// ⚠️ Valeurs de la GRILLE TARIF MN (prioritaire) : L<567 → −77 € ; L≥567 → −17 €.
//    (L'arbre de décision indiquait <451 → −72 / −13 — à confirmer.)
priceRules.push({
  code: 'manuelle_mv', label: 'Manœuvre manuelle (moins-value)', kind: 'add',
  when: AND([IS_MINIBOX, eq('manoeuvre', 'manuelle')]),
  amount: { op: 'if', cond: lt('largeur', 567), then: -77, else: -17 },
});
// (RENOBOX) Tringle oscillante (manœuvre manuelle) = moins-value sur grille filaire :
// largeur < 573 → −77 € ; ≥ 573 → −17 € (barème tarif, prioritaire sur l'arbre 451/72/13).
priceRules.push({
  code: 'manuelle_mv_reno', label: 'Manœuvre manuelle (moins-value)', kind: 'add',
  when: AND([IS_RENOBOX, eq('manoeuvre', 'manuelle')]),
  amount: { op: 'if', cond: lt('largeur', 573), then: -77, else: -17 },
});
// (RENOBOX) Tirage direct = plus-value +135 € sur grille filaire (largeur 630-2000 mm).
priceRules.push({
  code: 'tirage_direct_pv_reno', label: 'Tirage direct (plus-value)', kind: 'add',
  when: AND([IS_RENOBOX, eq('manoeuvre', 'tirage_direct')]),
  amount: 135,
});
// Genouillère (manœuvre manuelle) : 60° incluse / 60° aimantée +41 / 90° +18 / 90° aimantée +59.
fields.push({
  id: 'genouillere_manuelle', label: 'Genouillère', type: 'choice', default: 'g60',
  visibleWhen: AND([IS_MINIBOX, eq('manoeuvre', 'manuelle')]),
  options: [
    { value: 'g60', label: 'Genouillère 60° (incluse)' },
    { value: 'g60a', label: 'Genouillère 60° aimantée (+41 €)' },
    { value: 'g90', label: 'Genouillère 90° (+18 €)' },
    { value: 'g90a', label: 'Genouillère 90° aimantée (+59 €)' },
  ],
});
for (const [val, price] of Object.entries({ g60a: 41, g90: 18, g90a: 59 })) {
  priceRules.push({ code: `opt_genou_${val}`, label: `Genouillère ${val}`, kind: 'add',
    when: AND([IS_MINIBOX, eq('manoeuvre', 'manuelle'), eq('genouillere_manuelle', val)]), amount: price });
}

// Motorisation : type (filaire/radio/solaire) + marque (MN/Somfy).
fields.push({
  id: 'commande', label: 'Motorisation', type: 'choice', default: 'filaire',
  visibleWhen: eq('manoeuvre', 'motorisee'),
  options: [
    { value: 'filaire', label: 'Filaire' },
    { value: 'radio', label: 'Radio' },
    { value: 'solaire', label: 'Solaire' },
  ],
});
// ⚠️ Solaire : l'arbre montre MN + Somfy ; à confirmer (pour le Tradi, le PDG a
//    indiqué que MN ne fait pas de moteur solaire). Ici MN+Somfy laissés dispo.
fields.push({
  id: 'moteur', label: 'Marque du moteur', type: 'choice', default: 'mn',
  visibleWhen: eq('manoeuvre', 'motorisee'),
  options: [{ value: 'mn', label: 'Moteur MN' }, { value: 'somfy', label: 'Moteur Somfy' }],
});
// Côté de manœuvre (fabrication) — gauche / droite.
fields.push({
  id: 'position_moteur', label: 'Position manœuvre', type: 'choice', role: 'spec', default: 'droite',
  visibleWhen: AND([IS_MINIBOX, eq('manoeuvre', 'motorisee')]),
  options: [{ value: 'gauche', label: 'Gauche (G)' }, { value: 'droite', label: 'Droite (D)' }],
});

// ── Motorisation FILAIRE : option inverseur +21 € (4 variantes même prix).
//    Pas de commande de secours en filaire (différence avec le Tradi).
const filaireVis = AND([eq('manoeuvre', 'motorisee'), eq('commande', 'filaire')]);
fields.push({ id: 'inverseur', label: 'Inverseur (+21 €)', type: 'boolean', visibleWhen: filaireVis });
priceRules.push({ code: 'opt_inverseur', label: 'Inverseur', kind: 'add', when: AND([eq('inverseur', true), filaireVis]), amount: 21 });
fields.push({
  id: 'inverseur_pose', label: 'Inverseur — pose', type: 'choice', role: 'spec', default: 'encastre',
  visibleWhen: AND([eq('inverseur', true), filaireVis]),
  options: [{ value: 'encastre', label: 'Encastré' }, { value: 'applique', label: 'En applique' }],
});
fields.push({
  id: 'inverseur_maintien', label: 'Inverseur — maintien', type: 'choice', role: 'spec', default: 'maintenu',
  visibleWhen: AND([eq('inverseur', true), filaireVis]),
  options: [{ value: 'maintenu', label: 'Maintenu' }, { value: 'fixe', label: 'Fixe' }],
});

// ── Motorisation RADIO / SOLAIRE : émetteur (portatif/mural) + marque incluse.
//    MN → portatif 1 canal inclus (option 5 canaux +80). Somfy → Amy 1 Sun Protect
//    inclus + options de CENTRALISATION (Somfy uniquement).
fields.push({
  id: 'emetteur_type', label: 'Émetteur', type: 'choice', default: 'mural',
  visibleWhen: RADIO_SOL,
  help: 'Mural par défaut (MN mural / Somfy Amy) ou portatif (MN portatif / Somfy Situo) — tous inclus.',
  helpImage: '/reno-minibox-emetteur.png',
  options: [{ value: 'mural', label: 'Émetteur mural' }, { value: 'portatif', label: 'Émetteur portatif' }],
});
fields.push({
  id: 'radio_info', type: 'info', visibleWhen: RADIO_SOL,
  help: 'Émetteur de base inclus : MN → portatif 1 canal · Somfy → Amy 1 Sun Protect (l’une des 4 possibilités, toutes incluses).',
});
// MN : émetteur 5 canaux (+80 €).
const mnRadioVis = AND([RADIO_SOL, eq('moteur', 'mn')]);
fields.push({ id: 'emetteur_5c', label: 'Émetteur portatif 5 canaux (+80 €)', type: 'boolean', visibleWhen: mnRadioVis });
priceRules.push({ code: 'opt_emetteur_5c', label: 'Émetteur portatif 5 canaux', kind: 'add', when: AND([eq('emetteur_5c', true), mnRadioVis]), amount: 80 });
// Somfy : centralisation.
const somfyRadioVis = AND([RADIO_SOL, eq('moteur', 'somfy')]);
fields.push({
  id: 'centralisation_info', type: 'info', visibleWhen: somfyRadioVis,
  help: 'Options de centralisation (Somfy uniquement) : la Situo IO 1 canal remplace l’Amy 1 (+23 €) ; vous pouvez ajouter la Situo IO 5 Pure 2 ou l’Amy 4 IO.',
});
fields.push({ id: 'situo_io_1c', label: 'Situo IO 1 canal — remplace l’Amy 1 (+23 €)', type: 'boolean', visibleWhen: somfyRadioVis });
priceRules.push({ code: 'opt_situo_io_1c', label: 'Situo IO 1 canal (remplace l’Amy 1)', kind: 'add', when: AND([eq('situo_io_1c', true), somfyRadioVis]), amount: 23 });
fields.push({ id: 'situo_io_5c', label: 'Situo IO 5 Pure 2, 5 canaux (+135 €)', type: 'boolean', visibleWhen: somfyRadioVis });
priceRules.push({ code: 'opt_situo_io_5c', label: 'Situo IO 5 Pure 2 (5 canaux)', kind: 'add', when: AND([eq('situo_io_5c', true), somfyRadioVis]), amount: 135 });
fields.push({ id: 'amy_4c_io', label: 'Amy 4 IO (+131 €)', type: 'boolean', visibleWhen: somfyRadioVis });
priceRules.push({ code: 'opt_amy_4c_io', label: 'Émetteur Amy 4 IO', kind: 'add', when: AND([eq('amy_4c_io', true), somfyRadioVis]), amount: 131 });

// ── Motorisation SOLAIRE (Somfy RS100 SOLAR IO) : kit solaire +232 € (moteur +
//    batterie + panneau + émetteur) toujours inclus ; alim de dépannage +83 € en option.
const SOLAIRE = AND([eq('manoeuvre', 'motorisee'), eq('commande', 'solaire')]);
priceRules.push({ code: 'kit_solaire', label: 'Kit solaire (moteur + batterie + panneau + émetteur)', kind: 'add',
  when: SOLAIRE, amount: 232 });
fields.push({ id: 'alim_depannage', label: 'Alimentation de dépannage (+83 €)', type: 'boolean', visibleWhen: SOLAIRE });
priceRules.push({ code: 'opt_alim_depannage', label: 'Alimentation de dépannage', kind: 'add',
  when: AND([eq('alim_depannage', true), SOLAIRE]), amount: 83 });

// Côté tringle (fabrication) — manœuvre manuelle.
fields.push({
  id: 'tringle_cote', label: 'Côté tringle', type: 'choice', role: 'spec', default: 'droite',
  visibleWhen: AND([IS_MINIBOX, eq('manoeuvre', 'manuelle')]),
  options: [{ value: 'gauche', label: 'Gauche' }, { value: 'droite', label: 'Droite' }],
});

// Numéros de SORTIE (fabrication) — position sur le coffre, d'après le schéma de pose.
//  - Fil (manœuvre motorisée) : 1 à 11.
//  - Tringle oscillante (manœuvre manuelle TO) : 1 à 5.
// Schémas de position à déposer dans public/ (2 fichiers séparés).
fields.push({
  id: 'sortie_fil', label: 'Numéro de sortie du fil', type: 'choice', role: 'spec', default: '1',
  // Le moteur solaire est autonome (batterie/panneau) : pas de fil → pas de sortie de fil.
  visibleWhen: AND([IS_MINIBOX, eq('manoeuvre', 'motorisee'), inSet('commande', ['filaire', 'radio'])]),
  help: 'Position de sortie du fil sur le coffre (voir schéma) — 1 à 11.',
  helpImage: '/reno-minibox-sortie-fil.png',
  options: Array.from({ length: 11 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
});
fields.push({
  id: 'sortie_tringle', label: 'Numéro de sortie de la tringle', type: 'choice', role: 'spec', default: '1',
  visibleWhen: AND([IS_MINIBOX, eq('manoeuvre', 'manuelle')]),
  help: 'Position de sortie de la tringle oscillante (voir schéma) — 1 à 5.',
  helpImage: '/reno-minibox-sortie-tringle.png',
  options: Array.from({ length: 5 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
});

// ════════ (RENOBOX) Manœuvre ════════
// Côté (manœuvre / fil) et Sortie (sous-coffre / façade) — pour toutes les manœuvres.
fields.push({
  id: 'cote_reno', label: 'Côté de manœuvre', type: 'choice', role: 'spec', default: 'droite',
  visibleWhen: IS_RENOBOX,
  options: [{ value: 'gauche', label: 'Gauche (G)' }, { value: 'droite', label: 'Droite (D)' }],
});
fields.push({
  id: 'sortie_reno', label: 'Sortie', type: 'choice', role: 'spec', default: 'sous_coffre',
  visibleWhen: IS_RENOBOX,
  options: [{ value: 'sous_coffre', label: 'Sous-coffre' }, { value: 'facade', label: 'Façade' }],
});
// Tirage direct : position de la serrure (lame finale / intermédiaire + hauteur).
// Prix = grille filaire + 135 € (règle tirage_direct_pv_reno) ; largeur 630-2000 mm.
const TIRAGE_VIS = AND([IS_RENOBOX, eq('manoeuvre', 'tirage_direct')]);
fields.push({
  id: 'serrure_position', label: 'Position de la serrure', type: 'choice', role: 'spec', default: 'lame_finale',
  visibleWhen: TIRAGE_VIS,
  options: [{ value: 'lame_finale', label: 'Sur lame finale' }, { value: 'lame_intermediaire', label: 'Sur lame intermédiaire' }],
});
fields.push({
  id: 'serrure_hauteur', label: 'Hauteur position lame intermédiaire (mm)', type: 'dimension', unit: 'mm', default: 1000,
  visibleWhen: AND([TIRAGE_VIS, eq('serrure_position', 'lame_intermediaire')]),
  help: 'Hauteur de la serrure sur lame intermédiaire (tirage direct — L mini 630 mm).',
});
// Motorisation filaire : commande de secours intégrée (+136 €) — Renobox uniquement.
const secoursVis = AND([IS_RENOBOX, filaireVis]);
fields.push({ id: 'commande_secours', label: 'Commande de secours intégrée (+136 €)', type: 'boolean', visibleWhen: secoursVis });
priceRules.push({ code: 'opt_commande_secours', label: 'Commande de secours intégrée', kind: 'add',
  when: AND([secoursVis, eq('commande_secours', true)]), amount: 136 });
// Genouillère (6 variantes) : manœuvre manuelle OU commande de secours filaire.
const GEN_VIS_RENO = AND([IS_RENOBOX, { any: [eq('manoeuvre', 'manuelle'), AND([filaireVis, eq('commande_secours', true)])] }]);
fields.push({
  id: 'genouillere_reno', label: 'Genouillère', type: 'choice', default: 'app60',
  visibleWhen: GEN_VIS_RENO,
  options: [
    { value: 'app60', label: 'En applique 60° non aimantée (incluse)' },
    { value: 'app90', label: 'En applique 90° non aimantée (+18 €)' },
    { value: 'sc60', label: 'Sous coffre 60° (incluse)' },
    { value: 'app60a', label: 'En applique 60° aimantée (+41 €)' },
    { value: 'app90a', label: 'En applique 90° aimantée (+59 €)' },
    { value: 'sc60a', label: 'Sous coffre 60° aimantée (+41 €)' },
  ],
});
for (const [val, price] of Object.entries({ app90: 18, app60a: 41, app90a: 59, sc60a: 41 })) {
  priceRules.push({ code: `opt_genou_reno_${val}`, label: `Genouillère ${val}`, kind: 'add',
    when: AND([GEN_VIS_RENO, eq('genouillere_reno', val)]), amount: price });
}

// Section de coffre AUTO selon la hauteur (grille MN) : 137 (≤1550) / 150 (≤2250)
// / 165 (≤2550). Affichée sous le champ « Taille de coffre » (override possible).
fields.push({
  id: 'coffre_auto_info', type: 'info', visibleWhen: IS_MINIBOX,
  help: 'Section mini automatique selon la hauteur : {{coffre_auto}}. Pour uniformiser la section sur plusieurs repères, précisez-le dans la note (dernière étape).',
});

// ---- Dérivées ----
const derived = [
  { id: 'surface_m2', expr: { op: '*', args: [{ op: '/', args: [V('largeur'), 1000] }, { op: '/', args: [V('hauteur'), 1000] }] } },
  { id: 'coffre_auto', expr: { op: 'if', cond: lte('hauteur', 1550), then: '137',
      else: { op: 'if', cond: lte('hauteur', 2250), then: '150', else: '165' } } },
  // (RENOBOX) Section de coffre effective : lame 42 → AUTO par la hauteur
  // (150 ≤1350 · 165 ≤1750 · 180 ≤2250 · 205 sinon) ; lame 56 → 205 / 250 choisi.
  { id: 'coffre_reno_eff', expr: { op: 'if', cond: eq('lame_reno', 'alu42'),
      then: { op: 'if', cond: lte('hauteur', 1350), then: 150,
        else: { op: 'if', cond: lte('hauteur', 1750), then: 165,
          else: { op: 'if', cond: lte('hauteur', 2250), then: 180, else: 205 } } },
      else: V('coffre_reno') } },
  { id: 'coffre_color_rate', expr: { op: 'if', cond: eq('lame_reno', 'alu56'), then: 66,
      else: { op: 'if', cond: lte('coffre_reno_eff', 165), then: 44, else: 54 } } },
  // (RENOBOX) Sélection de la grille de base = groupe (lame/coffre) × moteur × commande.
  //  - manœuvre manuelle / tirage direct → grille FILAIRE (± moins/plus-value) ;
  //  - solaire → grille SOMFY RADIO (RS100 io) + kit solaire ;
  //  - sinon grille du moteur × commande choisis.
  { id: 'base_cmd_reno', expr: { op: 'if', cond: inSet('manoeuvre', ['manuelle', 'tirage_direct']), then: 'filaire',
      else: { op: 'if', cond: eq('commande', 'solaire'), then: 'radio', else: V('commande') } } },
  { id: 'base_moteur_reno', expr: { op: 'if', cond: eq('commande', 'solaire'), then: 'somfy', else: V('moteur') } },
  { id: 'grid_group_reno', expr: { op: 'if', cond: eq('lame_reno', 'alu42'), then: 'r42',
      else: { op: 'if', cond: lte('coffre_reno_eff', 205), then: 'r56_205', else: 'r56_250' } } },
  { id: 'grid_reno', expr: { op: 'concat', args: [V('grid_group_reno'), '_', V('base_moteur_reno'), '_', V('base_cmd_reno')] } },
  // Largeur mini réelle selon la grille : filaire 422 (MN) / 427 (Somfy) ; radio 622 (lame 42) / 628 (lame 56).
  { id: 'largeur_mini_reno', expr: { op: 'if', cond: eq('base_cmd_reno', 'filaire'),
      then: { op: 'if', cond: eq('base_moteur_reno', 'somfy'), then: 427, else: 422 },
      else: { op: 'if', cond: eq('lame_reno', 'alu56'), then: 628, else: 622 } } },
  // Grille de prix retenue = coût de motorisation par marque × commande.
  //  - manuelle → grille MN filaire (− moins-value) ;
  //  - motorisée filaire/radio → g_<moteur>_<commande> ;
  //  - motorisée solaire → Somfy RS100 SOLAR IO = grille Radio RS100 io (g_somfy_radio)
  //    + kit solaire +232 € (quel que soit le choix marque : l'offre solaire est Somfy).
  { id: 'grid', expr: { op: 'if', cond: eq('manoeuvre', 'manuelle'), then: 'g_mn_filaire',
      else: { op: 'if', cond: eq('commande', 'solaire'), then: 'g_somfy_radio',
        else: { op: 'concat', args: ['g_', V('moteur'), '_', V('commande')] } } } },
  // Largeur MINI réelle (limites dimensionnelles) selon la manœuvre / le moteur :
  //  manuelle tringle 400 · MN filaire 536 / radio 622 · Somfy filaire 490 / radio 531
  //  · solaire (radio io Somfy) 490.
  { id: 'largeur_mini', expr:
    { op: 'if', cond: eq('manoeuvre', 'manuelle'), then: 400,
      else: { op: 'if', cond: eq('commande', 'solaire'), then: 490,
        else: { op: 'if', cond: eq('commande', 'filaire'),
          then: { op: 'if', cond: eq('moteur', 'mn'), then: 536, else: 490 },
          else: { op: 'if', cond: eq('moteur', 'mn'), then: 622, else: 531 } } } } },
];

// ---- Prix de BASE = grille de coût de motorisation (Largeur × Hauteur) ----
//  - Minibox : lookup2d sur la grille MN/Somfy (reno-minibox-grids.json).
//  - Renobox : lookup2d sur la grille sélectionnée (reno-renobox-grids.json) =
//    groupe (lame/coffre) × moteur × commande. Manœuvre manuelle = filaire − moins-value ;
//    tirage direct = filaire + 135 ; solaire = Somfy radio + kit (règles dédiées).
priceRules.unshift({
  code: 'base', label: 'Prix de base', kind: 'base',
  amount: {
    op: 'if', cond: IS_RENOBOX,
    then: { op: 'lookup2d', table: V('grid_reno'), row: V('hauteur'), col: V('largeur') },
    else: { op: 'lookup2d', table: V('grid'), row: V('hauteur'), col: V('largeur') },
  },
});

// ---- Contraintes ----
const constraints = [
  // Minibox (lame alu 37) — n'enforce que pour la sous-famille minibox.
  { message: 'Largeur inférieure au minimum pour cette manœuvre / ce moteur', requires: onlyFor('minibox', { op: 'gte', left: V('largeur'), right: V('largeur_mini') }) },
  { message: 'Largeur maximale 2400 mm (lame Alu 37)', requires: onlyFor('minibox', lte('largeur', 2400)) },
  { message: 'Hauteur maximale 2550 mm (coffre 165)', requires: onlyFor('minibox', lte('hauteur', 2550)) },
  { message: 'Surface maximale 5,5 m² (lame Alu 37)', requires: onlyFor('minibox', lte('surface_m2', 5.5)) },
  // Renobox — limites par lame (Alu 42 : L≤3000 / 8 m² · Alu 56 : L≤4000 / 10 m²).
  // ⚠️ Largeur MINI non contrainte tant que la grille tarifaire Renobox n'est pas fournie.
  { message: 'Largeur maximale 3000 mm (lame Alu 42)', requires: { any: [ne('sous_famille', 'renobox'), ne('lame_reno', 'alu42'), lte('largeur', 3000)] } },
  { message: 'Largeur maximale 4000 mm (lame Alu 56)', requires: { any: [ne('sous_famille', 'renobox'), ne('lame_reno', 'alu56'), lte('largeur', 4000)] } },
  { message: 'Surface maximale 8 m² (lame Alu 42)', requires: { any: [ne('sous_famille', 'renobox'), ne('lame_reno', 'alu42'), lte('surface_m2', 8)] } },
  { message: 'Surface maximale 10 m² (lame Alu 56)', requires: { any: [ne('sous_famille', 'renobox'), ne('lame_reno', 'alu56'), lte('surface_m2', 10)] } },
  // Renobox : largeur ≥ largeur mini de la grille (filaire 422/427 · radio 622/628).
  { message: 'Largeur inférieure au minimum pour ce moteur / cette commande', requires: onlyFor('renobox', { op: 'gte', left: V('largeur'), right: V('largeur_mini_reno') }) },
  // Renobox tirage direct : largeur 630-2000 mm.
  { message: 'Tirage direct : largeur minimale 630 mm', requires: { any: [ne('sous_famille', 'renobox'), ne('manoeuvre', 'tirage_direct'), { op: 'gte', left: V('largeur'), right: 630 }] } },
  { message: 'Tirage direct : largeur maximale 2000 mm', requires: { any: [ne('sous_famille', 'renobox'), ne('manoeuvre', 'tirage_direct'), lte('largeur', 2000)] } },
];

// ---- Étapes (ordre de l'arbre) ----
const steps = [
  { id: 'produit', title: 'Type de produit', fields: ['sous_famille'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur', 'pose', 'enroulement', 'lame_info', 'lame_reno'] },
  { id: 'coffre', title: 'Coffre', fields: ['coffre_auto_info', 'coffre_pan', 'lame_finale', 'coffre_reno_info', 'coffre_reno', 'coffre_pan_reno', 'lame_finale_reno'] },
  { id: 'coloris', title: 'Coloris', fields: ['coloris', 'coloris_mode_reno', 'coloris_mono_reno', 'coloris_coffre_reno', 'coloris_tablier_reno', 'coloris_coulisse_reno', 'coloris_lamefinale_reno'] },
  { id: 'coulisses', title: 'Coulisses', fields: ['coulisse_type', 'coulisse_reno', 'percage', 'arrets_bas'] },
  { id: 'manoeuvre', title: 'Manœuvre', fields: [
    'manoeuvre', 'tringle_cote', 'sortie_tringle', 'genouillere_manuelle', 'commande', 'moteur', 'position_moteur', 'sortie_fil', 'emetteur_type',
    'radio_info', 'centralisation_info', 'inverseur', 'inverseur_pose', 'inverseur_maintien',
    'emetteur_5c', 'situo_io_1c', 'situo_io_5c', 'amy_4c_io', 'alim_depannage',
    // Renobox
    'cote_reno', 'sortie_reno', 'serrure_position', 'serrure_hauteur', 'genouillere_reno', 'commande_secours',
  ] },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

const def = {
  slug: 'volet-roulant-renovation',
  name: 'Volet roulant rénovation (Minibox · Renobox)',
  famille: 'reno', nodeField: 'sous_famille',
  fields, derived, steps, priceRules,
  tables: { d1: {}, d2: { ...grids, ...renoGrids } },
  tableLabels: {
    // Minibox
    g_mn_filaire: 'Minibox · MN Filaire', g_mn_radio: 'Minibox · MN Radio',
    g_somfy_filaire: 'Minibox · Somfy Ilmo (filaire)', g_somfy_radio: 'Minibox · Somfy RS100 io (radio)',
    // Renobox — lame 42 (coffre auto par hauteur)
    r42_mn_filaire: 'Renobox L42 · MN Filaire', r42_mn_radio: 'Renobox L42 · MN Radio',
    r42_somfy_filaire: 'Renobox L42 · Somfy Filaire', r42_somfy_radio: 'Renobox L42 · Somfy Radio',
    // Renobox — lame 56 coffre 205
    r56_205_mn_filaire: 'Renobox L56 C205 · MN Filaire', r56_205_mn_radio: 'Renobox L56 C205 · MN Radio',
    r56_205_somfy_filaire: 'Renobox L56 C205 · Somfy Filaire', r56_205_somfy_radio: 'Renobox L56 C205 · Somfy Radio',
    // Renobox — lame 56 coffre 250
    r56_250_mn_filaire: 'Renobox L56 C250 · MN Filaire', r56_250_mn_radio: 'Renobox L56 C250 · MN Radio',
    r56_250_somfy_filaire: 'Renobox L56 C250 · Somfy Filaire', r56_250_somfy_radio: 'Renobox L56 C250 · Somfy Radio',
  },
  constraints,
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'volet-roulant-renovation.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`Écrit ${path.relative(process.cwd(), out)} (${kb} Ko) — ${fields.length} champs, ${priceRules.length} règles, ${steps.length} étapes, ${Object.keys(grids).length} grilles MN/Somfy.`);
