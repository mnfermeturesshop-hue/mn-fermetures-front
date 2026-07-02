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

interface OrderLine {
  key: string;
  name: string;
  reference?: string;
  detail?: string;
  quantity: number;
  unitPriceHT: number;
}

interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  postalCode: string;
  city: string;
  phone: string;
}

interface OrderDocuments {
  arc?: string;
  facture?: string;
  suivi?: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  created_at: string;
  email: string;
  customer_name: string;
  is_guest: boolean;
  total_ht: number;
  total_ttc: number;
  frais_ht: number;
  payment_method: string;
  shipping_method: string;
  status: string;
  lines: OrderLine[];
  shipping_address: Address;
  billing_address: Address;
  documents?: OrderDocuments;
}

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const MOCK_ORDERS: OrderRow[] = [
  {
    id: 'CMD-2026-0001',
    order_number: 'CMD-2026-0001',
    created_at: '2026-06-20T10:14:00Z',
    email: 'jean.dupont@example.com',
    customer_name: 'Jean Dupont',
    is_guest: false,
    total_ht: 847.50,
    total_ttc: 1017.00,
    frais_ht: 0,
    payment_method: 'virement',
    shipping_method: 'standard',
    status: 'pending',
    lines: [
      { key: '1', name: 'Tablier PVC 40', reference: 'TAB-PVC-40', quantity: 3, unitPriceHT: 245.00 },
      { key: '2', name: 'Motorisation Somfy', reference: 'MOT-SOMFY', quantity: 1, unitPriceHT: 117.50 },
    ],
    shipping_address: { firstName: 'Jean', lastName: 'Dupont', address1: '12 rue des Lilas', postalCode: '34000', city: 'Montpellier', phone: '0600000001' },
    billing_address: { firstName: 'Jean', lastName: 'Dupont', address1: '12 rue des Lilas', postalCode: '34000', city: 'Montpellier', phone: '0600000001' },
  },
];

export default function AdminCommandes() {
  const [orders, setOrders]       = useState<OrderRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updating, setUpdating]   = useState<string | null>(null);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

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
        (o.order_number ?? o.id).toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q) ||
        `${o.shipping_address?.firstName ?? ''} ${o.shipping_address?.lastName ?? ''}`.toLowerCase().includes(q)
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

  const handleUploadDoc = async (orderId: string, type: string, file: File) => {
    setUploadingDoc(`${orderId}-${type}`);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    const res = await fetch(`/api/admin/orders/${orderId}/documents`, { method: 'POST', body: fd });
    if (!res.ok) {
      toast.error('Erreur upload document');
    } else {
      const { documents } = await res.json() as { documents: OrderDocuments };
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, documents } : o));
      toast.success(`Document ${type.toUpperCase()} uploadé`);
    }
    setUploadingDoc(null);
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

      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="N° commande, client, email…"
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
                <th style={{ width: 32 }} />
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
              {filtered.map((o) => {
                const isOpen = expandedId === o.id;
                return (
                  <>
                    <tr
                      key={o.id}
                      className={`adm-tr adm-tr--clickable${isOpen ? ' adm-tr--open' : ''}`}
                      onClick={() => setExpandedId(isOpen ? null : o.id)}
                    >
                      <td style={{ textAlign: 'center', color: '#6b7280', fontSize: 11 }}>
                        {isOpen ? '▲' : '▼'}
                      </td>
                      <td><span className="ref">{o.order_number ?? o.id}</span></td>
                      <td>{new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        {o.shipping_address?.firstName} {o.shipping_address?.lastName}
                        <br /><span className="adm-muted" style={{ fontSize: 12 }}>{o.email}</span>
                      </td>
                      <td>
                        {o.lines.slice(0, 2).map((l, i) => (
                          <div key={i} className="adm-muted" style={{ fontSize: 12 }}>{l.quantity}× {l.name}</div>
                        ))}
                        {o.lines.length > 2 && (
                          <span className="adm-muted" style={{ fontSize: 11 }}>+{o.lines.length - 2} autre{o.lines.length - 2 > 1 ? 's' : ''}</span>
                        )}
                      </td>
                      <td className="adm-td-price">{euro(o.total_ttc)}</td>
                      <td>
                        {o.payment_method === 'bon_de_commande' ? '📋 Bon de commande'
                          : o.payment_method === 'virement' ? '🏦 Virement'
                          : '💳 Carte'}
                      </td>
                      <td>
                        <span className={`order-status ${STATUS_CLASS[o.status] ?? ''}`}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
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

                    {isOpen && (
                      <tr key={`${o.id}-detail`} className="adm-tr-detail">
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div className="adm-order-detail">

                            {/* Articles */}
                            <div className="adm-order-detail-section">
                              <div className="adm-order-detail-title">Articles</div>
                              <table className="adm-order-lines">
                                <thead>
                                  <tr>
                                    <th>Désignation</th>
                                    <th>Réf.</th>
                                    <th style={{ textAlign: 'center' }}>Qté</th>
                                    <th style={{ textAlign: 'right' }}>P.U. HT</th>
                                    <th style={{ textAlign: 'right' }}>Total HT</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {o.lines.map((l, i) => (
                                    <tr key={i}>
                                      <td>
                                        <div style={{ fontWeight: 600 }}>{l.name}</div>
                                        {l.detail && <div className="adm-muted" style={{ fontSize: 12 }}>{l.detail}</div>}
                                      </td>
                                      <td><span className="adm-slug">{l.reference ?? '—'}</span></td>
                                      <td style={{ textAlign: 'center' }}>{l.quantity}</td>
                                      <td style={{ textAlign: 'right' }}>{euro(l.unitPriceHT)}</td>
                                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{euro(l.unitPriceHT * l.quantity)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan={4} style={{ textAlign: 'right', color: '#6b7280', fontSize: 13 }}>
                                      Frais de livraison ({o.shipping_method === 'express' ? 'Express' : 'Standard'})
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      {o.frais_ht === 0
                                        ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Offerts</span>
                                        : euro(o.frais_ht)}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Total HT</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{euro(o.total_ht)}</td>
                                  </tr>
                                  <tr>
                                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, fontSize: 15 }}>Total TTC</td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#10314f' }}>{euro(o.total_ttc)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>

                            {/* Adresses + infos */}
                            <div className="adm-order-detail-cols">
                              <div className="adm-order-detail-section">
                                <div className="adm-order-detail-title">Livraison</div>
                                <div className="adm-order-addr">
                                  <strong>{o.shipping_address?.firstName} {o.shipping_address?.lastName}</strong>
                                  {o.shipping_address?.company && <div>{o.shipping_address.company}</div>}
                                  <div>{o.shipping_address?.address1}</div>
                                  {o.shipping_address?.address2 && <div>{o.shipping_address.address2}</div>}
                                  <div>{o.shipping_address?.postalCode} {o.shipping_address?.city}</div>
                                  <div>{o.shipping_address?.phone}</div>
                                </div>
                              </div>

                              <div className="adm-order-detail-section">
                                <div className="adm-order-detail-title">Client</div>
                                <div className="adm-order-addr">
                                  <div>{o.email}</div>
                                  <div className="adm-muted" style={{ fontSize: 12, marginTop: 4 }}>
                                    {o.is_guest ? 'Commande invité' : 'Compte client'}
                                  </div>
                                  <div className="adm-muted" style={{ fontSize: 12, marginTop: 8 }}>
                                    {o.payment_method === 'bon_de_commande' ? '📋 Bon de commande pro'
                                      : o.payment_method === 'virement' ? '🏦 Virement bancaire'
                                      : '💳 Carte bancaire'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Documents ERP — uniquement pour les bons de commande */}
                            {o.payment_method === 'bon_de_commande' && (
                              <div className="adm-order-detail-section">
                                <div className="adm-order-detail-title">Documents ERP</div>
                                <div className="adm-doc-slots">
                                  {(['arc', 'facture', 'suivi'] as const).map((type) => {
                                    const LABELS = { arc: 'ARC', facture: 'Facture', suivi: 'Suivi livraison' };
                                    const docPath = o.documents?.[type];
                                    const isUploading = uploadingDoc === `${o.id}-${type}`;
                                    return (
                                      <div key={type} className="adm-doc-slot">
                                        <span className="adm-doc-slot-label">{LABELS[type]}</span>
                                        {docPath
                                          ? <span className="adm-doc-uploaded">✓ Uploadé</span>
                                          : <span className="adm-doc-missing">—</span>
                                        }
                                        <label className="btn ghost sm adm-doc-upload-btn" style={{ cursor: 'pointer' }}>
                                          {isUploading ? 'Upload…' : docPath ? 'Remplacer' : 'Uploader'}
                                          <input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            hidden
                                            disabled={!!uploadingDoc}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleUploadDoc(o.id, type, file);
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="adm-empty">Aucune commande</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
