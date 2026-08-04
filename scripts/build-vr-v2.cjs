/* =====================================================================
   Convertisseur def VR v1 -> def v2 (moteur universel).
   Déterministe : lit lib/configurateur/data/volet-roulant-traditionnel.json
   (v1) et produit ...v2.json.
   Recentré sur le TRADI 1.1.1 (arbre PDG) :
     - retrait du coffre PVC (Briquélite/Néothermic/Néobric = 1.1.2) ;
     - structure « deux familles » : Tradi standard vs Tradi Express ;
     - couleurs séparées tablier/coulisse/lame finale ;
     - manœuvre restructurée (manuelle/motorisée + position + côté) ;
     - genouillère en choix unique + maintenu/fixe ;
     - contrôles surface & poids.
   ISO-PRIX conservé pour la base + attaches + manœuvre manuelle + moteur.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const v1 = require('../lib/configurateur/data/volet-roulant-traditionnel.json');

// ---- helpers conditions/expr ----
const V = (name) => ({ var: name });
const eq = (name, val) => ({ op: 'eq', left: V(name), right: val });
const inSet = (name, set) => ({ op: 'in', value: V(name), set });
const gte = (name, n) => ({ op: 'gte', left: V(name), right: n });
const lte = (name, n) => ({ op: 'lte', left: V(name), right: n });
const AND = (cs) => (cs.length === 1 ? cs[0] : { all: cs });
const ANY = (cs) => (cs.length === 1 ? cs[0] : { any: cs });
const scopeConds = (scope, layer) => {
  const cs = [];
  if (scope) for (const [k, val] of Object.entries(scope)) cs.push(eq(k, val));
  if (layer) cs.push(eq('layer', layer));
  return cs;
};

// ---- combinaisons de grilles ----
const gridKeys = v1.grids.map((g) => g.key);
const poses = [...new Set(gridKeys.map((k) => k.pose))];
const posesForLame = {};
for (const k of gridKeys) (posesForLame[k.lame] ??= new Set()).add(k.pose);

// ---- FIELDS ----
const fields = [];

for (const sel of v1.selectors) {
  if (sel.id === 'coffre') continue; // A. coffre PVC retiré (relève du 1.1.2)

  // D. Manœuvre : choix primaire manuelle/motorisée, juste avant le moteur.
  if (sel.id === 'moteur') {
    fields.push({
      id: 'manoeuvre', label: 'Manœuvre', type: 'choice', default: 'motorisee',
      help: 'La manœuvre manuelle est tarifée à partir de la grille filaire.',
      options: [
        { value: 'manuelle', label: 'Manuelle (tringle / sangle)', setsValues: { layer: 'filaire' } },
        { value: 'motorisee', label: 'Motorisée' },
      ],
    });
  }

  const f = { id: sel.id, label: sel.label, type: 'choice', options: [] };
  const vis = scopeConds(sel.scope, sel.layer);
  if (vis.length) f.visibleWhen = AND(vis);

  for (const o of sel.options) {
    if (sel.id === 'type_volet' && (o.value === 'express' || o.value === 'zf')) continue; // express -> gamme_tradi ; ZF retiré
    const opt = { value: o.value, label: o.label };
    if (o.hint) opt.hint = o.hint;
    if (o.derivedAxes) opt.setsValues = o.derivedAxes;
    if (sel.id === 'lame') {
      const ps = [...posesForLame[o.value]];
      if (ps.length < poses.length) opt.availableWhen = inSet('pose', ps); // express -> cd942 seul
    }
    f.options.push(opt);
  }
  // B. type_volet (5 poses) visible uniquement en Tradi standard.
  if (sel.id === 'type_volet') f.visibleWhen = eq('gamme_tradi', 'standard');

  fields.push(f);

  // B. gamme_tradi juste APRÈS type_volet : l'ordre des setsValues fait gagner
  //    pose=express sur la pose posée par type_volet (caché) ; avant `lame`.
  if (sel.id === 'type_volet') {
    fields.push({
      id: 'gamme_tradi', label: 'Type de Tradi', type: 'choice', default: 'standard',
      help: 'Tradi standard (5 poses, 3 lames) ou Tradi Express (lame CD942 uniquement).',
      options: [
        { value: 'standard', label: 'Tradi standard' },
        { value: 'express', label: 'Tradi Express', setsValues: { pose: 'express' } },
      ],
    });
  }

  // Couche (filaire/radio) après moteur — visible seulement en motorisée.
  if (sel.id === 'moteur') {
    fields.push({
      id: 'layer', label: 'Type de commande', type: 'choice', default: 'filaire',
      visibleWhen: eq('manoeuvre', 'motorisee'),
      options: [{ value: 'filaire', label: 'Filaire' }, { value: 'radio', label: 'Radio' }],
    });
    // Position & côté de manœuvre — fabrication, sans +value.
    fields.push({ id: 'position', label: 'Position de manœuvre', type: 'choice', role: 'spec', default: 'facade',
      options: [{ value: 'facade', label: 'En façade' }, { value: 'sous_coffre', label: 'Sous-coffre (sortie de fil)' }] });
    fields.push({ id: 'cote', label: 'Côté de manœuvre', type: 'choice', role: 'spec', default: 'droite',
      options: [{ value: 'droite', label: 'Droite' }, { value: 'gauche', label: 'Gauche' }] });
  }
}

// C. Coloris : 3 sélecteurs (tablier / coulisse / lame finale).
const lamesForColor = (code) => v1.colorPolicies.filter((p) => p.standard.includes(code) || p.pvM2?.codes.includes(code)).map((p) => p.lame);
const allLames = v1.colorPolicies.map((p) => p.lame);
// Listes coulisse & lame finale (identiques, source PDG) — indépendantes de la lame.
const COL_STD = ['blanc-9010', 'ivoire-1015', 'gris-7035', 'gris-7038', 'gris-7016', 'alu-9006', 'marron-8019'];
const COL_OPT = ['rouge-3004', 'bleu-5011', 'vert-6005', 'vert-6009', 'vert-6021', 'gris-7011', 'gris-7012',
  'gris-7021', 'gris-7022', 'gris-7039', 'marron-8014', 'noir-9005', 'gris-9007', 'noir-2100', 'gris-2900'];
const COL_ALL = [...COL_STD, ...COL_OPT];
// allow=null : tablier (toutes couleurs, filtrées par lame). allow=[...] : liste
// propre (coulisse & lame finale), sans filtre lame.
function makeColorField(id, label, allow) {
  const src = allow ? v1.colors.filter((c) => allow.includes(c.code)) : v1.colors;
  const f = { id, label, type: 'choice', default: src[0].code, options: [] };
  for (const c of src) {
    const opt = { value: c.code, label: c.label, hex: c.hex };
    if (!allow) { const la = lamesForColor(c.code); if (la.length < allLames.length) opt.availableWhen = inSet('lame', la); }
    f.options.push(opt);
  }
  return f;
}
fields.push(makeColorField('color_tablier', 'Coloris tablier', null));
fields.push(makeColorField('color_coulisse', 'Coloris coulisse', COL_ALL));
fields.push(makeColorField('color_lame_finale', 'Coloris lame finale', COL_ALL));

// dimensions
fields.push({ id: 'largeur', label: 'Largeur dos de coulisse', type: 'dimension', unit: 'mm', default: 1200 });
fields.push({ id: 'hauteur', label: 'Hauteur sous coffre', type: 'dimension', unit: 'mm', default: 1000 });
// F. Message de contrôle (surface max admissible par lame).
fields.push({ id: 'surface_info', type: 'info',
  help: 'Surface maximale admissible : CD942 8 m², Alu 56 10 m², Alu 55 12 m².' });

// ---- TABLES 2D (grilles) ----
const d2 = {};
const gridTableId = (k, layer) => `g_${k.pose}_${k.lame}_${k.moteur}_${layer}`;
for (const g of v1.grids) {
  for (const [layer, lg] of Object.entries(g.layers)) {
    d2[gridTableId(g.key, layer)] = {
      rows: g.heights,
      cols: lg.widths,
      cells: g.heights.map((h) => lg.rows[String(h)]),
    };
  }
}

// ---- DERIVED ----
// SUR MESURE : aucun arrondi des cotes. Le PRIX se lit par bande (lookup1d/2d
// snappent en interne pour trouver la bonne case), mais la surface et la cote
// fabriquée utilisent les dimensions EXACTES saisies par le client.
const derived = [
  { id: 'grid', expr: { op: 'concat', args: ['g_', V('pose'), '_', V('lame'), '_', V('moteur'), '_', V('layer')] } },
  { id: 'surface_m2', expr: { op: '*', args: [{ op: '/', args: [V('largeur'), 1000] }, { op: '/', args: [V('hauteur'), 1000] }] } },
  // NB : le poids du tablier / la puissance moteur sont gérés dans Optilog (hors SaaS).
];

// Largeur MINIMALE réelle = borne basse « L de » de la 1re bande de la grille,
// par pose/lame/moteur/couche (source : en-têtes des grilles du tarif).
const WIDTH_MIN = {
  'independant/cd942/mn': { filaire: 300, radio: 506 }, 'independant/cd942/somfy': { filaire: 400, radio: 400 },
  'independant/56/mn': { filaire: 300, radio: 506 },    'independant/56/somfy': { filaire: 400, radio: 400 },
  'independant/55/mn': { filaire: 1100, radio: 1100 },  'independant/55/somfy': { filaire: 1100, radio: 1100 },
  'coffre/cd942/mn': { filaire: 300, radio: 506 },      'coffre/cd942/somfy': { filaire: 400, radio: 400 },
  'coffre/56/mn': { filaire: 300, radio: 506 },         'coffre/56/somfy': { filaire: 400, radio: 400 },
  'express/cd942/mn': { filaire: 385, radio: 591 },     'express/cd942/somfy': { filaire: 400, radio: 400 },
};

// ---- PRICE RULES ----
const priceRules = [];
const d1 = {};

// base
priceRules.push({ code: 'base', label: 'Prix de base', kind: 'base',
  amount: { op: 'lookup2d', table: V('grid'), row: V('hauteur'), col: V('largeur') } });

// A. Ajustements — hors coffre PVC (Briquélite/Néothermic/Néobric).
const COFFRE_PVC = ['coffre_briquelite', 'coffre_neothermic', 'coffre_neobric'];
const adjustments = v1.adjustments.filter((a) => !COFFRE_PVC.includes(a.code));
const optionalCodes = {}; // code -> [conditions par ajustement]
adjustments.forEach((adj, i) => {
  const tid = `adj_${i}`;
  d1[tid] = { keys: Object.keys(adj.baremeParLargeur).map(Number).sort((a, b) => a - b), values: [] };
  d1[tid].values = d1[tid].keys.map((k) => adj.baremeParLargeur[String(k)]);
  const cs = scopeConds(adj.scope, adj.layer);
  if (adj.code === 'manoeuvre_manuelle') {
    cs.push(eq('manoeuvre', 'manuelle')); // D. piloté par le champ manœuvre (pas de booléen)
  } else if (adj.optional) {
    cs.push(eq(adj.code, true));
    (optionalCodes[adj.code] ??= []).push(AND(scopeConds(adj.scope, adj.layer)));
  }
  priceRules.push({ code: `${adj.code}_${i}`, label: adj.label, kind: 'add',
    when: cs.length ? AND(cs) : undefined,
    amount: { op: 'lookup1d', table: tid, key: V('largeur') } });
});
// champs booléens pour ajustements optionnels (attaches rigides, sous-face…)
for (const [code, condList] of Object.entries(optionalCodes)) {
  const label = adjustments.find((a) => a.code === code).label;
  const uniq = [...new Map(condList.map((c) => [JSON.stringify(c), c])).values()];
  fields.push({ id: code, label, type: 'boolean', visibleWhen: ANY(uniq) });
}

// C. Coloris : +value quand une couleur « option » est choisie pour l'élément.
//    Tablier +14 €/m² (surface) ; coulisse +40 €/ml (hauteur) ; lame finale +18 €/ml (largeur).
//    (source arbre PDG : le libellé « + value X linéaire » s'applique à la section qui SUIT.)
// Tablier : couleurs « option » PAR LAME (source colorPolicies).
const optionColorCond = (fieldId) => ANY(v1.colorPolicies
  .filter((p) => p.pvM2?.codes?.length)
  .map((p) => AND([eq('lame', p.lame), inSet(fieldId, p.pvM2.codes)])));
// Coulisse / lame finale : couleurs « option » À PLAT (liste PDG, indép. lame).
const flatOptionCond = (fieldId) => inSet(fieldId, COL_OPT);
priceRules.push({ code: 'color_tablier_pv', label: 'Coloris tablier (option)', kind: 'add',
  when: optionColorCond('color_tablier'),
  amount: { op: 'round', arg: { op: '*', args: [V('surface_m2'), 14] } } });
priceRules.push({ code: 'color_coulisse_pv', label: 'Coloris coulisse (option)', kind: 'add',
  when: flatOptionCond('color_coulisse'),
  amount: { op: 'round', arg: { op: '*', args: [{ op: '/', args: [V('hauteur'), 1000] }, 40, 2] } } }); // ×2 coulisses
priceRules.push({ code: 'color_lame_finale_pv', label: 'Coloris lame finale (option)', kind: 'add',
  when: flatOptionCond('color_lame_finale'),
  amount: { op: 'round', arg: { op: '*', args: [{ op: '/', args: [V('largeur'), 1000] }, 18] } } });

// Options fixes -> champs booléens + règles (genouillères regroupées à part).
const GENOU = ['genouillere_60', 'genouillere_60a', 'genouillere_90', 'genouillere_90a'];
for (const o of v1.options) {
  if (GENOU.includes(o.code)) continue; // E.
  const vis = scopeConds(o.scope, o.layer);
  fields.push({ id: o.code, label: o.label, type: 'boolean', ...(vis.length ? { visibleWhen: AND(vis) } : {}) });
  priceRules.push({ code: `opt_${o.code}`, label: o.label, kind: 'add',
    when: AND([eq(o.code, true), ...vis]),
    amount: o.priceHT });
}

// E. Genouillère : un seul choix + sous-choix maintenu/fixe (fabrication).
const genouPrice = (c) => (v1.options.find((o) => o.code === c)?.priceHT ?? 0);
fields.push({ id: 'genouillere', label: 'Genouillère', type: 'choice', default: 'sc60_incluse',
  help: 'Sous-coffre 60° et applique 60° non aimantée sont incluses dans le prix.',
  options: [
    { value: 'sc60_incluse', label: 'Sous-coffre 60° (incluse)' },
    { value: 'app60', label: 'En applique 60° non aimantée (incluse)' },
    { value: 'app90', label: 'En applique 90° non aimantée' },
    { value: 'app60a', label: 'En applique 60° aimantée' },
    { value: 'app90a', label: 'En applique 90° aimantée' },
  ] });
fields.push({ id: 'genouillere_fix', label: 'Maintien de la genouillère', type: 'choice', role: 'spec', default: 'maintenu',
  visibleWhen: inSet('genouillere', ['app60', 'app90', 'app60a', 'app90a']),
  options: [{ value: 'maintenu', label: 'Maintenu' }, { value: 'fixe', label: 'Fixe' }] });
const GENOU_MAP = { app60: 'genouillere_60', app90: 'genouillere_90', app60a: 'genouillere_60a', app90a: 'genouillere_90a' };
for (const [val, code] of Object.entries(GENOU_MAP)) {
  const price = genouPrice(code);
  if (price > 0) priceRules.push({ code: `opt_${code}`, label: v1.options.find((o) => o.code === code).label, kind: 'add',
    when: eq('genouillere', val), amount: price });
}

// Coulisse Tradi Express « 53×22 à aile » : +8,50 €/ml (hauteur) × 2 coulisses.
priceRules.push({ code: 'coulisse_express_aile', label: 'Coulisse 53×22 à aile', kind: 'add',
  when: AND([eq('gamme_tradi', 'express'), eq('coulisse_express', 'c53x22_aile')]),
  amount: { op: 'round', arg: { op: '*', args: [{ op: '/', args: [V('hauteur'), 1000] }, 8.5, 2] } } });

// champs de fabrication (specFields)
for (const sf of (v1.specFields ?? [])) {
  const vis = scopeConds(sf.scope, sf.layer);
  fields.push({ id: sf.id, label: sf.label, type: sf.type, role: 'spec',
    ...(sf.options ? { options: sf.options } : {}),
    ...(sf.defaultValue !== undefined ? { default: sf.defaultValue } : {}),
    ...(vis.length ? { visibleWhen: AND(vis) } : {}) });
}

// Perçage des coulisses (fabrication) — juste après l'enroulement.
fields.push({ id: 'percage', label: 'Perçage des coulisses', type: 'choice', role: 'spec', default: 'tableau',
  options: [{ value: 'tableau', label: 'Perçage tableau' }, { value: 'non_perce', label: 'Non percé' }] });

// Coulisses spécifiques Tradi Express (choix de profil).
fields.push({ id: 'coulisse_express', label: 'Coulisses', type: 'choice', default: 'c45x22',
  visibleWhen: eq('gamme_tradi', 'express'),
  options: [
    { value: 'c45x22', label: 'Coulisse 45×22 (par défaut)' },
    { value: 'c53x22', label: 'Coulisse 53×22 (sans plus-value)' },
    { value: 'c53x22_aile', label: 'Coulisse 53×22 à aile (+8,50 €/ml)' },
  ] });

// ---- CONSTRAINTS (limites dimensionnelles) ----
const nonPose = v1.limits.filter((l) => !l.pose);
const constraints = [];
// surface max
constraints.push({ message: 'Surface maximale dépassée pour cette lame',
  requires: ANY(nonPose.map((l) => AND([eq('lame', l.lame), lte('surface_m2', l.surfaceMaxM2)]))) });
// largeur max
constraints.push({ message: 'Largeur maximale dépassée pour cette lame',
  requires: ANY(nonPose.map((l) => AND([eq('lame', l.lame), lte('largeur', l.largeurMax)]))) });
// hauteur max (commune)
constraints.push({ message: 'Hauteur maximale dépassée',
  requires: lte('hauteur', Math.max(...nonPose.map((l) => l.hauteurMax))) });
// Largeur mini réelle par grille (pose/lame/moteur/couche) — couvre la lame 55 (1100).
const minClauses = [];
for (const [key, m] of Object.entries(WIDTH_MIN)) {
  const [pose, lame, moteur] = key.split('/');
  for (const layer of ['filaire', 'radio']) {
    minClauses.push(AND([eq('pose', pose), eq('lame', lame), eq('moteur', moteur), eq('layer', layer), gte('largeur', m[layer])]));
  }
}
constraints.push({ message: 'Largeur inférieure au minimum de la grille pour cette configuration', requires: ANY(minClauses) });

// ---- STEPS (assistant) ----
const optionFieldIds = [
  ...Object.keys(optionalCodes),
  ...v1.options.filter((o) => !GENOU.includes(o.code)).map((o) => o.code),
  'genouillere', 'genouillere_fix',
];
const specIds = (v1.specFields ?? []).map((s) => s.id);
const steps = [
  { id: 'type', title: 'Type & pose', fields: ['gamme_tradi', 'type_volet', ...specIds, 'percage'] },
  { id: 'lame', title: 'Lame & coulisses', fields: ['lame', 'coulisse_express'] },
  { id: 'manoeuvre', title: 'Manœuvre', fields: ['manoeuvre', 'moteur', 'layer', 'radio_somfy', 'position', 'cote'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur', 'surface_info'] },
  { id: 'coloris', title: 'Coloris', fields: ['color_tablier', 'color_coulisse', 'color_lame_finale'] },
  { id: 'options', title: 'Options', fields: optionFieldIds },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

const def = {
  slug: v1.slug, name: v1.name, famille: v1.famille,
  fields, derived, steps, priceRules, tables: { d1, d2 }, constraints,
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'volet-roulant-traditionnel.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`Écrit ${path.relative(process.cwd(), out)} (${kb} Ko) — ${fields.length} champs, ${priceRules.length} règles, ${Object.keys(d2).length} tables 2D, ${Object.keys(d1).length} tables 1D, ${constraints.length} contraintes.`);
