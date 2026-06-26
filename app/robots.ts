import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mmfermetures.fr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/checkout', '/commande/', '/compte', '/devis', '/panier'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
