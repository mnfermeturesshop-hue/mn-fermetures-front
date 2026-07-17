import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseWorkbook } from '@/lib/configurateur/import/parseWorkbook';
import { loadConfiguratorDef } from '@/lib/configurateur/loader';
import { priceFrom } from '@/lib/configurateur/v2/engine';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Import d'un classeur Excel (DefV2) → définition en base. Admin uniquement.
 * Archive le tarif précédent (rollback) et renvoie un aperçu avant/après.
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

  // Filet de sécurité : archiver le tarif en cours avant remplacement.
  let priceFromBefore: number | null = null;
  try {
    const prev = await loadConfiguratorDef(def.slug);
    if (prev) {
      priceFromBefore = priceFrom(prev);
      await supabase.from('configurator_versions').insert({
        slug: prev.slug, name: prev.name, famille: prev.famille,
        definition: prev, archived_by: guard.userId,
      });
    }
  } catch {
    // Table d'historique absente → import quand même possible.
  }

  const { error } = await supabase.from('configurators').upsert(
    { slug: def.slug, name: def.name, famille: def.famille, definition: def, active: true, updated_at: new Date().toISOString() },
    { onConflict: 'slug' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    slug: def.slug,
    name: def.name,
    stats: {
      fields: def.fields.length,
      steps: def.steps.length,
      priceRules: def.priceRules.length,
      tables: Object.keys(def.tables?.d2 ?? {}).length + Object.keys(def.tables?.d1 ?? {}).length,
      priceFrom: priceFrom(def),
      priceFromBefore,
    },
  });
}
