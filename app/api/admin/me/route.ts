import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStaff } from '@/lib/auth/guards';

/**
 * Identité back-office de l'utilisateur connecté (admin ou commercial).
 * Sert au layout admin et aux pages pour adapter la navigation et l'UI —
 * la sécurité réelle reste dans les gardes de chaque route API.
 */
export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('name')
    .eq('id', guard.userId)
    .single();

  return NextResponse.json({ role: guard.role, name: profile?.name ?? '' });
}
