/* =====================================================================
   MN FERMETURES — Moteur de configuration UNIVERSEL (CPQ) · Modèle v2
   Entièrement piloté par données : champs, règles, dépendances et prix
   sont des DONNÉES (JSON/base), agnostiques du produit. Permet de créer
   des configurateurs (volet roulant, store banne, portail, pergola…)
   sans réécrire l'application. Aucun `eval` : conditions et formules sont
   des arbres sérialisables (sûrs client+serveur, prêts pour un éditeur
   visuel low-code).
   ===================================================================== */

export type Primitive = string | number | boolean;
/** Valeurs saisies par l'utilisateur (par id de champ) + variables dérivées. */
export type Values = Record<string, Primitive>;

/* ---------- Expressions (arithmétique + lookups), sérialisables ---------- */

export type Expr =
  | Primitive                                             // littéral (number/string/boolean)
  | { var: string }                                       // valeur d'un champ / variable dérivée
  | { op: '+' | '-' | '*' | '/'; args: Expr[] }
  | { op: 'min' | 'max'; args: Expr[] }
  | { op: 'neg'; arg: Expr }
  | { op: 'round'; arg: Expr; decimals?: number }
  | { op: 'concat'; args: Expr[] }                        // construit une chaîne (ex. id de table)
  | { op: 'snap'; value: Expr; steps: number[] }          // borne haute >= value (null si dépassé)
  | { op: 'lookup1d'; table: Expr; key: Expr }            // table1d (snap-up sur key)
  | { op: 'lookup2d'; table: Expr; row: Expr; col: Expr } // table2d (snap-up row & col)
  | { op: 'if'; cond: Condition; then: Expr; else: Expr };

/* ---------- Conditions (booléen), sérialisables ---------- */

export type Condition =
  | boolean
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; left: Expr; right: Expr }
  | { op: 'in' | 'nin'; value: Expr; set: Primitive[] };

/* ---------- Tables de prix ---------- */

/** Table 1 dimension : `keys` = bornes hautes croissantes (snap-up) ; `null` = hors abaque. */
export interface Table1D { keys: number[]; values: (number | null)[]; }
/** Table 2 dimensions : `cells[rowIndex][colIndex]` ; snap-up sur rows & cols. */
export interface Table2D { rows: number[]; cols: number[]; cells: (number | null)[][]; }

/* ---------- Champs (entrées) ---------- */

export interface FieldOption {
  value: string;
  label: string;
  hint?: string;
  hex?: string;                                           // pastille coloris
  imageUrl?: string;
  /** Option proposée seulement si la condition est vraie (cascade générique). */
  availableWhen?: Condition;
  /** Valeurs posées automatiquement quand l'option est choisie (ex. type→pose interne). */
  setsValues?: Values;
}

export type FieldType = 'choice' | 'number' | 'dimension' | 'boolean' | 'text' | 'info';

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];                                // choice
  unit?: string;                                          // number/dimension (ex. 'mm')
  min?: number; max?: number; step?: number;
  default?: Primitive;
  visibleWhen?: Condition;                                // champ conditionnel
  help?: string; helpImage?: string;                      // aide contextuelle (guide)
  /** 'spec' = champ de fabrication (remonté à la prod, sans impact prix). */
  role?: 'spec';
}

/* ---------- Étapes du wizard (pilotées par données) ---------- */

export interface Step {
  id: string;
  title: string;
  help?: string;
  fields: string[];                                       // ids de champs
  visibleWhen?: Condition;
}

/* ---------- Règles de prix ---------- */

/**
 * Règle de prix composable. `kind:'base'` = prix de base (au moins une requise) ;
 * `kind:'add'` = supplément/moins-value. `when` = condition d'application ;
 * `amount` = expression (peut lire les champs, dérivées et tables). Un `amount`
 * qui vaut `null` (lookup hors abaque) invalide le prix si `base`, sinon ignoré.
 */
export interface PriceRule {
  code: string;
  label: string;
  kind: 'base' | 'add';
  when?: Condition;
  amount: Expr;
}

/* ---------- Contraintes / validation ---------- */

export interface Constraint {
  requires: Condition;                                    // prix invalide si faux
  message: string;
}

/* ---------- Définition complète (universelle) ---------- */

export interface DefV2 {
  slug: string;
  name: string;
  famille: string;                                        // remise B2B
  fields: Field[];
  derived?: { id: string; expr: Expr }[];                 // variables calculées (surface, snaps…)
  steps: Step[];
  priceRules: PriceRule[];
  tables?: { d1?: Record<string, Table1D>; d2?: Record<string, Table2D> };
  constraints?: Constraint[];
}

/* ---------- Résultat de calcul ---------- */

export interface LineItem { code: string; label: string; kind: 'base' | 'add'; montant: number; }

export interface ResolveResult {
  ok: boolean;                                            // false = hors abaque / contrainte violée
  total: number;
  lineItems: LineItem[];
  errors: string[];                                       // messages de contraintes
  context: Values;                                        // valeurs + dérivées (snaps, surface…)
}
