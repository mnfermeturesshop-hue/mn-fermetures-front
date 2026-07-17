/* =====================================================================
   Convertisseur def VR v1 -> def v2 (moteur universel).
   Déterministe : lit lib/configurateur/data/volet-roulant-traditionnel.json
   (v1) et produit ...v2.json. Objectif : ISO-PRIX (mêmes prix que v1).
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
  const f = { id: sel.id, label: sel.label, type: 'choice', options: [] };
  const vis = scopeConds(sel.scope, sel.layer);
  if (vis.length) f.visibleWhen = AND(vis);
  for (const o of sel.options) {
    const opt = { value: o.value, label: o.label };
    if (o.hint) opt.hint = o.hint;
    if (o.derivedAxes) opt.setsValues = o.derivedAxes;
    if (sel.id === 'lame') {
      const ps = [...posesForLame[o.value]];
      if (ps.length < poses.length) opt.availableWhen = inSet('pose', ps);
    }
    f.options.push(opt);
  }
  // insérer le champ couche (filaire/radio) juste après moteur
  fields.push(f);
  if (sel.id === 'moteur') {
    fields.push({ id: 'layer', label: 'Type de commande', type: 'choice', default: 'filaire',
      options: [{ value: 'filaire', label: 'Filaire' }, { value: 'radio', label: 'Radio' }] });
  }
}

// coloris
const colorField = { id: 'color', label: 'Coloris', type: 'choice', default: v1.colors[0].code, options: [] };
const lamesForColor = (code) => v1.colorPolicies.filter((p) => p.standard.includes(code) || p.pvM2?.codes.includes(code)).map((p) => p.lame);
const allLames = v1.colorPolicies.map((p) => p.lame);
for (const c of v1.colors) {
  const opt = { value: c.code, label: c.label, hex: c.hex };
  const la = lamesForColor(c.code);
  if (la.length < allLames.length) opt.availableWhen = inSet('lame', la);
  colorField.options.push(opt);
}
fields.push(colorField);

// dimensions
fields.push({ id: 'largeur', label: 'Largeur dos de coulisse', type: 'dimension', unit: 'mm', default: 1200 });
fields.push({ id: 'hauteur', label: 'Hauteur sous coffre', type: 'dimension', unit: 'mm', default: 1000 });

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
const derived = [
  { id: 'grid', expr: { op: 'concat', args: ['g_', V('pose'), '_', V('lame'), '_', V('moteur'), '_', V('layer')] } },
  { id: 'largeur_snap', expr: { op: 'snapCol', table: V('grid'), value: V('largeur') } },
  { id: 'hauteur_snap', expr: { op: 'snapRow', table: V('grid'), value: V('hauteur') } },
  // Pleine précision (comme v1) : l'arrondi ne se fait qu'au montant final.
  { id: 'surface_m2', expr: { op: '*', args: [{ op: '/', args: [V('largeur_snap'), 1000] }, { op: '/', args: [V('hauteur_snap'), 1000] }] } },
  { id: 'mode', expr: { op: 'if', cond: eq('manoeuvre_manuelle', true), then: 'tringle', else: { op: 'concat', args: [V('layer'), '_', V('moteur')] } } },
];

// ---- PRICE RULES ----
const priceRules = [];
const d1 = {};

// base
priceRules.push({ code: 'base', label: 'Prix de base', kind: 'base',
  amount: { op: 'lookup2d', table: V('grid'), row: V('hauteur'), col: V('largeur') } });

// ajustements -> tables 1D + règles + champs booléens optionnels
const optionalCodes = {};   // code -> [conditions par ajustement]
v1.adjustments.forEach((adj, i) => {
  const tid = `adj_${i}`;
  d1[tid] = { keys: Object.keys(adj.baremeParLargeur).map(Number).sort((a, b) => a - b), values: [] };
  d1[tid].values = d1[tid].keys.map((k) => adj.baremeParLargeur[String(k)]);
  const cs = scopeConds(adj.scope, adj.layer);
  if (adj.optional) {
    cs.push(eq(adj.code, true));
    (optionalCodes[adj.code] ??= []).push(AND(scopeConds(adj.scope, adj.layer)));
  }
  priceRules.push({ code: `${adj.code}_${i}`, label: adj.label, kind: 'add',
    when: cs.length ? AND(cs) : undefined,
    amount: { op: 'lookup1d', table: tid, key: V('largeur_snap') } });
});
// champs booléens pour ajustements optionnels
for (const [code, condList] of Object.entries(optionalCodes)) {
  const label = v1.adjustments.find((a) => a.code === code).label;
  const uniq = [...new Map(condList.map((c) => [JSON.stringify(c), c])).values()];
  fields.push({ id: code, label, type: 'boolean', visibleWhen: ANY(uniq) });
}

// coloris : supplément +€/m² (règle formule) — paires (lame, couleur) laquées
const pvPairs = [];
let pvM2 = 14;
for (const p of v1.colorPolicies) for (const code of (p.pvM2?.codes ?? [])) { pvPairs.push(AND([eq('lame', p.lame), eq('color', code)])); pvM2 = p.pvM2.montantParM2; }
priceRules.push({ code: 'color_pv', label: 'Supplément coloris', kind: 'add',
  when: ANY(pvPairs),
  amount: { op: 'round', arg: { op: '*', args: [V('surface_m2'), pvM2] } } });

// options fixes -> champs booléens + règles
for (const o of v1.options) {
  const vis = scopeConds(o.scope, o.layer);
  fields.push({ id: o.code, label: o.label, type: 'boolean', ...(vis.length ? { visibleWhen: AND(vis) } : {}) });
  priceRules.push({ code: `opt_${o.code}`, label: o.label, kind: 'add',
    when: AND([eq(o.code, true), ...vis]),
    amount: o.priceHT });
}

// champs de fabrication (specFields)
for (const sf of (v1.specFields ?? [])) {
  const vis = scopeConds(sf.scope, sf.layer);
  fields.push({ id: sf.id, label: sf.label, type: sf.type, role: 'spec',
    ...(sf.options ? { options: sf.options } : {}),
    ...(sf.defaultValue !== undefined ? { default: sf.defaultValue } : {}),
    ...(vis.length ? { visibleWhen: AND(vis) } : {}) });
}

// ---- CONSTRAINTS (limites dimensionnelles) ----
const nonPose = v1.limits.filter((l) => !l.pose);
const byLame = {}; for (const l of nonPose) byLame[l.lame] = l;
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
// largeur mini par mode (+ pose express spécifique)
const minClauses = [];
const expressLimit = v1.limits.find((l) => l.pose === 'express');
const tradiModes = byLame[Object.keys(byLame)[0]].largeurMinByMode; // MINS_TRADI (partagé)
for (const [m, min] of Object.entries(tradiModes)) minClauses.push(AND([ne('pose', 'express'), eq('mode', m), gte('largeur', min)]));
if (expressLimit) for (const [m, min] of Object.entries(expressLimit.largeurMinByMode)) minClauses.push(AND([eq('pose', 'express'), eq('mode', m), gte('largeur', min)]));
constraints.push({ message: 'Largeur minimale non atteinte pour ce mode', requires: ANY(minClauses) });

// ---- STEPS (assistant) ----
const optionFieldIds = [...Object.keys(optionalCodes), ...v1.options.map((o) => o.code)];
const specIds = (v1.specFields ?? []).map((s) => s.id);
const steps = [
  { id: 'type', title: 'Type de volet', fields: ['type_volet', 'coffre'] },
  { id: 'lame', title: 'Lame', fields: ['lame'] },
  { id: 'moteur', title: 'Motorisation', fields: ['moteur', 'layer', 'radio_somfy'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur', ...specIds] },
  { id: 'coloris', title: 'Coloris', fields: ['color'] },
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
