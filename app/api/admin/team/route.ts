import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';

/**
 * Gestion des comptes commerciaux — STRICTEMENT admin.
 * Un commercial est un compte back-office restreint à ses propres clients
 * (profiles.commercial_id) ; il ne peut ni créer ni supprimer d'autres comptes.
 */

/** Liste des commerciaux (+ email et nombre de clients assignés). */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const [{ data: commercials }, { data: { users } }, { data: assigned }] = await Promise.all([
    supabase.from('profiles').select('id, name').eq('role', 'commercial').order('name'),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('profiles').select('commercial_id').not('commercial_id', 'is', null),
  ]);

  const emailById = Object.fromEntries(users.map((u) => [u.id, u.email ?? '']));
  const clientCount = new Map<string, number>();
  for (const p of assigned ?? []) {
    if (p.commercial_id) clientCount.set(p.commercial_id, (clientCount.get(p.commercial_id) ?? 0) + 1);
  }

  return NextResponse.json((commercials ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    email: emailById[c.id] ?? '',
    clients: clientCount.get(c.id) ?? 0,
  })));
}

/** Création d'un compte commercial. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { name = '', email = '', password = '' } = await req.json() as {
    name?: string; email?: string; password?: string;
  };

  if (!name.trim() || !email.trim()) {
    return NextResponse.json({ error: 'Nom et email requis.' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim() },
  });

  if (createErr) {
    const msg = createErr.message.toLowerCase().includes('already registered')
      ? 'Un compte existe déjà avec cet email.'
      : createErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Le trigger handle_new_user crée le profil en b2c → on le passe commercial
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ name: name.trim(), role: 'commercial' })
    .eq('id', created.user.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: created.user.id });
}

/** Suppression d'un commercial (ses clients repassent « non assigné » via FK). */
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const supabase = createAdminClient();

  // Garde-fou : cette route ne supprime QUE des comptes commerciaux
  // (impossible de supprimer un admin ou un client par ce chemin).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single();
  if (!profile || profile.role !== 'commercial') {
    return NextResponse.json({ error: 'Ce compte n\'est pas un commercial.' }, { status: 400 });
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
