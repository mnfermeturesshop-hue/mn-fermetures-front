import type { MetadataRoute } from 'next';
import { getAllProducts, getAllCategories } from '@/lib/catalog/db';
import { listConfigurators } from '@/lib/configurateur/loader';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mnfermetures.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [allProducts, allCategories] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);

  // Configurateurs actifs (les inactifs ne sont pas exposés)
  let configuratorRoutes: MetadataRoute.Sitemap = [];
  try {
    const configs = await listConfigurators();
    configuratorRoutes = configs
      .filter((c) => c.active)
      .map((c) => ({
        url: `${BASE}/configurateur/${c.slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));
  } catch {
    configuratorRoutes = [];
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                     lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/gammes`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/documentation`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/pro`,            lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/cgv`,               lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/mentions-legales`,  lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/confidentialite`,   lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/cookies`,           lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
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

  return [...staticRoutes, ...configuratorRoutes, ...categoryRoutes, ...productRoutes];
}
