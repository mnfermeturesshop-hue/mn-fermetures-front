import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { loadConfiguratorDef } from '@/lib/configurateur/loader';

/**
 * Définition d'un configurateur (grilles + options + coloris) pour le calcul
 * de prix instantané. Réservé aux utilisateurs connectés : les prix sont une
 * donnée pro (PUBLIC_PRICES=false).
 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const def = await loadConfiguratorDef(params.slug);
  if (!def) return NextResponse.json({ error: 'Configurateur introuvable' }, { status: 404 });

  return NextResponse.json(def);
}
