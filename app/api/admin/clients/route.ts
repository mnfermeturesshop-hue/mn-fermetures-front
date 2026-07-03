import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const supabase = createAdminClient();

    const [{ data: profiles }, { data: { users } }, { data: proRequests }] = await Promise.all([
      supabase.from('profiles').select('id, name, role, company, discounts').in('role', ['b2b', 'blocked']).order('name'),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase.from('pro_requests').select('email, company'),
    ]);

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
      };
    });

    return NextResponse.json(clients);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json() as { id: string; discounts?: Record<string, number>; action?: 'block' | 'unblock' };
    const { id, action, discounts } = body;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const supabase = createAdminClient();

    if (action === 'block') {
      await supabase.auth.admin.updateUserById(id, { ban_duration: '876600h' });
      return NextResponse.json({ ok: true });
    }

    if (action === 'unblock') {
      await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' });
      return NextResponse.json({ ok: true });
    }

    // Mise à jour des remises
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
