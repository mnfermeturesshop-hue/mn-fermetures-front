import { NextResponse } from 'next/server';
import { listConfigurators } from '@/lib/configurateur/loader';

/** Liste publique des slugs de configurateurs ACTIFS — utilisée par le menu pour
 *  masquer les configurateurs désactivés (ex. store banne). Aucune donnée sensible. */
export async function GET() {
  try {
    const configs = await listConfigurators();
    const slugs = configs.filter((c) => c.active).map((c) => c.slug);
    return NextResponse.json({ slugs });
  } catch {
    // En cas d'erreur (base indisponible) : on ne masque rien (menu complet).
    return NextResponse.json({ slugs: null });
  }
}
