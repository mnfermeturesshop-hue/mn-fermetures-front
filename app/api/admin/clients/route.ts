import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireStaff } from '@/lib/auth/guards';
import { orderCountsForLoyalty } from '@/lib/loyalty';

export async function GET() {
  // Ouvert aux commerciaux — mais chacun ne voit QUE ses clients assignés
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;
  try {
    const supabase = createAdminClient();

    let profilesQuery = supabase
      .from('profiles')
      .select('id, name, role, company, discounts, commercial_id, email_optout')
      .in('role', ['b2b', 'blocked'])
      .order('name');
    if (guard.role === 'commercial') {
      profilesQuery = profilesQuery.eq('commercial_id', guard.userId);
    }
    let { data: profiles } = await profilesQuery;
    if (!profiles && guard.role === 'admin') {
      // Migration 20260707_role_commercial pas encore jouée — fallback sans la
      // colonne (sans risque : aucun compte commercial ne peut exister avant elle)
      const { data: fallback } = await supabase
        .from('profiles')
        .select('id, name, role, company, discounts')
        .in('role', ['b2b', 'blocked'])
        .order('name');
      profiles = (fallback ?? []).map((p) => ({ ...p, commercial_id: null, email_optout: false }));
    }

    const loyaltyYear = new Date().getFullYear();
    const [{ data: { users } }, { data: proRequests }, { data: loyaltyOrders }] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from('pro_requests').select('email, company'),
      // CA fidélité : BC expédiés/livrés de l'année en cours, agrégés par client
      supabase
        .from('orders')
        .select('user_id, total_ht, status, payment_method, created_at')
        .eq('payment_method', 'bon_de_commande')
        .gte('created_at', `${new Date().getFullYear()}-01-01`),
    ]);

    const loyaltyCaByUser = new Map<string, number>();
    for (const o of loyaltyOrders ?? []) {
      if (!o.user_id || !orderCountsForLoyalty(o, loyaltyYear)) continue;
      loyaltyCaByUser.set(o.user_id, (loyaltyCaByUser.get(o.user_id) ?? 0) + Number(o.total_ht));
    }

    const now = new Date();
    const userDataById = Object.fromEntries(users.map((u) => [u.id, {
      email: u.email ?? '',
      lastSignIn: u.last_sign_in_at ?? null,
      banned: !!(u.banned_until && new Date(u.banned_until) > now),
    }]));

    // Fallback : récupère le nom d'entreprise depuis pro_requests si profiles.company est vide
    const proCompanyByEmail = Object.fromEntries(
      (proRequests ?? []).map((r) => [r.email, r.company])
    );

    const clients = (profiles ?? []).map((p) => {
      const email = userDataById[p.id]?.email ?? '';
      return {
        id: p.id,
        email,
        name: p.name,
        company: p.company || proCompanyByEmail[email] || '',
        discounts: (p.discounts as Record<string, number>) ?? {},
        lastSignIn: userDataById[p.id]?.lastSignIn ?? null,
        banned: userDataById[p.id]?.banned ?? false,
        loyaltyCaHT: loyaltyCaByUser.get(p.id) ?? 0,
        commercialId: p.commercial_id ?? null,
        emailOptout: p.email_optout ?? false,
      };
    });

    return NextResponse.json(clients);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Staff : les remises sont ouvertes aux commerciaux (sur LEURS clients) ;
  // blocage et assignation de commercial restent admin uniquement.
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json() as {
      id: string;
      discounts?: Record<string, number>;
      action?: 'block' | 'unblock';
      commercialId?: string | null;
    };
    const { id, action, discounts, commercialId } = body;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const supabase = createAdminClient();

    if (action === 'block' || action === 'unblock') {
      if (guard.role !== 'admin') {
        return NextResponse.json({ error: 'Action réservée à l\'administrateur.' }, { status: 403 });
      }
      await supabase.auth.admin.updateUserById(id, {
        ban_duration: action === 'block' ? '876600h' : 'none',
      });
      return NextResponse.json({ ok: true });
    }

    // Assignation d'un commercial référent (admin uniquement)
    if (commercialId !== undefined) {
      if (guard.role !== 'admin') {
        return NextResponse.json({ error: 'Action réservée à l\'administrateur.' }, { status: 403 });
      }
      const { error } = await supabase
        .from('profiles')
        .update({ commercial_id: commercialId || null })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    // Mise à jour des remises — un commercial ne touche que SES clients
    if (guard.role === 'commercial') {
      const { data: target } = await supabase
        .from('profiles')
        .select('commercial_id')
        .eq('id', id)
        .single();
      if (!target || target.commercial_id !== guard.userId) {
        return NextResponse.json({ error: 'Ce client ne vous est pas assigné.' }, { status: 403 });
      }
    }
    const { error } = await supabase.from('profiles').update({ discounts }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const { id } = await req.json() as { id: string };
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const supabase = createAdminClient();

    // Supprime la demande pro liée avant de supprimer l'utilisateur
    await supabase.from('pro_requests').delete().eq('user_id', id);

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
