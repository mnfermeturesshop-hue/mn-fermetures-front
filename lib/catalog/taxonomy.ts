/* =====================================================================
   MN FERMETURES — Nomenclature produits : Gamme › Famille › Sous‑famille
   Hiérarchie unique (codes 1 / 1.1 / 1.1.1) qui pilote la navigation, le
   rattachement des produits/configurateurs ET les remises B2B (héritées).
   Ce fichier porte le SEED (nomenclature du PDG) ; en base la table
   `taxonomy_nodes` prend le relais (éditable admin) — cf. loader `getTaxonomy`.
   ===================================================================== */

export type TaxonomyLevel = 'gamme' | 'famille' | 'sous_famille';

export interface TaxonomyNode {
  code: string;                 // '1' | '1.1' | '1.1.1'
  slug: string;                 // unique, kebab-case
  name: string;
  level: TaxonomyLevel;
  parentSlug: string | null;    // null pour une gamme
  sortOrder: number;
  active: boolean;
  generatorSlug?: string;       // configurateur rattaché (facultatif)
  surcharge?: number;           // surcharge temporaire % (héritée), 0 par défaut
}

/* ---------- Seed (arbre lisible → aplati en liste) ---------- */

interface SeedLeaf { name: string; slug: string; generatorSlug?: string }
interface SeedFamille extends SeedLeaf { children?: SeedLeaf[] }
interface SeedGamme extends SeedLeaf { children: SeedFamille[] }

const TREE: SeedGamme[] = [
  { name: 'Volets roulants', slug: 'volets-roulants', children: [
    { name: 'Tradi', slug: 'tradi', generatorSlug: 'volet-roulant-traditionnel', children: [
      { name: 'Tradi', slug: 'tradi-std' }, { name: 'Tradi + coffre', slug: 'tradi-coffre' }, { name: 'Coffre seul', slug: 'coffre-seul' },
    ] },
    { name: 'Reno', slug: 'reno', children: [
      { name: 'Minibox', slug: 'minibox' }, { name: 'Renobox', slug: 'renobox' }, { name: 'Reno gros coffre', slug: 'reno-gros-coffre' },
    ] },
    { name: 'Bloc baie', slug: 'bloc-baie', children: [
      { name: 'Bloc baie intérieur neuf', slug: 'bloc-baie-int-neuf' }, { name: 'Bloc baie intérieur réno', slug: 'bloc-baie-int-reno' },
      { name: 'Bloc baie extérieur', slug: 'bloc-baie-ext' }, { name: 'Bloc baie ½ linteau', slug: 'bloc-baie-demi-linteau' },
    ] },
    { name: 'Porte de garage', slug: 'porte-de-garage', children: [
      { name: 'Ecopark', slug: 'ecopark' }, { name: 'Rollpark', slug: 'rollpark' }, { name: 'Primo', slug: 'primo' },
    ] },
  ] },
  { name: 'Volets battants', slug: 'volets-battants', children: [
    { name: 'Panneaux', slug: 'vb-panneaux', children: [ { name: 'Ecotek', slug: 'ecotek' }, { name: 'Novatek', slug: 'novatek' } ] },
    { name: 'Extrudés', slug: 'vb-extrudes' },
  ] },
  { name: 'Moustiquaires', slug: 'moustiquaires', children: [
    { name: 'Verticales', slug: 'mous-verticales', children: [
      { name: 'Eco', slug: 'mous-eco' }, { name: 'Eco+', slug: 'mous-eco-plus' }, { name: 'Aglaé', slug: 'aglae' },
      { name: 'Cecias', slug: 'cecias' }, { name: 'Lips', slug: 'lips' }, { name: 'Aura', slug: 'aura' },
    ] },
    { name: 'Latérales', slug: 'mous-laterales', children: [ { name: 'Zephyr', slug: 'zephyr' }, { name: 'Borée', slug: 'boree' } ] },
    { name: 'Plissées', slug: 'mous-plissees', children: [ { name: 'Calista', slug: 'calista' }, { name: 'Circé', slug: 'circe' } ] },
    { name: 'Fixes', slug: 'mous-fixes', children: [ { name: 'Mylas', slug: 'mylas' } ] },
    { name: 'Battantes', slug: 'mous-battantes', children: [ { name: 'Sciron', slug: 'sciron' } ] },
    { name: 'Coulissantes', slug: 'mous-coulissantes', children: [ { name: 'Lapix', slug: 'lapix' } ] },
  ] },
  { name: 'Portails & clôtures', slug: 'portails-clotures', children: [
    { name: 'Alu', slug: 'pc-alu', children: [ { name: 'Portail alu', slug: 'portail-alu' }, { name: 'Clôture alu', slug: 'cloture-alu' } ] },
    { name: 'PVC', slug: 'pc-pvc', children: [ { name: 'Portail PVC', slug: 'portail-pvc' }, { name: 'Clôture PVC', slug: 'cloture-pvc' } ] },
  ] },
  { name: 'Accessoires', slug: 'accessoires', children: [
    { name: 'Tabliers seuls', slug: 'tabliers-seuls' },
    { name: 'Accessoires & kits', slug: 'accessoires-kits', children: [
      { name: 'À l’unité', slug: 'acc-unite' }, { name: 'À la longueur', slug: 'acc-longueur' }, { name: 'Kits d’axe', slug: 'kits-axe' },
    ] },
  ] },
];

function flatten(): TaxonomyNode[] {
  const out: TaxonomyNode[] = [];
  TREE.forEach((g, gi) => {
    const gCode = String(gi + 1);
    out.push({ code: gCode, slug: g.slug, name: g.name, level: 'gamme', parentSlug: null, sortOrder: gi, active: true, ...(g.generatorSlug ? { generatorSlug: g.generatorSlug } : {}) });
    (g.children ?? []).forEach((f, fi) => {
      const fCode = `${gCode}.${fi + 1}`;
      out.push({ code: fCode, slug: f.slug, name: f.name, level: 'famille', parentSlug: g.slug, sortOrder: fi, active: true, ...(f.generatorSlug ? { generatorSlug: f.generatorSlug } : {}) });
      (f.children ?? []).forEach((s, si) => {
        out.push({ code: `${fCode}.${si + 1}`, slug: s.slug, name: s.name, level: 'sous_famille', parentSlug: f.slug, sortOrder: si, active: true, ...(s.generatorSlug ? { generatorSlug: s.generatorSlug } : {}) });
      });
    });
  });
  return out;
}

export const TAXONOMY_SEED: TaxonomyNode[] = flatten();

/* ---------- Helpers (sur une liste de nœuds) ---------- */

export function bySlug(nodes: TaxonomyNode[]): Map<string, TaxonomyNode> {
  return new Map(nodes.map((n) => [n.slug, n]));
}

/** Chaîne du nœud jusqu'à la gamme : [feuille, …, gamme]. */
export function chainSlugs(nodes: TaxonomyNode[], slug: string): string[] {
  const map = bySlug(nodes);
  const out: string[] = [];
  let cur = map.get(slug);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.slug)) { seen.add(cur.slug); out.push(cur.slug); cur = cur.parentSlug ? map.get(cur.parentSlug) : undefined; }
  return out;
}

/** Enfants directs d'un nœud (ou gammes si slug null). `activeOnly` par défaut. */
export function children(nodes: TaxonomyNode[], parentSlug: string | null, activeOnly = true): TaxonomyNode[] {
  return nodes
    .filter((n) => n.parentSlug === parentSlug && (!activeOnly || n.active))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Recalcule les codes 1 / 1.1 / 1.1.1 depuis parentSlug + sortOrder (source de
 *  vérité = la structure ; jamais de dérive après un déplacement/réordre). */
export function recomputeCodes(nodes: TaxonomyNode[]): TaxonomyNode[] {
  const codeBySlug = new Map<string, string>();
  const walk = (parentSlug: string | null, prefix: string) => {
    children(nodes, parentSlug, false).forEach((n, i) => {
      const code = prefix ? `${prefix}.${i + 1}` : String(i + 1);
      codeBySlug.set(n.slug, code);
      walk(n.slug, code);
    });
  };
  walk(null, '');
  return nodes.map((n) => ({ ...n, code: codeBySlug.get(n.slug) ?? n.code }));
}
