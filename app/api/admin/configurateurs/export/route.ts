import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { loadConfiguratorDef } from '@/lib/configurateur/loader';
import { buildWorkbook, workbookFilename } from '@/lib/configurateur/export/buildWorkbook';

// SheetJS a besoin du runtime Node (pas edge).
export const runtime = 'nodejs';

/**
 * Export du tarif en cours (définition du configurateur) en classeur Excel,
 * toutes valeurs pré-remplies. Admin uniquement. L'admin édite les prix puis
 * ré-importe via `/admin/configurateurs` (round-trip sans perte).
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
