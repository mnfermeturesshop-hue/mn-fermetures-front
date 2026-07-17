import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { loadConfiguratorDef } from '@/lib/configurateur/loader';

export const runtime = 'nodejs';

/** Renvoie la définition (DefV2) d'un configurateur, pour l'éditeur admin. */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 });
  const def = await loadConfiguratorDef(slug);
  if (!def) return NextResponse.json({ error: `Configurateur introuvable : ${slug}` }, { status: 404 });
  return NextResponse.json({ def });
}
