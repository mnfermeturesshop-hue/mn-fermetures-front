import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/guards';
import { loadConfiguratorDef } from '@/lib/configurateur/loader';
import { getUserHiddenNodes } from '@/lib/pricing/discounts';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { generatorNode } from '@/lib/catalog/taxonomy';
import { isNodeHidden } from '@/lib/pricing/discount-resolver';

/**
 * Définition d'un configurateur (grilles + options + coloris) pour le calcul
 * de prix instantané. Réservé aux utilisateurs connectés : les prix sont une
 * donnée pro (PUBLIC_PRICES=false).
 *
 * Masquage par client : les sous-familles masquées (champ `nodeField`) sont
 * retirées des options ; si le configurateur entier est masqué (nœud
 * générateur, ou plus aucune sous-famille disponible) → 404 discret.
 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const def = await loadConfiguratorDef(params.slug);
  if (!def) return NextResponse.json({ error: 'Configurateur introuvable' }, { status: 404 });

  const hidden = await getUserHiddenNodes(guard.userId);
  if (hidden.length) {
    const taxonomy = await getTaxonomy();
    // Configurateur entièrement masqué (nœud générateur / famille) → 404.
    const genNode = generatorNode(taxonomy, def.slug) ?? def.famille;
    if (isNodeHidden(hidden, genNode, taxonomy)) {
      return NextResponse.json({ error: 'Configurateur introuvable' }, { status: 404 });
    }
    // Retire les sous-familles masquées des options du champ nodeField.
    const nf = def.nodeField ? def.fields.find((f) => f.id === def.nodeField) : undefined;
    if (nf?.options) {
      const kept = nf.options.filter((o) => !isNodeHidden(hidden, String(o.value), taxonomy));
      if (kept.length === 0) {
        return NextResponse.json({ error: 'Configurateur introuvable' }, { status: 404 });
      }
      if (kept.length !== nf.options.length) {
        const fields = def.fields.map((f) => (f.id === def.nodeField ? { ...f, options: kept } : f));
        return NextResponse.json({ ...def, fields });
      }
    }
  }

  return NextResponse.json(def);
}
