import type { MetadataRoute } from 'next';
import { products, categories } from '@/lib/catalog/mock';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mmfermetures.fr';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/pro`,    lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/panier`, lastModified: now, changeFrequency: 'never',   priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE}/catalogue/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/produit/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
