import type { Product } from '@/lib/catalog/types';
import { isUnit, isKit, isMatrix } from '@/lib/catalog/types';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { getBrand } from '@/lib/catalog/mock';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mmfermetures.fr';

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

export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MN Fermetures',
    url: BASE,
    logo: `${BASE}/logo.png`,
    contactPoint: [
      { '@type': 'ContactPoint', telephone: '+33-4-67-78-06-63', contactType: 'sales', availableLanguage: 'French' },
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Chemin du Mas de Pastrou',
      postalCode: '34560',
      addressLocality: 'Villeveyrac',
      addressCountry: 'FR',
    },
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
