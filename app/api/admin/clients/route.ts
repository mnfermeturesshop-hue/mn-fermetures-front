import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' }, { status: 500 });
  }
  try {
    const supabase = createAdminClient();

    const [{ data: profiles }, { data: { users } }] = await Promise.all([
      supabase.from('profiles').select('id, name, role, company, discounts').eq('role', 'b2b').order('name'),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    const emailById = Object.fromEntries(users.map((u) => [u.id, u.email ?? '']));

    const clients = (profiles ?? []).map((p) => ({
      id: p.id,
      email: emailById[p.id] ?? '',
      name: p.name,
      company: p.company ?? '',
      discounts: (p.discounts as Record<string, number>) ?? {},
    }));

    return NextResponse.json(clients);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' }, { status: 500 });
  }
  try {
    const { id, discounts } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('profiles')
      .update({ discounts })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
