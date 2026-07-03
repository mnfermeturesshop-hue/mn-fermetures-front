import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Garde d'accès pour les routes API admin.
 *
 * Contexte : les routes `/api/admin/*` utilisent la clé `service_role` qui
 * BYPASSE la RLS. Le middleware ne protège que les *pages* `/admin`, jamais
 * `/api/admin` (le chemin commence par `/api`). Sans cette garde, ces routes
 * sont ouvertes à tout internet. Voir docs/audit.md — S1.
 *
 * Vérifie la session (cookie) puis le rôle via `service_role` (évite la
 * récursion RLS de la policy `profiles_admin_all`).
 *
 * Usage :
 *   const guard = await requireAdmin();
 *   if (!guard.ok) return guard.response;
 */
export type AdminGuardOk = { ok: true; userId: string };
export type GuardErr = { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminGuardOk | GuardErr> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Service non configuré.' }, { status: 500 }),
    };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
  }

  return { ok: true, userId: user.id };
}

/**
 * Garde pour les routes qui exigent seulement un utilisateur connecté.
 * Renvoie l'utilisateur de session — à utiliser comme unique source de
 * vérité pour `user_id`/`email` (ne jamais faire confiance au body).
 */
export type AuthGuardOk = { ok: true; userId: string; email: string | null };

export async function requireUser(): Promise<AuthGuardOk | GuardErr> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  return { ok: true, userId: user.id, email: user.email ?? null };
}
