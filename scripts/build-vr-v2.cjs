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
const ne = (name, val) => ({ op: 'ne', left: V(name), right: val });
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

  const f = { id: sel.id, label: sel.label, type: 'choice', options: [] };
  const vis = scopeConds(sel.scope, sel.layer);
  if (vis.length) f.visibleWhen = AND(vis);

  for (const o of sel.options) {
    if (sel.id === 'type_volet' && (o.value === 'express' || o.value === 'zf')) continue; // express -> gamme_tradi ; ZF retiré
    const opt = { value: o.value, label: o.label };
    if (o.hint) opt.hint = o.hint;
    if (o.derivedAxes) opt.setsValues = o.derivedAxes;
    // Poses tunnel = 1.1.1 : mêmes prix qu'Indépendant/Drapeau (grille independant).
    // Les grilles `coffre` correspondaient au 1.1.2 (Tradi + coffre).
    if (sel.id === 'type_volet' && o.value === 'tunnel_mn') { opt.label = 'Tradi tunnel MN'; opt.setsValues = { pose: 'independant' }; }
    if (sel.id === 'type_volet' && o.value === 'tunnel_inconnu') { opt.label = 'Tradi tunnel inconnu'; opt.setsValues = { pose: 'independant' }; }
    if (sel.id === 'moteur' && o.value === 'somfy') opt.label = 'Moteur Somfy';
    if (sel.id === 'lame') {
      const ps = [...posesForLame[o.value]];
      if (ps.length < poses.length) opt.availableWhen = inSet('pose', ps); // express -> cd942 seul
    }
    // radio_somfy : io/rts dispo en commande radio ; solaire en commande solaire.
    if (sel.id === 'radio_somfy') opt.availableWhen = o.value === 'solaire' ? eq('commande', 'solaire') : eq('commande', 'radio');
    f.options.push(opt);
  }
  // B. type_volet (poses) visible uniquement en Tradi standard.
  if (sel.id === 'type_volet') f.visibleWhen = eq('gamme_tradi', 'standard');
  // Marque du moteur : en motorisation, hors solaire (le solaire force Somfy).
  if (sel.id === 'moteur') f.visibleWhen = AND([eq('manoeuvre', 'motorisee'), ne('commande', 'solaire')]);
  // Variante Somfy radio (io/rts) : uniquement commande radio + Somfy.
  if (sel.id === 'radio_somfy') f.visibleWhen = AND([eq('manoeuvre', 'motorisee'), eq('commande', 'radio'), eq('moteur', 'somfy')]);

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

  if (sel.id === 'moteur') {
    // Motorisation : choix explicite Filaire / Radio / Solaire (pilote `layer`).
    fields.push({
      id: 'commande', label: 'Motorisation', type: 'choice', default: 'filaire',
      visibleWhen: eq('manoeuvre', 'motorisee'),
      options: [
        { value: 'filaire', label: 'Filaire', setsValues: { layer: 'filaire' } },
        { value: 'radio', label: 'Radio', setsValues: { layer: 'radio' } },
        { value: 'solaire', label: 'Solaire', setsValues: { layer: 'radio', moteur: 'somfy', radio_somfy: 'solaire' } },
      ],
    });
    // `layer` interne (pilote la grille de prix) — non affiché.
    fields.push({ id: 'layer', type: 'choice', default: 'filaire',
      options: [{ value: 'filaire', label: 'Filaire' }, { value: 'radio', label: 'Radio' }] });
    // Côté / sortie — libellés selon la branche (arbre PDG), sans +value.
    const coteOpts = [{ value: 'gauche', label: 'Gauche' }, { value: 'droite', label: 'Droite' }];
    const sortieOpts = [{ value: 'sous_coffre', label: 'Sous-coffre' }, { value: 'facade', label: 'Façade' }];
    fields.push({ id: 'cote_manoeuvre', label: 'Côté manœuvre', type: 'choice', role: 'spec', default: 'droite', visibleWhen: eq('manoeuvre', 'manuelle'), options: coteOpts });
    fields.push({ id: 'sortie_manoeuvre', label: 'Sortie manœuvre', type: 'choice', role: 'spec', default: 'facade', visibleWhen: eq('manoeuvre', 'manuelle'), options: sortieOpts });
    fields.push({ id: 'cote_fil', label: 'Côté fil', type: 'choice', role: 'spec', default: 'droite', visibleWhen: eq('manoeuvre', 'motorisee'), options: coteOpts });
    fields.push({ id: 'sortie_fil', label: 'Sortie fil', type: 'choice', role: 'spec', default: 'facade', visibleWhen: eq('manoeuvre', 'motorisee'), options: sortieOpts });
    // Manœuvre en DERNIER : ses setsValues gagnent (manuelle -> MN filaire, même
    // si une commande radio/solaire avait été choisie auparavant).
    fields.push({
      id: 'manoeuvre', label: 'Type de manœuvre', type: 'choice', default: 'motorisee',
      options: [
        { value: 'manuelle', label: 'Manuelle', setsValues: { moteur: 'mn', layer: 'filaire' } },
        { value: 'motorisee', label: 'Motorisation' },
      ],
    });
    // Sous-choix de la manœuvre manuelle :
    //  - tringle oscillante = prix filaire MN + moins-value (−72 si L<451, −13 sinon) ;
    //  - tirage direct      = prix filaire MN SANS moins-value, largeur 630–2000 mm.
    fields.push({
      id: 'manoeuvre_type', label: 'Manœuvre manuelle', type: 'choice', default: 'tringle',
      visibleWhen: eq('manoeuvre', 'manuelle'),
      options: [
        { value: 'tringle', label: 'Par tringle oscillante' },
        { value: 'tirage', label: 'Par tirage direct' },
      ],
    });
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
    // Moins-value uniquement pour la tringle oscillante (le tirage direct = prix filaire MN plein).
    cs.push(eq('manoeuvre', 'manuelle'));
    cs.push(eq('manoeuvre_type', 'tringle'));
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

// Motorisation Radio & Solaire (même logique d'émetteurs) : type d'émetteur
// (portatif/mural) + rappel de l'émetteur inclus.
fields.push({ id: 'emetteur_type', label: 'Émetteur', type: 'choice', default: 'portatif',
  visibleWhen: inSet('commande', ['radio', 'solaire']),
  options: [{ value: 'portatif', label: 'Émetteur portatif' }, { value: 'mural', label: 'Émetteur mural' }] });
fields.push({ id: 'radio_info', type: 'info', visibleWhen: inSet('commande', ['radio', 'solaire']),
  help: 'Émetteur de base inclus : MN → portatif 1 canal · Somfy → Amy 1 Sun Protect (l’une des 4 possibilités, toutes incluses).' });

// Ajustements de libellé / prix issus de l'arbre Radio (source PDG).
const OPTION_OVERRIDE = {
  emetteur_portatif_5c: { label: 'Émetteur portatif 5 canaux', extraWhen: eq('emetteur_type', 'portatif') },
  emetteur_mural_5c: { label: 'Émetteur mural 5 canaux', extraWhen: eq('emetteur_type', 'mural') },
  situo_io_1c: { label: 'Situo IO 1 canal (remplace l’Amy 1)', priceHT: 23 },
  situo_io_5c: { label: 'Situo IO 5 Pure 2 (5 canaux)' },
  amy_4c_io: { label: 'Émetteur Amy 4 IO' },
};

// Options fixes -> champs booléens + règles (genouillères regroupées à part).
const GENOU = ['genouillere_60', 'genouillere_60a', 'genouillere_90', 'genouillere_90a'];
for (const o of v1.options) {
  if (GENOU.includes(o.code)) continue; // E.

  // Inverseur : uniquement en Filaire, +21 € ; 4 variantes (pose × maintien) au même prix.
  if (o.code === 'inverseur') {
    const invVis = AND([eq('manoeuvre', 'motorisee'), eq('commande', 'filaire')]);
    fields.push({ id: 'inverseur', label: 'Inverseur', type: 'boolean', visibleWhen: invVis });
    priceRules.push({ code: 'opt_inverseur', label: 'Inverseur', kind: 'add',
      when: AND([eq('inverseur', true), eq('manoeuvre', 'motorisee'), eq('commande', 'filaire')]), amount: o.priceHT });
    fields.push({ id: 'inverseur_pose', label: 'Inverseur — pose', type: 'choice', role: 'spec', default: 'encastre',
      visibleWhen: eq('inverseur', true),
      options: [{ value: 'encastre', label: 'Encastré' }, { value: 'applique', label: 'En applique' }] });
    fields.push({ id: 'inverseur_maintien', label: 'Inverseur — maintien', type: 'choice', role: 'spec', default: 'maintenu',
      visibleWhen: eq('inverseur', true),
      options: [{ value: 'maintenu', label: 'Maintenu' }, { value: 'fixe', label: 'Fixe' }] });
    continue;
  }

  // Commande de secours intégrée : +136 € — ne concerne que le moteur (motorisation).
  if (o.code === 'kit_inverseur_secours') {
    fields.push({ id: 'kit_inverseur_secours', label: 'Commande de secours', type: 'boolean',
      visibleWhen: eq('manoeuvre', 'motorisee') });
    priceRules.push({ code: 'opt_kit_inverseur_secours', label: 'Commande de secours', kind: 'add',
      when: AND([eq('kit_inverseur_secours', true), eq('manoeuvre', 'motorisee')]), amount: 136 });
    continue;
  }

  const ov = OPTION_OVERRIDE[o.code] || {};
  const label = ov.label ?? o.label;
  const price = ov.priceHT ?? o.priceHT;
  const vis = [...scopeConds(o.scope, o.layer), ...(ov.extraWhen ? [ov.extraWhen] : [])];
  fields.push({ id: o.code, label, type: 'boolean', ...(vis.length ? { visibleWhen: AND(vis) } : {}) });
  priceRules.push({ code: `opt_${o.code}`, label, kind: 'add',
    when: AND([eq(o.code, true), ...vis]),
    amount: price });
}

// E. Genouillère : un seul choix (6 options). Sous-coffre 60° et applique 60°
//    non aimantée incluses ; aimantées +41, applique 90° +18 / aimantée +59.
fields.push({ id: 'genouillere', label: 'Genouillère', type: 'choice', default: 'sc60_incluse',
  help: 'Sous-coffre 60° et applique 60° non aimantée sont incluses dans le prix.',
  options: [
    { value: 'sc60_incluse', label: 'Sous-coffre 60° (incluse)' },
    { value: 'sc60a', label: 'Sous-coffre 60° aimantée (+41 €)' },
    { value: 'app60', label: 'En applique 60° non aimantée (incluse)' },
    { value: 'app60a', label: 'En applique 60° aimantée (+41 €)' },
    { value: 'app90', label: 'En applique 90° non aimantée (+18 €)' },
    { value: 'app90a', label: 'En applique 90° aimantée (+59 €)' },
  ] });
const GENOU_PRICE = { sc60a: 41, app60a: 41, app90: 18, app90a: 59 }; // incluses : sc60_incluse, app60
for (const [val, price] of Object.entries(GENOU_PRICE)) {
  priceRules.push({ code: `opt_genouillere_${val}`, label: `Genouillère (${val})`, kind: 'add',
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
// Tirage direct : lecture de la grille filaire MN, largeur bornée 630–2000 mm.
constraints.push({ message: 'Tirage direct : largeur autorisée entre 630 et 2000 mm',
  requires: ANY([ne('manoeuvre', 'manuelle'), ne('manoeuvre_type', 'tirage'), AND([gte('largeur', 630), lte('largeur', 2000)])]) });

// ---- STEPS (assistant) ----
const optionFieldIds = [
  ...Object.keys(optionalCodes),                                    // attaches_rigides, sous_face_7016
  'inverseur', 'inverseur_pose', 'inverseur_maintien',             // Filaire
  'kit_inverseur_secours',                                         // Commande de secours
  'radio_info',                                                    // Radio (émetteur inclus)
  ...v1.options.filter((o) => !GENOU.includes(o.code) && !['inverseur', 'kit_inverseur_secours'].includes(o.code)).map((o) => o.code),
  'genouillere',
];
const specIds = (v1.specFields ?? []).map((s) => s.id);
const steps = [
  { id: 'type', title: 'Type & pose', fields: ['gamme_tradi', 'type_volet', ...specIds, 'percage'] },
  { id: 'lame', title: 'Lame & coulisses', fields: ['lame', 'coulisse_express'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur', 'surface_info'] },
  { id: 'manoeuvre', title: 'Manœuvre', fields: ['manoeuvre', 'manoeuvre_type', 'cote_manoeuvre', 'sortie_manoeuvre', 'cote_fil', 'sortie_fil', 'commande', 'moteur', 'radio_somfy', 'emetteur_type'] },
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
