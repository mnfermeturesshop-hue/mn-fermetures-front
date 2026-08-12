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
const lt = (name, n) => ({ op: 'lt', left: V(name), right: n });
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
  // L'ancien sélecteur `coffre` PVC (Thermic/Briquélite/…) est retiré : le coffre
  // (1.1.2 & 1.1.3) est désormais décrit par la cascade GAMME/FACE/SECTION (bloc
  // coffre seul), partagée par tradi-coffre et coffre-seul.
  if (sel.id === 'coffre') continue;

  const f = { id: sel.id, label: sel.label, type: 'choice', options: [] };
  const vis = scopeConds(sel.scope, sel.layer);
  if (vis.length) f.visibleWhen = AND(vis);

  for (const o of sel.options) {
    if (sel.id === 'type_volet' && (o.value === 'express' || o.value === 'zf')) continue; // express -> gamme_tradi ; ZF retiré
    // Radio Somfy : on ne garde que RS100 io (Amy inclus). RTS (Smoove) retiré ;
    // le « solaire » n'est plus une variante ici (géré par la motorisation Solaire).
    if (sel.id === 'radio_somfy' && (o.value === 'rts' || o.value === 'solaire')) continue;
    const opt = { value: o.value, label: o.label };
    if (o.hint) opt.hint = o.hint;
    if (o.derivedAxes) opt.setsValues = o.derivedAxes;
    // Poses tunnel = 1.1.1 : mêmes prix qu'Indépendant/Drapeau (grille independant).
    // Les grilles `coffre` correspondaient au 1.1.2 (Tradi + coffre).
    if (sel.id === 'type_volet' && o.value === 'tunnel_mn') { opt.label = 'Tradi tunnel MN'; opt.setsValues = { pose: 'independant' }; }
    if (sel.id === 'type_volet' && o.value === 'tunnel_inconnu') { opt.label = 'Tradi tunnel inconnu'; opt.setsValues = { pose: 'independant' }; }
    if (sel.id === 'moteur' && o.value === 'somfy') opt.label = 'Moteur Somfy';
    // Solaire = Somfy uniquement (le PDG ne fait pas de moteur solaire MN).
    if (sel.id === 'moteur' && o.value === 'mn') opt.availableWhen = ne('commande', 'solaire');
    if (sel.id === 'lame') {
      // Schéma de profil de lame (affiché pour l'option sélectionnée).
      opt.imageUrl = { cd942: '/schema-lame-alu-42.png', 56: '/schema-lame-alu-56.png', 55: '/schema-lame-alu-55.png' }[o.value];
      const ps = [...posesForLame[o.value]];
      if (ps.length < poses.length) opt.availableWhen = inSet('pose', ps); // express -> cd942 seul
      // 1.1.2 (tradi-coffre) : uniquement lames CD942 (42) et 56 (pas la 55).
      if (o.value === '55') opt.availableWhen = opt.availableWhen
        ? AND([opt.availableWhen, ne('sous_famille', 'tradi-coffre')])
        : ne('sous_famille', 'tradi-coffre');
    }
    // radio_somfy : io/rts dispo en commande radio ; solaire en commande solaire.
    if (sel.id === 'radio_somfy') opt.availableWhen = o.value === 'solaire' ? eq('commande', 'solaire') : eq('commande', 'radio');
    f.options.push(opt);
  }
  // B. type_volet (poses) visible uniquement en Tradi standard.
  if (sel.id === 'type_volet') { f.visibleWhen = eq('gamme_tradi', 'standard'); f.helpImage = '/schema-tradi-type-volet.png'; }
  // Marque du moteur : en motorisation, hors solaire (le solaire force Somfy).
  // `moteur` = MARQUE du moteur (MN / Somfy) — renommé pour lever l'ambiguïté avec
  // le champ « Motorisation » (type Filaire/Radio/Solaire = `commande`). Visible pour
  // toute motorisation, Y COMPRIS solaire (l'arbre solaire propose aussi MN/Somfy).
  if (sel.id === 'moteur') { f.label = 'Marque du moteur'; f.visibleWhen = eq('manoeuvre', 'motorisee'); }
  // Commande radio Somfy (RS100 io, Amy inclus) : uniquement commande radio + Somfy.
  if (sel.id === 'radio_somfy') { f.label = 'Commande radio Somfy'; f.visibleWhen = AND([eq('manoeuvre', 'motorisee'), eq('commande', 'radio'), eq('moteur', 'somfy')]); }

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
    // Sélecteur de SOUS-FAMILLE (pilote étapes + nœud de surcharge/remise, cf.
    // def.nodeField). Placé APRÈS gamme_tradi (sa pose gagne) et AVANT `lame` (le
    // filtrage des lames voit la pose). Valeurs = slugs de nœuds (tradi-std 1.1.1 /
    // tradi-coffre 1.1.2 / coffre-seul 1.1.3).
    //  - tradi-coffre (1.1.2) = coffre (cascade 1.1.3) + volet « tradi tunnel MN »
    //    (= grille INDÉPENDANT, lames CD942/56 seulement) → pose:'independant'.
    //  - coffre-seul (1.1.3) = coffre seul (pas de volet) → pose:'coffre'.
    fields.push({
      id: 'sous_famille', label: 'Type de produit', type: 'choice', default: 'tradi-std',
      help: 'Volet traditionnel seul, volet avec coffre, ou coffre seul. Ce choix pilote les étapes visibles et le tarif.',
      options: [
        { value: 'tradi-std', label: 'Volet traditionnel (volet seul)' },
        { value: 'tradi-coffre', label: 'Volet + coffre', setsValues: { pose: 'independant' } },
        { value: 'coffre-seul', label: 'Coffre seul', setsValues: { pose: 'coffre' } },
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
        // Solaire = Somfy uniquement (MN ne fait pas de moteur solaire) : prix
        // « radio » (layer radio) + kit solaire Somfy (déclenché par commande=solaire).
        // La marque est forcée Somfy (l'option MN est masquée en solaire).
        { value: 'solaire', label: 'Solaire', setsValues: { layer: 'radio', moteur: 'somfy' } },
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
    // Tirage direct : position de la serrure (lame finale / intermédiaire + hauteur), comme en Reno.
    const TIRAGE_DIRECT = AND([eq('manoeuvre', 'manuelle'), eq('manoeuvre_type', 'tirage')]);
    fields.push({
      id: 'serrure_position', label: 'Position de la serrure', type: 'choice', role: 'spec', default: 'lame_finale',
      visibleWhen: TIRAGE_DIRECT,
      options: [
        { value: 'lame_finale', label: 'Sur lame finale' },
        { value: 'lame_intermediaire', label: 'Sur lame intermédiaire' },
      ],
    });
    fields.push({
      id: 'serrure_hauteur', label: 'Hauteur position lame intermédiaire (mm)', type: 'dimension', unit: 'mm', default: 1000,
      visibleWhen: AND([TIRAGE_DIRECT, eq('serrure_position', 'lame_intermediaire')]),
      help: 'Hauteur de la serrure sur lame intermédiaire (tirage direct).',
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
// `tableLabels` : libellé humain par id de table, pour nommer les feuilles Excel
// (édition annuelle des prix). Le round-trip garde l'id (cellule A1) comme ancre.
// Libellés COMPACTS (≤ 31 car. = limite des noms de feuille Excel) pour que les
// 4 axes de la grille restent lisibles sans troncature.
const tableLabels = {};
const POSE_LBL = { independant: 'Indép', coffre: 'Coffre', express: 'Express' };
const LAME_LBL = { cd942: 'CD942', 56: 'A56', 55: 'A55' };
const MOTEUR_LBL = { mn: 'MN', somfy: 'Somfy' };
const LAYER_LBL = { filaire: 'Fil', radio: 'Radio' };
const d2 = {};
const gridTableId = (k, layer) => `g_${k.pose}_${k.lame}_${k.moteur}_${layer}`;
for (const g of v1.grids) {
  for (const [layer, lg] of Object.entries(g.layers)) {
    const id = gridTableId(g.key, layer);
    d2[id] = {
      rows: g.heights,
      cols: lg.widths,
      cells: g.heights.map((h) => lg.rows[String(h)]),
    };
    // ex. « Indép · CD942 · MN · Fil » (≤ 31) — moteur/couche toujours visibles.
    tableLabels[id] = `${POSE_LBL[g.key.pose] ?? g.key.pose} · ${LAME_LBL[g.key.lame] ?? g.key.lame} · ${MOTEUR_LBL[g.key.moteur] ?? g.key.moteur} · ${LAYER_LBL[layer] ?? layer}`;
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
// Coulisse (par défaut) — dépend de la lame (CD942→×22, 56/55→×27) et de la pose
// (Indépendant/Drapeau→40, Tunnel MN/inconnu & Tradi+Coffre→45). Valeur affichée
// (configurateur + détail/devis/BC), sans impact prix.
const COULISSE_TUNNEL = ANY([
  eq('sous_famille', 'tradi-coffre'),
  AND([eq('sous_famille', 'tradi-std'), inSet('type_volet', ['tunnel_mn', 'tunnel_inconnu'])]),
]);
derived.push({ id: 'coulisse_defaut', expr: { op: 'concat', args: [
  'Coulisse alu ',
  { op: 'if', cond: COULISSE_TUNNEL, then: '45', else: '40' },
  '×',
  { op: 'if', cond: eq('lame', 'cd942'), then: '22', else: '27' },
] } });

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

// base volet (Tradi standard 1.1.1 & Tradi + coffre 1.1.2) — lecture grille.
// Exclue du Coffre seul (1.1.3), qui a sa propre base par section (voir bloc dédié).
priceRules.push({ code: 'base', label: 'Prix de base', kind: 'base',
  when: ne('sous_famille', 'coffre-seul'),
  amount: { op: 'lookup2d', table: V('grid'), row: V('hauteur'), col: V('largeur') } });

// Ajustements — hors coffre PVC (Briquélite/Néothermic/Néobric) : le coffre est
// désormais tarifé par la cascade GAMME/FACE/SECTION (grille cs_<section>), pas
// par ces anciens ajustements.
const COFFRE_PVC = ['coffre_briquelite', 'coffre_neothermic', 'coffre_neobric'];
// somfy_rts (RTS Smoove +55 €) retiré : plus proposé.
const adjustments = v1.adjustments.filter((a) => !COFFRE_PVC.includes(a.code) && a.code !== 'somfy_rts');
const optionalCodes = {}; // code -> [conditions par ajustement]
adjustments.forEach((adj, i) => {
  const tid = `adj_${i}`;
  d1[tid] = { keys: Object.keys(adj.baremeParLargeur).map(Number).sort((a, b) => a - b), values: [] };
  d1[tid].values = d1[tid].keys.map((k) => adj.baremeParLargeur[String(k)]);
  // Libellé compact = code humanisé + portée (pose/moteur/couche) pour distinguer
  // les barèmes d'un même ajustement selon leur scope.
  const scopeBits = [];
  for (const [k, val] of Object.entries(adj.scope ?? {})) {
    scopeBits.push(k === 'pose' ? (POSE_LBL[val] ?? val) : k === 'moteur' ? (MOTEUR_LBL[val] ?? val) : String(val));
  }
  if (adj.layer) scopeBits.push(LAYER_LBL[adj.layer] ?? adj.layer);
  const adjBase = adj.code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  tableLabels[tid] = (adjBase + (scopeBits.length ? ' ' + scopeBits.join('·') : '')).slice(0, 31);
  const cs = scopeConds(adj.scope, adj.layer);
  // Kit solaire Somfy (+232 €) : déclenché par la motorisation Solaire (Somfy only),
  // plus par la variante radio_somfy (l'option a été retirée du champ radio Somfy).
  if (adj.code === 'somfy_solaire') { cs.length = 0; cs.push(eq('commande', 'solaire')); }
  if (adj.code === 'manoeuvre_manuelle') {
    // Moins-value uniquement pour la tringle oscillante (le tirage direct = prix filaire MN plein).
    cs.push(eq('manoeuvre', 'manuelle'));
    cs.push(eq('manoeuvre_type', 'tringle'));
  } else if (adj.code === 'attaches_rigides') {
    // Moins-value optionnelle, mais OBLIGATOIRE (appliquée d'office) si largeur < 650 mm.
    cs.push(ANY([eq('attaches_rigides', true), lt('largeur', 650)]));
    (optionalCodes[adj.code] ??= []).push(AND(scopeConds(adj.scope, adj.layer)));
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
  if (code === 'attaches_rigides') {
    // Choix proposé seulement ≥ 650 mm ; en dessous elles sont obligatoires (auto).
    fields.push({ id: code, label, type: 'boolean', visibleWhen: AND([ANY(uniq), gte('largeur', 650)]),
      help: 'Moins-value. Obligatoires (appliquées automatiquement) si largeur < 650 mm.' });
  } else {
    fields.push({ id: code, label, type: 'boolean', visibleWhen: ANY(uniq) });
  }
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
// Exiger la MOTORISATION : sinon `commande` garde une valeur résiduelle (radio/
// solaire) en manœuvre manuelle et ces champs resteraient visibles à tort.
const RADIO_SOL_VIS = AND([eq('manoeuvre', 'motorisee'), inSet('commande', ['radio', 'solaire'])]);
fields.push({ id: 'emetteur_type', label: 'Émetteur', type: 'choice', default: 'portatif',
  visibleWhen: RADIO_SOL_VIS,
  options: [{ value: 'portatif', label: 'Émetteur portatif' }, { value: 'mural', label: 'Émetteur mural' }] });
fields.push({ id: 'radio_info', type: 'info', visibleWhen: RADIO_SOL_VIS,
  help: 'Émetteur de base inclus : MN → portatif 1 canal · Somfy → Amy 1 Sun Protect (l’une des 4 possibilités, toutes incluses).' });
// Intitulé du bloc « centralisation » — uniquement en Somfy radio/solaire.
fields.push({ id: 'centralisation_info', type: 'info', visibleWhen: AND([eq('moteur', 'somfy'), eq('layer', 'radio')]),
  help: 'Options de centralisation (Somfy uniquement) : la Situo IO 1 canal remplace l’Amy 1 (+23 €) ; vous pouvez ajouter la Situo IO 5 Pure 2 ou l’Amy 4 IO.' });

// Ajustements de libellé / prix issus de l'arbre Radio/Solaire (source PDG) :
//  - MN : émetteur de base 1 canal INCLUS ; option 5 canaux +80 € (portatif/mural).
//  - Somfy : Amy 1 Sun Protect INCLUS ; options de CENTRALISATION (Somfy uniquement) :
//    Situo IO 1 canal (remplace l'Amy 1) +23 €, Situo IO 5 Pure 2 +135 €, Amy 4 IO +131 €.
const OPTION_OVERRIDE = {
  emetteur_portatif_5c: { label: 'Émetteur portatif 5 canaux', extraWhen: eq('emetteur_type', 'portatif') },
  emetteur_mural_5c: { label: 'Émetteur mural 5 canaux', extraWhen: eq('emetteur_type', 'mural') },
  situo_io_1c: { label: 'Émetteur portatif Situo IO 1 canal (remplace l’Amy 1)', priceHT: 23 },
  situo_io_5c: { label: 'Émetteur portatif Situo IO 5 Pure 2 (5 canaux)' },
  amy_4c_io: { label: 'Émetteur portatif Amy 4 IO' },
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
      visibleWhen: AND([eq('inverseur', true), invVis]),
      options: [{ value: 'encastre', label: 'Encastré' }, { value: 'applique', label: 'En applique' }] });
    fields.push({ id: 'inverseur_maintien', label: 'Inverseur — maintien', type: 'choice', role: 'spec', default: 'maintenu',
      visibleWhen: AND([eq('inverseur', true), invVis]),
      options: [{ value: 'maintenu', label: 'Maintenu' }, { value: 'fixe', label: 'Fixe' }] });
    continue;
  }

  // Commande de secours intégrée : +136 € — option de la MOTORISATION FILAIRE
  // (arbre PDG), ne concerne que le moteur.
  if (o.code === 'kit_inverseur_secours') {
    const secVis = AND([eq('manoeuvre', 'motorisee'), eq('commande', 'filaire')]);
    fields.push({ id: 'kit_inverseur_secours', label: 'Commande de secours intégrée', type: 'boolean',
      visibleWhen: secVis });
    priceRules.push({ code: 'opt_kit_inverseur_secours', label: 'Commande de secours intégrée', kind: 'add',
      when: AND([eq('kit_inverseur_secours', true), secVis]), amount: 136 });
    continue;
  }

  const ov = OPTION_OVERRIDE[o.code] || {};
  const label = ov.label ?? o.label;
  const price = ov.priceHT ?? o.priceHT;
  // Alim de dépannage (solaire) : rattachée à la motorisation Solaire (Somfy),
  // depuis `commande=solaire` (l'option radio_somfy=solaire a été retirée).
  const vis = o.code === 'alim_depannage'
    ? [eq('commande', 'solaire')]
    : [...scopeConds(o.scope, o.layer), ...(ov.extraWhen ? [ov.extraWhen] : [])];
  fields.push({ id: o.code, label, type: 'boolean', ...(vis.length ? { visibleWhen: AND(vis) } : {}) });
  priceRules.push({ code: `opt_${o.code}`, label, kind: 'add',
    when: AND([eq(o.code, true), ...vis]),
    amount: price });
}

// E. Genouillère — MOTORISATION FILAIRE (6 options : sous-coffre / en applique).
//    Uniquement en filaire (l'arbre radio/solaire n'a pas de genouillère).
const GENOU_FIL_VIS = AND([eq('manoeuvre', 'motorisee'), eq('commande', 'filaire')]);
fields.push({ id: 'genouillere', label: 'Genouillère', type: 'choice', default: 'sc60_incluse',
  visibleWhen: GENOU_FIL_VIS,
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
    when: AND([GENOU_FIL_VIS, eq('genouillere', val)]), amount: price });
}

// E'. Genouillère — MANŒUVRE MANUELLE (4 options, libellés capture PDG).
fields.push({ id: 'genouillere_manuelle', label: 'Genouillère', type: 'choice', default: 'g60',
  visibleWhen: eq('manoeuvre', 'manuelle'),
  options: [
    { value: 'g60', label: 'Genouillère 60° (incluse)' },
    { value: 'g60a', label: 'Genouillère 60° aimantée (+41 €)' },
    { value: 'g90', label: 'Genouillère 90° (+18 €)' },
    { value: 'g90a', label: 'Genouillère 90° aimantée (+59 €)' },
  ] });
const GENOU_MAN_PRICE = { g60a: 41, g90: 18, g90a: 59 }; // g60 inclus
for (const [val, price] of Object.entries(GENOU_MAN_PRICE)) {
  priceRules.push({ code: `opt_genouillere_man_${val}`, label: `Genouillère ${val}`, kind: 'add',
    when: AND([eq('manoeuvre', 'manuelle'), eq('genouillere_manuelle', val)]), amount: price });
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
fields.push({ id: 'express_attaches_info', type: 'info', visibleWhen: eq('gamme_tradi', 'express'),
  help: 'Tradi Express : attaches rigides incluses de série.' });

// Coulisse par défaut (affichée) — Tradi standard (hors Express) & Tradi + coffre.
// `{{coulisse_defaut}}` = valeur dérivée interpolée par le wizard (cf. buildDetail).
fields.push({ id: 'coulisse_defaut_info', type: 'info', label: 'Coulisse (par défaut)',
  help: '{{coulisse_defaut}}',
  visibleWhen: ANY([AND([eq('sous_famille', 'tradi-std'), eq('gamme_tradi', 'standard')]), eq('sous_famille', 'tradi-coffre')]) });

// ===================================================================
// 1.1.3 COFFRE SEUL — cascade GAMME › FACE › SECTION (arbre de décision PDG)
// -------------------------------------------------------------------
// Chaque SECTION (modèle + hauteur) porte SA PROPRE grille largeur→prix HT (1D),
// pour la sous-face BLANCHE (défaut). Largeurs = bornes hautes 500…4500 mm par
// pas de 100 (snap-up). Prix HT source PDG (« TARIF TRADI 2026 »). Au-delà de
// 3800 mm : HORS AVIS TECHNIQUE (vendable mais signalé, cf. champ info).
const CS_WIDTHS = [];
for (let w = 500; w <= 4500; w += 100) CS_WIDTHS.push(w);   // 41 bornes
const CS_LMIN = 500, CS_LMAX = 4500, CS_HAT = 3800;         // bornes + seuil hors avis technique
const CS_PRICES = {
  thermic_280: [69, 77, 84, 92, 99, 107, 114, 122, 130, 135, 143, 150, 157, 165, 172, 177, 185, 192, 205, 212, 220, 227, 240, 244, 251, 258, 265, 273, 280, 287, 295, 303, 310, 317, 324, 331, 338, 345, 352, 360, 367],
  thermic_300: [73, 81, 89, 97, 105, 113, 121, 129, 137, 143, 151, 159, 167, 175, 183, 188, 196, 204, 217, 225, 233, 241, 254, 258, 266, 274, 281, 289, 297, 304, 313, 321, 328, 336, 344, 351, 359, 366, 374, 382, 389],
  briquelite_280: [98, 110, 121, 133, 144, 152, 163, 170, 181, 192, 203, 214, 225, 236, 247, 258, 262, 273, 289, 300, 311, 322, 338, 349, 360, 370, 376, 381, 392, 402, 418, 429, 439, 450, 447, 457, 468, 478, 488, 498, 508],
  neothermic_280: [88, 99, 109, 116, 126, 135, 145, 155, 165, 175, 180, 189, 199, 216, 224, 233, 241, 262, 275, 283, 291, 298, 343, 350, 358, 366, 374, 413, 420, 428, 441, 449, 488, 496, 503, 511, 519, 558, 566, 573, 581],
  neobric_280: [115, 129, 143, 157, 171, 181, 195, 203, 222, 236, 244, 257, 270, 291, 303, 315, 327, 344, 360, 371, 382, 394, 423, 433, 444, 454, 465, 507, 517, 528, 543, 554, 596, 606, 617, 628, 638, 680, 691, 701, 712],
};
const COFFRE_SEUL_SECTIONS = [
  { code: 'thermic_280',    label: "Thermic'élite 280 mm", gamme: 'classique', face: 'fibre'  },
  { code: 'thermic_300',    label: "Thermic'élite 300 mm", gamme: 'classique', face: 'fibre'  },
  { code: 'briquelite_280', label: 'Briquelite 280 mm',    gamme: 'classique', face: 'brique' },
  { code: 'neothermic_280', label: 'Néothermic 280 mm',    gamme: 'renforce',  face: 'fibre'  },
  { code: 'neobric_280',    label: 'Néobric 280 mm',       gamme: 'renforce',  face: 'brique' },
].map((s) => ({ ...s, lmin: CS_LMIN, lmax: CS_LMAX, grid: CS_PRICES[s.code].map((p, i) => [CS_WIDTHS[i], p]) }));
// GAMME (coffre classique / renforcé) — 1er niveau de la cascade coffre seul.
fields.push({ id: 'coffre_gamme', label: 'Gamme de coffre', type: 'choice', default: 'classique',
  helpImage: '/schema-tradi-type-coffre.png',
  options: [
    { value: 'classique', label: 'Coffre classique' },
    { value: 'renforce', label: 'Coffre renforcé' },
  ] });
// FACE (fibre / brique) — 2e niveau (les deux existent sous chaque gamme).
fields.push({ id: 'coffre_face', label: 'Face', type: 'choice', default: 'fibre',
  options: [
    { value: 'fibre', label: 'Face fibre' },
    { value: 'brique', label: 'Face brique' },
  ] });
// SECTION (modèle + hauteur) — 3e niveau, filtré par gamme + face.
fields.push({ id: 'coffre_section', label: 'Section', type: 'choice', default: COFFRE_SEUL_SECTIONS[0].code,
  options: COFFRE_SEUL_SECTIONS.map((s) => ({
    value: s.code, label: s.label,
    availableWhen: AND([eq('coffre_gamme', s.gamme), eq('coffre_face', s.face)]),
  })) });
// Pattes de maintien supplémentaires — proposées UNIQUEMENT au-delà de 2300 mm
// de largeur (arbre PDG), à l'unité, +8,80 € pièce.
fields.push({ id: 'pattes_maintien', label: 'Pattes de maintien supplémentaires', type: 'number',
  unit: 'u', default: 0, min: 0, visibleWhen: gte('largeur', 2300),
  help: 'À partir de 2300 mm : ajoutez une ou plusieurs pattes de maintien (8,80 € l’unité).' });
// Avertissement hors avis technique (largeur ≥ 3800 mm) — vendable mais signalé.
fields.push({ id: 'coffre_hat_info', type: 'info', visibleWhen: gte('largeur', CS_HAT),
  help: 'Largeur ≥ 3800 mm : coffre HORS AVIS TECHNIQUE (jusqu’à 4500 mm).' });
// Sous-face : blanche (incluse, défaut) / couleurs à plus-value (RAL 7016, gris
// 7039, noir 2100 sablé — MÊME plus-value par largeur) / cache-rail seul sans
// sous-face (moins-value par largeur). Barèmes source PDG.
fields.push({ id: 'coffre_sous_face', label: 'Sous-face', type: 'choice', default: 'blanche',
  options: [
    { value: 'blanche', label: 'Sous-face blanche (incluse)' },
    { value: '7016', label: 'Sous-face RAL 7016 (plus-value)' },
    { value: '7039', label: 'Sous-face gris RAL 7039 (plus-value)' },
    { value: '2100', label: 'Sous-face noir 2100 sablé (plus-value)' },
    { value: 'cache_rail', label: 'Cache-rail seul, sans sous-face (moins-value)' },
  ] });

// Grilles 1D par section (id `cs_<code>`).
for (const s of COFFRE_SEUL_SECTIONS) {
  d1[`cs_${s.code}`] = { keys: s.grid.map((r) => r[0]), values: s.grid.map((r) => r[1]) };
  tableLabels[`cs_${s.code}`] = `Coffre ${s.label}`;
}
// Le coffre (cascade + pattes + sous-face) est tarifé pour les DEUX sous-familles
// qui portent un coffre : 1.1.2 (tradi-coffre, en plus du volet) et 1.1.3 (coffre seul).
const CS_ON = inSet('sous_famille', ['tradi-coffre', 'coffre-seul']);
// base coffre : lecture de la grille de la section choisie (kind:'base'). En
// tradi-coffre, elle S'AJOUTE à la base volet (deux bases sommées).
priceRules.push({ code: 'base_coffre_seul', label: 'Coffre', kind: 'base',
  when: CS_ON,
  amount: { op: 'lookup1d', table: { op: 'concat', args: ['cs_', V('coffre_section')] }, key: V('largeur') } });
// Pattes de maintien : quantité × 8,80 € (au-delà de 2300 mm).
priceRules.push({ code: 'coffre_seul_pattes', label: 'Pattes de maintien supplémentaires', kind: 'add',
  when: AND([CS_ON, gte('largeur', 2300), gte('pattes_maintien', 1)]),
  amount: { op: '*', args: [V('pattes_maintien'), 8.8] } });

// Sous-face — barèmes par largeur (mêmes bornes CS_WIDTHS). Plus-value couleur
// (positive, MÊME barème pour 7016 / 7039 / 2100 sablé) ; cache-rail = moins-value
// (négative). Blanche = 0 (aucune règle).
d1['cs_pv_couleur'] = { keys: CS_WIDTHS, values: [
  6, 8, 12, 13, 14, 16, 17, 18, 20, 21, 22, 24, 25, 27, 31, 33, 35, 36, 37, 39, 40, 42, 43, 46, 48, 50, 51, 54, 55, 57, 58, 60, 61, 64, 65, 68, 69, 71, 72, 75, 77] };
tableLabels['cs_pv_couleur'] = 'Coffre sous-face couleur (+val)';
d1['cs_mv_cacherail'] = { keys: CS_WIDTHS, values: [
  -5, -6, -7, -8, -12, -13, -14, -15, -16, -16, -17, -18, -19, -21, -22, -23, -24, -24, -42, -45, -46, -49, -50, -52, -54, -55, -57, -58, -61, -63, -64, -67, -68, -69, -71, -72, -73, -75, -77, -78, -80] };
tableLabels['cs_mv_cacherail'] = 'Coffre cache-rail (−val)';
priceRules.push({ code: 'coffre_sf_couleur', label: 'Sous-face couleur (plus-value)', kind: 'add',
  when: AND([CS_ON, inSet('coffre_sous_face', ['7016', '7039', '2100'])]),
  amount: { op: 'lookup1d', table: 'cs_pv_couleur', key: V('largeur') } });
priceRules.push({ code: 'coffre_sf_cacherail', label: 'Cache-rail (sans sous-face)', kind: 'add',
  when: AND([CS_ON, eq('coffre_sous_face', 'cache_rail')]),
  amount: { op: 'lookup1d', table: 'cs_mv_cacherail', key: V('largeur') } });

// GARDE : toutes les règles VOLET (base, ajustements, options, coloris, moins-values
// attaches/manœuvre…) ne doivent JAMAIS tirer sur le Coffre seul (1.1.3), qui n'a
// que sa base par section + pattes + sous-face. On ajoute `sous_famille ≠ coffre-seul`
// à chaque règle sauf les règles propres au coffre seul.
const CS_ONLY_RULES = new Set(['base_coffre_seul', 'coffre_seul_pattes', 'coffre_sf_couleur', 'coffre_sf_cacherail']);
for (const r of priceRules) {
  if (CS_ONLY_RULES.has(r.code)) continue;
  r.when = r.when ? AND([r.when, ne('sous_famille', 'coffre-seul')]) : ne('sous_famille', 'coffre-seul');
}

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

// Les contraintes ci-dessus sont des limites VOLET (lame/pose/manœuvre) : elles
// ne s'appliquent pas au Coffre seul (1.1.3). On les neutralise pour lui.
for (const c of constraints) c.requires = ANY([eq('sous_famille', 'coffre-seul'), c.requires]);
// Bornes L mini / L max du coffre, par section — appliquées dès qu'un coffre est
// présent (tradi-coffre 1.1.2 & coffre-seul 1.1.3).
constraints.push({ message: 'Largeur hors bornes pour cette section de coffre',
  requires: ANY([{ not: inSet('sous_famille', ['tradi-coffre', 'coffre-seul']) },
    ANY(COFFRE_SEUL_SECTIONS.map((s) => AND([eq('coffre_section', s.code), gte('largeur', s.lmin), lte('largeur', s.lmax)])))]) });

// ---- GATING par sous-famille (1.1.1 tradi-std / 1.1.2 tradi-coffre / 1.1.3 coffre-seul) ----
// Chaque champ reçoit, EN PLUS de sa condition propre, une condition sur
// `sous_famille`. Les axes posés par setsValues (pose…) restent lisibles dans le
// contexte de visibilité (le wizard applique withDerivedValues avant isVisible).
const gate = (ids, cond) => {
  for (const f of fields) {
    if (!ids.includes(f.id)) continue;
    f.visibleWhen = f.visibleWhen ? AND([f.visibleWhen, cond]) : cond;
  }
};
const STD = eq('sous_famille', 'tradi-std');
const VOLET = inSet('sous_famille', ['tradi-std', 'tradi-coffre']);           // a un tablier
const COFFRE = inSet('sous_famille', ['tradi-coffre', 'coffre-seul']);        // porte un coffre (cascade)
// Présents pour toutes les sous-familles (largeur, sélecteur, axe interne).
const GATE_ALWAYS = ['sous_famille', 'largeur', 'layer'];
// Réservés au Tradi standard (poses, gamme Standard/Express, Express).
const GATE_STD_ONLY = ['type_volet', 'gamme_tradi', 'coulisse_express', 'express_attaches_info'];
// Cascade coffre (1.1.2 tradi-coffre + 1.1.3 coffre-seul) — gamme/face/section/
// sous-face + pattes de maintien + hors avis technique.
const GATE_COFFRE = ['coffre_gamme', 'coffre_face', 'coffre_section', 'coffre_sous_face', 'pattes_maintien', 'coffre_hat_info'];
gate(GATE_STD_ONLY, STD);
gate(GATE_COFFRE, COFFRE);
// Champs « volet » (tablier / manœuvre / coloris / options / hauteur / surface) :
// tradi-std + tradi-coffre, masqués en coffre seul.
const gateExplicit = new Set([...GATE_ALWAYS, ...GATE_STD_ONLY, ...GATE_COFFRE]);
const gateVoletIds = fields.map((f) => f.id).filter((id) => !gateExplicit.has(id));
gate(gateVoletIds, VOLET);

// ---- STEPS (assistant) ----
const specIds = (v1.specFields ?? []).map((s) => s.id);
// Émetteurs / centralisation (group 'commande', hors inverseur traité à part) +
// alim solaire — rattachés à la MANŒUVRE (motorisation).
const emetteurCmdIds = v1.options
  .filter((o) => o.group === 'commande' && o.code !== 'inverseur')
  .map((o) => o.code);
// Tout ce qui relève du CHOIX DE MOTORISATION / MANŒUVRE est regroupé dans l'onglet
// Manœuvre (meilleure UX : un seul endroit) — filaire, radio, solaire, manuelle.
// La visibilité par branche (filaire/radio/somfy/solaire/manuelle) reste gérée par
// les `visibleWhen` de chaque champ, donc valable aussi en Tradi Express.
const manoeuvreOptionIds = [
  'inverseur', 'inverseur_pose', 'inverseur_maintien', 'kit_inverseur_secours', 'genouillere',  // FILAIRE
  'radio_info', 'centralisation_info', ...emetteurCmdIds,                                         // Radio/Solaire
  'genouillere_manuelle',                                                                         // Manœuvre manuelle
];
// Onglet Options : uniquement les options GÉNÉRALES (ni motorisation ni manœuvre).
const optionFieldIds = [
  ...Object.keys(optionalCodes),                                                                  // attaches rigides, sous-face…
  ...v1.options.filter((o) => o.group === 'divers' && o.code !== 'kit_inverseur_secours').map((o) => o.code),  // serrure, flasques
];
const steps = [
  { id: 'produit', title: 'Type de produit', fields: ['sous_famille'] },
  // Étape 1 (tradi-coffre & coffre-seul) : configuration du COFFRE. Placée avant la
  // config volet (« Étape 2 » du tradi + coffre). Masquée en tradi-std (étape vide).
  { id: 'coffre', title: 'Coffre', fields: ['coffre_gamme', 'coffre_face', 'coffre_section', 'coffre_sous_face'] },
  { id: 'type', title: 'Type & pose', fields: ['gamme_tradi', 'type_volet', ...specIds] },
  { id: 'lame', title: 'Lame & coulisses', fields: ['lame', 'coulisse_express', 'coulisse_defaut_info', 'percage', 'express_attaches_info'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur', 'surface_info', 'pattes_maintien', 'coffre_hat_info'] },
  // Radio/Solaire : on choisit le type d'émetteur (portatif/mural) AVANT la marque
  // de motorisation (MN/Somfy) — d'où `emetteur_type` placé avant `moteur`. Toutes
  // les options de motorisation/manœuvre (inverseur, secours, genouillère, émetteurs,
  // centralisation, alim solaire, genouillère manuelle) sont regroupées ici.
  { id: 'manoeuvre', title: 'Manœuvre', fields: ['manoeuvre', 'manoeuvre_type', 'serrure_position', 'serrure_hauteur', 'cote_manoeuvre', 'sortie_manoeuvre', 'cote_fil', 'sortie_fil', 'commande', 'emetteur_type', 'moteur', 'radio_somfy', ...manoeuvreOptionIds] },
  { id: 'coloris', title: 'Coloris', fields: ['color_tablier', 'color_coulisse', 'color_lame_finale'] },
  { id: 'options', title: 'Options', fields: optionFieldIds },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

const def = {
  // Le configurateur sert TOUTE la famille Tradi (1.1). Le nœud de surcharge/
  // remise est DYNAMIQUE : il vaut la valeur du champ `sous_famille` (tradi-std
  // 1.1.1 / tradi-coffre 1.1.2 / coffre-seul 1.1.3), cf. def.nodeField. `famille`
  // = repli (nœud famille 1.1) si aucune sous-famille n'est sélectionnée.
  slug: v1.slug, name: v1.name, famille: 'tradi', nodeField: 'sous_famille',
  fields, derived, steps, priceRules, tables: { d1, d2 }, tableLabels, constraints,
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'volet-roulant-traditionnel.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`Écrit ${path.relative(process.cwd(), out)} (${kb} Ko) — ${fields.length} champs, ${priceRules.length} règles, ${Object.keys(d2).length} tables 2D, ${Object.keys(d1).length} tables 1D, ${constraints.length} contraintes.`);
