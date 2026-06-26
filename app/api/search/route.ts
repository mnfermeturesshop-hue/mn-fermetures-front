import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, getAllBrands, getAllCategories } from '@/lib/catalog/db';
import { searchProducts } from '@/lib/catalog/search';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) return NextResponse.json([]);

  const [products, brands, categories] = await Promise.all([
    getAllProducts(),
    getAllBrands(),
    getAllCategories(),
  ]);

  const results = searchProducts(q, products, brands, categories, 6);
  return NextResponse.json(results.map((r) => ({
    slug:          r.product.slug,
    name:          r.product.name,
    categorySlug:  r.product.categorySlug,
    brandSlug:     r.product.brandSlug,
    pricingType:   r.product.pricingType,
    matchedField:  r.matchedField,
    reference:
      r.product.pricingType === 'unit'
        ? (r.product as { variants: { reference: string }[] }).variants[0]?.reference
        : r.product.pricingType === 'kit'
        ? (r.product as { configs: { reference: string }[] }).configs[0]?.reference
        : undefined,
  })));
}
