import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { builtinConfigurators, loadConfiguratorDef } from '@/lib/configurateur/loader';
import { validateDef } from '@/lib/configurateur/v2/validate';
import { priceFrom } from '@/lib/configurateur/v2/engine';

export const runtime = 'nodejs';

interface ListItem { slug: string; name: string; famille: string; active: boolean; source: 'seed' | 'db'; updatedAt?: string }

/** Liste des configurateurs (seeds intégrés + lignes en base ; la base prime). */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const map = new Map<string, ListItem>();
  for (const b of builtinConfigurators()) map.set(b.slug, { ...b, active: true, source: 'seed' });

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.from('configurators').select('slug, name, famille, active, updated_at');
      for (const r of data ?? []) {
        map.set(r.slug, { slug: r.slug, name: r.name, famille: r.famille, active: r.active, source: 'db', updatedAt: r.updated_at });
      }
    } catch { /* table absente → seeds seuls */ }
  }
  return NextResponse.json({ items: [...map.values()].sort((a, b) => a.name.localeCompare(b.name)) });
}

/** Enregistre (ou valide en `dryRun`) une définition éditée par l'admin. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null) as { definition?: unknown; dryRun?: boolean } | null;
  if (!body) return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });

  const { def, errors, warnings, priceFrom: pf } = validateDef(body.definition);
  if (!def) return NextResponse.json({ error: 'Définition refusée.', details: errors, warnings }, { status: 400 });
  if (body.dryRun) return NextResponse.json({ ok: true, dryRun: true, slug: def.slug, priceFrom: pf, warnings });

  const supabase = createAdminClient();
  // Filet de sécurité : archiver la définition en cours avant remplacement.
  let priceFromBefore: number | null = null;
  try {
    const prev = await loadConfiguratorDef(def.slug);
    if (prev) {
      priceFromBefore = priceFrom(prev);
      await supabase.from('configurator_versions').insert({
        slug: prev.slug, name: prev.name, famille: prev.famille, definition: prev, archived_by: guard.userId,
      });
    }
  } catch { /* historique absent → save quand même */ }

  const { error } = await supabase.from('configurators').upsert(
    { slug: def.slug, name: def.name, famille: def.famille, definition: def, active: true, updated_at: new Date().toISOString() },
    { onConflict: 'slug' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, slug: def.slug, priceFrom: pf, priceFromBefore, warnings });
}
