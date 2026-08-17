/** Liste curatée des configurateurs mis en avant (accueil + page /configurateur).
 *  `slug` = slug du configurateur v2 (pour masquer la carte si l'admin l'a désactivé). */
export interface FeaturedConfigurator {
  slug: string;
  name: string;
  desc: string;
  href: string;
  icon: string;
}

export const FEATURED_CONFIGURATORS: FeaturedConfigurator[] = [
  { slug: 'volet-roulant-traditionnel', name: 'Volet roulant Traditionnel', desc: 'Tradi · Tradi + coffre · Coffre seul', href: '/configurateur/volet-roulant-traditionnel', icon: '▦' },
  { slug: 'volet-roulant-renovation', name: 'Volet roulant Rénovation', desc: 'Minibox · Renobox · Gros coffre', href: '/configurateur/volet-roulant-renovation', icon: '▤' },
  { slug: 'store-banne', name: 'Store banne', desc: 'Monobloc · Semi-coffre · Coffre intégral', href: '/configurateur/store-banne', icon: '☀' },
  { slug: 'tablier-sur-mesure', name: 'Tablier sur mesure', desc: 'PVC & aluminium · prix HT instantané', href: '/configurateur/tablier-sur-mesure', icon: '▥' },
];
