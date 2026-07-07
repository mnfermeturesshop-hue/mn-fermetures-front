import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStaff, getCommercialClientIds } from '@/lib/auth/guards';
import { isValidatedBC } from '@/lib/loyalty';

/**
 * Agrégats commerciaux du tableau de bord (évolution #15).
 * - Admin : périmètre global.
 * - Commercial : STRICTEMENT ses clients assignés (filtrage serveur).
 * Mêmes règles que le reste du site : CA « validé » = bons de commande
 * expédiés/livrés, fenêtre 12 mois glissants, paliers sur l'année civile.
 * Volumes faibles → agrégation en mémoire, service_role.
 */
export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  // Le CA « année civile » (paliers) peut commencer avant la fenêtre 12 mois
  const dataStart = new Date(Math.min(windowStart.getTime(), yearStart.getTime()));

  // Périmètre commercial : uniquement ses clients assignés
  const scopeIds = guard.role === 'commercial'
    ? [...await getCommercialClientIds(guard.userId)]
    : null;

  if (scopeIds && scopeIds.length === 0) {
    // Aucun client assigné : réponse vide propre (pas d'erreur)
    return NextResponse.json({
      viewerRole: guard.role,
      kpis: { ca12m: 0, caMonth: 0, totalOrders: 0, pendingOrders: 0, devisActifs: 0, conversionPct: null, clientsB2B: 0 },
      monthly: Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        return { year: date.getFullYear(), month: date.getMonth(), ca: 0 };
      }),
      topClients: [],
      byCommercial: [],
    });
  }

  let ordersQuery = supabase
    .from('orders')
    .select('user_id, total_ht, status, payment_method, created_at')
    .gte('created_at', dataStart.toISOString());
  let totalOrdersQuery = supabase.from('orders').select('*', { count: 'exact', head: true });
  let pendingOrdersQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  let devisQuery = supabase
    .from('devis')
    .select('user_id, status, created_at')
    .gte('created_at', windowStart.toISOString());
  let devisActifsQuery = supabase
    .from('devis')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')
    .gte('valid_until', now.toISOString());

  if (scopeIds) {
    ordersQuery = ordersQuery.in('user_id', scopeIds);
    totalOrdersQuery = totalOrdersQuery.in('user_id', scopeIds);
    pendingOrdersQuery = pendingOrdersQuery.in('user_id', scopeIds);
    devisQuery = devisQuery.in('user_id', scopeIds);
    devisActifsQuery = devisActifsQuery.in('user_id', scopeIds);
  }

  const [
    { data: orders },
    { count: totalOrders },
    { count: pendingOrders },
    { data: devis },
    { count: devisActifs },
    { data: allProfiles },
  ] = await Promise.all([
    ordersQuery,
    totalOrdersQuery,
    pendingOrdersQuery,
    devisQuery,
    devisActifsQuery,
    // Tous les profils : les libellés du top clients doivent résoudre aussi
    // les commandes passées par un compte non-b2b (ex. tests avec le compte admin)
    supabase.from('profiles').select('id, name, company, role, commercial_id'),
  ]);

  const clients = (allProfiles ?? []).filter((p) =>
    p.role === 'b2b' && (!scopeIds || p.commercial_id === guard.userId)
  );
  const commercials = (allProfiles ?? []).filter((p) => p.role === 'commercial');

  const inWindow = (iso: string) => new Date(iso) >= windowStart;
  const validated = (orders ?? []).filter((o) => isValidatedBC(o));
  const validated12m = validated.filter((o) => inWindow(o.created_at));

  // ── KPIs ──
  const ca12m = validated12m.reduce((s, o) => s + Number(o.total_ht), 0);
  const caMonth = validated
    .filter((o) => {
      const d = new Date(o.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, o) => s + Number(o.total_ht), 0);
  const devisCount = (devis ?? []).length;
  const converted = (devis ?? []).filter((d) => d.status === 'converted').length;
  const conversionPct = devisCount > 0 ? Math.round((converted / devisCount) * 100) : null;

  // ── CA validé par mois (12 points) ──
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const ca = validated12m
      .filter((o) => {
        const d = new Date(o.created_at);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
      })
      .reduce((s, o) => s + Number(o.total_ht), 0);
    return { year: date.getFullYear(), month: date.getMonth(), ca };
  });

  // ── Agrégats par client (12 mois + année civile pour le palier) ──
  const byClient = new Map<string, { ca12m: number; caYear: number; ordersCount: number }>();
  for (const o of validated) {
    if (!o.user_id) continue;
    const agg = byClient.get(o.user_id) ?? { ca12m: 0, caYear: 0, ordersCount: 0 };
    const d = new Date(o.created_at);
    if (inWindow(o.created_at)) {
      agg.ca12m += Number(o.total_ht);
      agg.ordersCount += 1;
    }
    if (d >= yearStart) agg.caYear += Number(o.total_ht);
    byClient.set(o.user_id, agg);
  }

  const profileById = new Map((allProfiles ?? []).map((p) => [p.id, p]));
  const topClients = [...byClient.entries()]
    .map(([id, agg]) => {
      const p = profileById.get(id);
      const label = p
        ? (p.company || p.name || 'Sans nom') + (p.role !== 'b2b' ? ` (compte ${p.role})` : '')
        : 'Compte supprimé';
      return { id, label, ...agg };
    })
    .sort((a, b) => b.ca12m - a.ca12m)
    .slice(0, 10);

  // ── CA par commercial (pilotage des assignations) ──
  const commercialName = new Map(commercials.map((c) => [c.id, c.name as string]));
  const byCommercial = new Map<string, { name: string; clients: number; ca12m: number }>();
  for (const c of clients) {
    const key = c.commercial_id ?? 'none';
    const entry = byCommercial.get(key) ?? {
      name: c.commercial_id ? (commercialName.get(c.commercial_id) ?? 'Commercial supprimé') : 'Non assigné',
      clients: 0,
      ca12m: 0,
    };
    entry.clients += 1;
    entry.ca12m += byClient.get(c.id)?.ca12m ?? 0;
    byCommercial.set(key, entry);
  }

  return NextResponse.json({
    viewerRole: guard.role,
    kpis: {
      ca12m,
      caMonth,
      totalOrders: totalOrders ?? 0,
      pendingOrders: pendingOrders ?? 0,
      devisActifs: devisActifs ?? 0,
      conversionPct,
      clientsB2B: clients.length,
    },
    monthly,
    topClients,
    // Sans objet pour un commercial (une seule ligne : lui-même)
    byCommercial: guard.role === 'commercial'
      ? []
      : [...byCommercial.values()].sort((a, b) => b.ca12m - a.ca12m),
  });
}
