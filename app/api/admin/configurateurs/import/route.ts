import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';

export const runtime = 'nodejs';

/**
 * Import d'un classeur Excel de tarif. TEMPORAIREMENT indisponible : le round-trip
 * Excel est en cours de migration vers le format du moteur universel (v2).
 * Rétabli au sous-lot 1.3. En attendant, le configurateur est servi par le seed v2.
 */
export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  return NextResponse.json(
    { error: 'Import Excel en cours de migration vers le moteur universel (v2).' },
    { status: 503 },
  );
}
