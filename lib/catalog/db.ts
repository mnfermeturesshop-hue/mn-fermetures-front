/**
 * Couche d'accès données catalogue.
 * Lit Supabase si configuré, sinon retombe sur le mock statique.
 * L'UI ne sait pas d'où viennent les données.
 */

import type { Product, Category, Brand } from './types';

const isSupabaseConfigured = () =>
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

/* ------------------------------------------------------------------ */
/* ROW → TYPE helpers (Supabase row → TypeScript union)               */
/* ------------------------------------------------------------------ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProduct(row: any): Product {
  const base = {
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    categorySlug: row.category_slug,
    famille: row.famille ?? undefined,
    menuPath: row.menu_path ?? undefined,
    imageUrl: row.image_url ?? undefined,
    brandSlug: row.brand_slug ?? undefined,
    specs: row.specs ?? undefined,
    proOnly: row.pro_only ?? false,
  };

  if (row.pricing_type === 'unit') {
    return { ...base, pricingType: 'unit', uom: row.variants?.[0]?.uom ?? 'unite', variants: row.variants ?? [] };
  }
  if (row.pricing_type === 'matrix') {
    return {
      ...base,
      pricingType: 'matrix',
      uom: 'unite',
      colors: row.matrix_options?.colors ?? [],
      heights: row.matrix_prices ? Object.keys(row.matrix_prices).map(Number) : [],
      widths: row.matrix_prices ? Object.keys(Object.values(row.matrix_prices)[0] as object ?? {}).map(Number) : [],
      grid: row.matrix_prices ?? {},
      options: row.matrix_options?.options ?? [],
    };
  }
  // kit
  return { ...base, pricingType: 'kit', configs: row.configs ?? [] };
}

/* ------------------------------------------------------------------ */
/* READ — Products                                                      */
/* ------------------------------------------------------------------ */
export async function getAllProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    const { products } = await import('./mock');
    return products;
  }
  const { createServerDbClient } = await import('../supabase/server-db');
  const supabase = createServerDbClient();
  const { data } = await supabase.from('products').select('*').eq('active', true).order('name');
  return (data ?? []).map(rowToProduct);
}

export async function getProductBySlugDB(slug: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured()) {
    const { getProductBySlug } = await import('./mock');
    return getProductBySlug(slug) ?? undefined;
  }
  const { createServerDbClient } = await import('../supabase/server-db');
  const supabase = createServerDbClient();
  const { data } = await supabase.from('products').select('*').eq('slug', slug).single();
  return data ? rowToProduct(data) : undefined;
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    const { products } = await import('./mock');
    return products.filter((p) => p.categorySlug === categorySlug);
  }
  const { createServerDbClient } = await import('../supabase/server-db');
  const supabase = createServerDbClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('category_slug', categorySlug)
    .eq('active', true)
    .order('name');
  return (data ?? []).map(rowToProduct);
}

/* ------------------------------------------------------------------ */
/* READ — Categories & Brands                                           */
/* ------------------------------------------------------------------ */
export async function getAllCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    const { categories } = await import('./mock');
    return categories;
  }
  const { createServerDbClient } = await import('../supabase/server-db');
  const supabase = createServerDbClient();
  const { data } = await supabase.from('categories').select('*').order('sort');
  return (data ?? []).map((r) => ({ slug: r.slug, name: r.name, icon: r.icon ?? undefined }));
}

export async function getAllBrands(): Promise<Brand[]> {
  if (!isSupabaseConfigured()) {
    const { brands } = await import('./mock');
    return brands;
  }
  const { createServerDbClient } = await import('../supabase/server-db');
  const supabase = createServerDbClient();
  const { data } = await supabase.from('brands').select('*').order('name');
  return (data ?? []).map((r) => ({ slug: r.slug, name: r.name, logoUrl: r.logo_url ?? undefined }));
}

/* ------------------------------------------------------------------ */
/* WRITE — Admin CRUD                                                   */
/* ------------------------------------------------------------------ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertProduct(payload: any): Promise<{ id: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const { createServerDbClient } = await import('../supabase/server-db');
  const supabase = createServerDbClient();
  const { data, error } = await supabase
    .from('products')
    .upsert(payload, { onConflict: 'slug' })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { createServerDbClient } = await import('../supabase/server-db');
  const supabase = createServerDbClient();
  await supabase.from('products').update({ active: false }).eq('id', id);
}

export async function updateVariantStock(
  productId: string,
  reference: string,
  inStock: boolean,
  stockQty?: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { createServerDbClient } = await import('../supabase/server-db');
  const supabase = createServerDbClient();

  const { data } = await supabase.from('products').select('variants').eq('id', productId).single();
  if (!data) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variants = (data.variants as any[]).map((v: any) =>
    v.reference === reference ? { ...v, inStock, ...(stockQty !== undefined ? { stockQty } : {}) } : v
  );
  await supabase.from('products').update({ variants }).eq('id', productId);
}

/* ------------------------------------------------------------------ */
/* WRITE — Image upload                                                 */
/* ------------------------------------------------------------------ */
export async function uploadProductImage(file: File, productSlug: string): Promise<string> {
  const { createClient } = await import('../supabase/client'); // browser client OK pour upload côté client
  const supabase = createClient();
  const ext = file.name.split('.').pop();
  const path = `${productSlug}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
