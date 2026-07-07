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
 * Garde d'accès pour les routes API du back-office ouvertes aux COMMERCIAUX.
 *
 * Un commercial est un admin restreint : il n'agit que sur SES clients
 * (profiles.commercial_id = lui). Cette garde renvoie le rôle ; c'est à
 * chaque route de filtrer/vérifier la propriété via getCommercialClientIds
 * — jamais l'UI. Les routes sensibles (produits, import, suppression de
 * comptes, demandes pro, équipe) restent sur requireAdmin.
 */
export type StaffRole = 'admin' | 'commercial';
export type StaffGuardOk = { ok: true; userId: string; role: StaffRole };

export async function requireStaff(): Promise<StaffGuardOk | GuardErr> {
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

  if (!profile || (profile.role !== 'admin' && profile.role !== 'commercial')) {
    return { ok: false, response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
  }

  return { ok: true, userId: user.id, role: profile.role as StaffRole };
}

/** IDs des clients rattachés à un commercial (périmètre d'action serveur). */
export async function getCommercialClientIds(commercialId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('commercial_id', commercialId);
  return new Set((data ?? []).map((p) => p.id as string));
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
