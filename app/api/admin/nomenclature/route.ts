import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { recomputeCodes, children, chainSlugs, type TaxonomyLevel, type TaxonomyNode } from '@/lib/catalog/taxonomy';
import { TAXONOMY_SEED } from '@/lib/catalog/taxonomy';

export const runtime = 'nodejs';

const LEVELS: TaxonomyLevel[] = ['gamme', 'famille', 'sous_famille'];

/** Niveau d'un enfant sous un parent donné (null → gamme). */
function childLevel(parent: TaxonomyNode | undefined): TaxonomyLevel | null {
  if (!parent) return 'gamme';
  const idx = LEVELS.indexOf(parent.level);
  return idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null; // sous_famille = feuille
}

function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'noeud';
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base, i = 2;
  while (taken.has(slug)) slug = `${base}-${i++}`;
  return slug;
}

function row(n: TaxonomyNode) {
  return {
    slug: n.slug, parent_slug: n.parentSlug, level: n.level, code: n.code,
    name: n.name, sort_order: n.sortOrder, active: n.active,
    generator_slug: n.generatorSlug ?? null, updated_at: new Date().toISOString(),
  };
}

/** Nomenclature complète (base si peuplée, sinon seed), codes recalculés. */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const nodes = await getTaxonomy();
  const source = nodes === TAXONOMY_SEED ? 'seed' : 'db';
  return NextResponse.json({ items: recomputeCodes(nodes), source });
}

type Action =
  | { action: 'seed' }
  | { action: 'create'; name: string; parentSlug: string | null; generatorSlug?: string | null }
  | { action: 'update'; slug: string; name?: string; active?: boolean; generatorSlug?: string | null; surcharge?: number }
  | { action: 'move'; slug: string; parentSlug: string | null }
  | { action: 'reorder'; parentSlug: string | null; orderedSlugs: string[] }
  | { action: 'delete'; slug: string };

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => null)) as Action | null;
  if (!body || !('action' in body)) return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Base non configurée (SUPABASE_SERVICE_ROLE_KEY manquant).' }, { status: 500 });
  }

  const nodes = recomputeCodes(await getTaxonomy());
  const bySlugMap = new Map(nodes.map((n) => [n.slug, n]));

  try {
    switch (body.action) {
      /* Bootstrap : recopie le seed en base (idempotent). */
      case 'seed': {
        const { error } = await admin.from('taxonomy_nodes').upsert(TAXONOMY_SEED.map(row), { onConflict: 'slug' });
        if (error) throw error;
        return NextResponse.json({ ok: true, seeded: TAXONOMY_SEED.length });
      }

      case 'create': {
        const name = (body.name ?? '').trim();
        if (!name) return NextResponse.json({ error: 'Nom requis.' }, { status: 400 });
        const parent = body.parentSlug ? bySlugMap.get(body.parentSlug) : undefined;
        if (body.parentSlug && !parent) return NextResponse.json({ error: 'Parent introuvable.' }, { status: 400 });
        const level = childLevel(parent);
        if (!level) return NextResponse.json({ error: 'Une sous‑famille ne peut pas avoir d’enfant.' }, { status: 400 });

        const taken = new Set(nodes.map((n) => n.slug));
        const slug = uniqueSlug(slugify(name), taken);
        const siblings = children(nodes, body.parentSlug ?? null, false);
        const sortOrder = siblings.length ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

        const node: TaxonomyNode = {
          slug, name, level, parentSlug: body.parentSlug ?? null, sortOrder, active: true, code: '',
          ...(body.generatorSlug ? { generatorSlug: body.generatorSlug } : {}),
        };
        const { error } = await admin.from('taxonomy_nodes').insert(row(node));
        if (error) throw error;
        return NextResponse.json({ ok: true, slug });
      }

      case 'update': {
        const cur = bySlugMap.get(body.slug);
        if (!cur) return NextResponse.json({ error: 'Nœud introuvable.' }, { status: 404 });
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
        if (typeof body.active === 'boolean') patch.active = body.active;
        if ('generatorSlug' in body) patch.generator_slug = body.generatorSlug || null;
        if (typeof body.surcharge === 'number') patch.surcharge = Math.min(200, Math.max(0, Math.round(body.surcharge)));
        const { error } = await admin.from('taxonomy_nodes').update(patch).eq('slug', body.slug);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      case 'move': {
        const moved = bySlugMap.get(body.slug);
        if (!moved) return NextResponse.json({ error: 'Nœud introuvable.' }, { status: 404 });
        const parent = body.parentSlug ? bySlugMap.get(body.parentSlug) : undefined;
        if (body.parentSlug && !parent) return NextResponse.json({ error: 'Parent introuvable.' }, { status: 400 });
        // Interdit de déplacer sous soi‑même ou l'un de ses descendants (cycle).
        if (body.parentSlug && chainSlugs(nodes, body.parentSlug).includes(body.slug)) {
          return NextResponse.json({ error: 'Déplacement circulaire refusé.' }, { status: 400 });
        }
        const newLevel = childLevel(parent);
        if (!newLevel) return NextResponse.json({ error: 'Cible invalide (feuille).' }, { status: 400 });

        // Recalcule le niveau du nœud ET de tout son sous‑arbre ; refuse si > 3 niveaux.
        const updates: { slug: string; level: TaxonomyLevel }[] = [];
        const recurse = (slug: string, level: TaxonomyLevel): boolean => {
          const li = LEVELS.indexOf(level);
          if (li < 0) return false;
          updates.push({ slug, level });
          for (const ch of children(nodes, slug, false)) {
            if (li + 1 >= LEVELS.length) return false; // dépasserait sous_famille
            if (!recurse(ch.slug, LEVELS[li + 1])) return false;
          }
          return true;
        };
        if (!recurse(body.slug, newLevel)) {
          return NextResponse.json({ error: 'Déplacement refusé : dépasserait 3 niveaux (Gamme › Famille › Sous‑famille).' }, { status: 400 });
        }
        const siblings = children(nodes, body.parentSlug ?? null, false).filter((s) => s.slug !== body.slug);
        const sortOrder = siblings.length ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

        const { error: e1 } = await admin.from('taxonomy_nodes')
          .update({ parent_slug: body.parentSlug ?? null, level: newLevel, sort_order: sortOrder, updated_at: new Date().toISOString() })
          .eq('slug', body.slug);
        if (e1) throw e1;
        for (const u of updates.filter((u) => u.slug !== body.slug)) {
          const { error } = await admin.from('taxonomy_nodes').update({ level: u.level }).eq('slug', u.slug);
          if (error) throw error;
        }
        return NextResponse.json({ ok: true });
      }

      case 'reorder': {
        const orders = Array.isArray(body.orderedSlugs) ? body.orderedSlugs : [];
        for (let i = 0; i < orders.length; i++) {
          const { error } = await admin.from('taxonomy_nodes').update({ sort_order: i }).eq('slug', orders[i]);
          if (error) throw error;
        }
        return NextResponse.json({ ok: true });
      }

      case 'delete': {
        const { error } = await admin.from('taxonomy_nodes').delete().eq('slug', body.slug);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Table absente = migration non jouée.
    const hint = /relation .*taxonomy_nodes.* does not exist/i.test(msg)
      ? 'Table taxonomy_nodes absente : jouez la migration 20260804_taxonomy_nodes.sql dans Supabase.'
      : msg;
    return NextResponse.json({ error: hint }, { status: 400 });
  }
}
