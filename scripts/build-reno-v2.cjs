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

// ---- helpers conditions / expr ----
const V = (name) => ({ var: name });
const eq = (name, val) => ({ op: 'eq', left: V(name), right: val });
const ne = (name, val) => ({ op: 'ne', left: V(name), right: val });
const inSet = (name, set) => ({ op: 'in', value: V(name), set });
const lt = (name, n) => ({ op: 'lt', left: V(name), right: n });
const lte = (name, n) => ({ op: 'lte', left: V(name), right: n });
const AND = (cs) => (cs.length === 1 ? cs[0] : { all: cs });
const RADIO_SOL = inSet('commande', ['radio', 'solaire']);

const fields = [];
const priceRules = [];

// ── Sous-famille (nœud remise/surcharge/éco + futures sous-familles Reno) ──
fields.push({
  id: 'sous_famille', label: 'Type de produit', type: 'choice', default: 'minibox',
  help: 'Gamme rénovation. Renobox et Reno gros coffre seront ajoutés prochainement.',
  options: [{ value: 'minibox', label: 'Reno Minibox' }],
});

// ── Dimensions (cotes de FABRICATION, vue intérieure, jeux de pose déduits) ──
fields.push({ id: 'largeur', label: 'Largeur (dos de coulisse)', type: 'dimension', unit: 'mm', default: 1200 });
fields.push({ id: 'hauteur', label: 'Hauteur (sous coffre)', type: 'dimension', unit: 'mm', default: 1000 });
fields.push({
  id: 'enroulement', label: 'Enroulement', type: 'choice', role: 'spec', default: 'interieur',
  help: 'Pose en tableau (enroulement intérieur ou extérieur) ou en applique (extérieur). Cotes de FABRICATION en mm — pensez à déduire vos jeux de pose (largeur dos de coulisses, hauteur coffre compris).',
  helpImage: '/reno-minibox-dimensions-enroulements.png',
  options: [{ value: 'interieur', label: 'Intérieur' }, { value: 'exterieur', label: 'Extérieur' }],
});
fields.push({ id: 'lame_info', type: 'info', help: 'Lame aluminium 37 — largeur max 2400 mm, surface max 5,5 m².' });

// ── Coffre : section AUTO par la hauteur (137/150/165 — 180/205/250 indisponibles
//    en Minibox alu), + forme (pan) qui pilote la lame finale et les coloris ──
fields.push({
  id: 'coffre_pan', label: 'Forme de coffre', type: 'choice', default: 'pan_coupe',
  options: [{ value: 'pan_coupe', label: 'Pan coupé (PC)' }, { value: 'pan_rond', label: 'Pan rond (PR)' }],
});
// Lame finale : pan coupé → affleurante (défaut) ou classique ; pan rond → classique (forcé).
fields.push({
  id: 'lame_finale', label: 'Lame finale', type: 'choice', default: 'affleurante',
  options: [
    { value: 'affleurante', label: 'Lame finale affleurante', availableWhen: eq('coffre_pan', 'pan_coupe') },
    { value: 'classique', label: 'Lame finale classique' },
  ],
});

// ── Coloris (coffre, coulisses & tablier) — monocouleur. Pan coupé : 5 coloris ;
//    Pan rond : Blanc 9010 & Gris 7016 seulement. Standards sans plus-value.
fields.push({
  id: 'coloris', label: 'Coloris (coffre, coulisses & tablier)', type: 'choice', default: 'blanc-9010',
  options: [
    { value: 'blanc-9010', label: 'Blanc 9010', hex: '#f4f4f2' },
    { value: 'gris-7016', label: 'Gris 7016', hex: '#383e42' },
    { value: 'ivoire-1015', label: 'Ivoire 1015', hex: '#e6d2b5', availableWhen: eq('coffre_pan', 'pan_coupe') },
    { value: 'gris-7035', label: 'Gris 7035', hex: '#d7d7d7', availableWhen: eq('coffre_pan', 'pan_coupe') },
    { value: 'marron-8019', label: 'Marron 8019 (proche)', hex: '#3d3635', availableWhen: eq('coffre_pan', 'pan_coupe') },
  ],
});

// ── Coulisse : 53/22 par défaut ; à aile +8,5 €/ml. Perçage T / F / sans. ──
fields.push({
  id: 'coulisse_type', label: 'Coulisses', type: 'choice', default: 'c53x22',
  options: [
    { value: 'c53x22', label: 'Coulisse 53/22 (par défaut)' },
    { value: 'a_aile', label: 'Coulisse à aile (+8,50 €/ml)' },
  ],
});
// +value coulisse à aile : 8,5 €/ml de hauteur × 2 coulisses (à confirmer : base du ml).
priceRules.push({
  code: 'coulisse_aile', label: 'Coulisse à aile', kind: 'add',
  when: eq('coulisse_type', 'a_aile'),
  amount: { op: 'round', arg: { op: '*', args: [{ op: '/', args: [V('hauteur'), 1000] }, 8.5, 2] } },
});
fields.push({
  id: 'percage', label: 'Perçage des coulisses', type: 'choice', role: 'spec', default: 'tableau',
  options: [
    { value: 'tableau', label: 'Perçage tableau' },
    { value: 'facade', label: 'Perçage façade' },
    { value: 'sans', label: 'Sans perçage' },
  ],
});

// ── Manœuvre : manuelle / motorisée ──
fields.push({
  id: 'manoeuvre', label: 'Type de manœuvre', type: 'choice', default: 'motorisee',
  options: [
    { value: 'manuelle', label: 'Manuelle' },
    { value: 'motorisee', label: 'Motorisation' },
  ],
});
// Manuelle = grille de coût de motorisation FILAIRE − moins-value.
// ⚠️ Valeurs de la GRILLE TARIF MN (prioritaire) : L<567 → −77 € ; L≥567 → −17 €.
//    (L'arbre de décision indiquait <451 → −72 / −13 — à confirmer.)
priceRules.push({
  code: 'manuelle_mv', label: 'Manœuvre manuelle (moins-value)', kind: 'add',
  when: eq('manoeuvre', 'manuelle'),
  amount: { op: 'if', cond: lt('largeur', 567), then: -77, else: -17 },
});
// Genouillère (manœuvre manuelle) : 60° incluse / 60° aimantée +41 / 90° +18 / 90° aimantée +59.
fields.push({
  id: 'genouillere_manuelle', label: 'Genouillère', type: 'choice', default: 'g60',
  visibleWhen: eq('manoeuvre', 'manuelle'),
  options: [
    { value: 'g60', label: 'Genouillère 60° (incluse)' },
    { value: 'g60a', label: 'Genouillère 60° aimantée (+41 €)' },
    { value: 'g90', label: 'Genouillère 90° (+18 €)' },
    { value: 'g90a', label: 'Genouillère 90° aimantée (+59 €)' },
  ],
});
for (const [val, price] of Object.entries({ g60a: 41, g90: 18, g90a: 59 })) {
  priceRules.push({ code: `opt_genou_${val}`, label: `Genouillère ${val}`, kind: 'add',
    when: AND([eq('manoeuvre', 'manuelle'), eq('genouillere_manuelle', val)]), amount: price });
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
  visibleWhen: eq('manoeuvre', 'motorisee'),
  options: [{ value: 'gauche', label: 'Gauche (G)' }, { value: 'droite', label: 'Droite (D)' }],
});

// ── Motorisation FILAIRE : option inverseur +21 € (4 variantes même prix).
//    Pas de commande de secours en filaire (différence avec le Tradi).
const filaireVis = AND([eq('manoeuvre', 'motorisee'), eq('commande', 'filaire')]);
fields.push({ id: 'inverseur', label: 'Inverseur (+21 €)', type: 'boolean', visibleWhen: filaireVis });
priceRules.push({ code: 'opt_inverseur', label: 'Inverseur', kind: 'add', when: AND([eq('inverseur', true), filaireVis]), amount: 21 });
fields.push({
  id: 'inverseur_pose', label: 'Inverseur — pose', type: 'choice', role: 'spec', default: 'encastre',
  visibleWhen: eq('inverseur', true),
  options: [{ value: 'encastre', label: 'Encastré' }, { value: 'applique', label: 'En applique' }],
});
fields.push({
  id: 'inverseur_maintien', label: 'Inverseur — maintien', type: 'choice', role: 'spec', default: 'maintenu',
  visibleWhen: eq('inverseur', true),
  options: [{ value: 'maintenu', label: 'Maintenu' }, { value: 'fixe', label: 'Fixe' }],
});

// ── Motorisation RADIO / SOLAIRE : émetteur (portatif/mural) + marque incluse.
//    MN → portatif 1 canal inclus (option 5 canaux +80). Somfy → Amy 1 Sun Protect
//    inclus + options de CENTRALISATION (Somfy uniquement).
fields.push({
  id: 'emetteur_type', label: 'Émetteur', type: 'choice', default: 'portatif',
  visibleWhen: RADIO_SOL,
  options: [{ value: 'portatif', label: 'Émetteur portatif' }, { value: 'mural', label: 'Émetteur mural' }],
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
priceRules.push({ code: 'kit_solaire', label: 'Kit solaire (moteur + batterie + panneau + émetteur)', kind: 'add',
  when: eq('commande', 'solaire'), amount: 232 });
fields.push({ id: 'alim_depannage', label: 'Alimentation de dépannage (+83 €)', type: 'boolean', visibleWhen: eq('commande', 'solaire') });
priceRules.push({ code: 'opt_alim_depannage', label: 'Alimentation de dépannage', kind: 'add',
  when: AND([eq('alim_depannage', true), eq('commande', 'solaire')]), amount: 83 });

// Côté tringle (fabrication) — manœuvre manuelle.
fields.push({
  id: 'tringle_cote', label: 'Côté tringle', type: 'choice', role: 'spec', default: 'droite',
  visibleWhen: eq('manoeuvre', 'manuelle'),
  options: [{ value: 'gauche', label: 'Gauche' }, { value: 'droite', label: 'Droite' }],
});

// Numéros de SORTIE (fabrication) — position sur le coffre, d'après le schéma de pose.
//  - Fil (manœuvre motorisée) : 1 à 11.
//  - Tringle oscillante (manœuvre manuelle TO) : 1 à 5.
// Schémas de position à déposer dans public/ (2 fichiers séparés).
fields.push({
  id: 'sortie_fil', label: 'Numéro de sortie du fil', type: 'choice', role: 'spec', default: '1',
  visibleWhen: eq('manoeuvre', 'motorisee'),
  help: 'Position de sortie du fil sur le coffre (voir schéma) — 1 à 11.',
  helpImage: '/reno-minibox-sortie-fil.png',
  options: Array.from({ length: 11 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
});
fields.push({
  id: 'sortie_tringle', label: 'Numéro de sortie de la tringle', type: 'choice', role: 'spec', default: '1',
  visibleWhen: eq('manoeuvre', 'manuelle'),
  help: 'Position de sortie de la tringle oscillante (voir schéma) — 1 à 5.',
  helpImage: '/reno-minibox-sortie-tringle.png',
  options: Array.from({ length: 5 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
});

// Section de coffre AUTO selon la hauteur (grille MN) : 137 (≤1550) / 150 (≤2250)
// / 165 (≤2550). Affichée sous le champ « Taille de coffre » (override possible).
fields.push({
  id: 'coffre_auto_info', type: 'info',
  help: 'Section mini automatique selon la hauteur : {{coffre_auto}}.',
});

// ---- Dérivées ----
const derived = [
  { id: 'surface_m2', expr: { op: '*', args: [{ op: '/', args: [V('largeur'), 1000] }, { op: '/', args: [V('hauteur'), 1000] }] } },
  { id: 'coffre_auto', expr: { op: 'if', cond: lte('hauteur', 1550), then: '137',
      else: { op: 'if', cond: lte('hauteur', 2250), then: '150', else: '165' } } },
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
priceRules.unshift({
  code: 'base', label: 'Prix de base', kind: 'base',
  amount: { op: 'lookup2d', table: V('grid'), row: V('hauteur'), col: V('largeur') },
});

// ---- Contraintes (limites dimensionnelles Minibox alu 37) ----
const constraints = [
  { message: 'Largeur inférieure au minimum pour cette manœuvre / ce moteur', requires: { op: 'gte', left: V('largeur'), right: V('largeur_mini') } },
  { message: 'Largeur maximale 2400 mm (lame Alu 37)', requires: lte('largeur', 2400) },
  { message: 'Hauteur maximale 2550 mm (coffre 165)', requires: lte('hauteur', 2550) },
  { message: 'Surface maximale 5,5 m² (lame Alu 37)', requires: lte('surface_m2', 5.5) },
];

// ---- Étapes (ordre de l'arbre) ----
const steps = [
  { id: 'produit', title: 'Type de produit', fields: ['sous_famille'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur', 'enroulement', 'lame_info'] },
  { id: 'coffre', title: 'Coffre', fields: ['coffre_auto_info', 'coffre_pan', 'lame_finale'] },
  { id: 'coloris', title: 'Coloris', fields: ['coloris'] },
  { id: 'coulisses', title: 'Coulisses', fields: ['coulisse_type', 'percage'] },
  { id: 'manoeuvre', title: 'Manœuvre', fields: [
    'manoeuvre', 'tringle_cote', 'sortie_tringle', 'genouillere_manuelle', 'commande', 'moteur', 'position_moteur', 'sortie_fil', 'emetteur_type',
    'radio_info', 'centralisation_info', 'inverseur', 'inverseur_pose', 'inverseur_maintien',
    'emetteur_5c', 'situo_io_1c', 'situo_io_5c', 'amy_4c_io', 'alim_depannage',
  ] },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

const def = {
  slug: 'volet-roulant-renovation',
  name: 'Volet roulant rénovation (Minibox)',
  famille: 'reno', nodeField: 'sous_famille',
  fields, derived, steps, priceRules,
  tables: { d1: {}, d2: grids },
  tableLabels: {
    g_mn_filaire: 'MN Filaire', g_mn_radio: 'MN Radio',
    g_somfy_filaire: 'Somfy Ilmo (filaire)', g_somfy_radio: 'Somfy RS100 io (radio)',
  },
  constraints,
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'volet-roulant-renovation.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`Écrit ${path.relative(process.cwd(), out)} (${kb} Ko) — ${fields.length} champs, ${priceRules.length} règles, ${steps.length} étapes, ${Object.keys(grids).length} grilles MN/Somfy.`);
