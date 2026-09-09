/* =====================================================================
   Build def v2 — MOUSTIQUAIRES (gamme 3). UN configurateur pour tous les modèles
   (data-driven, sans motorisation). Familles → modèles (nodeField=type) → dimensions
   → ventaux → coloris standard → options de fabrication.
   Grilles : scripts/parse-moustiquaire.cjs → moustiquaire-grids.json (H×L par modèle,
   variantes ventaux _v2/_vr). Bornes L/H générées depuis chaque grille.
   ⚠️ Coloris usuels/spéciaux + plus-values, Eco+ « autres couleurs », partie basse pleine
   (bakélite/polycarbonate) : PLUS TARD (à tarifer). Ventaux Mylas = sans impact prix.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const grids = require('../lib/configurateur/data/moustiquaire-grids.json');

const V = (n) => ({ var: n });
const eq = (n, v) => ({ op: 'eq', left: V(n), right: v });
const ne = (n, v) => ({ op: 'ne', left: V(n), right: v });
const inSet = (n, set) => ({ op: 'in', value: V(n), set });
const AND = (cs) => (cs.length === 1 ? cs[0] : { all: cs });

// Modèle → famille + libellé. Slugs = sous-familles de la gamme 3 (nomenclature).
const MODELS = [
  { slug: 'mous-eco', label: 'Eco', famille: 'verticales' },
  { slug: 'mous-eco-plus', label: 'Eco+', famille: 'verticales' },
  { slug: 'aglae', label: 'Aglaé', famille: 'verticales' },
  { slug: 'cecias', label: 'Cecias', famille: 'verticales' },
  { slug: 'lips', label: 'Lips', famille: 'verticales' },
  { slug: 'aura', label: 'Aura', famille: 'verticales' },
  { slug: 'zephyr', label: 'Zephyr', famille: 'laterales' },
  { slug: 'boree', label: 'Borée', famille: 'laterales' },
  { slug: 'calista', label: 'Calista', famille: 'plissees' },
  { slug: 'circe', label: 'Circé', famille: 'plissees' },
  { slug: 'mylas', label: 'Mylas', famille: 'fixes' },
  { slug: 'lyssa', label: 'Lyssa', famille: 'battantes' },
];
const FAMILLES = [
  { value: 'verticales', label: 'Verticales' }, { value: 'laterales', label: 'Latérales' },
  { value: 'plissees', label: 'Plissées' }, { value: 'fixes', label: 'Fixes' }, { value: 'battantes', label: 'Battantes' },
];
// Modèles à variantes VENTAUX tarifées (grilles _v2 / _vr). Mylas a des ventaux SANS
// impact prix (choix fabrication). Verticales : pas de ventaux.
const VENTAUX_GRID = { zephyr: ['v1', 'v2'], boree: ['v1', 'v2'], calista: ['v1', 'v2'], circe: ['v1', 'vr', 'v2'], lyssa: ['v1', 'v2'] };
const VENTAUX_LABEL = { v1: '1 vantail', v2: '2 vantaux', vr: '1 vantail réversible' };

const fields = [];

// Famille puis Modèle (nodeField). Le modèle est filtré par la famille.
fields.push({ id: 'famille_mous', label: 'Type de moustiquaire', type: 'choice', default: 'verticales', options: FAMILLES });
fields.push({
  id: 'type', label: 'Modèle', type: 'choice', default: 'mous-eco',
  options: MODELS.map((m) => ({ value: m.slug, label: m.label, availableWhen: eq('famille_mous', m.famille) })),
});

// Dimensions (cotes de commande = largeur dos de coulisse × hauteur coffre compris).
fields.push({ id: 'dim_help', type: 'info', help: 'Dimensions de commande : largeur = dos de coulisse · hauteur = coffre compris.' });
// Dimensions NON pré-remplies : le prix (grille H×L) n'apparaît qu'une fois les cotes saisies.
fields.push({ id: 'largeur', label: 'Largeur', type: 'dimension', unit: 'mm', min: 500, max: 3500, step: 1 });
fields.push({ id: 'hauteur', label: 'Hauteur', type: 'dimension', unit: 'mm', min: 550, max: 2550, step: 1 });

// Ventaux (impact prix via grille) — modèles latéraux/plissés/battante.
const VENTAUX_TYPES = Object.keys(VENTAUX_GRID);
fields.push({
  id: 'ventaux', label: 'Vantaux', type: 'choice', default: 'v1',
  visibleWhen: inSet('type', VENTAUX_TYPES),
  options: [
    { value: 'v1', label: '1 vantail' },
    { value: 'v2', label: '2 vantaux' },
    { value: 'vr', label: '1 vantail réversible', availableWhen: eq('type', 'circe') },
  ],
});

// Eco+ : gamme de coloris STANDARD (grille de base) ou AUTRES COULEURS (grille _autres,
// plus chère). Les vraies couleurs « autres » seront ajoutées plus tard ; ici on câble le
// basculement de grille. (Usuels/spéciaux + PV des autres modèles : plus tard.)
const ECOPLUS_AUTRES = AND([eq('type', 'mous-eco-plus'), eq('coloris_gamme', 'autres')]);
fields.push({
  id: 'coloris_gamme', label: 'Gamme de coloris', type: 'choice', default: 'standard',
  visibleWhen: eq('type', 'mous-eco-plus'),
  options: [
    { value: 'standard', label: 'Coloris standard' },
    { value: 'autres', label: 'Autres couleurs (nous consulter)' },
  ],
});
// Coloris STANDARD (sans plus-value). Masqué quand « autres couleurs » (Eco+) est choisi.
fields.push({
  id: 'coloris', label: 'Coloris', type: 'choice', default: 'blanc-9010',
  // Masqué pour Eco+ « autres couleurs » ET pour Circé (qui a profilés + toile séparés).
  visibleWhen: { all: [{ any: [ne('type', 'mous-eco-plus'), ne('coloris_gamme', 'autres')] }, ne('type', 'circe')] },
  help: 'Coloris standard (sans plus-value). Accessoires blancs sur moustiquaire blanche, noirs sinon.',
  options: [
    { value: 'blanc-9010', label: 'Blanc 9010', hex: '#f4f4f2' },
    { value: 'gris-7016', label: 'Gris anthracite 7016', hex: '#383e42' },
    { value: 'marron-8019', label: 'Marron 8019 (proche)', hex: '#3d3635' },
  ],
});
fields.push({ id: 'coloris_autres_info', type: 'info', visibleWhen: ECOPLUS_AUTRES,
  help: 'Autres couleurs (RAL / structuré) : coloris à préciser à la commande. Tarif « autres couleurs » appliqué.' });
// Circé : deux axes de coloris (capture PDG) — couleur des profilés (standard) + couleur
// de la toile (noire / grise, sans plus-value). Coloris usuels/spéciaux : plus tard.
fields.push({
  id: 'coloris_profiles', label: 'Couleur des profilés', type: 'choice', default: 'blanc-9010',
  visibleWhen: eq('type', 'circe'),
  help: 'Coloris standard des profilés (sans plus-value).',
  options: [
    { value: 'blanc-9010', label: 'Blanc 9010', hex: '#f4f4f2' },
    { value: 'gris-7016', label: 'Gris anthracite 7016', hex: '#383e42' },
    { value: 'marron-8019', label: 'Marron 8019 (proche)', hex: '#3d3635' },
  ],
});
fields.push({
  id: 'coloris_toile', label: 'Couleur de la toile', type: 'choice', role: 'spec', default: 'noire',
  visibleWhen: eq('type', 'circe'),
  options: [{ value: 'noire', label: 'Noire', hex: '#1a1a1a' }, { value: 'grise', label: 'Grise', hex: '#8a8a8a' }],
});

// Options de FABRICATION (sans impact prix) — spécifiques à certains modèles.
fields.push({ id: 'percage_coulisse', label: 'Perçage coulisse', type: 'choice', role: 'spec', default: 'facade',
  visibleWhen: eq('type', 'aglae'), options: [{ value: 'facade', label: 'Façade' }, { value: 'tableau', label: 'Tableau' }] });
fields.push({ id: 'position_chainette', label: 'Position chaînette', type: 'choice', role: 'spec', default: 'droite',
  visibleWhen: eq('type', 'cecias'), options: [{ value: 'gauche', label: 'Gauche' }, { value: 'droite', label: 'Droite' }] });
fields.push({ id: 'type_fixation', label: 'Type de fixation', type: 'choice', role: 'spec', default: 'aimants',
  visibleWhen: eq('type', 'mylas'), options: [{ value: 'aimants', label: 'Aimants' }, { value: 'equerres', label: 'Équerres' }] });
fields.push({ id: 'ventaux_mylas', label: 'Vantaux', type: 'choice', role: 'spec', default: '1',
  visibleWhen: eq('type', 'mylas'), help: 'Sans impact sur le prix.',
  options: [{ value: '1', label: '1 vantail' }, { value: '2', label: '2 vantaux' }] });
// Partie basse pleine (Lyssa) — plus-value bakélite/polycarbonate : 215 € (1 vantail) / 430 € (2 vantaux).
fields.push({ id: 'partie_basse_pleine', label: 'Partie basse pleine', type: 'choice', default: 'non',
  visibleWhen: eq('type', 'lyssa'), help: 'Bakélite ou polycarbonate — plus-value 215 € (1 vantail) / 430 € (2 vantaux).',
  options: [{ value: 'non', label: 'Non' }, { value: 'bakelite', label: 'Bakélite' }, { value: 'polycarbonate', label: 'Polycarbonate' }] });

// ---- Dérivées : routage de grille ----
const derived = [
  // Grille = mous_<type> ; Eco+ « autres couleurs » → grille _autres ; sinon + _<ventaux>
  // pour les modèles à variantes tarifées (v2/vr).
  { id: 'grid', expr: {
      op: 'if', cond: ECOPLUS_AUTRES, then: 'mous_mous-eco-plus_autres',
      else: {
        op: 'if', cond: AND([inSet('type', VENTAUX_TYPES), ne('ventaux', 'v1')]),
        then: { op: 'concat', args: ['mous_', V('type'), '_', V('ventaux')] },
        else: { op: 'concat', args: ['mous_', V('type')] },
      },
    } },
];

// ---- Prix de base = lookup2d(grille, hauteur, largeur) ----
const priceRules = [
  { code: 'base', label: 'Moustiquaire (grille)', kind: 'base',
    amount: { op: 'lookup2d', table: V('grid'), row: V('hauteur'), col: V('largeur') } },
  // Partie basse pleine (Lyssa) : +215 € (1 vantail) / +430 € (2 vantaux).
  { code: 'partie_basse_pleine', label: 'Partie basse pleine (bakélite/polycarbonate)', kind: 'add',
    when: AND([eq('type', 'lyssa'), ne('partie_basse_pleine', 'non')]),
    amount: { op: 'if', cond: eq('ventaux', 'v2'), then: 430, else: 215 } },
];

// ---- Contraintes de bornes : L/H dans la plage de la grille sélectionnée ----
// Générées depuis chaque grille (rows=hauteurs, cols=largeurs). Le prix hors plage
// n'est pas tarifable ; message ciblé par grille.
const gridOfType = (m) => (VENTAUX_GRID[m.slug] ? VENTAUX_GRID[m.slug] : ['v1']);
const keyFor = (slug, v) => (v === 'v1' ? `mous_${slug}` : `mous_${slug}_${v}`);
const constraints = [];
for (const m of MODELS) {
  for (const v of gridOfType(m)) {
    const g = grids[keyFor(m.slug, v)];
    if (!g) { console.warn('  ⚠ grille absente:', keyFor(m.slug, v)); continue; }
    const lmin = g.cols[0], lmax = g.cols[g.cols.length - 1];
    const hmin = g.rows[0], hmax = g.rows[g.rows.length - 1];
    // Ne s'applique qu'à ce (type, ventaux). Pour les modèles sans ventaux tarifé, v='v1'.
    const scope = VENTAUX_GRID[m.slug] ? AND([eq('type', m.slug), eq('ventaux', v)]) : eq('type', m.slug);
    const ok = { all: [
      { op: 'gte', left: V('largeur'), right: lmin }, { op: 'lte', left: V('largeur'), right: lmax },
      { op: 'gte', left: V('hauteur'), right: hmin }, { op: 'lte', left: V('hauteur'), right: hmax },
    ] };
    constraints.push({ requires: { any: [{ op: 'ne', left: V('type'), right: m.slug }, ...(VENTAUX_GRID[m.slug] ? [ne('ventaux', v)] : []), ok] },
      message: `${m.label}${VENTAUX_GRID[m.slug] ? ' (' + VENTAUX_LABEL[v] + ')' : ''} : largeur ${lmin}–${lmax} mm, hauteur ${hmin}–${hmax} mm.` });
  }
}

// ---- Étapes ----
const steps = [
  { id: 'modele', title: 'Modèle', fields: ['famille_mous', 'type', 'ventaux'] },
  { id: 'dim', title: 'Dimensions', fields: ['dim_help', 'largeur', 'hauteur'] },
  { id: 'coloris', title: 'Coloris', fields: ['coloris_gamme', 'coloris', 'coloris_autres_info', 'coloris_profiles', 'coloris_toile'] },
  { id: 'options', title: 'Options', fields: ['percage_coulisse', 'position_chainette', 'type_fixation', 'ventaux_mylas', 'partie_basse_pleine'] },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

// ---- tableLabels (onglets Excel lisibles) ----
const tableLabels = {};
for (const k of Object.keys(grids)) tableLabels[k] = k.replace(/^mous_/, '').replace(/mous-/, '').toUpperCase();

const def = {
  slug: 'moustiquaire', name: 'Moustiquaire', famille: 'moustiquaires', nodeField: 'type',
  fields, derived, steps, priceRules, tables: { d2: grids }, tableLabels, constraints,
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'moustiquaire.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
console.log(`Écrit ${path.relative(process.cwd(), out)} — ${fields.length} champs, ${priceRules.length} règle(s), ${constraints.length} contraintes, ${Object.keys(grids).length} grilles.`);
