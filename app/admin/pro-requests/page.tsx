'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';

interface ProRequest {
  id: string;
  company: string;
  siret: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending:  'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
};
const STATUS_CLASS: Record<string, string> = {
  pending:  'status-pending',
  approved: 'status-ok',
  rejected: 'status-rupture',
};

export default function AdminProRequests() {
  const [requests, setRequests] = useState<ProRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/pro-requests')
      .then((r) => r.json())
      .then((data) => { setRequests(data); setLoading(false); });
  }, []);

  const handle = async (id: string, action: 'approve' | 'reject') => {
    setActing(id + action);
    try {
      const res = await fetch('/api/admin/pro-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur');

      setRequests((prev) =>
        prev.map((r) => r.id === id
          ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' }
          : r
        )
      );
      toast.success(action === 'approve'
        ? 'Compte créé — invitation envoyée par email au client'
        : 'Demande refusée'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erreur : ${msg}`);
    } finally {
      setActing(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Demandes compte pro</h1>
        {pending > 0 && (
          <span className="adm-badge-warn">{pending} en attente</span>
        )}
      </div>

      {loading ? (
        <div className="adm-loading">Chargement…</div>
      ) : requests.length === 0 ? (
        <div className="adm-empty-state">
          <p>Aucune demande reçue pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>SIRET</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="adm-tr">
                  <td><strong>{r.company}</strong></td>
                  <td><span className="ref adm-slug">{r.siret}</span></td>
                  <td>{r.name}</td>
                  <td><span className="adm-slug">{r.email}</span></td>
                  <td>{r.phone ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <span className={`order-status ${STATUS_CLASS[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="adm-td-actions">
                    {r.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className="adm-action-btn edit"
                          onClick={() => handle(r.id, 'approve')}
                          disabled={!!acting}
                        >
                          {acting === r.id + 'approve' ? '…' : '✓ Approuver'}
                        </button>
                        <button
                          type="button"
                          className="adm-action-btn del"
                          onClick={() => handle(r.id, 'reject')}
                          disabled={!!acting}
                        >
                          {acting === r.id + 'reject' ? '…' : '✕ Refuser'}
                        </button>
                      </>
                    ) : (
                      <span className="adm-muted" style={{ fontSize: 13 }}>
                        {r.status === 'approved' ? 'Invitation envoyée' : 'Demande refusée'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
