/* Parse docs/Tarif_MOUSTIQUAIRES_2026.xlsx → grilles 2D (JSON) pour le configurateur
   Moustiquaires (gamme 3). 1 feuille = 1 modèle (nom explicite « Enroulable/Plissée/
   Fixe/Porte battante XXX » dans la feuille). Chaque feuille peut contenir plusieurs
   grilles (variantes) : ventaux (« 2 vantaux », « 1 vantail réversible ») ou, pour Eco+,
   coloris (« standard » / « autres couleurs »).

   Ancrage ROBUSTE : une vraie en-tête de grille contient la cellule « H/L » ; les largeurs
   sont à droite, les hauteurs dessous dans la même colonne. (Évite les fausses en-têtes =
   lignes de données à valeurs rondes.) Variante = libellé lu juste avant l'en-tête.

   Clés de sortie : mous_<slug>[ _v2 | _vr | _autres ]  (v1 = grille par défaut = mous_<slug>).
   Bornes L/H = celles de CHAQUE grille (ex. Aura 800-2100). Prix NET HT 2026.
   Sortie : lib/configurateur/data/moustiquaire-grids.json. À VÉRIFIER avec le PDG. */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'docs', 'Tarif_MOUSTIQUAIRES_2026.xlsx'));
const A = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });
const num = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : null; };
const isHL = (v) => /^\s*H\s*\/\s*L\s*$/i.test(String(v));
const isDim = (n) => n != null && n >= 300 && n <= 5000;
const price = (v) => { const n = num(v); return n != null && Number.isInteger(n) && n >= 30 && n <= 6000 ? n : null; };

// Modèle (slug de sous-famille) d'après le nom explicite dans le texte de la feuille.
function modelSlug(text) {
  const t = text.toUpperCase();
  if (/ECO\s*\+/.test(t)) return 'mous-eco-plus';
  if (/\bECO\b/.test(t)) return 'mous-eco';
  if (/AGLAE/.test(t)) return 'aglae';
  if (/CECIAS/.test(t)) return 'cecias';
  if (/\bLIPS\b/.test(t)) return 'lips';
  if (/AURA/.test(t)) return 'aura';
  if (/ZEPHYR/.test(t)) return 'zephyr';
  if (/BOREE/.test(t)) return 'boree';
  if (/CALISTA/.test(t)) return 'calista';
  if (/CIRCE/.test(t)) return 'circe';
  if (/MYLAS/.test(t)) return 'mylas';
  if (/LYSSA/.test(t)) return 'lyssa';
  return null;
}

// Variante d'une grille d'après le texte des lignes JUSTE au-dessus de son en-tête
// (fenêtre étroite pour éviter le titre : « réversible » de la description Circé,
// « autres couleurs » de la note accessoires). La 1re grille est toujours v1.
function variantOf(labelText) {
  const t = labelText.toLowerCase();
  if (/r[ée]versible/.test(t)) return 'vr';
  if (/2\s*vantaux/.test(t)) return 'v2';
  return 'autres'; // 2e grille verticale sans libellé ventaux = coloris « autres couleurs »
}

const grids = {};
const report = [];

for (const name of wb.SheetNames) {
  const a = A(name);
  const slug = modelSlug(a.map((r) => r.map(String).join(' ')).join(' '));
  if (!slug) { report.push(`${name}: modèle non identifié`); continue; }

  // En-têtes réelles = lignes contenant « H/L ».
  const headers = [];
  a.forEach((r, i) => { const hc = r.findIndex(isHL); if (hc >= 0) headers.push({ i, hc }); });

  headers.forEach((h, hi) => {
    // Largeurs = cellules numériques à droite de « H/L ».
    const cols = [];
    for (let c = h.hc + 1; c < a[h.i].length; c++) { const w = num(a[h.i][c]); if (isDim(w)) cols.push({ c, w }); }
    if (cols.length < 3) return;
    // Variante : la 1re grille = v1 (défaut) ; sinon libellé lu dans les 3 lignes
    // juste au-dessus de l'en-tête (« … 2 vantaux », « … 1 vantail réversible »).
    const label = a.slice(Math.max(0, h.i - 3), h.i).map((r) => r.map(String).join(' ')).join(' ');
    const variant = hi === 0 ? 'v1' : variantOf(label);
    // Hauteurs + cellules : lignes sous l'en-tête où la colonne H/L porte une hauteur.
    const rows = [], cells = [];
    for (let k = h.i + 1; k < a.length; k++) {
      if (a[k].findIndex(isHL) >= 0) break;               // en-tête suivante
      const hh = num(a[k][h.hc]);
      if (!isDim(hh)) { if (rows.length) break; else continue; }
      rows.push(hh);
      cells.push(cols.map((mc) => price(a[k][mc.c])));
    }
    if (!rows.length) return;
    const key = variant === 'v1' ? `mous_${slug}` : `mous_${slug}_${variant}`;
    grids[key] = { rows, cols: cols.map((mc) => mc.w), cells };
    report.push(`${name.padEnd(9)} ${slug.padEnd(14)} ${variant.padEnd(6)} → ${key.padEnd(24)} ${rows.length}h[${rows[0]}-${rows[rows.length - 1]}] × ${cols.length}w[${cols[0].w}-${cols[cols.length - 1].w}]`);
  });
}

// ── Sortie + vérifications ──
const out = path.join(__dirname, '..', 'lib', 'configurateur', 'data', 'moustiquaire-grids.json');
fs.writeFileSync(out, JSON.stringify(grids), 'utf8');
console.log('Grilles écrites :', Object.keys(grids).length);
report.forEach((r) => console.log('  ' + r));

const at = (key, h, w) => { const t = grids[key]; if (!t) return 'NOKEY'; const ri = t.rows.indexOf(h), ci = t.cols.indexOf(w); return ri < 0 || ci < 0 ? `OOB(h${h}/w${w})` : t.cells[ri][ci]; };
console.log('\n=== Références (captures PDG) ===');
console.log('Eco+ standard  H550/L500 =', at('mous_mous-eco-plus', 550, 500), '(attendu 93)');
console.log('Eco+ autres    H550/L500 =', at('mous_mous-eco-plus_autres', 550, 500), '(attendu 168)');
console.log('Aura           H550/L800 =', at('mous_aura', 550, 800), '(attendu 233)');
console.log('Mylas          H550/L500 =', at('mous_mylas', 550, 500), '(attendu 121)');
console.log('Eco            H550/L500 =', at('mous_mous-eco', 550, 500));
console.log('Écrit', path.relative(process.cwd(), out));
