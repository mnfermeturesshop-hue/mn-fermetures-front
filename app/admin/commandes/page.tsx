'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from '@/components/ui/Toast';

const STATUS_LABELS: Record<string, string> = {
  pending:    'En attente',
  paid:       'Payé',
  processing: 'En prépa.',
  shipped:    'Expédié',
  delivered:  'Livré',
  cancelled:  'Annulé',
};
const STATUS_CLASS: Record<string, string> = {
  pending:    'status-pending',
  paid:       'status-ok',
  processing: 'status-shipping',
  shipped:    'status-shipping',
  delivered:  'status-ok',
  cancelled:  'status-rupture',
};

interface OrderRow {
  id: string;
  created_at: string;
  total_ht: number;
  total_ttc: number;
  payment_method: string;
  shipping_method: string;
  status: string;
  lines: { name: string; quantity: number }[];
  shipping_address: { firstName: string; lastName: string; city: string };
}

const MOCK_ORDERS: OrderRow[] = [
  {
    id: 'CMD-2026-0001',
    created_at: '2026-06-20T10:14:00Z',
    total_ht: 847.50,
    total_ttc: 1017.00,
    payment_method: 'virement',
    shipping_method: 'standard',
    status: 'pending',
    lines: [{ name: 'Tablier PVC 40', quantity: 3 }, { name: 'Motorisation Somfy', quantity: 1 }],
    shipping_address: { firstName: 'Jean', lastName: 'Dupont', city: 'Montpellier' },
  },
  {
    id: 'CMD-2026-0002',
    created_at: '2026-06-22T14:32:00Z',
    total_ht: 312.00,
    total_ttc: 374.40,
    payment_method: 'card',
    shipping_method: 'express',
    status: 'paid',
    lines: [{ name: 'Kit axe 1500', quantity: 2 }],
    shipping_address: { firstName: 'Marie', lastName: 'Martin', city: 'Béziers' },
  },
];

export default function AdminCommandes() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data as OrderRow[] : MOCK_ORDERS);
        setLoading(false);
      })
      .catch(() => { setOrders(MOCK_ORDERS); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (filterStatus) list = list.filter((o) => o.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.id.toLowerCase().includes(q) ||
        `${o.shipping_addr.firstName} ${o.shipping_addr.lastName}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, search, filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast.error('Erreur mise à jour');
      setUpdating(null);
      return;
    }
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    toast.success(`Commande ${id} → ${STATUS_LABELS[status]}`);
    setUpdating(null);
  };

  const totalPending = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Commandes</h1>
        {totalPending > 0 && (
          <span className="adm-badge-warn">{totalPending} en attente</span>
        )}
      </div>

      {/* Filtres */}
      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="N° commande, client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="adm-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="adm-count">{filtered.length} commande{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="adm-loading">Chargement…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>N° commande</th>
                <th>Date</th>
                <th>Client</th>
                <th>Articles</th>
                <th>Total TTC</th>
                <th>Paiement</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="adm-tr">
                  <td><span className="ref">{o.id}</span></td>
                  <td>{new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>{o.shipping_address?.firstName} {o.shipping_address?.lastName}<br /><span className="adm-muted">{o.shipping_address?.city}</span></td>
                  <td>
                    {o.lines.slice(0, 2).map((l, i) => (
                      <div key={i} className="adm-muted" style={{ fontSize: 12 }}>{l.quantity}× {l.name}</div>
                    ))}
                    {o.lines.length > 2 && <span className="adm-muted" style={{ fontSize: 11 }}>+{o.lines.length - 2} autre{o.lines.length - 2 > 1 ? 's' : ''}</span>}
                  </td>
                  <td className="adm-td-price">{o.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                  <td>{o.payment_method === 'virement' ? '🏦 Virement' : '💳 Carte'}</td>
                  <td>
                    <span className={`order-status ${STATUS_CLASS[o.status] ?? ''}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="adm-select adm-select-sm"
                      value={o.status}
                      disabled={updating === o.id}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="adm-empty">Aucune commande</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
