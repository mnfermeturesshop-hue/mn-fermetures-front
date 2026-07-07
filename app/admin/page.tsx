'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { computeLoyalty } from '@/lib/loyalty';
import { MonthlyBarChart, type MonthPoint } from '@/components/ui/MonthlyBarChart';

interface Stats {
  totalProducts: number;
  outOfStock: number;
  totalOrders: number;
  pendingOrders: number;
  categories: number;
}

interface DashboardData {
  kpis: {
    ca12m: number;
    caMonth: number;
    pendingOrders: number;
    devisActifs: number;
    conversionPct: number | null;
    clientsB2B: number;
  };
  monthly: { year: number; month: number; ca: number }[];
  topClients: { id: string; label: string; ca12m: number; caYear: number; ordersCount: number }[];
  byCommercial: { name: string; clients: number; ca12m: number }[];
}

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';

async function fetchStats(): Promise<Stats> {
  const isSupabase = typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string'
    && process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  if (!isSupabase) {
    const { products } = await import('@/lib/catalog/mock');
    const outOfStock = products.filter((p) => {
      if (p.pricingType === 'unit') return p.variants.some((v) => !v.inStock);
      return false;
    }).length;
    return {
      totalProducts: products.length,
      outOfStock,
      totalOrders: 0,
      pendingOrders: 0,
      categories: 9,
    };
  }

  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  const [{ count: totalProducts }, { count: outOfStock }, { count: totalOrders }, { count: pendingOrders }, { count: categories }] =
    await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true).contains('variants', [{ inStock: false }]),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
    ]);

  return {
    totalProducts: totalProducts ?? 0,
    outOfStock: outOfStock ?? 0,
    totalOrders: totalOrders ?? 0,
    pendingOrders: pendingOrders ?? 0,
    categories: categories ?? 0,
  };
}

const QUICK_ACTIONS = [
  { href: '/admin/produits/nouveau', label: 'Nouveau produit', icon: '＋', color: 'var(--success)' },
  { href: '/admin/import',           label: 'Importer Excel', icon: '⬆',  color: 'var(--steel-600)' },
  { href: '/admin/inventaire',       label: 'Mettre à jour le stock', icon: '📦', color: 'var(--navy-700)' },
  { href: '/admin/commandes',        label: 'Voir les commandes', icon: '🧾', color: '#7a52b3' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchStats().then(setStats);
    fetch('/api/admin/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.kpis) setDash(data); })
      .catch(() => {});
  }, []);

  const months: MonthPoint[] = (dash?.monthly ?? []).map((m) => ({
    date: new Date(m.year, m.month, 1),
    total: m.ca,
  }));

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Dashboard</h1>
        <span className="adm-date">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* KPIs */}
      <div className="adm-kpis">
        <div className="adm-kpi">
          <div className="adm-kpi-value">{stats?.totalProducts ?? '—'}</div>
          <div className="adm-kpi-label">Produits actifs</div>
        </div>
        <div className={`adm-kpi ${(stats?.outOfStock ?? 0) > 0 ? 'adm-kpi-warn' : ''}`}>
          <div className="adm-kpi-value">{stats?.outOfStock ?? '—'}</div>
          <div className="adm-kpi-label">Références en rupture</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-value">{stats?.totalOrders ?? '—'}</div>
          <div className="adm-kpi-label">Commandes totales</div>
        </div>
        <div className={`adm-kpi ${(stats?.pendingOrders ?? 0) > 0 ? 'adm-kpi-warn' : ''}`}>
          <div className="adm-kpi-value">{stats?.pendingOrders ?? '—'}</div>
          <div className="adm-kpi-label">En attente paiement</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-value">{stats?.categories ?? '—'}</div>
          <div className="adm-kpi-label">Catégories</div>
        </div>
      </div>

      {/* ── Pilotage commercial (12 mois glissants) ── */}
      {dash && (
        <>
          <h2 className="adm-section-title">Pilotage commercial — 12 derniers mois</h2>
          <div className="adm-kpis">
            <div className="adm-kpi">
              <div className="adm-kpi-value">{euro(Math.round(dash.kpis.ca12m))}</div>
              <div className="adm-kpi-label">CA validé 12 mois (HT)</div>
            </div>
            <div className="adm-kpi">
              <div className="adm-kpi-value">{euro(Math.round(dash.kpis.caMonth))}</div>
              <div className="adm-kpi-label">CA validé ce mois (HT)</div>
            </div>
            <div className={`adm-kpi ${dash.kpis.devisActifs > 0 ? 'adm-kpi-warn' : ''}`}>
              <div className="adm-kpi-value">{dash.kpis.devisActifs}</div>
              <div className="adm-kpi-label">Devis en cours</div>
            </div>
            <div className="adm-kpi">
              <div className="adm-kpi-value">{dash.kpis.conversionPct === null ? '—' : `${dash.kpis.conversionPct} %`}</div>
              <div className="adm-kpi-label">Conversion devis → BC</div>
            </div>
            <div className="adm-kpi">
              <div className="adm-kpi-value">{dash.kpis.clientsB2B}</div>
              <div className="adm-kpi-label">Clients pro</div>
            </div>
          </div>

          <div style={{ margin: '16px 0 24px' }}>
            <MonthlyBarChart
              months={months}
              title="CA validé par mois (€ HT) — bons de commande expédiés/livrés"
              emptyMessage="Le CA apparaîtra dès les premières commandes expédiées ou livrées."
            />
          </div>

          <div className="adm-dash-cols">
            {/* Top clients */}
            <div className="adm-table-wrap">
              <div className="adm-dash-table-head">
                <span>Top clients — CA validé 12 mois</span>
                <Link href="/admin/clients" className="adm-alert-link">Voir tous →</Link>
              </div>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Palier</th>
                    <th style={{ textAlign: 'center' }}>BC</th>
                    <th style={{ textAlign: 'right' }}>CA 12 mois</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.topClients.length === 0 && (
                    <tr className="adm-tr"><td colSpan={5} style={{ color: 'var(--muted)' }}>Aucun CA validé pour l&apos;instant.</td></tr>
                  )}
                  {dash.topClients.map((c, i) => {
                    const { tier } = computeLoyalty(c.caYear);
                    return (
                      <tr key={c.id} className="adm-tr">
                        <td style={{ color: 'var(--muted)', fontWeight: 700 }}>{i + 1}</td>
                        <td><strong>{c.label}</strong></td>
                        <td>
                          {tier ? (
                            <span className="loyalty-badge loyalty-badge--sm" style={{ background: tier.color }}>{tier.label}</span>
                          ) : (
                            <span className="adm-muted">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>{c.ordersCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{euro(Math.round(c.ca12m))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Par commercial */}
            <div className="adm-table-wrap">
              <div className="adm-dash-table-head">
                <span>CA par commercial</span>
                <Link href="/admin/equipe" className="adm-alert-link">Gérer l&apos;équipe →</Link>
              </div>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Commercial</th>
                    <th style={{ textAlign: 'center' }}>Clients</th>
                    <th style={{ textAlign: 'right' }}>CA 12 mois</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.byCommercial.length === 0 && (
                    <tr className="adm-tr"><td colSpan={3} style={{ color: 'var(--muted)' }}>Aucun client pro.</td></tr>
                  )}
                  {dash.byCommercial.map((c, i) => (
                    <tr key={i} className="adm-tr">
                      <td>{c.name === 'Non assigné' ? <span className="adm-muted">Non assigné</span> : <strong>{c.name}</strong>}</td>
                      <td style={{ textAlign: 'center' }}>{c.clients}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{euro(Math.round(c.ca12m))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Actions rapides */}
      <h2 className="adm-section-title">Actions rapides</h2>
      <div className="adm-quick-actions">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="adm-quick-card">
            <span className="adm-quick-icon" style={{ background: a.color }}>{a.icon}</span>
            <span className="adm-quick-label">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Alertes stock */}
      {(stats?.outOfStock ?? 0) > 0 && (
        <div className="adm-alert">
          <span className="adm-alert-icon">⚠</span>
          <span>{stats!.outOfStock} référence{stats!.outOfStock > 1 ? 's' : ''} en rupture de stock.</span>
          <Link href="/admin/inventaire" className="adm-alert-link">Gérer l&apos;inventaire →</Link>
        </div>
      )}
    </div>
  );
}
