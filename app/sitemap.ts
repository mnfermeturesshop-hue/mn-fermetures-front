import type { MetadataRoute } from 'next';
import { getAllProducts, getAllCategories } from '@/lib/catalog/db';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mmfermetures.fr';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [allProducts, allCategories] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/pro`,     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/panier`,  lastModified: now, changeFrequency: 'never',   priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = allCategories.map((cat) => ({
    url: `${BASE}/catalogue/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = allProducts.map((p) => ({
    url: `${BASE}/produit/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
