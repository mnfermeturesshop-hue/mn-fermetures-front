/* =====================================================================
   Build def v2 — Volet roulant BLOC BAIE (1.3, démarrage 1.3.1 « intérieur neuf »).
   Grilles = parse-bloc-baie.cjs (bloc-baie-grids.json / -renfort.json).
   Coffre DÉTERMINÉ par la hauteur (bandes continues 168/205/235 selon la lame).
   Motorisation → grille bb_<lame>_<marque>_<filaire|radio> ; manuelle = MN filaire − MV ;
   solaire/RTS = grille radio + forfait. PV coloris/options depuis l'arbre PDG.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const grids = require('../lib/configurateur/data/bloc-baie-grids.json');
const renfort = require('../lib/configurateur/data/bloc-baie-renfort.json');
const gridsReno = require('../lib/configurateur/data/bloc-baie-reno-grids.json');
const renfortReno = require('../lib/configurateur/data/bloc-baie-reno-renfort.json');

const V = (name) => ({ var: name });
const eq = (n, v) => ({ op: 'eq', left: V(n), right: v });
const ne = (n, v) => ({ op: 'ne', left: V(n), right: v });
const inSet = (n, set) => ({ op: 'in', value: V(n), set });
const lt = (n, v) => ({ op: 'lt', left: V(n), right: v });
const lte = (n, v) => ({ op: 'lte', left: V(n), right: v });
const gt = (n, v) => ({ op: 'gt', left: V(n), right: v });
const gte = (n, v) => ({ op: 'gte', left: V(n), right: v });
const AND = (cs) => (cs.length === 1 ? cs[0] : { all: cs });
const ANY = (cs) => (cs.length === 1 ? cs[0] : { any: cs });
const round2 = (e) => ({ op: 'round', arg: e, decimals: 2 });
const perMlLarg = (eur) => round2({ op: '*', args: [eur, { op: '/', args: [V('largeur'), 1000] }] });
const perMlHaut = (eur) => round2({ op: '*', args: [eur, { op: '/', args: [V('hauteur'), 1000] }] });

// ── Coloris (code → libellé + pastille) ──
const C = {
  'blanc-9010': ['Blanc 9010', '#f4f4f0'], 'blanc-pvc': ['Blanc PVC', '#f4f4f0'],
  'beige-pvc': ['Beige PVC', '#e9ddc4'], 'gris-pvc': ['Gris PVC', '#9aa1a8'],
  'beige-1015': ['Beige 1015', '#e9ddc4'],
  'ivoire-1015': ['Ivoire 1015', '#efe7d2'], 'gris-7035': ['Gris 7035', '#d2d4cf'],
  'gris-7038': ['Gris 7038', '#b5b8b1'], 'gris-7016': ['Gris 7016', '#3a3f44'],
  'alu-9006': ['Alu AS 9006', '#c7ccd1'], 'marron-8019': ['Marron 8019', '#5a3a25'],
  'gris-7039': ['Gris 7039', '#6b675f'], 'noir-9005': ['Noir 9005', '#0e0e10'],
  'noir-2100-sable': ['Noir 2100 Sablé', '#1a1a1a'], 'gris-2900-sable': ['Gris 2900 Sablé', '#3d3f42'],
  'rouge-3004': ['Rouge 3004', '#6b1f2a'], 'bleu-5011': ['Bleu 5011', '#1a2b45'],
  'vert-6005': ['Vert 6005', '#114232'], 'vert-6009': ['Vert 6009', '#27352a'],
  'vert-6021': ['Vert 6021', '#89a06b'], 'gris-7011': ['Gris 7011', '#565d65'],
  'gris-7012': ['Gris 7012', '#4e565c'], 'gris-7021': ['Gris 7021', '#2f3438'],
  'gris-7022': ['Gris 7022', '#4b4a45'], 'marron-8014': ['Marron 8014', '#3d2a1d'],
  'ral-9007': ['Ral 9007', '#8f9291'], 'chene-dore': ['Chêne Doré', '#7a4a1e'],
};
const opt = (code, extra) => ({ value: code, label: C[code][0], hex: C[code][1], ...(extra || {}) });

const COFFRE_205_51 = ['beige-1015', 'gris-7035'];
const COFFRE_205_90 = ['gris-7016', 'chene-dore'];
const TAB_PVC = ['blanc-pvc', 'beige-pvc', 'gris-pvc'];
const TAB_ALU_STD = ['blanc-9010', 'ivoire-1015', 'gris-7035', 'gris-7038', 'gris-7016', 'alu-9006', 'marron-8019', 'gris-7039', 'noir-9005', 'noir-2100-sable', 'gris-2900-sable'];
const TAB_ALU56_OPT = ['rouge-3004', 'bleu-5011', 'vert-6005', 'vert-6021', 'gris-7011', 'gris-7012', 'marron-8014', 'ral-9007', 'chene-dore'];
const TAB_ALU42_OPT = ['rouge-3004', 'bleu-5011', 'vert-6005', 'vert-6009', 'vert-6021', 'gris-7021', 'gris-7022', 'marron-8014', 'ral-9007', 'chene-dore'];
const TAB_ALU_OPT_ALL = [...new Set([...TAB_ALU56_OPT, ...TAB_ALU42_OPT])];
const LF_STD = ['blanc-9010', 'ivoire-1015', 'gris-7035', 'gris-7038', 'gris-7016', 'alu-9006', 'marron-8019'];
const LF_OPT = ['rouge-3004', 'bleu-5011', 'vert-6005', 'vert-6009', 'vert-6021', 'gris-7011', 'gris-7012', 'gris-7021', 'gris-7022', 'gris-7039', 'marron-8014', 'noir-9005', 'ral-9007', 'noir-2100-sable', 'gris-2900-sable', 'chene-dore'];

const IS_ALU = inSet('lame', ['alu42', 'alu56']);
const IS_RENO = eq('sous_famille', 'bloc-baie-int-reno');
const IS_NEUF = eq('sous_famille', 'bloc-baie-int-neuf');
const SANS_PA = AND([inSet('lame', ['pvc40', 'alu42']), eq('coulisse_debord', 'sans')]);
const AVEC_PA = AND([inSet('lame', ['pvc40', 'alu42']), eq('coulisse_debord', 'avec')]);
// « Coffre = 205 » exprimé en lame + hauteur (pour la DISPONIBILITÉ des options UI, qui ne
// voit pas la dérivée `coffre`). Équivalent à la dérivée coffre côté prix.
const COFFRE_205 = ANY([
  AND([eq('lame', 'pvc40'), gt('hauteur', 1750)]),
  AND([eq('lame', 'alu42'), IS_RENO, gt('hauteur', 1350)]),
  AND([eq('lame', 'alu42'), IS_NEUF, gt('hauteur', 1350), lte('hauteur', 2350)]),
]);
const MOTORISEE = eq('manoeuvre', 'motorisee');
const IS_FILAIRE = AND([MOTORISEE, eq('motorisation', 'filaire')]);
const IS_RADIO_LIKE = AND([MOTORISEE, inSet('motorisation', ['radio', 'solaire'])]);

// ── CHAMPS ──
const fields = [
  { id: 'sous_famille', label: 'Type de bloc baie', type: 'choice', default: 'bloc-baie-int-neuf',
    options: [
      { value: 'bloc-baie-int-neuf', label: 'Bloc baie intérieur neuf' },
      { value: 'bloc-baie-int-reno', label: 'Bloc baie intérieur rénovation croqué' },
    ] },

  { id: 'lame', label: 'Type de lame', type: 'choice', default: 'alu42',
    options: [
      { value: 'pvc40', label: 'Lame PVC 40' },
      { value: 'alu42', label: 'Lame aluminium 42' },
      { value: 'alu56', label: 'Lame aluminium 56', availableWhen: IS_NEUF },
    ] },

  { id: 'largeur', label: 'Largeur (dos de coulisse)', type: 'dimension', unit: 'mm', min: 375, max: 3500, step: 1, default: 1200 },
  { id: 'hauteur', label: 'Hauteur (sous coffre)', type: 'dimension', unit: 'mm', min: 850, max: 3000, step: 1, default: 1500 },
  { id: 'coffre_info', label: 'Section de coffre', type: 'info', help: 'Déterminée par la hauteur : {{coffre}} mm (enroulement intérieur).' },

  // Cotes de fabrication « croqué » (réno) — sans impact prix ; le prix reste indexé par
  // largeur dos de coulisse × hauteur sous coffre.
  { id: 'largeur_coffre', label: 'Largeur du coffre (mm)', type: 'number', unit: 'mm', min: 0, max: 3600, step: 1, default: 0, role: 'spec', visibleWhen: IS_RENO,
    help: 'Cote de fabrication (distincte de la largeur dos de coulisse).' },
  { id: 'croquage_gauche', label: 'Croquage coffre gauche', type: 'choice', default: '30', role: 'spec', visibleWhen: IS_RENO,
    options: [{ value: '30', label: '30 mm' }, { value: '40', label: '40 mm' }, { value: '60', label: '60 mm' }, { value: '70', label: '70 mm' }] },
  { id: 'croquage_droite', label: 'Croquage coffre droite', type: 'choice', default: '30', role: 'spec', visibleWhen: IS_RENO,
    options: [{ value: '30', label: '30 mm' }, { value: '40', label: '40 mm' }, { value: '60', label: '60 mm' }, { value: '70', label: '70 mm' }] },
  { id: 'profondeur_decoupe_dc', label: 'Profondeur de découpe DC (dormant + coulisse, mm)', type: 'number', unit: 'mm', min: 0, max: 500, step: 1, default: 0, role: 'spec', visibleWhen: IS_RENO },

  { id: 'coffre_coloris', label: 'Coloris du coffre', type: 'choice', default: 'blanc-9010',
    help: 'Coffre 168/235 : blanc uniquement. Coffre 205 : coloris en option (plus-value au ml de largeur).',
    options: [
      opt('blanc-9010'),
      ...COFFRE_205_51.map((c) => opt(c, { availableWhen: COFFRE_205 })),
      ...COFFRE_205_90.map((c) => opt(c, { availableWhen: COFFRE_205 })),
    ] },
  { id: 'cache_vis', label: 'Cache-vis larges', type: 'choice', default: 'non',
    help: 'Coloris identique au coffre. +18 € HT la paire.',
    options: [{ value: 'non', label: 'Sans' }, { value: 'oui', label: 'Avec (+18 €/paire)' }] },

  { id: 'tablier_coloris', label: 'Coloris du tablier', type: 'choice', default: 'blanc-9010',
    options: [
      ...TAB_PVC.map((c) => opt(c, { availableWhen: eq('lame', 'pvc40') })),
      ...TAB_ALU_STD.map((c) => opt(c, { availableWhen: IS_ALU })),
      ...TAB_ALU42_OPT.map((c) => opt(c, { availableWhen: eq('lame', 'alu42') })),
      ...TAB_ALU56_OPT.filter((c) => !TAB_ALU42_OPT.includes(c)).map((c) => opt(c, { availableWhen: eq('lame', 'alu56') })),
    ] },

  { id: 'lamefinale_coloris', label: 'Coloris lame finale (alu)', type: 'choice', default: 'blanc-9010',
    help: 'Lame finale toujours en aluminium. Coloris laqué (hors standard) : +18 €/ml largeur + forfait laquage 77 € par commande (offert dès 2000 € HT).',
    options: [...LF_STD, ...LF_OPT].map((c) => opt(c)) },

  // Coulisse : type (selon lame + débord) + débord + coloris + perçage.
  { id: 'coulisse_debord', label: 'Coulisse — débord', type: 'choice', default: 'sans',
    options: [{ value: 'sans', label: 'Sans débord' }, { value: 'avec', label: 'Avec débord' }] },
  // Coulisses (corrections PDG) — profil par défaut = base (sans PV), listé en 1er par groupe.
  { id: 'coulisse_type', label: 'Coulisse — profil', type: 'choice', default: 'pvc60x30',
    options: [
      // PVC 40 / Alu 42 — sans débord : défaut PVC 60×30
      { value: 'pvc60x30', label: 'PVC 60×30', availableWhen: SANS_PA },
      { value: 'alu53x22', label: 'Alu 53×22', availableWhen: SANS_PA },
      { value: 'alu60x30', label: 'Alu 60×30 (+18 €/ml haut.)', availableWhen: SANS_PA },
      { value: 'alu53x22-aile', label: 'Alu 53×22 à aile (+18 €/ml haut.)', availableWhen: SANS_PA },
      { value: 'alu53x22-z2', label: 'Alu 53×22 Z2 (+23,9 €/ml haut.)', availableWhen: SANS_PA },
      // PVC 40 / Alu 42 — avec débord : défaut PVC 40×30
      { value: 'pvc40x30', label: 'PVC 40×30', availableWhen: AVEC_PA },
      { value: 'alu45x22', label: 'Alu 45×22', availableWhen: AVEC_PA },
      { value: 'alu40x30', label: 'Alu 40×30 (+18 €/ml haut.)', availableWhen: AVEC_PA },
      // Alu 56
      { value: 'alu66x27', label: 'Alu 66×27', availableWhen: AND([eq('lame', 'alu56'), eq('coulisse_debord', 'sans')]) },
      { value: 'alu45x27', label: 'Alu 45×27', availableWhen: AND([eq('lame', 'alu56'), eq('coulisse_debord', 'avec')]) },
    ] },
  { id: 'debord_gauche', label: 'Valeur débord gauche (mm)', type: 'number', unit: 'mm', min: 0, max: 300, step: 1, default: 0, role: 'spec', visibleWhen: eq('coulisse_debord', 'avec') },
  { id: 'debord_droite', label: 'Valeur débord droite (mm)', type: 'number', unit: 'mm', min: 0, max: 300, step: 1, default: 0, role: 'spec', visibleWhen: eq('coulisse_debord', 'avec') },
  { id: 'percage', label: 'Perçage', type: 'choice', default: 'sans',
    options: [{ value: 'tableau', label: 'Tableau' }, { value: 'facade', label: 'Façade' }, { value: 'sans', label: 'Sans perçage' }] },

  // Manœuvre
  { id: 'manoeuvre', label: 'Type de manœuvre', type: 'choice', default: 'motorisee',
    options: [{ value: 'manuelle', label: 'Manuelle (tringle oscillante)' }, { value: 'motorisee', label: 'Motorisation' }] },
  { id: 'cote_manoeuvre', label: 'Côté manœuvre', type: 'choice', default: 'gauche', role: 'spec', visibleWhen: eq('manoeuvre', 'manuelle'),
    options: [{ value: 'gauche', label: 'Gauche' }, { value: 'droite', label: 'Droite' }] },
  { id: 'sortie_manoeuvre', label: 'Sortie manœuvre', type: 'choice', default: 'sous-coffre', role: 'spec', visibleWhen: eq('manoeuvre', 'manuelle'),
    options: [{ value: 'sous-coffre', label: 'Sous-coffre' }, { value: 'facade', label: 'Façade' }] },
  { id: 'genouillere_manuelle', label: 'Genouillère déportée sous coffre', type: 'choice', default: 'non', visibleWhen: eq('manoeuvre', 'manuelle'),
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+18 €)' }] },
  { id: 'cote_fil', label: 'Côté fil', type: 'choice', default: 'gauche', role: 'spec', visibleWhen: MOTORISEE,
    options: [{ value: 'gauche', label: 'Gauche' }, { value: 'droite', label: 'Droite' }] },
  { id: 'sortie_fil', label: 'Sortie fil', type: 'choice', default: 'sous-coffre', role: 'spec', visibleWhen: MOTORISEE,
    options: [{ value: 'sous-coffre', label: 'Sous-coffre' }, { value: 'facade', label: 'Façade' }] },

  // Motorisation
  { id: 'motorisation', label: 'Motorisation', type: 'choice', default: 'radio', visibleWhen: MOTORISEE,
    options: [{ value: 'filaire', label: 'Filaire' }, { value: 'radio', label: 'Radio' }, { value: 'solaire', label: 'Solaire' }] },
  { id: 'marque', label: 'Marque moteur', type: 'choice', default: 'somfy', visibleWhen: MOTORISEE,
    options: [{ value: 'mn', label: 'MN' }, { value: 'somfy', label: 'Somfy' }] },

  // Options filaire
  { id: 'inverseur', label: 'Inverseur (en applique ou encastré)', type: 'choice', default: 'non', visibleWhen: IS_FILAIRE,
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+21 €)' }] },
  { id: 'secours_integre', label: 'Commande de secours intégrée', type: 'choice', default: 'non', visibleWhen: IS_FILAIRE,
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+136 €)' }] },
  { id: 'genouillere', label: 'Choix de genouillère', type: 'choice', default: 'app60-non-aim', visibleWhen: AND([IS_FILAIRE, eq('secours_integre', 'oui')]),
    options: [
      { value: 'app60-non-aim', label: 'En applique 60° non aimantée (incluse)' },
      { value: 'app90-non-aim', label: 'En applique 90° non aimantée (+18 €)' },
      { value: 'sous-coffre-60', label: 'Sous-coffre 60° (incluse)' },
      { value: 'app60-aim', label: 'En applique 60° aimantée (+41 €)' },
      { value: 'app90-aim', label: 'En applique 90° aimantée (+59 €)' },
      { value: 'sous-coffre-60-aim', label: 'Sous-coffre 60° aimantée (+41 €)' },
    ] },
  { id: 'secours_type', label: 'Commande de secours', type: 'choice', default: 'aucune', visibleWhen: AND([IS_FILAIRE, eq('secours_integre', 'oui')]),
    options: [
      { value: 'aucune', label: 'Aucune (secours intégré seul)' },
      { value: 'cle', label: 'À clé (+158 €)' },
      { value: 'renvoi-coulisse', label: 'Renvoi extérieur coulisse (+228 €)' },
      { value: 'renvoi-mur', label: 'Renvoi extérieur mur (+228 €)' },
      { value: 'kit-inverseur', label: 'Kit inverseur + contact à clé + télérupteur (+139 €)' },
    ] },

  // Options radio / solaire
  { id: 'emetteur_type', label: 'Émetteur', type: 'choice', default: 'mural', visibleWhen: IS_RADIO_LIKE,
    help: 'MN : portatif 1 canal inclus. Somfy : Amy 1 Sun Protect inclus.',
    options: [{ value: 'portatif', label: 'Portatif' }, { value: 'mural', label: 'Mural' }] },
  { id: 'mn_5canaux', label: 'Émetteur portatif 5 canaux (MN)', type: 'choice', default: 'non', visibleWhen: AND([IS_RADIO_LIKE, eq('marque', 'mn')]),
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+80 €)' }] },
  { id: 'somfy_situo1', label: 'Remplacer Amy 1 par Situo IO 1 canal', type: 'choice', default: 'non', visibleWhen: AND([IS_RADIO_LIKE, eq('marque', 'somfy')]),
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+23 €)' }] },
  { id: 'somfy_situo5', label: 'Ajouter Situo IO 5 Pure 2 (5 canaux)', type: 'choice', default: 'non', visibleWhen: AND([IS_RADIO_LIKE, eq('marque', 'somfy')]),
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+135 €)' }] },
  { id: 'somfy_amy4', label: 'Ajouter Amy 4 IO', type: 'choice', default: 'non', visibleWhen: AND([IS_RADIO_LIKE, eq('marque', 'somfy')]),
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+131 €)' }] },
  { id: 'somfy_tahoma', label: 'Box domotique TaHoma switch', type: 'choice', default: 'non', visibleWhen: AND([IS_RADIO_LIKE, eq('marque', 'somfy')]),
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+340 €)' }] },
  { id: 'rts', label: 'Motorisation RTS (au lieu de io)', type: 'choice', default: 'non', visibleWhen: AND([MOTORISEE, eq('motorisation', 'radio'), eq('marque', 'somfy')]),
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+55 €)' }] },
  { id: 'alim_depannage', label: 'Alimentation de dépannage (solaire)', type: 'choice', default: 'non', visibleWhen: AND([MOTORISEE, eq('motorisation', 'solaire')]),
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+83 €)' }] },

  // Options diverses
  { id: 'renfort', label: 'Renfort', type: 'choice', default: 'non',
    help: 'Renfort de tablier — plus-value selon la largeur.',
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui' }] },
  { id: 'mortaise', label: 'Mortaise', type: 'choice', default: 'non',
    options: [{ value: 'non', label: 'Non' }, { value: 'oui', label: 'Oui (+12,70 €)' }] },
  { id: 'cale_epaississeur', label: 'Câle épaississeur coulisse 10 mm (qté / volet)', type: 'number', min: 0, max: 20, step: 1, default: 0, role: 'spec', visibleWhen: IS_RENO,
    help: 'Sur consultation — compatible coulisses PVC / Alu 60×30. Indiquer la quantité par volet.' },
];

// ── DÉRIVÉES ──
// Coffre = f(lame, hauteur). Réno : pas de 235 (alu 42 → 205 dès H>1350). Neuf : 235 au-delà.
const coffreExpr = {
  op: 'if', cond: eq('lame', 'pvc40'),
  then: { op: 'if', cond: lte('hauteur', 1750), then: '168', else: '205' },
  else: {
    op: 'if', cond: eq('lame', 'alu56'), then: '235',
    else: {  // alu42
      op: 'if', cond: lte('hauteur', 1350), then: '168',
      else: { op: 'if', cond: IS_RENO, then: '205',
        else: { op: 'if', cond: lte('hauteur', 2350), then: '205', else: '235' } },
    },
  },
};
const derived = [
  { id: 'coffre', expr: coffreExpr },
  // Couche : filaire (manuelle + motorisation filaire) sinon radio (radio/solaire/RTS).
  { id: 'layer', expr: { op: 'if', cond: ANY([eq('manoeuvre', 'manuelle'), IS_FILAIRE]), then: 'filaire', else: 'radio' } },
  // Marque effective : manuelle → MN ; sinon la marque choisie.
  { id: 'marque_eff', expr: { op: 'if', cond: eq('manoeuvre', 'manuelle'), then: 'mn', else: V('marque') } },
  { id: 'grid', expr: { op: 'concat', args: [{ op: 'if', cond: IS_RENO, then: 'bbr_', else: 'bb_' }, V('lame'), '_', V('marque_eff'), '_', V('layer')] } },
  { id: 'surface_m2', expr: { op: '*', args: [{ op: '/', args: [V('largeur'), 1000] }, { op: '/', args: [V('hauteur'), 1000] }] } },
  // Largeur MINI = borne basse de la bande L-mini. Réno : manuelle/filaire MN 436 · filaire
  // Somfy 456 · solaire 569 · radio MN 642 · radio Somfy 456. Neuf : lame 56 → 700 ;
  // manuelle/filaire MN 375 · filaire Somfy 400 · solaire 508 · radio MN 596 · radio Somfy 400.
  { id: 'l_min', expr: {
    op: 'if', cond: IS_RENO,
    then: { op: 'if', cond: eq('manoeuvre', 'manuelle'), then: 436,
      else: { op: 'if', cond: eq('motorisation', 'solaire'), then: 569,
        else: { op: 'if', cond: eq('motorisation', 'filaire'),
          then: { op: 'if', cond: eq('marque', 'mn'), then: 436, else: 456 },
          else: { op: 'if', cond: eq('marque', 'mn'), then: 642, else: 456 } } } },
    else: { op: 'if', cond: eq('lame', 'alu56'), then: 700,
      else: { op: 'if', cond: eq('manoeuvre', 'manuelle'), then: 375,
        else: { op: 'if', cond: eq('motorisation', 'solaire'), then: 508,
          else: { op: 'if', cond: eq('motorisation', 'filaire'),
            then: { op: 'if', cond: eq('marque', 'mn'), then: 375, else: 400 },
            else: { op: 'if', cond: eq('marque', 'mn'), then: 596, else: 400 } } } } } } },
];

// ── RÈGLES DE PRIX ──
const priceRules = [];
priceRules.push({ code: 'base', label: 'Volet (grille)', kind: 'base',
  amount: { op: 'lookup2d', table: V('grid'), row: V('hauteur'), col: V('largeur') } });

// Manœuvre manuelle : moins-value sur la grille MN filaire.
priceRules.push({ code: 'manuelle_mv', label: 'Manœuvre manuelle (moins-value)', kind: 'add',
  when: eq('manoeuvre', 'manuelle'), amount: { op: 'if', cond: lt('largeur', 526), then: -61, else: -10 } });
priceRules.push({ code: 'genouillere_manuelle', label: 'Genouillère déportée sous coffre', kind: 'add',
  when: AND([eq('manoeuvre', 'manuelle'), eq('genouillere_manuelle', 'oui')]), amount: 18 });

// Solaire (kit) / RTS / alim dépannage.
priceRules.push({ code: 'solaire_kit', label: 'Kit solaire', kind: 'add', when: AND([MOTORISEE, eq('motorisation', 'solaire')]), amount: 232 });
priceRules.push({ code: 'alim_depannage', label: 'Alimentation de dépannage', kind: 'add', when: AND([MOTORISEE, eq('motorisation', 'solaire'), eq('alim_depannage', 'oui')]), amount: 83 });
priceRules.push({ code: 'rts', label: 'Motorisation RTS', kind: 'add', when: AND([MOTORISEE, eq('motorisation', 'radio'), eq('marque', 'somfy'), eq('rts', 'oui')]), amount: 55 });

// Coffre coloris (205) — plus-value au ml de largeur.
priceRules.push({ code: 'coffre_col_51', label: 'Coloris coffre 205', kind: 'add', when: AND([eq('coffre', '205'), inSet('coffre_coloris', COFFRE_205_51)]), amount: perMlLarg(51) });
priceRules.push({ code: 'coffre_col_90', label: 'Coloris coffre 205 (foncé/bois)', kind: 'add', when: AND([eq('coffre', '205'), inSet('coffre_coloris', COFFRE_205_90)]), amount: perMlLarg(90) });
priceRules.push({ code: 'cache_vis', label: 'Cache-vis larges', kind: 'add', when: eq('cache_vis', 'oui'), amount: 18 });

// Tablier coloris option (+14 €/m²).
priceRules.push({ code: 'tablier_col', label: 'Coloris tablier (option)', kind: 'add', when: inSet('tablier_coloris', TAB_ALU_OPT_ALL), amount: round2({ op: '*', args: [14, V('surface_m2')] }) });
// Lame finale laquée : +18 €/ml largeur. Le code `color_*_pv` déclenche le FORFAIT LAQUAGE
// par commande (77 € si total < 2000 € HT, offert au-delà — mécanisme partagé Tradi/Réno,
// géré par verifyCart), donc PAS de +77 € en dur ici.
priceRules.push({ code: 'color_lamefinale_pv', label: 'Coloris lame finale (laqué)', kind: 'add', when: inSet('lamefinale_coloris', LF_OPT), amount: perMlLarg(18) });

// Coulisse profil — plus-value €/ml hauteur.
priceRules.push({ code: 'coulisse_pv18', label: 'Coulisse (plus-value)', kind: 'add', when: inSet('coulisse_type', ['alu53x22-aile', 'alu60x30', 'alu40x30']), amount: perMlHaut(18) });
priceRules.push({ code: 'coulisse_pv239', label: 'Coulisse Z2 (plus-value)', kind: 'add', when: eq('coulisse_type', 'alu53x22-z2'), amount: perMlHaut(23.9) });

// Options filaire.
priceRules.push({ code: 'inverseur', label: 'Inverseur', kind: 'add', when: AND([IS_FILAIRE, eq('inverseur', 'oui')]), amount: 21 });
priceRules.push({ code: 'secours_integre', label: 'Commande de secours intégrée', kind: 'add', when: AND([IS_FILAIRE, eq('secours_integre', 'oui')]), amount: 136 });
const genouillereAmt = { op: 'if', cond: inSet('genouillere', ['app90-non-aim']), then: 18,
  else: { op: 'if', cond: inSet('genouillere', ['app60-aim', 'sous-coffre-60-aim']), then: 41,
    else: { op: 'if', cond: eq('genouillere', 'app90-aim'), then: 59, else: 0 } } };
priceRules.push({ code: 'genouillere', label: 'Genouillère', kind: 'add', when: AND([IS_FILAIRE, eq('secours_integre', 'oui')]), amount: genouillereAmt });
const secoursAmt = { op: 'if', cond: eq('secours_type', 'cle'), then: 158,
  else: { op: 'if', cond: inSet('secours_type', ['renvoi-coulisse', 'renvoi-mur']), then: 228,
    else: { op: 'if', cond: eq('secours_type', 'kit-inverseur'), then: 139, else: 0 } } };
priceRules.push({ code: 'secours_type', label: 'Commande de secours (type)', kind: 'add', when: AND([IS_FILAIRE, eq('secours_integre', 'oui')]), amount: secoursAmt });

// Options radio / solaire.
priceRules.push({ code: 'mn_5canaux', label: 'Émetteur 5 canaux MN', kind: 'add', when: AND([IS_RADIO_LIKE, eq('marque', 'mn'), eq('mn_5canaux', 'oui')]), amount: 80 });
priceRules.push({ code: 'somfy_situo1', label: 'Situo IO 1 canal', kind: 'add', when: AND([IS_RADIO_LIKE, eq('marque', 'somfy'), eq('somfy_situo1', 'oui')]), amount: 23 });
priceRules.push({ code: 'somfy_situo5', label: 'Situo IO 5 Pure 2', kind: 'add', when: AND([IS_RADIO_LIKE, eq('marque', 'somfy'), eq('somfy_situo5', 'oui')]), amount: 135 });
priceRules.push({ code: 'somfy_amy4', label: 'Amy 4 IO', kind: 'add', when: AND([IS_RADIO_LIKE, eq('marque', 'somfy'), eq('somfy_amy4', 'oui')]), amount: 131 });
priceRules.push({ code: 'somfy_tahoma', label: 'TaHoma switch', kind: 'add', when: AND([IS_RADIO_LIKE, eq('marque', 'somfy'), eq('somfy_tahoma', 'oui')]), amount: 340 });

// Renfort (option) + mortaise.
priceRules.push({ code: 'renfort', label: 'Renfort', kind: 'add', when: eq('renfort', 'oui'), amount: { op: 'lookup1d', table: { op: 'concat', args: [{ op: 'if', cond: IS_RENO, then: 'renfort_r_', else: 'renfort_' }, V('lame')] }, key: V('largeur') } });
priceRules.push({ code: 'mortaise', label: 'Mortaise', kind: 'add', when: eq('mortaise', 'oui'), amount: 12.70 });

// ── CONTRAINTES ──
// Bornes par sous-famille × lame. Réno : PVC 40 → L max 1600, H max 2450 ; Alu 42 → 3000 / 2450.
const SF = { neuf: 'bloc-baie-int-neuf', reno: 'bloc-baie-int-reno' };
const SURF_MAX = { neuf: { pvc40: 4.5, alu42: 8, alu56: 12 }, reno: { pvc40: 4.5, alu42: 8 } };
const H_MAX = { neuf: { pvc40: 2450, alu42: 2850, alu56: 2350 }, reno: { pvc40: 2450, alu42: 2450 } };
const L_MAX = { neuf: { pvc40: 1700, alu42: 3000, alu56: 3500 }, reno: { pvc40: 1600, alu42: 3000 } };
const constraints = [];
for (const sfk of ['neuf', 'reno']) {
  for (const lame of Object.keys(SURF_MAX[sfk])) {
    const guard = (extra) => ANY([ne('sous_famille', SF[sfk]), ne('lame', lame), extra]);
    constraints.push({ requires: guard(lte('surface_m2', SURF_MAX[sfk][lame])), message: `Surface maximale ${String(SURF_MAX[sfk][lame]).replace('.', ',')} m² dépassée pour cette lame.` });
    constraints.push({ requires: guard(lte('hauteur', H_MAX[sfk][lame])), message: `Hauteur hors plage pour cette lame (max ${H_MAX[sfk][lame]} mm).` });
    constraints.push({ requires: guard(lte('largeur', L_MAX[sfk][lame])), message: `Largeur hors plage pour cette lame (max ${L_MAX[sfk][lame]} mm).` });
  }
}
// Minimums : hauteur ≥ 850 mm (toutes lames) ; largeur ≥ l_min (selon lame + motorisation).
constraints.push({ requires: gte('hauteur', 850), message: 'Hauteur minimale : 850 mm.' });
constraints.push({ requires: { op: 'gte', left: V('largeur'), right: V('l_min') }, message: 'Largeur inférieure au minimum autorisé (dépend de la lame et de la motorisation).' });

// ── ÉTAPES ──
const steps = [
  { id: 'produit', title: 'Type de produit', fields: ['sous_famille', 'lame'] },
  { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur', 'coffre_info', 'largeur_coffre', 'croquage_gauche', 'croquage_droite', 'profondeur_decoupe_dc'] },
  { id: 'coffre', title: 'Coffre', fields: ['coffre_coloris', 'cache_vis'] },
  { id: 'tablier', title: 'Tablier & lame finale', fields: ['tablier_coloris', 'lamefinale_coloris'] },
  { id: 'coulisse', title: 'Coulisses', fields: ['coulisse_debord', 'coulisse_type', 'debord_gauche', 'debord_droite', 'coulisse_coloris', 'percage'] },
  { id: 'manoeuvre', title: 'Manœuvre', fields: ['manoeuvre', 'cote_manoeuvre', 'sortie_manoeuvre', 'genouillere_manuelle', 'cote_fil', 'sortie_fil', 'motorisation', 'marque', 'emetteur_type', 'inverseur', 'secours_integre', 'genouillere', 'secours_type', 'mn_5canaux', 'somfy_situo1', 'somfy_situo5', 'somfy_amy4', 'somfy_tahoma', 'rts', 'alim_depannage'] },
  { id: 'options', title: 'Options', fields: ['renfort', 'mortaise', 'cale_epaississeur'] },
  { id: 'recap', title: 'Récapitulatif', fields: [] },
];

// ── Coloris coulisse (corrections PDG) — 4 schémas de prix selon le profil ──
//  PVC (60×30/40×30) ; Alu-A (40×30/60×30/53×22-aile) ; Alu-B (45×22/53×22/45×27/66×27) ;
//  Alu-Z2 (53×22-Z2). Les coloris LAQUÉS (+42 €/ml haut.) déclenchent le forfait laquage
//  (code color_*_pv, 77 €/commande offert ≥ 2000 €). Le Z2 laque même les coloris standard.
const COUL_PVC_T = ['pvc60x30', 'pvc40x30'];
const COUL_A_T = ['alu40x30', 'alu60x30', 'alu53x22-aile'];
const COUL_B_T = ['alu45x22', 'alu53x22', 'alu45x27', 'alu66x27'];
const COUL_Z2_T = ['alu53x22-z2'];
const COUL_ALU_T = [...COUL_A_T, ...COUL_B_T, ...COUL_Z2_T];
const ALU_STD_C = ['ivoire-1015', 'gris-7035', 'gris-7038', 'gris-7016', 'alu-9006', 'marron-8019'];
const ALU_LAQUE_C = ['rouge-3004', 'bleu-5011', 'vert-6005', 'vert-6009', 'vert-6021', 'gris-7021', 'gris-7022', 'gris-7039', 'marron-8014', 'noir-9005', 'ral-9007', 'noir-2100-sable', 'gris-2900-sable'];

fields.splice(fields.findIndex((f) => f.id === 'percage'), 0, {
  id: 'coulisse_coloris', label: 'Coloris coulisse', type: 'choice', default: 'blanc-9010',
  help: 'PVC : Ivoire/Gris 7035 +14,3 €/ml haut., Gris 7016 +29. Alu : +42 €/ml haut. (coloris laqués : + forfait laquage 77 €/commande).',
  options: [
    opt('blanc-9010'), opt('ivoire-1015'), opt('gris-7035'), opt('gris-7016'),
    opt('gris-7038', { availableWhen: inSet('coulisse_type', COUL_ALU_T) }),
    opt('alu-9006', { availableWhen: inSet('coulisse_type', COUL_ALU_T) }),
    opt('marron-8019', { availableWhen: inSet('coulisse_type', COUL_ALU_T) }),
    ...ALU_LAQUE_C.map((c) => opt(c, { availableWhen: inSet('coulisse_type', COUL_ALU_T) })),
    opt('chene-dore', { availableWhen: inSet('coulisse_type', COUL_B_T) }),
  ],
});
// PVC : +14,3 (ivoire/gris7035) / +29 (gris7016).
priceRules.push({ code: 'coul_col_pvc_143', label: 'Coloris coulisse PVC', kind: 'add', when: AND([inSet('coulisse_type', COUL_PVC_T), inSet('coulisse_coloris', ['ivoire-1015', 'gris-7035'])]), amount: perMlHaut(14.3) });
priceRules.push({ code: 'coul_col_pvc_29', label: 'Coloris coulisse PVC (foncé)', kind: 'add', when: AND([inSet('coulisse_type', COUL_PVC_T), eq('coulisse_coloris', 'gris-7016')]), amount: perMlHaut(29) });
// Alu +42 NON laqué (A : standards ; B : alu 9006/marron 8019/chêne doré).
const std42Coul = ANY([
  AND([inSet('coulisse_type', COUL_A_T), inSet('coulisse_coloris', ALU_STD_C)]),
  AND([inSet('coulisse_type', COUL_B_T), inSet('coulisse_coloris', ['alu-9006', 'marron-8019', 'chene-dore'])]),
]);
priceRules.push({ code: 'coul_col_42', label: 'Coloris coulisse alu', kind: 'add', when: std42Coul, amount: perMlHaut(42) });
// Alu +42 LAQUÉ (A/B : options ; Z2 : tout coloris non blanc) → déclenche le forfait laquage.
const laqueCoul = ANY([
  AND([inSet('coulisse_type', COUL_A_T), inSet('coulisse_coloris', ALU_LAQUE_C)]),
  AND([inSet('coulisse_type', COUL_B_T), inSet('coulisse_coloris', ALU_LAQUE_C)]),
  AND([inSet('coulisse_type', COUL_Z2_T), ne('coulisse_coloris', 'blanc-9010')]),
]);
priceRules.push({ code: 'color_coulisse_pv', label: 'Coloris coulisse (laqué)', kind: 'add', when: laqueCoul, amount: perMlHaut(42) });

const def = {
  slug: 'volet-roulant-bloc-baie', name: 'Volet roulant Bloc baie', famille: 'bloc-baie', nodeField: 'sous_famille',
  fields, derived, steps, priceRules,
  tables: { d1: { ...renfort, ...renfortReno }, d2: { ...grids, ...gridsReno } }, constraints,
  tableLabels: Object.fromEntries([
    ...Object.keys(grids).map((k) => [k, k.replace('bb_', '').replace('_', ' ').toUpperCase()]),
    ...Object.keys(gridsReno).map((k) => [k, 'RÉNO ' + k.replace('bbr_', '').replace('_', ' ').toUpperCase()]),
    ...Object.keys(renfort).map((k) => [k, 'Renfort ' + k.replace('renfort_', '')]),
    ...Object.keys(renfortReno).map((k) => [k, 'Renfort réno ' + k.replace('renfort_r_', '')]),
  ]),
};

const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'volet-roulant-bloc-baie.v2.json');
fs.writeFileSync(out, JSON.stringify(def), 'utf8');
console.log(`Écrit ${path.relative(process.cwd(), out)} — ${fields.length} champs, ${priceRules.length} règles, ${Object.keys(grids).length + Object.keys(gridsReno).length} grilles (dont ${Object.keys(gridsReno).length} réno), ${constraints.length} contraintes.`);
