import type { Product } from '@/lib/catalog/types';
import { isUnit, isKit, isMatrix } from '@/lib/catalog/types';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { getBrand } from '@/lib/catalog/mock';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mnfermetures.com';

/** Sérialise en JSON-LD sûr : neutralise `</script>` dans un champ (audit S10). */
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function availability(p: Product): string {
  if (isUnit(p)) {
    return p.variants.some((v) => v.inStock)
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';
  }
  return 'https://schema.org/InStock';
}

export function ProductJsonLd({ product }: { product: Product }) {
  const brand = getBrand(product.brandSlug);
  const price = priceFrom(product);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    url: `${BASE}/produit/${product.slug}`,
    brand: brand
      ? { '@type': 'Brand', name: brand.name }
      : { '@type': 'Brand', name: 'MN Fermetures' },
    category: product.categorySlug.replace(/-/g, ' '),
    // Prix réservés aux connectés : aucune offre tarifaire dans les données
    // structurées publiques quand le produit est masqué (proOnly).
    ...(product.proOnly ? {} : {
      offers: {
        '@type': isMatrix(product) ? 'AggregateOffer' : 'Offer',
        priceCurrency: 'EUR',
        ...(isMatrix(product)
          ? { lowPrice: price.toFixed(2), priceSpecification: { '@type': 'PriceSpecification', valueAddedTaxIncluded: false } }
          : { price: price.toFixed(2), priceSpecification: { '@type': 'PriceSpecification', valueAddedTaxIncluded: false } }),
        availability: availability(product),
        seller: {
          '@type': 'Organization',
          name: 'MN Fermetures',
          url: BASE,
        },
      },
    }),
    ...(isUnit(product) && product.variants[0]?.reference
      ? { sku: product.variants[0].reference, mpn: product.variants[0].reference }
      : {}),
    ...(isKit(product) && product.configs[0]?.reference
      ? { sku: product.configs[0].reference }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

/** Départements couverts (zone d'intervention) — repris de la vitrine. */
const AREA_SERVED = ['Hérault', 'Aude', 'Pyrénées-Orientales', 'Gard', 'Bouches-du-Rhône', 'Vaucluse', 'Drôme', 'Ardèche'];

/** Profils/fiches externes de la marque (renforce l'entité pour Google + IA).
 *  À compléter avec les URLs exactes : page Facebook, fiche Google Business Profile. */
const SAME_AS: string[] = [
  'https://www.facebook.com/p/MN-Fermetures-100063541122119/',
  'https://share.google/5Axczk9N8bCywzhqz', // fiche Google Business Profile (M.N Fermetures)
];

/**
 * Entité unique du site (SEO local + GEO/AEO) : le fabricant + le WebSite,
 * reliés par `@id`, rendus une seule fois via le layout. Évite les entités
 * Organization dupliquées entre pages.
 */
export function OrganizationJsonLd() {
  const org = {
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${BASE}/#org`,
    name: 'MN Fermetures',
    legalName: 'MN FERMETURES SAS',
    url: BASE,
    logo: `${BASE}/logo.png`,
    image: `${BASE}/logo.png`,
    email: 'contact@mnfermetures.com',
    telephone: '+33-4-67-78-06-63',
    foundingDate: '1986',
    description:
      "Fabricant français depuis 40 ans de volets roulants, blocs baie, volets battants et coulissants, portes de garage enroulables, portails, clôtures, moustiquaires, kits d'axes et pièces détachées, pour les professionnels.",
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Chemin du Mas de Pastrou',
      postalCode: '34560',
      addressLocality: 'Villeveyrac',
      addressRegion: 'Occitanie',
      addressCountry: 'FR',
    },
    location: [
      { '@type': 'Place', name: 'MN Fermetures — Villeveyrac', address: { '@type': 'PostalAddress', streetAddress: 'Chemin du Mas de Pastrou', postalCode: '34560', addressLocality: 'Villeveyrac', addressCountry: 'FR' } },
      { '@type': 'Place', name: 'MN Fermetures — Pérols', address: { '@type': 'PostalAddress', streetAddress: '2066 Av. Marcel Pagnol', postalCode: '34470', addressLocality: 'Pérols', addressCountry: 'FR' } },
    ],
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Occitanie' },
      ...AREA_SERVED.map((d) => ({ '@type': 'AdministrativeArea', name: d })),
    ],
    contactPoint: [
      { '@type': 'ContactPoint', telephone: '+33-4-67-78-06-63', contactType: 'sales', availableLanguage: 'French', areaServed: 'FR' },
    ],
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${BASE}/#website`,
    url: BASE,
    name: 'MN Fermetures',
    inLanguage: 'fr-FR',
    publisher: { '@id': `${BASE}/#org` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE}/recherche?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const schema = { '@context': 'https://schema.org', '@graph': [org, website] };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

/** FAQ (AEO) — questions/réponses factuelles pour Google + moteurs de réponse IA. */
export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

export function BreadcrumbJsonLd({ crumbs }: { crumbs: { label: string; href?: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${BASE}${c.href}` } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}
