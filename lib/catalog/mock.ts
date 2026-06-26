import type { Product, Brand, Category, ColorRef } from './types';

/* Données de démonstration — issues du Tarif Accessoires 2026.
   Elles IMPLÉMENTENT le contrat de types ; le backend (Supabase) servira
   plus tard exactement les mêmes formes, sans toucher aux composants. */

export const COLORS: Record<string, ColorRef> = {
  blanc:  { code: 'blanc',  label: 'Blanc',        hex: '#f4f4f0' },
  beige:  { code: 'beige',  label: 'Beige',        hex: '#e9ddc4' },
  gris:   { code: 'gris',   label: 'Gris',         hex: '#9aa1a8' },
  '7016': { code: '7016',   label: 'Gris 7016',    hex: '#3a3f44' },
  '7035': { code: '7035',   label: 'Gris 7035',    hex: '#d2d4cf' },
  ivoire: { code: 'ivoire', label: 'Ivoire',       hex: '#efe7d2' },
  marron: { code: 'marron', label: 'Marron 8019',  hex: '#5a3a25' },
  alu:    { code: 'alu',    label: 'Alu AS 9006',  hex: '#c7ccd1' },
};

export const brands: Brand[] = [
  { slug: 'somfy', name: 'Somfy' },
  { slug: 'mn', name: 'MN' },
  { slug: 'gaposa', name: 'Gaposa' },
];

export const categories: Category[] = [
  { slug: 'tabliers', name: 'Tabliers', icon: '▤' },
  { slug: 'kits-axes', name: 'Kits axes', icon: '⚙' },
  { slug: 'motorisations', name: 'Motorisations', icon: '⊙' },
  { slug: 'commandes', name: 'Commandes', icon: '⎚' },
  { slug: 'profils', name: 'Profils', icon: '▬' },
  { slug: 'consoles', name: 'Consoles & flasques', icon: '◳' },
  { slug: 'embouts', name: 'Embouts', icon: '◖' },
  { slug: 'verrouillages', name: 'Verrouillages', icon: '⛓' },
];

/** Types du méga-menu (3 niveaux : NavTop > NavGroup > NavLeaf). */
export interface NavLeaf  { name: string; href: string }
export interface NavGroup extends NavLeaf { children: NavLeaf[] }
export interface NavTop   extends NavLeaf { icon?: string; children?: (NavGroup | NavLeaf)[] }
export const isNavGroup = (item: NavLeaf | NavGroup): item is NavGroup =>
  'children' in item && Array.isArray((item as NavGroup).children);

export const MENU: NavTop[] = [
  {
    name: 'Tabliers', href: '/catalogue/tabliers', icon: '▤',
    children: [
      { name: 'Tablier lames PVC 40',        href: '/catalogue/tabliers/pvc-40'  },
      { name: 'Tablier lames PVC 55',        href: '/catalogue/tabliers/pvc-55'  },
      { name: 'Tablier lames aluminium 37',  href: '/catalogue/tabliers/alu-37'  },
      { name: 'Tablier lames aluminium 42',  href: '/catalogue/tabliers/alu-42'  },
      { name: 'Tablier lames aluminium 56',  href: '/catalogue/tabliers/alu-56'  },
      { name: 'Tablier lames aluminium 55',  href: '/catalogue/tabliers/alu-55'  },
      { name: 'Tablier lames aluminium 77',  href: '/catalogue/tabliers/alu-77'  },
    ],
  },
  {
    name: 'Kits axes', href: '/catalogue/kits-axes', icon: '⚙',
    children: [
      { name: 'Volet rénovation',   href: '/catalogue/kits-axes/renovation',    children: [
        { name: 'Motorisation Somfy', href: '/catalogue/kits-axes/renovation/somfy' },
        { name: 'Motorisation MN',    href: '/catalogue/kits-axes/renovation/mn'   },
      ]},
      { name: 'Volet traditionnel', href: '/catalogue/kits-axes/traditionnel',  children: [
        { name: 'Motorisation Somfy', href: '/catalogue/kits-axes/traditionnel/somfy' },
        { name: 'Motorisation MN',    href: '/catalogue/kits-axes/traditionnel/mn'   },
      ]},
      { name: 'Bloc baie 168',      href: '/catalogue/kits-axes/bloc-baie-168', children: [
        { name: 'Motorisation Somfy', href: '/catalogue/kits-axes/bloc-baie-168/somfy' },
        { name: 'Motorisation MN',    href: '/catalogue/kits-axes/bloc-baie-168/mn'   },
      ]},
      { name: 'Bloc baie 205',      href: '/catalogue/kits-axes/bloc-baie-205', children: [
        { name: 'Motorisation Somfy', href: '/catalogue/kits-axes/bloc-baie-205/somfy' },
        { name: 'Motorisation MN',    href: '/catalogue/kits-axes/bloc-baie-205/mn'   },
      ]},
      { name: 'Kit solaire',        href: '/catalogue/kits-axes/solaire',       children: [
        { name: 'Volet rénovation',   href: '/catalogue/kits-axes/solaire/renovation'    },
        { name: 'Volet traditionnel', href: '/catalogue/kits-axes/solaire/traditionnel'  },
        { name: 'Bloc baie 168',      href: '/catalogue/kits-axes/solaire/bloc-baie-168' },
        { name: 'Bloc baie 205',      href: '/catalogue/kits-axes/solaire/bloc-baie-205' },
      ]},
    ],
  },
  {
    name: 'Pièces détachées', href: '/catalogue/pieces-detachees', icon: '⊙',
    children: [
      { name: 'Motorisations', href: '/catalogue/motorisations', children: [
        { name: 'Somfy — filaires',       href: '/catalogue/motorisations/somfy-filaires'    },
        { name: 'Somfy — radio RTS',      href: '/catalogue/motorisations/somfy-rts'         },
        { name: 'Somfy — radio io',       href: '/catalogue/motorisations/somfy-io'          },
        { name: 'Somfy — solaires',       href: '/catalogue/motorisations/somfy-solaires'    },
        { name: 'Somfy — filaires CSI',   href: '/catalogue/motorisations/somfy-csi-filaires'},
        { name: 'Somfy — radio RTS CSI',  href: '/catalogue/motorisations/somfy-csi-rts'     },
        { name: 'MN — filaires',          href: '/catalogue/motorisations/mn-filaires'       },
        { name: 'MN — radio',             href: '/catalogue/motorisations/mn-radio'          },
        { name: 'MN — filaires CSI',      href: '/catalogue/motorisations/mn-csi'            },
        { name: 'Roues & couronnes Somfy',href: '/catalogue/motorisations/roues-somfy'       },
        { name: 'Roues & couronnes MN',   href: '/catalogue/motorisations/roues-mn'          },
        { name: 'Supports moteurs',       href: '/catalogue/motorisations/supports'          },
      ]},
      { name: 'Commandes', href: '/catalogue/commandes', children: [
        { name: 'Moteurs filaires',        href: '/catalogue/commandes/filaires'    },
        { name: 'Moteurs radio Somfy',     href: '/catalogue/commandes/somfy'       },
        { name: 'Moteurs io',              href: '/catalogue/commandes/io'          },
        { name: 'Moteurs RTS ou solaire',  href: '/catalogue/commandes/rts-solaire' },
        { name: 'Moteurs radio MN',        href: '/catalogue/commandes/mn'          },
        { name: 'Moteurs garage',          href: '/catalogue/commandes/garage'      },
        { name: 'Récepteurs portail',      href: '/catalogue/commandes/portail'     },
        { name: 'Domotique',               href: '/catalogue/commandes/domotique'   },
      ]},
      { name: 'Profils', href: '/catalogue/profils', children: [
        { name: 'Axes',           href: '/catalogue/profils/axes'          },
        { name: 'Lames',          href: '/catalogue/profils/lames'         },
        { name: 'Lames finales',  href: '/catalogue/profils/lames-finales' },
        { name: 'Coulisses',      href: '/catalogue/profils/coulisses'     },
        { name: 'Coffres',        href: '/catalogue/profils/coffres'       },
        { name: 'Coffres tunnel', href: '/catalogue/profils/coffres-tunnel'},
        { name: 'Accessoires',    href: '/catalogue/profils/accessoires'   },
      ]},
      { name: 'Consoles', href: '/catalogue/consoles', children: [
        { name: 'Consoles et contre plaques', href: '/catalogue/consoles/contre-plaques' },
        { name: 'Flasques',                   href: '/catalogue/consoles/flasques'       },
      ]},
      { name: 'Embouts',             href: '/catalogue/embouts',             children: [] },
      { name: 'Verrouillages',       href: '/catalogue/verrouillages',       children: [] },
      { name: 'Manœuvres manuelles', href: '/catalogue/manoeuvres-manuelles', children: [] },
    ],
  },
  {
    name: 'Aide à la pose', href: '/catalogue/aide-a-la-pose',
  },
];

export const products: Product[] = [
  // --- MATRIX ---
  {
    pricingType: 'matrix',
    slug: 'tablier-pvc-40',
    name: 'Tablier lame PVC 40',
    categorySlug: 'tabliers',
    menuPath: '/catalogue/tabliers/pvc-40',
    uom: 'unite',
    description: 'Tablier agrafé fourni avec attaches souples. Dimensions de commande = largeur finie × hauteur finie.',
    colors: [COLORS.blanc, COLORS.beige, COLORS.gris],
    heights: [850, 950, 1050, 1150, 1250, 1350, 1450, 1550],
    widths: [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700],
    grid: {
      850: [52, 57, 63, 71, 76, 81, 88, 97, 103, 109],
      950: [55, 62, 70, 76, 81, 89, 97, 104, 110, 116],
      1050: [59, 66, 74, 80, 88, 97, 104, 111, 118, 127],
      1150: [64, 74, 81, 89, 99, 107, 114, 123, 131, 138],
      1250: [71, 78, 87, 97, 106, 113, 123, 131, 138, 148],
      1350: [74, 82, 92, 101, 111, 120, 130, 137, 147, 158],
      1450: [77, 87, 98, 108, 116, 128, 135, 146, 157, 166],
      1550: [82, 96, 106, 115, 127, 136, 147, 158, 168, 178],
    },
    options: [
      { code: 'attache_rigide', label: 'Attaches rigides', valuesByWidth: { 800: 10, 900: 10, 1000: 10, 1100: 10, 1200: 10, 1300: 14, 1400: 14, 1500: 14, 1600: 14, 1700: 14 } },
      { code: 'verrou_auto', label: 'Verrous automatiques', valuesByWidth: { 800: 33, 900: 33, 1000: 33, 1100: 33, 1200: 33, 1300: 50, 1400: 50, 1500: 50, 1600: 50, 1700: 50 } },
    ],
  },

  // --- KIT ---
  {
    pricingType: 'kit',
    slug: 'kit-axe-reno-filaire-somfy',
    name: 'Kit axe rénovation — filaire Somfy',
    categorySlug: 'kits-axes',
    menuPath: '/catalogue/kits-axes/renovation/somfy',
    brandSlug: 'somfy',
    configs: [
      {
        reference: 'KIT-RENO-FS-1500', label: 'Largeur 1500 · moteur 10 nm', priceHT: 285,
        bom: [
          { label: 'Axe octogonal 60 - 6/10 · long. 1500', quantity: 1 },
          { label: 'Support étoile', quantity: 1 },
          { label: 'Attache rigide 2 maillons (8/14)', quantity: 3, componentReference: 'VERATRI2ML814' },
          { label: 'Embout côté opposé axe 60 / roulement 28', quantity: 1 },
          { label: 'Roulement 28 nylon', quantity: 1 },
          { label: 'Roue et couronne octo 60 Somfy Ø50', quantity: 1 },
          { label: 'Moteur filaire LT50 10 nm', quantity: 1, componentReference: 'MOTLT50010' },
          { label: 'Inverseur en saillie position fixe', quantity: 1 },
        ],
      },
      {
        reference: 'KIT-RENO-FS-3000', label: 'Largeur 3000 · moteur 20 nm', priceHT: 347,
        bom: [
          { label: 'Axe octogonal 60 - 6/10 · long. 3000', quantity: 1 },
          { label: 'Support étoile', quantity: 1 },
          { label: 'Attache rigide 2 maillons (8/14)', quantity: 5, componentReference: 'VERATRI2ML814' },
          { label: 'Embout côté opposé axe 60 / roulement 28', quantity: 1 },
          { label: 'Roulement 28 nylon', quantity: 1 },
          { label: 'Roue et couronne octo 60 Somfy Ø50', quantity: 1 },
          { label: 'Moteur filaire LT50 20 nm', quantity: 1, componentReference: 'MOTLT50020' },
          { label: 'Inverseur en saillie position fixe', quantity: 1 },
        ],
      },
    ],
  },

  // --- UNIT (€/unité) ---
  {
    pricingType: 'unit', slug: 'moteur-filaire-lt50-meteor-20', name: 'Moteur filaire LT50 Meteor 20 nm',
    categorySlug: 'motorisations', menuPath: '/catalogue/motorisations/somfy-filaires',
    brandSlug: 'somfy', uom: 'unite', specs: { puissance_nm: 20 },
    variants: [{ reference: 'MOTLT50020', priceHT: 255, inStock: true, stockQty: 147 }],
  },
  {
    pricingType: 'unit', slug: 'moteur-radio-io-rs100-10', name: 'Moteur radio io RS100 10 nm',
    categorySlug: 'motorisations', menuPath: '/catalogue/motorisations/somfy-io',
    brandSlug: 'somfy', uom: 'unite', specs: { puissance_nm: 10 },
    variants: [{ reference: 'MOTRS100010', priceHT: 345, inStock: true, stockQty: 32 }],
  },
  {
    pricingType: 'unit', slug: 'telecommande-amy1-sunprotect-io', name: 'Télécommande Amy 1 Sunprotect io',
    categorySlug: 'commandes', menuPath: '/catalogue/commandes/io',
    brandSlug: 'somfy', uom: 'unite',
    variants: [{ reference: 'CDEEMSMOAMYSUIO', priceHT: 84, inStock: true, stockQty: 60, color: COLORS.blanc }],
  },
  {
    pricingType: 'unit', slug: 'moteur-filaire-mn-10', name: 'Moteur filaire MN 10 nm',
    categorySlug: 'motorisations', menuPath: '/catalogue/motorisations/mn-filaires',
    brandSlug: 'mn', uom: 'unite', specs: { puissance_nm: 10 },
    variants: [{ reference: 'MOTXPFIL010', priceHT: 128, inStock: false, stockQty: 0 }],
  },
  {
    pricingType: 'unit', slug: 'moteur-filaire-lt50-apollo-35', name: 'Moteur filaire LT50 Apollo 35 nm',
    categorySlug: 'motorisations', menuPath: '/catalogue/motorisations/somfy-filaires',
    brandSlug: 'somfy', uom: 'unite', specs: { puissance_nm: 35 }, proOnly: true,
    variants: [{ reference: 'MOTLT50035', priceHT: 325, inStock: true, stockQty: 18 }],
  },

  // --- UNIT (€/ml avec variantes couleur) ---
  {
    pricingType: 'unit', slug: 'lame-aluminium-42-ajouree', name: 'Lame aluminium 42 ajourée',
    categorySlug: 'profils', menuPath: '/catalogue/profils/lames',
    uom: 'ml',
    variants: [
      { reference: 'LAMA42AJBLC', label: 'blanc', color: COLORS.blanc, priceHT: 3.29, inStock: true },
      { reference: 'LAMA42AJ7016', label: '7016', color: COLORS['7016'], priceHT: 3.46, inStock: true },
      { reference: 'LAMA42AJGRI', label: 'gris', color: COLORS.gris, priceHT: 3.51, inStock: true },
      { reference: 'LAMA42AJIVO', label: 'ivoire', color: COLORS.ivoire, priceHT: 3.51, inStock: true },
      { reference: 'LAMA42AJ7035', label: '7035', color: COLORS['7035'], priceHT: 3.51, inStock: true },
      { reference: 'LAMA42AJMAR', label: 'marron', color: COLORS.marron, priceHT: 3.84, inStock: true },
      { reference: 'LAMA42AJALU', label: 'alu', color: COLORS.alu, priceHT: 3.51, inStock: true },
    ],
  },
  {
    pricingType: 'unit', slug: 'coulisse-40-22', name: 'Coulisse 40 × 22',
    categorySlug: 'profils', menuPath: '/catalogue/profils/coulisses',
    uom: 'ml',
    variants: [
      { reference: 'COU4022D6BLC', label: 'blanc', color: COLORS.blanc, priceHT: 18.76, inStock: true },
      { reference: 'COU4022D67016', label: '7016', color: COLORS['7016'], priceHT: 19.70, inStock: true },
      { reference: 'COU4022D6IVO', label: 'ivoire', color: COLORS.ivoire, priceHT: 29.00, inStock: false },
    ],
  },
];

/* --- Sélecteurs (mêmes signatures que celles que Supabase exposera) --- */
export const getFeatured = (): Product[] => products;
export const getProductBySlug = (slug: string) => products.find((p) => p.slug === slug);
export const getBrand = (slug?: string) => brands.find((b) => b.slug === slug);
