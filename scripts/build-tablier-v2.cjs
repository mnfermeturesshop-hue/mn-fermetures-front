/* =====================================================================
   Convertit lib/configurateur/data/tablier-lames.json (LAMES, extrait de
   lib/tablier/data.ts) -> définition v2 (moteur universel CPQ).
   ISO-PRIX avec lib/tablier/engine : mêmes grilles 2D par lame + suppléments
   1D attache/verrou par largeur, mêmes snaps (lookup2d/lookup1d = snapUp).
   Sortie : lib/configurateur/data/tablier-sur-mesure.v2.json.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const LAMES = require('../lib/configurateur/data/tablier-lames.json');

const V = (name) => ({ var: name });
const eq = (name, val) => ({ op: 'eq', left: V(name), right: val });
const ne = (name, val) => ({ op: 'ne', left: V(name), right: val });
const gte = (name, n) => ({ op: 'gte', left: V(name), right: n });
const lte = (name, n) => ({ op: 'lte', left: V(name), right: n });
const inSet = (name, set) => ({ op: 'in', value: V(name), set });

// Verrouillage = UN SEUL choix par lame (mutuellement exclusif) :
//  - lames « souples » (toutes sauf alu-77) : Attaches souples (défaut, 0 €) OU
//    Attaches rigides (+PV) OU Verrous automatiques (+PV) ;
//  - alu-77 (agrafé, sans attache) : Sans (défaut, 0 €) OU Verrous automatiques (+PV).
const LAMES_SOUPLE = LAMES.filter((l) => l.attacheParDefaut !== 'verrou').map((l) => l.slug); // défaut « souple »
const LAMES_AGRAFE = LAMES.filter((l) => l.attacheParDefaut === 'verrou').map((l) => l.slug); // alu-77 : défaut « sans »
const LAMES_WITH_ATTACHE = LAMES.filter((l) => l.pvAttache).map((l) => l.slug);
const LAMES_WITH_VERROU = LAMES.filter((l) => l.pvVerrou).map((l) => l.slug);

// ---- TABLES (grilles 2D + barèmes 1D) + libellés d'onglets Excel ----
const d2 = {};
const d1 = {};
const tableLabels = {};
const asBareme = (obj) => {
  const keys = Object.keys(obj).map(Number).sort((a, b) => a - b);
  return { keys, values: keys.map((k) => obj[k]) };
};
for (const l of LAMES) {
  d2[`tab_${l.slug}`] = {
    rows: l.hauteurs,
    cols: l.largeurs,
    cells: l.hauteurs.map((h) => l.grille[String(h)] ?? l.largeurs.map(() => null)),
  };
  tableLabels[`tab_${l.slug}`] = `Tablier ${l.nom}`.slice(0, 31);
  if (l.pvAttache) {
    d1[`att_${l.slug}`] = asBareme(l.pvAttache);
    tableLabels[`att_${l.slug}`] = `Attaches ${l.nom}`.slice(0, 31);
  }
  if (l.pvVerrou) {
    d1[`ver_${l.slug}`] = asBareme(l.pvVerrou);
    tableLabels[`ver_${l.slug}`] = `Verrous ${l.nom}`.slice(0, 31);
  }
}

// ---- COLORIS : union des coloris de toutes les lames (pastilles hex) ----
const colMap = new Map();
for (const l of LAMES) for (const c of l.coloris) {
  if (!colMap.has(c.code)) colMap.set(c.code, { label: c.label, hex: c.hex, lames: [] });
  colMap.get(c.code).lames.push(l.slug);
}
const colorisOptions = [...colMap.entries()].map(([code, v]) => ({
  value: code, label: v.label, hex: v.hex, availableWhen: inSet('lame', v.lames),
}));

// ---- CHAMPS ----
const largeurMin = Math.min(...LAMES.map((l) => l.largeurs[0]));
const largeurMax = Math.max(...LAMES.map((l) => l.largeurs[l.largeurs.length - 1]));
const hauteurMin = Math.min(...LAMES.map((l) => l.hauteurs[0]));
const hauteurMax = Math.max(...LAMES.map((l) => l.hauteurs[l.hauteurs.length - 1]));

const fields = [
  { id: 'matiere', label: 'Matière', type: 'choice', default: 'alu',
    options: [{ value: 'pvc', label: 'PVC' }, { value: 'alu', label: 'Aluminium' }] },
  { id: 'lame', label: 'Lame', type: 'choice', default: 'alu-cd942',
    options: LAMES.map((l) => ({ value: l.slug, label: l.nom, hint: l.fourniture, availableWhen: eq('matiere', l.matiere) })) },
  { id: 'coloris', label: 'Coloris', type: 'choice', options: colorisOptions },
  // Aide à la prise de cotes (affichée en tête de l'étape Dimensions).
  { id: 'dim_help', label: '', type: 'info',
    help: '⚠️ Largeur de commande = largeur finie. Hauteur de commande = hauteur finie, enroulement compris (par défaut 100 mm).' },
  { id: 'largeur', label: 'Largeur', type: 'dimension', unit: 'mm', min: largeurMin, max: largeurMax, step: 1, default: 1200 },
  { id: 'hauteur', label: 'Hauteur', type: 'dimension', unit: 'mm', min: hauteurMin, max: hauteurMax, step: 1, default: 1500 },
  // Verrouillage : un seul choix (exclusif). Les options dispo dépendent de la lame.
  { id: 'verrouillage', label: 'Attaches & verrouillage', type: 'choice', default: 'souple',
    help: 'Attaches souples incluses. En option (plus-value) : attaches rigides OU verrous automatiques — pas les deux.',
    helpImage: '/schema-tablier-verrouillage.png',
    options: [
      { value: 'souple', label: 'Attaches souples (incluses)', availableWhen: inSet('lame', LAMES_SOUPLE) },
      { value: 'sans', label: 'Agrafé — sans attache de verrouillage', availableWhen: inSet('lame', LAMES_AGRAFE) },
      { value: 'rigide', label: 'Attaches rigides (+ plus-value)', availableWhen: inSet('lame', LAMES_WITH_ATTACHE) },
      { value: 'verrou', label: 'Verrous automatiques avec bagues (+ plus-value)', availableWhen: inSet('lame', LAMES_WITH_VERROU) },
    ] },
];

// ---- RÈGLES DE PRIX (iso lib/tablier/engine) ----
const priceRules = [
  { code: 'base', label: 'Tablier (barème)', kind: 'base',
    amount: { op: 'lookup2d', table: { op: 'concat', args: ['tab_', V('lame')] }, row: V('hauteur'), col: V('largeur') } },
  { code: 'attache', label: 'Attaches rigides', kind: 'add',
    when: eq('verrouillage', 'rigide'),
    amount: { op: 'lookup1d', table: { op: 'concat', args: ['att_', V('lame')] }, key: V('largeur') } },
  { code: 'verrou', label: 'Verrous automatiques', kind: 'add',
    when: eq('verrouillage', 'verrou'),
    amount: { op: 'lookup1d', table: { op: 'concat', args: ['ver_', V('lame')] }, key: V('largeur') } },
];

const steps = [
  { id: 'lame', title: 'Matière & lame', fields: ['matiere', 'lame'] },
  { id: 'coloris', title: 'Coloris', fields: ['coloris'] },
  { id: 'dim', title: 'Dimensions', fields: ['dim_help', 'largeur', 'hauteur'] },
  { id: 'options', title: 'Options', fields: ['verrouillage'] },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

// ---- CONTRAINTES : plage largeur/hauteur PAR LAME (message ciblé si hors plage) ----
const constraints = [];
for (const l of LAMES) {
  const lmin = l.largeurs[0], lmax = l.largeurs[l.largeurs.length - 1];
  const hmin = l.hauteurs[0], hmax = l.hauteurs[l.hauteurs.length - 1];
  constraints.push({
    requires: { any: [ne('lame', l.slug), { all: [gte('largeur', lmin), lte('largeur', lmax)] }] },
    message: `Largeur hors plage pour ${l.nom} : ${lmin} à ${lmax} mm.`,
  });
  constraints.push({
    requires: { any: [ne('lame', l.slug), { all: [gte('hauteur', hmin), lte('hauteur', hmax)] }] },
    message: `Hauteur hors plage pour ${l.nom} : ${hmin} à ${hmax} mm.`,
  });
}

const def = {
  // Rattaché au nœud de nomenclature `tabliers-seuls` : remise B2B / surcharge / éco
  // résolues sur ce nœud (verifyCart branche `configurateur`).
  slug: 'tablier-sur-mesure', name: 'Tablier sur mesure', famille: 'tabliers-seuls',
  fields, steps, priceRules, tables: { d1, d2 }, tableLabels, constraints,
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'tablier-sur-mesure.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
console.log(`Écrit ${path.relative(process.cwd(), out)} — ${fields.length} champs, ${priceRules.length} règles, ${Object.keys(d2).length} grilles, ${Object.keys(d1).length} barèmes.`);
