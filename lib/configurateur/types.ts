/* =====================================================================
   MN FERMETURES — Configurateur produit générique
   Modèle de données commun à toutes les familles configurables (volet
   roulant traditionnel d'abord, puis portails, portes de garage…).
   Une définition (ConfiguratorDef) est stockée en base (table
   `configurators`, jsonb) et alimentée par l'import Excel admin.
   Le même moteur (engine.ts) résout le prix côté client (instantané)
   ET côté serveur (re-tarification devis, audit S2).
   ===================================================================== */

export type MoneyHT = number;

/** Couche moteur d'une grille : le tarif distingue Filaire / Radio. */
export type MotorLayer = 'filaire' | 'radio';

/* ---------- Axes de choix (sélecteurs) ---------- */

export interface SelectorOption {
  value: string;        // ex: 'cd942'
  label: string;        // ex: 'Lame aluminium CD942'
  hint?: string;
  imageUrl?: string;
}

/** Un axe que l'utilisateur choisit pour sélectionner la grille + les options. */
export interface Selector {
  id: string;           // ex: 'pose' | 'lame' | 'moteur'
  label: string;        // ex: 'Type de lame'
  options: SelectorOption[];
  /** Affiché seulement si les axes courants matchent (ex. { pose: 'coffre' }). */
  scope?: Record<string, string>;
}

/* ---------- Grilles de prix (Largeur × Hauteur) ---------- */

/** Barème €/HT indexé sur la largeur de commande (mm) — snap-up. */
export type BaremeParLargeur = Record<number, MoneyHT>;

/**
 * Grille d'UNE couche moteur (filaire ou radio). `widths` = bornes hautes
 * de bande (snap-up), PROPRES à la couche : le tarif a des petites largeurs
 * différentes selon filaire/radio (ex. MN filaire ≤450, radio ≤600).
 * `rows[hauteur]` est aligné sur `widths` ; `null` = hors abaque.
 */
export interface LayerGrid {
  widths: number[];
  rows: Record<number, (MoneyHT | null)[]>;
}

/**
 * Grille de prix pour UNE combinaison d'axes (ex: pose=indépendant,
 * lame=cd942, moteur=mn). Les hauteurs (snap-up) sont communes aux couches ;
 * chaque couche a ses propres largeurs.
 */
export interface PriceGrid {
  key: Record<string, string>;                 // { pose, lame, moteur }
  heights: number[];
  layers: Partial<Record<MotorLayer, LayerGrid>>;
}

/* ---------- Ajustements (moins-values / suppléments par largeur) ---------- */

/**
 * Ajustement indexé sur la largeur, rattaché à une combinaison d'axes.
 * Ex: attaches rigides (« Moins value AR », négatif), manœuvre manuelle
 * (moins-value sur grille Filaire).
 */
export interface Adjustment {
  code: string;                                 // 'attaches_rigides' | 'manoeuvre_manuelle'
  label: string;
  scope?: Record<string, string>;               // ne s'applique qu'aux grilles matchant ce filtre partiel
  layer?: MotorLayer;                           // restreint à une couche (ex: manœuvre → filaire)
  baremeParLargeur: BaremeParLargeur;
  optional?: boolean;                           // true = case à cocher ; sinon appliqué d'office
  defaultOn?: boolean;
}

/* ---------- Options à prix fixe ---------- */

export interface FixedOption {
  code: string;
  label: string;
  priceHT: MoneyHT;                             // 0 = « inclus / sans plus-value »
  group?: string;                               // 'commande' | 'manoeuvre' | 'divers'
  scope?: Record<string, string>;               // ex: { moteur: 'somfy' }
  defaultOn?: boolean;
}

/* ---------- Coloris ---------- */

export interface ColorRef { code: string; label: string; hex: string }

/**
 * Politique de prix des coloris pour une (ou toutes '*') valeur(s) de
 * l'axe `lame`. Standard = inclus ; pvM2 = +montant/m² ; forfait =
 * +montant fixe (avec seuil de laquage éventuel).
 */
export interface ColorPolicy {
  lame: string | '*';
  standard: string[];
  pvM2?: { codes: string[]; montantParM2: MoneyHT };
  forfait?: { codes: string[]; montant: MoneyHT; seuilLaquageHT?: number };
}

/* ---------- Limites dimensionnelles ---------- */

export interface DimLimits {
  lame: string;
  surfaceMaxM2: number;
  largeurMin: number;
  largeurMax: number;
  hauteurMax: number;                           // v1 simplifié ; axe/coffre en v2
}

/* ---------- Définition complète ---------- */

export interface ConfiguratorDef {
  slug: string;                                 // 'volet-roulant-traditionnel'
  name: string;
  famille: string;                              // FamilleSlug → remise B2B
  selectors: Selector[];
  grids: PriceGrid[];
  adjustments: Adjustment[];
  options: FixedOption[];
  colors: ColorRef[];
  colorPolicies: ColorPolicy[];
  limits: DimLimits[];
}

/* ---------- Sélection utilisateur ---------- */

export interface ConfiguratorSelection {
  axes: Record<string, string>;                 // { pose, lame, moteur }
  layer: MotorLayer;
  largeur: number;
  hauteur: number;
  colorCode: string;
  /** Codes des options fixes ET des ajustements optionnels cochés. */
  optionCodes: string[];
}

/* ---------- Résultat de calcul ---------- */

export interface PriceLineItem { code: string; label: string; montant: MoneyHT }

export interface ConfiguratorResult {
  largeurSnap: number;
  hauteurSnap: number;
  base: MoneyHT;
  adjustments: PriceLineItem[];
  options: PriceLineItem[];
  colorSupplement: MoneyHT;
  total: MoneyHT;
}
