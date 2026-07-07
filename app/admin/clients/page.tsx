'use client';

import { useEffect, useState } from 'react';
import { FAMILLES, type FamilleSlug } from '@/lib/familles';
import { computeLoyalty } from '@/lib/loyalty';
import { toast } from '@/components/ui/Toast';

interface Client {
  id: string;
  email: string;
  name: string;
  company: string;
  discounts: Partial<Record<FamilleSlug, number>>;
  lastSignIn: string | null;
  banned: boolean;
  loyaltyCaHT?: number;
  commercialId?: string | null;
}

interface Commercial { id: string; name: string }

function formatDate(iso: string | null) {
  if (!iso) return 'Jamais';
  const d = new Date(iso);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (diffH < 1)  return 'Il y a moins d\'1h';
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)  return `Il y a ${diffD}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<FamilleSlug, number>>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  // Rôle du connecté (admin | commercial) — adapte les colonnes et actions
  const [viewerRole, setViewerRole] = useState<'admin' | 'commercial'>('admin');
  const [team, setTeam] = useState<Commercial[]>([]);

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((data) => { setClients(data); setLoading(false); });
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (me?.role) setViewerRole(me.role);
        // La liste des commerciaux (dropdown d'assignation) est admin only
        if (me?.role === 'admin') {
          fetch('/api/admin/team')
            .then((r) => (r.ok ? r.json() : []))
            .then((t) => { if (Array.isArray(t)) setTeam(t); });
        }
      })
      .catch(() => {});
  }, []);

  const assignCommercial = async (client: Client, commercialId: string) => {
    setActing(client.id + 'assign');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, commercialId: commercialId || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erreur');
      }
      setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, commercialId: commercialId || null } : c));
      const name = team.find((t) => t.id === commercialId)?.name;
      toast.success(name ? `Client assigné à ${name}` : 'Client désassigné');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur assignation');
    } finally {
      setActing(null);
    }
  };

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

  const handleBlock = async (client: Client, action: 'block' | 'unblock') => {
    setActing(client.id + action);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, action }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setClients((prev) =>
        prev.map((c) => c.id === client.id ? { ...c, banned: action === 'block' } : c)
      );
      toast.success(action === 'block' ? 'Compte bloqué' : 'Compte débloqué');
    } catch (err) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (client: Client) => {
    setConfirmDelete(null);
    setActing(client.id + 'delete');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      toast.success('Compte supprimé');
    } catch (err) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="adm-page">
      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="adm-overlay">
          <div className="adm-confirm-box">
            <h3 className="adm-confirm-title">Supprimer le compte ?</h3>
            <p className="adm-confirm-body">
              Le compte de <strong>{confirmDelete.name || confirmDelete.email}</strong>
              {confirmDelete.company && ` (${confirmDelete.company})`} sera définitivement supprimé,
              ainsi que toutes les données associées. Cette action est irréversible.
            </p>
            <div className="adm-confirm-actions">
              <button className="btn ghost" type="button" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button
                className="btn danger"
                type="button"
                onClick={() => handleDelete(confirmDelete)}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

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
                <th style={{ whiteSpace: 'nowrap' }}>Palier {new Date().getFullYear()}</th>
                {viewerRole === 'admin' && <th>Commercial</th>}
                <th>Dernière connexion</th>
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
                const isActing = acting?.startsWith(client.id) ?? false;

                return (
                  <tr
                    key={client.id}
                    className={`adm-tr${isEditing ? ' adm-tr--editing' : ''}${client.banned ? ' adm-tr--blocked' : ''}`}
                  >
                    <td>
                      <div className="adm-prod-name">
                        {client.company || client.name || '—'}
                        {client.banned && <span className="adm-badge-blocked">Bloqué</span>}
                      </div>
                      {client.company && client.name && (
                        <div className="adm-prod-brand">{client.name}</div>
                      )}
                    </td>
                    <td>
                      <span className="ref adm-slug">{client.email}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {(() => {
                        const ca = client.loyaltyCaHT ?? 0;
                        const { tier } = computeLoyalty(ca);
                        return (
                          <>
                            {tier ? (
                              <span className="loyalty-badge loyalty-badge--sm" style={{ background: tier.color }}>
                                {tier.label}
                              </span>
                            ) : (
                              <span className="adm-muted">—</span>
                            )}
                            <div className="adm-muted" style={{ fontSize: 11, marginTop: 3 }}>
                              {ca.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € HT
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    {viewerRole === 'admin' && (
                      <td>
                        <select
                          className="adm-select adm-select-sm"
                          value={client.commercialId ?? ''}
                          disabled={acting === client.id + 'assign'}
                          onChange={(e) => assignCommercial(client, e.target.value)}
                        >
                          <option value="">— Non assigné —</option>
                          {team.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td>
                      <span className="adm-last-login">{formatDate(client.lastSignIn)}</span>
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
                        <>
                          <button
                            type="button"
                            className="adm-action-btn edit"
                            onClick={() => startEdit(client)}
                            disabled={isActing}
                          >
                            Modifier
                          </button>
                          {/* Blocage/suppression : admin uniquement (l'API refuse de toute façon) */}
                          {viewerRole === 'admin' && (client.banned ? (
                            <button
                              type="button"
                              className="adm-action-btn"
                              onClick={() => handleBlock(client, 'unblock')}
                              disabled={isActing}
                              title="Réactiver ce compte"
                            >
                              {acting === client.id + 'unblock' ? '…' : '✓ Débloquer'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="adm-action-btn warn"
                              onClick={() => handleBlock(client, 'block')}
                              disabled={isActing}
                              title="Bloquer ce compte"
                            >
                              {acting === client.id + 'block' ? '…' : '⊘ Bloquer'}
                            </button>
                          ))}
                          {viewerRole === 'admin' && (
                            <button
                              type="button"
                              className="adm-action-btn del"
                              onClick={() => setConfirmDelete(client)}
                              disabled={isActing}
                              title="Supprimer définitivement"
                            >
                              {acting === client.id + 'delete' ? '…' : 'Supprimer'}
                            </button>
                          )}
                        </>
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
