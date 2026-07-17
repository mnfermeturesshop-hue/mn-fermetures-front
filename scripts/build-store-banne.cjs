/* =====================================================================
   PREUVE D'UNIVERSALITÉ — Store banne en PURE DONNÉE (moteur universel v2).
   Aucune grille de prix : tarification par FORMULE (surface × €/m²) + options.
   Le MÊME moteur et le MÊME wizard que le volet roulant le rendent et le
   tarifent, sans une ligne de code produit.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const V = (n) => ({ var: n });
const eq = (n, v) => ({ op: 'eq', left: V(n), right: v });
const gte = (n, v) => ({ op: 'gte', left: V(n), right: v });
const lte = (n, v) => ({ op: 'lte', left: V(n), right: v });
const round = (arg) => ({ op: 'round', arg });
const mul = (...args) => ({ op: '*', args });
const div = (a, b) => ({ op: '/', args: [a, b] });

const def = {
  slug: 'store-banne',
  name: 'Store banne',
  famille: 'store-banne',
  fields: [
    { id: 'modele', label: 'Modèle', type: 'choice', default: 'monobloc', options: [
      { value: 'monobloc', label: 'Monobloc' },
      { value: 'semi_coffre', label: 'Semi-coffre' },
      { value: 'coffre_integral', label: 'Coffre intégral' },
    ] },
    { id: 'largeur', label: 'Largeur', type: 'dimension', unit: 'mm', default: 3500 },
    { id: 'avancee', label: 'Avancée (projection)', type: 'dimension', unit: 'mm', default: 2500 },
    { id: 'toile', label: 'Toile', type: 'choice', default: 'ecru', options: [
      { value: 'ecru', label: 'Écru', hex: '#EFE7D6' },
      { value: 'gris', label: 'Gris ardoise', hex: '#5A6470' },
      { value: 'raye', label: 'Rayé multicolore', hex: '#B5643C' },
      { value: 'premium', label: 'Toile premium (Dickson)', hex: '#2E4C3B' },
    ] },
    { id: 'manoeuvre', label: 'Manœuvre', type: 'choice', default: 'manuelle', options: [
      { value: 'manuelle', label: 'Manuelle (manivelle)' },
      { value: 'motorisee', label: 'Motorisée' },
    ] },
    { id: 'moteur', label: 'Motorisation', type: 'choice', default: 'filaire', visibleWhen: eq('manoeuvre', 'motorisee'), options: [
      { value: 'filaire', label: 'Filaire' },
      { value: 'radio', label: 'Radio (télécommande)' },
      { value: 'solaire', label: 'Solaire' },
    ] },
    { id: 'capteur_vent', label: 'Capteur vent/soleil', type: 'boolean', visibleWhen: eq('manoeuvre', 'motorisee') },
    { id: 'lambrequin', label: 'Lambrequin enroulable', type: 'boolean' },
    { id: 'led', label: 'Éclairage LED intégré', type: 'boolean' },
  ],
  derived: [
    { id: 'surface_m2', expr: mul(div(V('largeur'), 1000), div(V('avancee'), 1000)) },
    { id: 'prix_m2', expr: { op: 'if', cond: eq('modele', 'coffre_integral'), then: 300,
      else: { op: 'if', cond: eq('modele', 'semi_coffre'), then: 230, else: 180 } } },
  ],
  steps: [
    { id: 'modele', title: 'Modèle', fields: ['modele'] },
    { id: 'dim', title: 'Dimensions', fields: ['largeur', 'avancee'] },
    { id: 'toile', title: 'Toile', fields: ['toile'] },
    { id: 'manoeuvre', title: 'Manœuvre', fields: ['manoeuvre', 'moteur', 'capteur_vent'] },
    { id: 'options', title: 'Options', fields: ['lambrequin', 'led'] },
    { id: 'recap', title: 'Récapitulatif', fields: [] },
  ],
  priceRules: [
    { code: 'base', label: 'Toile + structure', kind: 'base', amount: round(mul(V('surface_m2'), V('prix_m2'))) },
    { code: 'toile_premium', label: 'Toile premium', kind: 'add', when: eq('toile', 'premium'), amount: round(mul(V('surface_m2'), 15)) },
    { code: 'mot_filaire', label: 'Motorisation filaire', kind: 'add', when: { all: [eq('manoeuvre', 'motorisee'), eq('moteur', 'filaire')] }, amount: 150 },
    { code: 'mot_radio', label: 'Motorisation radio', kind: 'add', when: { all: [eq('manoeuvre', 'motorisee'), eq('moteur', 'radio')] }, amount: 220 },
    { code: 'mot_solaire', label: 'Motorisation solaire', kind: 'add', when: { all: [eq('manoeuvre', 'motorisee'), eq('moteur', 'solaire')] }, amount: 320 },
    { code: 'capteur', label: 'Capteur vent/soleil', kind: 'add', when: { all: [eq('manoeuvre', 'motorisee'), eq('capteur_vent', true)] }, amount: 180 },
    { code: 'lambrequin', label: 'Lambrequin enroulable', kind: 'add', when: eq('lambrequin', true), amount: 90 },
    { code: 'led', label: 'Éclairage LED', kind: 'add', when: eq('led', true), amount: 140 },
  ],
  constraints: [
    { requires: { all: [gte('largeur', 1500), lte('largeur', 6000)] }, message: 'Largeur : 1500 à 6000 mm' },
    { requires: { all: [gte('avancee', 1500), lte('avancee', 3500)] }, message: 'Avancée : 1500 à 3500 mm' },
    { requires: lte('surface_m2', 21), message: 'Surface maximale 21 m² dépassée' },
  ],
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'store-banne.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
console.log(`Écrit ${path.relative(process.cwd(), out)} — ${def.fields.length} champs, ${def.priceRules.length} règles, 0 grille (prix par formule).`);
