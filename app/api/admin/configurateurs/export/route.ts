import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { loadConfiguratorDef } from '@/lib/configurateur/loader';
import { buildWorkbook, workbookFilename } from '@/lib/configurateur/export/buildWorkbook';

export const runtime = 'nodejs';

/**
 * Export du tarif en cours (DefV2) en classeur Excel : prix éditables (grilles
 * `Gn`, barèmes `Bn`) + structure portée en JSON (`_structure`). L'admin édite
 * les prix puis ré-importe (round-trip sans perte).
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const slug = req.nextUrl.searchParams.get('slug') || 'volet-roulant-traditionnel';
  const def = await loadConfiguratorDef(slug);
  if (!def) return NextResponse.json({ error: `Configurateur introuvable : ${slug}` }, { status: 404 });

  const xlsx = buildWorkbook(def);
  return new NextResponse(xlsx, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${workbookFilename(slug)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
