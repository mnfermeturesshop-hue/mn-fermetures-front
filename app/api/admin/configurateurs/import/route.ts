import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseWorkbook } from '@/lib/configurateur/import/parseWorkbook';

// SheetJS a besoin du runtime Node (pas edge).
export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Import d'un classeur Excel de tarif → définition de configurateur en base.
 * Admin uniquement. Le fichier suit `docs/configurateur-modele-tarif.md`.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Fichier requis.' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier vide ou trop volumineux (10 Mo max).' }, { status: 400 });
  }

  const { def, errors } = parseWorkbook(new Uint8Array(await file.arrayBuffer()));
  if (!def) {
    return NextResponse.json({ error: 'Import refusé — corrigez le classeur.', details: errors }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('configurators').upsert(
    {
      slug: def.slug,
      name: def.name,
      famille: def.famille,
      definition: def,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    slug: def.slug,
    name: def.name,
    stats: {
      grids: def.grids.length,
      heights: def.grids.reduce((s, g) => s + g.heights.length, 0),
      selectors: def.selectors.length,
      options: def.options.length,
      colors: def.colors.length,
    },
  });
}
