import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';

export const runtime = 'nodejs';

/**
 * Export du tarif en classeur Excel. TEMPORAIREMENT indisponible : le round-trip
 * Excel est en cours de migration vers le format du moteur universel (v2).
 * Rétabli au sous-lot 1.3.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  return NextResponse.json(
    { error: 'Export/import Excel en cours de migration vers le moteur universel (v2).' },
    { status: 503 },
  );
}
