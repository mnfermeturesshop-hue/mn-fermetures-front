import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommercialClientIds } from '@/lib/auth/guards';

/**
 * Compteurs de commentaires NON LUS par document, pour l'utilisateur connecté.
 * Réponse : { "devis:DEV-2026-0042": 2, "order:CMD-2026-1234": 1 }
 * Non lu = écrit par quelqu'un d'autre, plus récent que mon dernier passage
 * sur le fil, sur un document de MON périmètre (client : mes documents ;
 * commercial : ceux de mes clients ; admin : tous). Volumes faibles →
 * agrégation en mémoire.
 */
export async function GET() {
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = profile?.role ?? 'b2c';

  // Périmètre : ensemble des user_id dont je peux voir les documents (null = tous)
  let scope: Set<string> | null = null;
  if (role === 'commercial') scope = await getCommercialClientIds(user.id);
  else if (role !== 'admin') scope = new Set([user.id]);
  if (scope && scope.size === 0) return NextResponse.json({});

  const [{ data: comments }, { data: reads }, { data: devisDocs }, { data: orderDocs }] = await Promise.all([
    admin.from('document_comments').select('target_type, target_number, author_id, created_at'),
    admin.from('comment_reads').select('target_type, target_number, last_read_at').eq('user_id', user.id),
    admin.from('devis').select('devis_number, user_id'),
    admin.from('orders').select('order_number, user_id'),
  ]);

  // Propriétaire de chaque document (pour appliquer le périmètre)
  const ownerByTarget = new Map<string, string | null>();
  for (const d of devisDocs ?? []) ownerByTarget.set(`devis:${d.devis_number}`, d.user_id);
  for (const o of orderDocs ?? []) ownerByTarget.set(`order:${o.order_number}`, o.user_id);

  const lastReadByTarget = new Map<string, number>();
  for (const r of reads ?? []) {
    lastReadByTarget.set(`${r.target_type}:${r.target_number}`, new Date(r.last_read_at).getTime());
  }

  const unread: Record<string, number> = {};
  for (const c of comments ?? []) {
    if (c.author_id === user.id) continue; // mes propres messages
    const key = `${c.target_type}:${c.target_number}`;
    const owner = ownerByTarget.get(key);
    if (scope && (!owner || !scope.has(owner))) continue; // hors périmètre
    const lastRead = lastReadByTarget.get(key) ?? 0;
    if (new Date(c.created_at).getTime() <= lastRead) continue; // déjà lu
    unread[key] = (unread[key] ?? 0) + 1;
  }

  return NextResponse.json(unread);
}
