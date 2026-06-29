'use client';

import { useEffect, useState } from 'react';
import { FAMILLES, type FamilleSlug } from '@/lib/familles';
import { toast } from '@/components/ui/Toast';

interface Client {
  id: string;
  email: string;
  name: string;
  company: string;
  discounts: Partial<Record<FamilleSlug, number>>;
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<FamilleSlug, number>>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((data) => { setClients(data); setLoading(false); });
  }, []);

  const startEdit = (client: Client) => {
    setEditing(client.id);
    setDrafts((prev) => ({ ...prev, [client.id]: { ...client.discounts } }));
  };

  const setDiscount = (clientId: string, famille: FamilleSlug, val: string) => {
    const num = val === '' ? 0 : Math.min(50, Math.max(0, parseInt(val) || 0));
    setDrafts((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], [famille]: num },
    }));
  };

  const save = async (client: Client) => {
    setSaving(client.id);
    try {
      const discounts = drafts[client.id] ?? {};
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, discounts }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      setClients((prev) =>
        prev.map((c) => c.id === client.id ? { ...c, discounts } : c)
      );
      setEditing(null);
      toast.success('Remises enregistrées');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erreur : ${msg}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Clients professionnels</h1>
        <span className="adm-count">{clients.length} compte{clients.length > 1 ? 's' : ''} pro</span>
      </div>

      {loading ? (
        <div className="adm-loading">Chargement…</div>
      ) : clients.length === 0 ? (
        <div className="adm-empty-state">
          <p>Aucun compte professionnel enregistré.</p>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Les comptes avec le rôle &ldquo;b2b&rdquo; apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                {FAMILLES.map((f) => (
                  <th key={f.slug} style={{ textAlign: 'center', minWidth: 110 }}>
                    {f.label}<br /><small style={{ fontWeight: 400, color: 'var(--muted)' }}>remise %</small>
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const isEditing = editing === client.id;
                const draft = drafts[client.id] ?? client.discounts;

                return (
                  <tr key={client.id} className={`adm-tr${isEditing ? ' adm-tr--editing' : ''}`}>
                    <td>
                      <div className="adm-prod-name">{client.name || '—'}</div>
                      {client.company && <div className="adm-prod-brand">{client.company}</div>}
                    </td>
                    <td>
                      <span className="ref adm-slug">{client.email}</span>
                    </td>
                    {FAMILLES.map((f) => (
                      <td key={f.slug} style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={draft[f.slug] ?? 0}
                            onChange={(e) => setDiscount(client.id, f.slug, e.target.value)}
                            style={{ width: 64, textAlign: 'center' }}
                          />
                        ) : (
                          <span className={client.discounts[f.slug] ? 'adm-yes' : 'adm-no'}>
                            {client.discounts[f.slug] ? `${client.discounts[f.slug]} %` : '—'}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="adm-td-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="adm-action-btn edit"
                            onClick={() => save(client)}
                            disabled={saving === client.id}
                          >
                            {saving === client.id ? '…' : 'Enregistrer'}
                          </button>
                          <button
                            type="button"
                            className="adm-action-btn del"
                            onClick={() => setEditing(null)}
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="adm-action-btn edit"
                          onClick={() => startEdit(client)}
                        >
                          Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
