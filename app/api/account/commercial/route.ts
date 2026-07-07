import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/guards';

/**
 * Commercial référent du client connecté (affiché dans l'onglet Tarifs).
 * La RLS empêche un client de lire le profil d'un autre utilisateur —
 * cette route lit le rattachement côté serveur et n'expose que le strict
 * nécessaire (nom, téléphone, email du commercial assigné).
 */
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();

  const { data: me, error } = await admin
    .from('profiles')
    .select('commercial_id')
    .eq('id', guard.userId)
    .single();

  // Colonne absente (migration non jouée) ou aucun commercial assigné
  if (error || !me?.commercial_id) return NextResponse.json({});

  const [{ data: profile }, { data: userData }] = await Promise.all([
    admin.from('profiles').select('name, phone').eq('id', me.commercial_id).single(),
    admin.auth.admin.getUserById(me.commercial_id),
  ]);

  if (!profile) return NextResponse.json({});

  return NextResponse.json({
    name: profile.name ?? '',
    phone: profile.phone ?? null,
    email: userData?.user?.email ?? null,
  });
}
