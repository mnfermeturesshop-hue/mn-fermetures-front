import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';

/** Mise à jour groupée des prix HT catalogue (variantes unitaires + configs de kit),
 *  déclenchée par l'outil « Tarifs ». Écriture autoritaire via le rôle service après
 *  contrôle admin — la table `products` reste la source de vérité (le panier recalcule). */
interface PriceUpdate {
  slug: string;
  kind: 'variant' | 'kit';
  reference: string;
  priceHT: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = { reference: string; priceHT: number;[k: string]: any };

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const { updates } = (await req.json()) as { updates: PriceUpdate[] };
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Aucune modification à enregistrer.' }, { status: 400 });
    }
    for (const u of updates) {
      if (!u?.slug || !u?.reference || (u.kind !== 'variant' && u.kind !== 'kit')) {
        return NextResponse.json({ error: 'Mise à jour invalide.' }, { status: 400 });
      }
      if (typeof u.priceHT !== 'number' || !Number.isFinite(u.priceHT) || u.priceHT < 0 || u.priceHT > 1_000_000) {
        return NextResponse.json({ error: `Prix invalide pour ${u.reference}.` }, { status: 400 });
      }
    }

    const supabase = createAdminClient();
    // Regroupé par produit : une lecture + une écriture par produit, quel que soit le
    // nombre de lignes modifiées.
    const bySlug = new Map<string, PriceUpdate[]>();
    for (const u of updates) {
      const arr = bySlug.get(u.slug) ?? [];
      arr.push(u);
      bySlug.set(u.slug, arr);
    }

    let count = 0;
    for (const [slug, ups] of bySlug) {
      const { data, error } = await supabase
        .from('products')
        .select('variants, configs')
        .eq('slug', slug)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: `Produit introuvable : ${slug}` }, { status: 400 });
      }
      let variants = (data.variants as Row[] | null) ?? null;
      let configs = (data.configs as Row[] | null) ?? null;
      const patch: Record<string, unknown> = {};
      for (const u of ups) {
        if (u.kind === 'variant' && variants) {
          variants = variants.map((v) => (v.reference === u.reference ? { ...v, priceHT: u.priceHT } : v));
          patch.variants = variants;
        } else if (u.kind === 'kit' && configs) {
          configs = configs.map((c) => (c.reference === u.reference ? { ...c, priceHT: u.priceHT } : c));
          patch.configs = configs;
        }
      }
      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await supabase.from('products').update(patch).eq('slug', slug);
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
        count += ups.length;
      }
    }

    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
