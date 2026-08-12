import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadConfiguratorDef, listConfigurators, rawConfiguratorDef, isSeedConfigurator } from '@/lib/configurateur/loader';
import { validateDef } from '@/lib/configurateur/v2/validate';
import { priceFrom } from '@/lib/configurateur/v2/engine';

export const runtime = 'nodejs';

/** Liste des configurateurs (seeds intégrés + lignes en base ; la base prime). */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const items = await listConfigurators();
  return NextResponse.json({ items: items.sort((a, b) => a.name.localeCompare(b.name)) });
}

/** Activer / désactiver un configurateur (seed inclus : upsert la def + le flag). */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null) as { slug?: string; active?: boolean } | null;
  if (!body?.slug || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'slug et active (booléen) requis.' }, { status: 400 });
  }
  const def = await rawConfiguratorDef(body.slug);
  if (!def) return NextResponse.json({ error: 'Configurateur introuvable.' }, { status: 404 });

  const supabase = createAdminClient();
  const { error } = await supabase.from('configurators').upsert(
    { slug: def.slug, name: def.name, famille: def.famille, definition: def, active: body.active, updated_at: new Date().toISOString() },
    { onConflict: 'slug' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, slug: body.slug, active: body.active });
}

/** Supprimer définitivement un configurateur EN BASE. Interdit pour un seed intégré
 *  (c'est du code — le supprimer le ferait réapparaître) : on renvoie une erreur claire. */
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug requis.' }, { status: 400 });
  if (isSeedConfigurator(slug)) {
    return NextResponse.json({ error: 'Configurateur intégré : utilisez « Désactiver » (il ne peut pas être supprimé définitivement).' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('configurators').delete().eq('slug', slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, slug });
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
