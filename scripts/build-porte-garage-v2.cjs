/* =====================================================================
   Build def v2 — PORTE DE GARAGE (1.4). Démarrage 1.4.1 « ECOPARK » (enroulable
   rénovation coffre 250, lame alu 55, motorisation MN filaire à commande de secours,
   pack radio « homme présent »). Configurateur simple : formats standards (2 largeurs ×
   2 hauteurs) → grille pg_<sous_famille>, coloris sans PV, 2 options radio.
   Prêt pour Rollpark / Primo (sous-familles à venir).
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const V = (name) => ({ var: name });
const eq = (n, v) => ({ op: 'eq', left: V(n), right: v });

// Coloris (Blanc / Gris 7016) — sans plus-value.
const COLORS = {
  'blanc-9010': ['Blanc 9010', '#f4f4f0'],
  'gris-7016': ['Gris anthracite 7016', '#3a3f44'],
};
const col = (code) => ({ value: code, label: COLORS[code][0], hex: COLORS[code][1] });

const fields = [
  { id: 'sous_famille', label: 'Modèle', type: 'choice', default: 'ecopark',
    options: [{ value: 'ecopark', label: 'Ecopark (enroulable rénovation)' }] },

  // Descriptif (specs fixes du modèle — affichées, non modifiables).
  { id: 'info_compo', label: 'Descriptif', type: 'info',
    help: 'Volet rénovation coffre 250 — Lame aluminium 55. Coffre pan coupé aluminium section 250, coulisse aluminium 75×27, lames aluminium 55, verrouillage par verrous rigides, moteur à commande de secours avec genouillère standard. Pack radio « homme présent » : armoire de commande, 2 télécommandes, pare-chute.' },
  { id: 'info_homme_present', label: 'Pack radio « homme présent »', type: 'info',
    help: 'Maintien continu sur le bouton de la télécommande pour la montée et la descente. Ouverture : 1 seule impulsion pour l’ouverture complète. Fermeture : par maintien continu sur le bouton.' },

  // Dimensions = formats standards (cotes tableau fini, pose en applique intérieure).
  // setsValues → variables numériques pour la grille (largeur_n / hauteur_n).
  { id: 'largeur', label: 'Largeur tableau', type: 'choice', default: '2400',
    help: 'Cote tableau fini (pose en applique intérieure).',
    options: [
      { value: '2400', label: '2400 mm', setsValues: { largeur_n: 2400 } },
      { value: '2500', label: '2500 mm', setsValues: { largeur_n: 2500 } },
    ] },
  { id: 'hauteur', label: 'Hauteur tableau', type: 'choice', default: '2000',
    options: [
      { value: '2000', label: '2000 mm', setsValues: { hauteur_n: 2000 } },
      { value: '2100', label: '2100 mm', setsValues: { hauteur_n: 2100 } },
    ] },

  { id: 'coloris', label: 'Coloris', type: 'choice', default: 'blanc-9010',
    help: 'Blanc ou Gris 7016 — sans plus-value.',
    options: [col('blanc-9010'), col('gris-7016')] },

  // Options radio (indépendantes, cumulables).
  { id: 'contact_cle', label: 'Contact à clé radio', type: 'choice', default: 'non',
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+148 €)' }] },
  { id: 'bouton_poussoir', label: 'Bouton poussoir radio', type: 'choice', default: 'non',
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+140 €)' }] },
];

const derived = [
  // Grille = pg_<sous_famille> (prêt pour rollpark / primo).
  { id: 'grid', expr: { op: 'concat', args: ['pg_', V('sous_famille')] } },
];

const priceRules = [
  { code: 'base', label: 'Porte de garage (grille)', kind: 'base',
    amount: { op: 'lookup2d', table: V('grid'), row: V('hauteur_n'), col: V('largeur_n') } },
  { code: 'contact_cle', label: 'Contact à clé radio', kind: 'add', when: eq('contact_cle', 'oui'), amount: 148 },
  { code: 'bouton_poussoir', label: 'Bouton poussoir radio', kind: 'add', when: eq('bouton_poussoir', 'oui'), amount: 140 },
];

// Grille ECOPARK : prix = Largeur tableau × Hauteur tableau (tarif NET HT 2026).
//   rows = hauteurs [2000, 2100] ; cols = largeurs [2400, 2500].
const tables = {
  d2: {
    pg_ecopark: { rows: [2000, 2100], cols: [2400, 2500], cells: [[942, 968], [968, 979]] },
  },
};

const steps = [
  { id: 'produit', title: 'Modèle', fields: ['sous_famille', 'info_compo', 'info_homme_present'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur'] },
  { id: 'coloris', title: 'Coloris', fields: ['coloris'] },
  { id: 'options', title: 'Options', fields: ['contact_cle', 'bouton_poussoir'] },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

const def = {
  slug: 'porte-de-garage', name: 'Porte de garage', famille: 'porte-de-garage', nodeField: 'sous_famille',
  fields, derived, steps, priceRules, tables,
  tableLabels: { pg_ecopark: 'ECOPARK' },
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'porte-de-garage.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
console.log(`Écrit ${path.relative(process.cwd(), out)} — ${fields.length} champs, ${priceRules.length} règles, grille pg_ecopark 2×2.`);
