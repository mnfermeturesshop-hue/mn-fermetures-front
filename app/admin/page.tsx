'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalProducts: number;
  outOfStock: number;
  totalOrders: number;
  pendingOrders: number;
  categories: number;
}

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

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

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
