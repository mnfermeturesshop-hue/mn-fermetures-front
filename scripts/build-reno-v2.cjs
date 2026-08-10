/* =====================================================================
   Configurateur VOLET ROULANT RÉNOVATION (famille Reno 1.2) — moteur v2.
   Un configurateur par famille : commence par la sous-famille MINIBOX (1.2.1) ;
   Renobox (1.2.2) et Reno gros coffre (1.2.3) seront ajoutés via `sous_famille`.

   ⚠️ PREMIER INCRÉMENT — arbre de décision PDG partiel (Dimensions › Enroulement ›
   Taille de coffre) + coloris standards. Le PRIX est PROVISOIRE (formule) tant que
   la grille Largeur × Hauteur (par taille de coffre) n'est pas fournie. Les sections
   Lame / Manœuvre / Commande / Options seront montées ensuite (comme le Tradi).
   ===================================================================== */
const fs = require('fs');
const path = require('path');

// ---- helpers conditions / expr ----
const V = (name) => ({ var: name });
const eq = (name, val) => ({ op: 'eq', left: V(name), right: val });
const lte = (name, n) => ({ op: 'lte', left: V(name), right: n });

const fields = [];

// Sous-famille (pilote le nœud de remise/surcharge/éco + futures sous-familles Reno).
fields.push({
  id: 'sous_famille', label: 'Type de produit', type: 'choice', default: 'minibox',
  help: 'Gamme rénovation. Renobox et Reno gros coffre seront ajoutés prochainement.',
  options: [{ value: 'minibox', label: 'Reno Minibox' }],
});

// Coloris monocouleur — standards, sans plus-value (BC Minibox). Le multi-couleurs
// (tablier / coffre / coulisses / lame finale) sera ajouté ensuite.
fields.push({
  id: 'coloris', label: 'Coloris (monocouleur)', type: 'choice', default: 'blanc-9010',
  options: [
    { value: 'blanc-9010', label: 'Blanc 9010', hex: '#f4f4f2' },
    { value: 'ivoire-1015', label: 'Ivoire 1015', hex: '#e6d2b5' },
    { value: 'gris-7016', label: 'Gris 7016', hex: '#383e42' },
    { value: 'gris-7035', label: 'Gris 7035', hex: '#d7d7d7' },
    { value: 'marron-8019', label: 'Marron 8019 (proche)', hex: '#3d3635' },
  ],
});

// Dimensions (cotes de FABRICATION en mm, vue intérieure — jeux de pose déjà déduits).
fields.push({ id: 'largeur', label: 'Largeur (dos de coulisse)', type: 'dimension', unit: 'mm', default: 1200 });
fields.push({ id: 'hauteur', label: 'Hauteur (sous coffre)', type: 'dimension', unit: 'mm', default: 1000 });

// Enroulement (pose) — intérieur / extérieur.
fields.push({
  id: 'enroulement', label: 'Enroulement', type: 'choice', role: 'spec', default: 'interieur',
  options: [{ value: 'interieur', label: 'Intérieur' }, { value: 'exterieur', label: 'Extérieur' }],
});

// Taille de coffre — 137 / 150 / 165 / 180. Par défaut la section mini (auto) ;
// choix d'une section supérieure possible (uniformisation multi-repères).
// ⚠️ La règle « auto = plus petite section admissible selon dimensions » est à fournir.
fields.push({
  id: 'coffre_taille', label: 'Taille de coffre', type: 'choice', default: '137',
  help: 'Section mini par défaut (auto) ; section supérieure possible pour uniformiser.',
  options: [
    { value: '137', label: '137' }, { value: '150', label: '150' },
    { value: '165', label: '165' }, { value: '180', label: '180' },
  ],
});

// Forme de coffre — pan coupé (PC) / pan rond (PR) : pilote la lame finale (affleurante / standard).
fields.push({
  id: 'coffre_pan', label: 'Forme de coffre', type: 'choice', role: 'spec', default: 'pan_coupe',
  options: [{ value: 'pan_coupe', label: 'Pan coupé (PC)' }, { value: 'pan_rond', label: 'Pan rond (PR)' }],
});

// Perçage des coulisses — Tableau (T) / Façade (F) / Non percé (NP).
fields.push({
  id: 'percage', label: 'Perçage des coulisses', type: 'choice', role: 'spec', default: 'tableau',
  options: [
    { value: 'tableau', label: 'Perçage tableau (T)' },
    { value: 'facade', label: 'Perçage façade (F)' },
    { value: 'non_perce', label: 'Non percé (NP)' },
  ],
});

// Lame (une seule référence Minibox) — info.
fields.push({ id: 'lame_info', type: 'info', help: 'Lame aluminium 37 — largeur max 2400 mm, surface max 5,5 m².' });

// ---- Dérivées ----
const derived = [
  { id: 'surface_m2', expr: { op: '*', args: [{ op: '/', args: [V('largeur'), 1000] }, { op: '/', args: [V('hauteur'), 1000] }] } },
];

// ---- Prix (PROVISOIRE) ----
// ⚠️ À REMPLACER par la grille réelle Largeur × Hauteur (par taille de coffre) dès fourniture.
const priceRules = [
  { code: 'base', label: 'Prix de base (tarif provisoire)', kind: 'base',
    amount: { op: 'round', arg: { op: '+', args: [{ op: '*', args: [V('surface_m2'), 300] }, 100] } } },
];

// ---- Contraintes (lame Alu 37) ----
const constraints = [
  { message: 'Largeur maximale 2400 mm (lame Alu 37)', requires: lte('largeur', 2400) },
  { message: 'Surface maximale 5,5 m² (lame Alu 37)', requires: lte('surface_m2', 5.5) },
];

// ---- Étapes ----
const steps = [
  { id: 'produit', title: 'Type de produit', fields: ['sous_famille'] },
  { id: 'coloris', title: 'Coloris', fields: ['coloris'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur', 'enroulement', 'lame_info'] },
  { id: 'coffre', title: 'Coffre', fields: ['coffre_taille', 'coffre_pan', 'percage'] },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

const def = {
  slug: 'volet-roulant-renovation',
  name: 'Volet roulant rénovation (Minibox)',
  famille: 'reno',            // repli ; nœud dynamique via sous_famille (minibox 1.2.1)
  nodeField: 'sous_famille',
  fields, derived, steps, priceRules,
  tables: { d1: {}, d2: {} }, tableLabels: {}, constraints,
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'volet-roulant-renovation.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`Écrit ${path.relative(process.cwd(), out)} (${kb} Ko) — ${fields.length} champs, ${priceRules.length} règles, ${steps.length} étapes (PRIX PROVISOIRE).`);
