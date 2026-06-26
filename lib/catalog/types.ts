/* =====================================================================
   MM FERMETURES — Contrat de données catalogue (Bloc 1 · Cadrage)
   Source de vérité des formes manipulées par le frontend.
   Le mock (Bloc 2) PUIS Supabase (backend) implémentent ce contrat —
   c'est ce qui permet de câbler la vraie base sans réécrire l'UI.
   ===================================================================== */

/** Prix en euros, toujours HT (audience pro). */
export type MoneyHT = number;

/** Unité de vente. */
export type Uom = 'unite' | 'ml' | 'paire' | 'm2';

/** Discrimine le modèle de prix d'un produit. */
export type PricingType = 'unit' | 'matrix' | 'kit';

export interface Brand { slug: string; name: string; logoUrl?: string }

export interface Category {
  slug: string;
  name: string;
  parentSlug?: string;
  /** Pour le méga-menu : icône ou visuel. */
  icon?: string;
}

/** Champs communs à tout produit, quel que soit son modèle de prix. */
interface ProductBase {
  slug: string;
  name: string;
  categorySlug: string;
  /** Position exacte dans l'arbre menu — ex: /catalogue/motorisations/somfy-filaires */
  menuPath?: string;
  /** URL publique du visuel (Supabase Storage) */
  imageUrl?: string;
  brandSlug?: string;
  description?: string;
  /** Caractéristiques techniques libres (Ø, puissance nm, etc.). */
  specs?: Record<string, string | number>;
  /** Réservé aux pros : prix masqué tant que non connecté (gating B2B). */
  proOnly?: boolean;
}

/* ---------- 1. UNITAIRE (€/u, €/ml, €/paire) ---------- */
export interface ProductVariant {
  reference: string;          // clé stable, ex: MOTLT50010, LAMA42AJBLC
  label?: string;             // "blanc", "7016"…
  color?: ColorRef;
  priceHT: MoneyHT;
  inStock: boolean;
  stockQty?: number;          // affiché sur la carte ("147 en stock")
  leadTimeNote?: string;      // flag "non tenu en stock"
}
export interface UnitProduct extends ProductBase {
  pricingType: 'unit';
  uom: Uom;
  variants: ProductVariant[];
}

/* ---------- 2. MATRICIEL (tabliers, prix = f(H, L)) ---------- */
export interface MatrixOption {
  code: string;               // 'attache_rigide' | 'verrou_auto'
  label: string;
  /** Supplément indexé sur la largeur (mm → €). */
  valuesByWidth: Record<number, MoneyHT>;
}
export interface MatrixProduct extends ProductBase {
  pricingType: 'matrix';
  uom: Uom;                   // 'unite'
  colors?: ColorRef[];        // mêmes prix, choix esthétique
  heights: number[];          // mm
  widths: number[];           // mm
  /** Grille : grid[hauteur][indexLargeur] = prix, ou null si hors abaque. */
  grid: Record<number, (MoneyHT | null)[]>;
  options?: MatrixOption[];
}

/* ---------- 3. KIT (kits axes : prix fixe + nomenclature) ---------- */
export interface KitComponent {
  label: string;
  quantity: number;
  componentReference?: string; // lien vers une réf vendue à part
}
export interface KitConfig {
  reference: string;
  label: string;               // "Largeur 1500 · moteur 10 nm"
  priceHT: MoneyHT;
  bom: KitComponent[];
}
export interface KitProduct extends ProductBase {
  pricingType: 'kit';
  configs: KitConfig[];
}

/** Union discriminée : tout produit du catalogue. */
export type Product = UnitProduct | MatrixProduct | KitProduct;

/** Référence couleur (RAL / dénomination métier). */
export interface ColorRef { code: string; label: string; hex: string }

/* ---------- Panier ---------- */
export interface CartLine {
  /** Clé de ligne (réf + dimensions/options choisies). */
  key: string;
  name: string;
  detail?: string;             // "1200×1250 mm · attaches rigides"
  reference?: string;
  unitPriceHT: MoneyHT;
  quantity: number;
  uom: Uom;
}

/* ---------- Contrat des résolveurs de prix ----------
   Implémentés dans lib/catalog/resolvePrice.ts.
   Les composants n'appellent QUE ces fonctions : ils ignorent d'où vient
   le prix (mock ou Supabase). */
export interface PriceResolvers {
  /** Prix « à partir de » pour les cartes/listings. */
  priceFrom(product: Product): MoneyHT;
  /** Résout un prix de tablier pour une dimension + options. */
  resolveMatrixPrice(
    product: MatrixProduct,
    height: number,
    width: number,
    optionCodes: string[]
  ): MoneyHT | null;
}

/* ---------- Aides de garde (narrowing) ---------- */
export const isUnit = (p: Product): p is UnitProduct => p.pricingType === 'unit';
export const isMatrix = (p: Product): p is MatrixProduct => p.pricingType === 'matrix';
export const isKit = (p: Product): p is KitProduct => p.pricingType === 'kit';
